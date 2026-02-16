using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reservations.Queries.SearchReservations;

public record SearchReservationsQuery : IRequest<ReceptionSearchResultDto>
{
    public string Query { get; init; } = string.Empty;
    public DateOnly? Date { get; init; }
    public int Limit { get; init; } = 20;
}

public class SearchReservationsQueryHandler : IRequestHandler<SearchReservationsQuery, ReceptionSearchResultDto>
{
    private readonly IApplicationDbContext _context;

    public SearchReservationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReceptionSearchResultDto> Handle(SearchReservationsQuery request, CancellationToken cancellationToken)
    {
        // Validation handled by FluentValidation usually, but let's be safe
        if (string.IsNullOrWhiteSpace(request.Query) || request.Query.Length < 2)
        {
            throw new InvalidOperationException("Search query must be at least 2 characters long.");
        }

        var limit = Math.Clamp(request.Limit, 1, 50);

        var dbQuery = _context.Reservations
            .Include(r => r.Lines)
            .ThenInclude(l => l.RoomType)
            .Where(r => r.Status != ReservationStatus.Draft); // Always exclude Draft

        // Filtering logic
        var searchPattern = $"%{request.Query}%";
        
        // Check if query is an ID
        int? queryId = int.TryParse(request.Query, out var id) ? id : null;

        dbQuery = dbQuery.Where(r => 
            (queryId.HasValue && r.Id == queryId.Value) ||
            EF.Functions.Like(r.BookingNumber!, searchPattern) ||
            EF.Functions.Like(r.GuestName, searchPattern) ||
            EF.Functions.Like(r.Phone!, searchPattern)
        );

        var rawResults = await dbQuery.ToListAsync(cancellationToken);

        // Ordering Logic (Bucket-based if date provided)
        IEnumerable<CleanArchitecture.Domain.Entities.Reservation> orderedResults;
        if (request.Date.HasValue)
        {
            var targetDate = request.Date.Value.ToDateTime(TimeOnly.MinValue);
            
            orderedResults = rawResults.OrderByDescending(r => 
            {
                // Buckets for relevance as per prompt:
                // 1. InHouse (Stay-over: started before today, ends after today)
                if (r.CheckInDate < targetDate && r.CheckOutDate > targetDate) return 4;
                // 2. Arrivals (Starts today)
                if (r.CheckInDate == targetDate) return 3;
                // 3. Departures (Ends today)
                if (r.CheckOutDate == targetDate) return 2;
                return 1; // Others
            })
            .ThenBy(r => Math.Abs((r.CheckInDate - targetDate).Days)) // Proximity
            .ThenBy(r => r.CheckInDate)
            .ThenBy(r => r.BookingNumber ?? r.Id.ToString());
        }
        else
        {
            orderedResults = rawResults.OrderBy(r => r.CheckInDate)
                .ThenBy(r => r.BookingNumber ?? r.Id.ToString());
        }

        var resultItems = orderedResults.Take(limit).Select(r => new ReceptionReservationSearchItemDto
        {
            ReservationId = r.Id,
            BookingNumber = r.BookingNumber ?? string.Empty,
            GuestName = r.GuestName,
            Phone = r.Phone,
            CheckIn = r.CheckInDate.ToString("yyyy-MM-dd"),
            CheckOut = r.CheckOutDate.ToString("yyyy-MM-dd"),
            Status = r.Status.ToString(),
            RoomTypeNames = r.Lines.Select(l => l.RoomType?.Name ?? "Unknown").Distinct().ToList(),
            TotalNights = (r.CheckOutDate - r.CheckInDate).Days
        }).ToList();

        return new ReceptionSearchResultDto
        {
            Query = request.Query,
            Date = request.Date?.ToString("yyyy-MM-dd"),
            Results = resultItems
        };
    }
}

public class ReceptionSearchResultDto
{
    public string Query { get; set; } = string.Empty;
    public string? Date { get; set; }
    public List<ReceptionReservationSearchItemDto> Results { get; set; } = new();
}

public class ReceptionReservationSearchItemDto
{
    public int ReservationId { get; set; }
    public string BookingNumber { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string CheckIn { get; set; } = string.Empty;
    public string CheckOut { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<string> RoomTypeNames { get; set; } = new();
    public int TotalNights { get; set; }
}
