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

    // POLICY: "Actuals" include CheckedOut (all nights) and CheckedIn (past nights).
    // POLICY: "Forecast" includes Confirmed (all nights) and CheckedIn (future nights).
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
        
        var statuses = new[] { ReservationStatus.Confirmed, ReservationStatus.CheckedIn, ReservationStatus.CheckedOut };

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

            // --- PRORATION: Distribute TotalAmount evenly across all nights ---
            // This ensures Rev Yield always sums to the exact contract/override price,
            // regardless of what RatePerNight was stored on the ReservationLines.
            var totalNights = Math.Max(1, (int)(checkout - checkin).TotalDays);
            decimal baseNightly = Math.Floor(res.TotalAmount / totalNights * 100m) / 100m;
            decimal remainder = Math.Round(res.TotalAmount - baseNightly * totalNights, 2);

            // Total line rate used as weights for per-line groupings (roomType / room)
            decimal totalLineRate = res.Lines.Sum(l => l.RatePerNight);

            // Loop through each night of the reservation
            for (var d = checkin; d < checkout; d = d.AddDays(1))
            {
                // Core Policy: Determine if this night belongs to Actual or Forecast
                // Actual: Night has passed (d < today) AND status is CheckedIn or CheckedOut
                // Forecast: Night is today or future (d >= today) AND status is Confirmed or CheckedIn

                bool isActual = (res.Status == ReservationStatus.CheckedOut) ||
                                (d < today.Date && res.Status == ReservationStatus.CheckedIn);

                bool isForecast = (res.Status == ReservationStatus.Confirmed) ||
                                  (d >= today.Date && res.Status == ReservationStatus.CheckedIn);

                bool shouldInclude = mode == "actual" ? isActual : isForecast;

                if (shouldInclude && d >= from.Date && d <= to.Date)
                {
                    // Night index (0-based). The final night absorbs the decimal remainder
                    // so that sum across all nights == TotalAmount exactly.
                    int nightIndex = (int)(d - checkin).TotalDays;
                    bool isLastNight = nightIndex == totalNights - 1;
                    decimal proratedNightly = baseNightly + (isLastNight ? remainder : 0m);

                    var groupKey = requestedGroupBy?.Trim().ToLower() ?? "day";

                    switch (groupKey)
                    {
                        case "branch":
                        {
                            var key = res.Branch?.Name ?? "Unknown Branch";
                            itemsMap[key] = Math.Round(itemsMap.GetValueOrDefault(key) + proratedNightly, 2);
                            break;
                        }

                        case "roomtype":
                            // Distribute prorated nightly yield by each line's proportional rate
                            foreach (var line in res.Lines)
                            {
                                var subKey = line.RoomType?.Name ?? "Unknown Type";
                                decimal lineShare = totalLineRate > 0
                                    ? Math.Round(proratedNightly * (line.RatePerNight / totalLineRate), 2)
                                    : Math.Round(proratedNightly / Math.Max(1, res.Lines.Count), 2);
                                itemsMap[subKey] = Math.Round(itemsMap.GetValueOrDefault(subKey) + lineShare, 2);
                            }
                            continue;

                        case "room":
                            // Distribute prorated nightly yield by each line's proportional rate
                            foreach (var line in res.Lines)
                            {
                                var subKey = line.Room?.RoomNumber ?? "Unassigned";
                                decimal lineShare = totalLineRate > 0
                                    ? Math.Round(proratedNightly * (line.RatePerNight / totalLineRate), 2)
                                    : Math.Round(proratedNightly / Math.Max(1, res.Lines.Count), 2);
                                itemsMap[subKey] = Math.Round(itemsMap.GetValueOrDefault(subKey) + lineShare, 2);
                            }
                            continue;

                        case "hotel":
                        {
                            var key = !string.IsNullOrWhiteSpace(res.HotelName) ? res.HotelName : "Unknown Hotel";
                            itemsMap[key] = Math.Round(itemsMap.GetValueOrDefault(key) + proratedNightly, 2);
                            break;
                        }

                        case "day":
                        default:
                        {
                            var key = d.ToString("yyyy-MM-dd");
                            itemsMap[key] = Math.Round(itemsMap.GetValueOrDefault(key) + proratedNightly, 2);
                            break;
                        }
                    }
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
