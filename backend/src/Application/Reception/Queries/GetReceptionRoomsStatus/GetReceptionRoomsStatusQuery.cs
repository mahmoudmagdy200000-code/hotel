using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reception.Queries.GetReceptionRoomsStatus;

public record GetReceptionRoomsStatusQuery(DateOnly Date) : IRequest<ReceptionRoomsStatusDto>;

public class GetReceptionRoomsStatusQueryHandler : IRequestHandler<GetReceptionRoomsStatusQuery, ReceptionRoomsStatusDto>
{
    private readonly IApplicationDbContext _context;

    public GetReceptionRoomsStatusQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReceptionRoomsStatusDto> Handle(GetReceptionRoomsStatusQuery request, CancellationToken cancellationToken)
    {
        var targetDate = request.Date.ToDateTime(TimeOnly.MinValue);

        // 1. Fetch all active rooms
        var rooms = await _context.Rooms
            .AsNoTracking()
            .Include(r => r.RoomType)
            .Where(r => r.IsActive)
            .ToListAsync(cancellationToken);

        // 2. Fetch active reservations for that date
        // CheckIn <= Date < CheckOut
        // We only care about statuses: Confirmed, CheckedIn
        var statuses = new[] { ReservationStatus.Confirmed, ReservationStatus.CheckedIn };

        var overlappingReservations = await _context.Reservations
            .AsNoTracking()
            .Include(r => r.Lines)
            .Where(r => !r.IsDeleted &&
                        statuses.Contains(r.Status) &&
                        r.CheckInDate <= targetDate &&
                        r.CheckOutDate > targetDate)
            .ToListAsync(cancellationToken);

        // Create a lookup for roomId -> List of reservations
        var roomReservationLookup = overlappingReservations
            .SelectMany(r => r.Lines.Select(l => new { l.RoomId, Reservation = r }))
            .GroupBy(x => x.RoomId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Reservation).ToList());

        var items = new List<ReceptionRoomStatusItemDto>();

        foreach (var room in rooms)
        {
            var item = new ReceptionRoomStatusItemDto
            {
                RoomId = room.Id,
                RoomNumber = room.RoomNumber,
                RoomTypeName = room.RoomType?.Name ?? "Unknown",
                Status = "Available",
                Reservation = null
            };

            if (roomReservationLookup.TryGetValue(room.Id, out var reservations))
            {
                // Priority: CheckedIn wins over Confirmed.
                // If same status, earliest CheckIn.
                var bestReservation = reservations
                    .OrderBy(r => r.Status == ReservationStatus.CheckedIn ? 0 : 1)
                    .ThenBy(r => r.CheckInDate)
                    .ThenBy(r => r.Id)
                    .FirstOrDefault();

                if (bestReservation != null)
                {
                    item.Status = bestReservation.Status == ReservationStatus.CheckedIn ? "Occupied" : "Reserved";
                    item.Reservation = new ReceptionRoomStatusReservationDto
                    {
                        ReservationId = bestReservation.Id,
                        GuestName = bestReservation.GuestName,
                        BookingNumber = bestReservation.BookingNumber,
                        CheckIn = bestReservation.CheckInDate.ToString("yyyy-MM-dd"),
                        CheckOut = bestReservation.CheckOutDate.ToString("yyyy-MM-dd"),
                        HotelName = bestReservation.HotelName
                    };
                }
            }

            items.Add(item);
        }

        // Natural sort by roomNumber
        var orderedItems = items
            .OrderBy(i => i.RoomNumber, new NaturalStringComparer())
            .ToList();

        return new ReceptionRoomsStatusDto
        {
            Date = request.Date.ToString("yyyy-MM-dd"),
            Items = orderedItems
        };
    }
}

public class NaturalStringComparer : IComparer<string>
{
    public int Compare(string? x, string? y)
    {
        if (x == null || y == null) return string.Compare(x, y);

        if (int.TryParse(x, out int xInt) && int.TryParse(y, out int yInt))
        {
            return xInt.CompareTo(yInt);
        }

        return string.Compare(x, y, StringComparison.OrdinalIgnoreCase);
    }
}
