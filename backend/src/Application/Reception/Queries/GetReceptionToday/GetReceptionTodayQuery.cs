using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reception.Queries.GetReceptionToday;

public record GetReceptionTodayQuery(DateOnly Date) : IRequest<ReceptionTodayDto>;

public class GetReceptionTodayQueryHandler : IRequestHandler<GetReceptionTodayQuery, ReceptionTodayDto>
{
    private readonly IApplicationDbContext _context;

    public GetReceptionTodayQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReceptionTodayDto> Handle(GetReceptionTodayQuery request, CancellationToken cancellationToken)
    {
        var targetDate = request.Date.ToDateTime(TimeOnly.MinValue); // Convert to DateTime for EF Core comparison with existing schema


        // Filter: 
        // 1. Confirmed (Arrivals) -> CheckIn == Date
        // 2. CheckedIn (InHouse OR Departures)
        //    - InHouse: CheckIn <= Date < CheckOut
        //    - Departure: CheckOut == Date
        // Combined window: CheckIn <= Date AND CheckOut >= Date
        
        var statuses = new[] { ReservationStatus.Confirmed, ReservationStatus.CheckedIn };

        var rawReservations = await _context.Reservations
            .AsNoTracking()
            .Include(r => r.Lines)
                .ThenInclude(l => l.Room)
            .Include(r => r.Lines)
                .ThenInclude(l => l.RoomType)
            .Where(r => (r.Status == ReservationStatus.Confirmed && r.CheckInDate <= targetDate) || 
                        (r.Status == ReservationStatus.CheckedIn) ||
                        (r.BalanceDue > 0 && r.Status != ReservationStatus.Cancelled && r.Status != ReservationStatus.NoShow))
            .ToListAsync(cancellationToken);

        var arrivals = new List<ReceptionReservationItemDto>();
        var departures = new List<ReceptionReservationItemDto>();
        var inHouse = new List<ReceptionReservationItemDto>();

        foreach (var r in rawReservations)
        {
            var item = MapToItemDto(r);

            // Categorize
            if (r.Status == ReservationStatus.Confirmed || r.Status == ReservationStatus.Draft)
            {
                // Pending arrivals: All those who were supposed to arrive by targetDate OR have balance
                arrivals.Add(item);
            }
            else if (r.Status == ReservationStatus.CheckedIn)
            {
                // Departures: Anyone checked in who should leave by targetDate
                if (r.CheckOutDate.Date <= targetDate)
                {
                    departures.Add(item);
                }
                
                // InHouse: Anyone currently checked in
                inHouse.Add(item);
            }
        }

        // Deterministic Ordering
        var sortedArrivals = OrderList(arrivals);
        var sortedDepartures = OrderList(departures);
        var sortedInHouse = OrderList(inHouse);

        return new ReceptionTodayDto
        {
            Date = targetDate.ToString("yyyy-MM-dd"),
            Summary = new ReceptionTodaySummaryDto
            {
                ArrivalsCount = sortedArrivals.Count,
                DeparturesCount = sortedDepartures.Count,
                InHouseCount = sortedInHouse.Count
            },
            Arrivals = sortedArrivals,
            Departures = sortedDepartures,
            InHouse = sortedInHouse
        };
    }

    private List<ReceptionReservationItemDto> OrderList(List<ReceptionReservationItemDto> list)
    {
        return list
            .OrderBy(x => x.CheckIn)
            .ThenBy(x => x.BookingNumber)
            .ThenBy(x => x.ReservationId) // Fallback for stability
            .ToList();
    }

    private ReceptionReservationItemDto MapToItemDto(Domain.Entities.Reservation r)
    {
        var roomNumbers = r.Lines
            .Select(l => l.Room?.RoomNumber)
            .Where(n => !string.IsNullOrEmpty(n))
            .Cast<string>()
            .Distinct()
            .OrderBy(n => n)
            .ToList();

        var roomTypes = r.Lines
            .Select(l => l.RoomType?.Name)
            .Where(n => !string.IsNullOrEmpty(n))
            .Cast<string>()
            .Distinct()
            .OrderBy(n => n)
            .ToList();

        // If RoomType name missing on relation, maybe use snapshot? 
        // ReservationLine doesn't store RoomTypeName snapshot currently, only RoomTypeId.
        // But we Included RoomType. So it should be there.

        return new ReceptionReservationItemDto
        {
            ReservationId = r.Id,
            BookingNumber = r.BookingNumber ?? r.Id.ToString(),
            GuestName = r.GuestName,
            Phone = r.Phone,
            CheckIn = r.CheckInDate.ToString("yyyy-MM-dd"),
            CheckOut = r.CheckOutDate.ToString("yyyy-MM-dd"),
            Status = r.Status.ToString(),
            RoomNumbers = roomNumbers,
            RoomTypeNames = roomTypes,
            TotalAmount = r.TotalAmount,
            BalanceDue = r.BalanceDue,
            Currency = r.Currency,
            CurrencyCode = (int)r.CurrencyCode,
            PaymentMethod = r.PaymentMethod.ToString(),
            Source = (int)r.Source,
            ActualCheckOut = r.ActualCheckOutDate?.ToString("yyyy-MM-dd"),
            IsEarlyCheckOut = r.Status == ReservationStatus.CheckedOut && 
                              r.ActualCheckOutDate.HasValue && 
                              r.ActualCheckOutDate.Value.Date < r.CheckOutDate.Date,
            Lines = r.Lines.Select(l => new ReceptionReservationLineDto
            {
                Id = l.Id,
                RoomId = l.RoomId,
                RoomNumber = l.Room?.RoomNumber ?? "??",
                RoomTypeId = l.RoomTypeId,
                RoomTypeName = l.RoomType?.Name ?? "Unknown"
            }).ToList()
        };
    }
}
