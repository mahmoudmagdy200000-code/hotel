using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using MediatR;

namespace CleanArchitecture.Application.Financials.Queries.GetRevenueSummary;

public record GetRevenueSummaryQuery : IRequest<RevenueSummaryDto>
{
    public DateTime? From { get; init; }
    public DateTime? To { get; init; }
    public string? Mode { get; init; } = "forecast"; // actual | forecast
    public string? groupBy { get; init; } = "day"; // day | roomType | room
    public CurrencyCode? Currency { get; init; }

    // POLICY: "Actual" includes CheckedOut only by accounting policy (Realized).
    // POLICY: "Forecast" includes Confirmed, CheckedIn, and CheckedOut (Operational).
}

public class GetRevenueSummaryQueryHandler : IRequestHandler<GetRevenueSummaryQuery, RevenueSummaryDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _dateTimeProvider;

    public GetRevenueSummaryQueryHandler(IApplicationDbContext context, IDateTimeProvider dateTimeProvider)
    {
        _context = context;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<RevenueSummaryDto> Handle(GetRevenueSummaryQuery request, CancellationToken cancellationToken)
    {
        var mode = (request.Mode ?? "forecast").ToLower();
        var requestedGroupBy = (request.groupBy ?? "day").ToLower();
        
        // Default to today if not provided
        var today = _dateTimeProvider.GetHotelToday();
        var from = request.From ?? today;
        var to = request.To ?? today;
        
        var statusFilterComment = mode == "actual" 
            ? "Actual includes CheckedOut only by accounting policy." 
            : "Forecast includes Confirmed, CheckedIn, and CheckedOut.";
            
        var statuses = mode == "actual" 
            ? new[] { ReservationStatus.CheckedOut } 
            : new[] { ReservationStatus.Confirmed, ReservationStatus.CheckedIn, ReservationStatus.CheckedOut };

        var currency = request.Currency ?? CurrencyCode.EGP;

        // Optimization: Filter reservations that overlap with the range
        var reservations = await _context.Reservations
            .AsNoTracking()
            .Include(x => x.Branch)
            .Include(x => x.Lines)
                .ThenInclude(l => l.RoomType)
            .Include(x => x.Lines)
                .ThenInclude(l => l.Room)
            .Where(x => statuses.Contains(x.Status) &&
                        x.CurrencyCode == currency &&
                        x.CheckInDate < to.AddDays(1) && 
                        x.CheckOutDate > from)
            .ToListAsync(cancellationToken);

        var itemsMap = new Dictionary<string, decimal>();

        foreach (var res in reservations)
        {
            var checkout = res.CheckOutDate.Date;
            var checkin = res.CheckInDate.Date;
            
            // Loop through each night of the reservation
            for (var d = checkin; d < checkout; d = d.AddDays(1))
            {
                if (d >= from.Date && d <= to.Date)
                {
                    string key = "";
                    decimal amount = 0;

                    // Clean up groupBy key to ensure matching
                    var groupKey = requestedGroupBy?.Trim().ToLower() ?? "day";

                    switch (groupKey)
                    {
                        case "branch":
                            key = res.Branch?.Name ?? "Unknown Branch";
                            amount = res.Lines.Sum(l => l.RatePerNight);
                            break;
                            
                        case "roomtype":
                            // RoomType requires iterating lines, handle separately or simplify
                            // Current logic iterates lines for roomtype/room, so we must keep that structure
                            // or refactor. Let's keep the inner loops for room/roomtype correctness.
                            foreach (var line in res.Lines)
                            {
                                var subKey = line.RoomType?.Name ?? "Unknown Type";
                                itemsMap[subKey] = Math.Round(itemsMap.GetValueOrDefault(subKey) + line.RatePerNight, 2);
                            }
                            continue; // Skip the rest of the loop for this night

                        case "room":
                             foreach (var line in res.Lines)
                            {
                                var subKey = line.Room?.RoomNumber ?? "Unassigned";
                                itemsMap[subKey] = Math.Round(itemsMap.GetValueOrDefault(subKey) + line.RatePerNight, 2);
                            }
                            continue;

                        case "hotel":
                            key = !string.IsNullOrWhiteSpace(res.HotelName) ? res.HotelName : "Unknown Hotel";
                            amount = res.Lines.Sum(l => l.RatePerNight);
                            break;

                        case "day":
                        default:
                            key = d.ToString("yyyy-MM-dd");
                            amount = res.Lines.Sum(l => l.RatePerNight);
                            break;
                    }

                    // Apply the amount for single-key cases (day, branch, hotel)
                    var currentVal = itemsMap.GetValueOrDefault(key) + amount;
                    itemsMap[key] = Math.Round(currentVal, 2);
                }
            }
        }

        var items = itemsMap
            .Select(x => new RevenueSummaryItemDto { Key = x.Key, Revenue = x.Value })
            .OrderBy(x => x.Key)
            .ToList();

        // Fetch Expenses for the range
        var fromDate = DateOnly.FromDateTime(from.Date);
        var toDate = DateOnly.FromDateTime(to.Date);
        
        var expensesList = await _context.Expenses
            .Where(e => e.BusinessDate >= fromDate && e.BusinessDate <= toDate && e.CurrencyCode == currency)
            .ToListAsync(cancellationToken);

        var byExpenseCategory = expensesList
            .GroupBy(e => (int)e.Category)
            .Select(g => new RevenueSummaryExpenseCategoryDto
            {
                CategoryId = g.Key,
                Amount = g.Sum(e => e.Amount)
            })
            .ToList();

        return new RevenueSummaryDto
        {
            TotalRevenue = Math.Round(items.Sum(x => x.Revenue), 2),
            Items = items,
            ByExpenseCategory = byExpenseCategory
        };
    }
}
