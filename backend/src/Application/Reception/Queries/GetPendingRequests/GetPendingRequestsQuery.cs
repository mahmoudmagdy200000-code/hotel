using System.Text.RegularExpressions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Constants;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reception.Queries.GetPendingRequests;

public record GetPendingRequestsQuery : IRequest<PendingRequestsDto>
{
    public DateOnly From { get; init; }
    public DateOnly To { get; init; }
    public bool IncludeHint { get; init; } = true;
    public int Limit { get; init; } = 50;
}

public class PendingRequestsDto
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public PendingTotalsDto Totals { get; set; } = new();
    public List<PendingRequestItemDto> Items { get; set; } = new();
}

public class PendingTotalsDto
{
    public int Count { get; set; }
    public int TotalPendingRoomNights { get; set; }
    public int SafeCount { get; set; }
    public int TightCount { get; set; }
    public int OverbookCount { get; set; }
}

public class PendingRequestItemDto
{
    public int ReservationId { get; set; }
    public string BookingNumber { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? CheckIn { get; set; }
    public string? CheckOut { get; set; }
    public int? Nights { get; set; }
    public int? RequestedRooms { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string ParsingStatus { get; set; } = "Pending";
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public decimal? TotalAmount { get; set; }
    public string? Currency { get; set; }
    public CurrencyCode? CurrencyCode { get; set; }
    public string? HotelName { get; set; }
    public AvailabilityHintDto? AvailabilityHint { get; set; }
}

public class AvailabilityHintDto
{
    public string Bucket { get; set; } = string.Empty; // Safe | Tight | Overbook
    public int AvailableRoomNights { get; set; }
    public int ForecastSoldRoomNights { get; set; }
    public int SupplyRoomNights { get; set; }
    public int PendingRoomNights { get; set; }
    public string? Note { get; set; }
}

public class GetPendingRequestsQueryHandler : IRequestHandler<GetPendingRequestsQuery, PendingRequestsDto>
{
    private readonly IApplicationDbContext _context;

    public GetPendingRequestsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PendingRequestsDto> Handle(GetPendingRequestsQuery request, CancellationToken cancellationToken)
    {
        var fromDateTime = request.From.ToDateTime(TimeOnly.MinValue);
        var toDateTime = request.To.ToDateTime(TimeOnly.MinValue);
        var queryLimit = Math.Clamp(request.Limit, 1, 100);

        // 1. Get all Draft PDF Reservations
        // Note: Filter range logic is tricky if dates are missing. 
        var draftsRaw = await _context.Reservations
            .Where(r => !r.IsDeleted && r.Status == ReservationStatus.Draft && r.Source == ReservationSource.PDF)
            .ToListAsync(cancellationToken);

        var allDrafts = draftsRaw
            .OrderByDescending(r => r.Created)
            .ToList();

        // 2. Supply & Forecast Occupancy for Hint
        var totalActiveRooms = await _context.Rooms.CountAsync(r => r.IsActive, cancellationToken);
        var queryNights = (int)(toDateTime - fromDateTime).TotalDays;
        var supplyRoomNights = totalActiveRooms * queryNights;

        var forecastStatuses = new[] { ReservationStatus.Confirmed, ReservationStatus.CheckedIn, ReservationStatus.CheckedOut };
        var forecastReservations = await _context.Reservations
            .Include(r => r.Lines)
            .Where(r => !r.IsDeleted && forecastStatuses.Contains(r.Status) && r.CheckInDate < toDateTime && r.CheckOutDate > fromDateTime)
            .ToListAsync(cancellationToken);

        // Calculate sold nights per day in range
        var dailySold = new Dictionary<DateTime, int>();
        for (int i = 0; i < queryNights; i++)
        {
            var day = fromDateTime.AddDays(i);
            var sold = forecastReservations
                .Where(r => r.CheckInDate <= day && r.CheckOutDate > day)
                .SelectMany(r => r.Lines)
                .Count();
            dailySold[day] = sold;
        }

        var totalForecastSoldRoomNights = dailySold.Values.Sum();
        var totalAvailableRoomNights = supplyRoomNights - totalForecastSoldRoomNights;

        // 3. Process Drafts
        var items = new List<PendingRequestItemDto>();
        foreach (var r in allDrafts)
        {
            var parsingStatus = GetParsingStatus(r.Notes);
            var requestedRoomsStr = GetMarkerValue(r.Notes, "EXTRACTED] RoomsCount=");
            int requestedRooms = int.TryParse(requestedRoomsStr, out var n) ? n : 1;

            // All Draft PDFs should appear in pending requests regardless of dates
            // The date range is only used for availability hint calculation
            int nights = 0;
            int itemPendingRoomNights = 0;

            // Calculate overlap if dates are available (for availability hint purposes)
            bool hasValidDates = r.CheckInDate != default && r.CheckOutDate != default;
            bool overlapsWithQueryRange = hasValidDates && r.CheckInDate < toDateTime && r.CheckOutDate > fromDateTime;
            
            if (overlapsWithQueryRange)
            {
                // Partial nights within range
                var overlapStart = r.CheckInDate < fromDateTime ? fromDateTime : r.CheckInDate;
                var overlapEnd = r.CheckOutDate > toDateTime ? toDateTime : r.CheckOutDate;
                nights = (int)(overlapEnd - overlapStart).TotalDays;
                if (nights < 0) nights = 0;
                itemPendingRoomNights = nights * requestedRooms;
            }
            else if (hasValidDates)
            {
                // Has dates but outside query range - still calculate nights for display
                nights = (int)(r.CheckOutDate - r.CheckInDate).TotalDays;
            }

            // Never skip Draft PDFs - they should all appear in pending requests

            AvailabilityHintDto? hint = null;
            if (request.IncludeHint && r.CheckInDate != default && r.CheckOutDate != default)
            {
                // Item specific hint based on query range availability
                // Note: Simplified logic as requested, using the total range availability as base
                var remaining = totalAvailableRoomNights - itemPendingRoomNights;
                string bucket;
                if (remaining >= 2) bucket = "Safe";
                else if (remaining >= 0) bucket = "Tight";
                else bucket = "Overbook";

                hint = new AvailabilityHintDto
                {
                    Bucket = bucket,
                    AvailableRoomNights = totalAvailableRoomNights,
                    ForecastSoldRoomNights = totalForecastSoldRoomNights,
                    SupplyRoomNights = supplyRoomNights,
                    PendingRoomNights = itemPendingRoomNights,
                    Note = bucket == "Overbook" ? "Capacity exceeded in range" : 
                           bucket == "Tight" ? "Capacity tight in range" : null
                };
            }

            items.Add(new PendingRequestItemDto
            {
                ReservationId = r.Id,
                BookingNumber = r.BookingNumber ?? "",
                GuestName = r.GuestName,
                Phone = r.Phone,
                CheckIn = r.CheckInDate == default ? null : r.CheckInDate.ToString("yyyy-MM-dd"),
                CheckOut = r.CheckOutDate == default ? null : r.CheckOutDate.ToString("yyyy-MM-dd"),
                Nights = r.CheckInDate == default ? null : (int)(r.CheckOutDate - r.CheckInDate).TotalDays,
                RequestedRooms = requestedRooms,
                CreatedAtUtc = r.Created.DateTime,
                ParsingStatus = parsingStatus,
                ErrorCode = GetErrorCode(r.Notes),
                ErrorMessage = GetErrorMessage(r.Notes),
                TotalAmount = r.TotalAmount > 0 ? r.TotalAmount : null,
                Currency = !string.IsNullOrWhiteSpace(r.Currency) ? r.Currency : null,
                CurrencyCode = r.CurrencyCode,
                HotelName = r.HotelName,
                AvailabilityHint = hint
            });
        }

        // 4. Ordering
        // Pending (1), Failed (2), Parsed (3)
        var orderedItems = items
            .OrderBy(i => i.ParsingStatus switch
            {
                "Pending" => 1,
                "Failed" => 2,
                "Parsed" => 3,
                _ => 4
            })
            .ThenByDescending(i => i.CreatedAtUtc)
            .Take(queryLimit)
            .ToList();

        // 5. Totals
        var totals = new PendingTotalsDto
        {
            Count = orderedItems.Count,
            TotalPendingRoomNights = orderedItems.Sum(i => i.AvailabilityHint?.PendingRoomNights ?? 0),
            SafeCount = orderedItems.Count(i => i.AvailabilityHint?.Bucket == "Safe"),
            TightCount = orderedItems.Count(i => i.AvailabilityHint?.Bucket == "Tight"),
            OverbookCount = orderedItems.Count(i => i.AvailabilityHint?.Bucket == "Overbook")
        };

        return new PendingRequestsDto
        {
            From = request.From,
            To = request.To,
            Totals = totals,
            Items = orderedItems
        };
    }

    private string GetParsingStatus(string? notes)
    {
        if (string.IsNullOrEmpty(notes)) return "Pending";
        var match = Regex.Match(notes, @"\[PARSING_STATUS\]\s*(\w+)");
        return match.Success ? match.Groups[1].Value : "Pending";
    }

    private string GetMarkerValue(string? notes, string markerStart)
    {
        if (string.IsNullOrEmpty(notes)) return "";
        var match = Regex.Match(notes, Regex.Escape(markerStart) + @"(\d+)");
        return match.Success ? match.Groups[1].Value : "";
    }

    private string? GetErrorCode(string? notes)
    {
        if (string.IsNullOrEmpty(notes)) return null;
        var match = Regex.Match(notes, @"\| Code=(\w+)");
        if (!match.Success) return null;
        
        // Normalize legacy codes to canonical codes
        var rawCode = match.Groups[1].Value;
        return PdfParseErrorCodeNormalizer.Normalize(rawCode);
    }

    private string? GetErrorMessage(string? notes)
    {
        if (string.IsNullOrEmpty(notes)) return null;
        
        // Try to extract error message from diagnostics first
        var errMatch = Regex.Match(notes, @"\| Err=(.+?)(?:\||$)");
        if (errMatch.Success)
            return errMatch.Groups[1].Value.Trim();
        
        // Use centralized message mapping for error code
        var codeMatch = Regex.Match(notes, @"\| Code=(\w+)");
        if (codeMatch.Success)
        {
            // Normalize legacy codes and get user-friendly message
            var rawCode = codeMatch.Groups[1].Value;
            var normalizedCode = PdfParseErrorCodeNormalizer.Normalize(rawCode);
            return PdfParseErrorMessages.ToUserMessage(normalizedCode);
        }
        
        return null;
    }
}
