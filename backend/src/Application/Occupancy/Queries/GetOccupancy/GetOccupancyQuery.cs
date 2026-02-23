using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Occupancy.Queries.GetOccupancy;

public record GetOccupancyQuery : IRequest<OccupancySummaryDto>
{
    public DateTime? From { get; init; }
    public DateTime? To { get; init; }
    public string? Mode { get; init; } = "Forecast"; // Actual | Forecast
    public string? GroupBy { get; init; } = "both"; // day | roomType | both
}

public class GetOccupancyQueryHandler : IRequestHandler<GetOccupancyQuery, OccupancySummaryDto>
{
    private readonly IApplicationDbContext _context;

    public GetOccupancyQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<OccupancySummaryDto> Handle(GetOccupancyQuery request, CancellationToken cancellationToken)
    {
        // 1. Inputs & Validation
        var from = request.From ?? DateTime.Today;
        var to = request.To ?? DateTime.Today.AddDays(7);
        if (to <= from) to = from.AddDays(1); // Ensure at least 1 night

        // +1 because 'to' is inclusive (frontend sends endOfMonth)
        var nightsCount = (int)(to - from).TotalDays + 1;
        
        var mode = (request.Mode ?? "Forecast").ToLower();
        var groupBy = (request.GroupBy ?? "both").ToLower();

        // 2. Supply
        // Count active rooms excluding Out Of Order / Out Of Service
        var totalRooms = await _context.Rooms.CountAsync(x => x.IsActive && x.Status != RoomStatus.OutOfService, cancellationToken);
        var supplyRoomNights = totalRooms * nightsCount;

        // 3. Status Filter
        var statuses = mode == "actual"
            ? new[] { ReservationStatus.CheckedIn, ReservationStatus.CheckedOut }
            : new[] { ReservationStatus.Confirmed, ReservationStatus.Draft };

        // 4. Fetch Data
        // Overlap: CheckIn <= To AND CheckOut > From (to is inclusive)
        var reservations = await _context.Reservations
            .AsNoTracking()
            .Include(x => x.Lines)
                .ThenInclude(l => l.RoomType)
            .Where(x => statuses.Contains(x.Status) &&
                        x.CheckInDate <= to &&
                        x.CheckOutDate > from)
            .ToListAsync(cancellationToken);

        // 5. Aggregate logic
        var dailyStats = new List<OccupancyDayDto>();
        var roomTypeStats = new List<OccupancyByRoomTypeDayDto>();

        var totalSoldRoomNights = 0;

        for (int i = 0; i < nightsCount; i++)
        {
            var currentDate = from.AddDays(i);
            var nextDate = currentDate.AddDays(1);
            var dateStr = currentDate.ToString("yyyy-MM-dd");

            // Find reservations active on this specific night
            // Active if CheckIn <= currentDate AND CheckOut > currentDate (CheckOut >= nextDate)
            var activeRes = reservations
                .Where(r => r.CheckInDate <= currentDate && r.CheckOutDate >= nextDate)
                .ToList();

            // Distinct rooms occupied
            // A reservation can have multiple lines (rooms). We flatten lines.
            // Assumption: A room appearing in ResLines is occupied for the full duration of the reservation? 
            // In Phase 4.0 we said ReservationLines store the breakdown. 
            // But usually ResLines don't have separate dates. They follow Reservation dates.
            // So for each active reservation, we count its lines' RoomIds.
            
            var occupiedRoomsOnDay = activeRes
                .SelectMany(r => r.Lines)
                .Select(l => l.RoomId)
                .Distinct()
                .Count();

            totalSoldRoomNights += occupiedRoomsOnDay;
            
            var occupancyRate = totalRooms > 0 ? (double)occupiedRoomsOnDay / totalRooms : 0;
            var availableRooms = totalRooms - occupiedRoomsOnDay;

            dailyStats.Add(new OccupancyDayDto
            {
                Date = dateStr,
                TotalRooms = totalRooms,
                OccupiedRooms = occupiedRoomsOnDay,
                RoomNightsSold = occupiedRoomsOnDay,
                OccupancyRate = Math.Round(occupancyRate, 2),
                AvailableRooms = availableRooms,
                Overbooked = occupiedRoomsOnDay > totalRooms
            });

            // By RoomType
            if (groupBy == "roomtype" || groupBy == "both")
            {
                var grouped = activeRes
                    .SelectMany(r => r.Lines)
                    .GroupBy(l => new { l.RoomTypeId }) // Snapshot RoomTypeId
                    .Select(g => new
                    {
                        RoomTypeId = g.Key.RoomTypeId,
                        // RoomTypeName: we might not have it if lines don't include it. 
                        // But lines SHOULD include RoomType object if we Include it in query? 
                        // Actually I forgot to Include RoomType in lines. Let's fix that in Fetch Data.
                        // Or I can pick first one.
                        RoomTypeName = g.Select(x => x.RoomType != null ? x.RoomType.Name : x.RoomTypeId.ToString()).FirstOrDefault(),
                        Count = g.Select(x => x.RoomId).Distinct().Count() // Count distinct rooms per type
                    });

                foreach (var g in grouped)
                {
                    roomTypeStats.Add(new OccupancyByRoomTypeDayDto
                    {
                        Date = dateStr,
                        RoomTypeId = g.RoomTypeId,
                        RoomTypeName = g.RoomTypeName,
                        OccupiedRoomsOfType = g.Count,
                        RoomNightsSoldOfType = g.Count
                    });
                }
            }
        }

        var overallRate = supplyRoomNights > 0 ? (double)totalSoldRoomNights / supplyRoomNights : 0;

        return new OccupancySummaryDto
        {
            From = from,
            To = to,
            NightsCount = nightsCount,
            Mode = request.Mode ?? "Forecast",
            TotalRooms = totalRooms,
            SupplyRoomNights = supplyRoomNights,
            SoldRoomNights = totalSoldRoomNights,
            OccupancyRateOverall = Math.Round(overallRate, 2),
            ByDay = dailyStats, // Filter based on GroupBy if needed, but 'both' or 'day' includes it. 
                                // Actually prompt says 'groupBy: day|roomType|both'.
                                // If groupBy=roomType, maybe we omit ByDay? 
                                // I'll just include ByDay always unless strictly requested not to. 
                                // Prompt: "byRoomTypeByDay: List... (optional toggle)"
            ByRoomTypeByDay = (groupBy == "roomtype" || groupBy == "both") ? roomTypeStats : new()
        };
    }
}
