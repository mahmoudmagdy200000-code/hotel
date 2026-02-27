using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Financials.Queries.GetRevenueSummary;
using CleanArchitecture.Application.Occupancy.Queries.GetOccupancy;
using CleanArchitecture.Domain.Enums;
using MediatR;

namespace CleanArchitecture.Application.Dashboard.Queries.GetDashboard;

public record GetDashboardQuery : IRequest<DashboardDto>
{
    public DateTime? From { get; init; }
    public DateTime? To { get; init; } // Exclusive end
    public string? Mode { get; init; } = "Forecast"; // Actual | Forecast
    public bool? IncludeRoomTypeBreakdown { get; init; } = true;
    public CurrencyCode? Currency { get; init; }

    // POLICY: "Actual" includes CheckedOut (all nights) and CheckedIn (past nights).
    // POLICY: "Forecast" includes Confirmed (all nights) and CheckedIn (future nights).
}

public class GetDashboardQueryHandler : IRequestHandler<GetDashboardQuery, DashboardDto>
{
    private readonly ISender _sender;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IApplicationDbContext _context;

    public GetDashboardQueryHandler(ISender sender, IDateTimeProvider dateTimeProvider, IApplicationDbContext context)
    {
        _sender = sender;
        _dateTimeProvider = dateTimeProvider;
        _context = context;
    }

    public async Task<DashboardDto> Handle(GetDashboardQuery request, CancellationToken cancellationToken)
    {
        // 1. Validate & Defaults
        var today = _dateTimeProvider.GetHotelToday();
        var from = request.From ?? today;
        var to = request.To ?? today.AddDays(7);
        if (to <= from) to = from.AddDays(1);
        
        var mode = request.Mode ?? "Forecast";
        var nightsCount = (int)(to - from).TotalDays;
        var includeRoomType = request.IncludeRoomTypeBreakdown ?? true;

        // 2. Get Occupancy (Group by both to support series and room type Kpi)
        var occupancyQuery = new GetOccupancyQuery
        {
            From = from,
            To = to,
            Mode = mode,
            GroupBy = includeRoomType ? "both" : "day"
        };
        var occupancy = await _sender.Send(occupancyQuery, cancellationToken);

        // 3. Get Revenue
        // We need daily revenue for the series.
        var revenueByDayQuery = new GetRevenueSummaryQuery
        {
            From = from,
            To = to.AddDays(-1), 
            Mode = mode,
            groupBy = "day",
            Currency = request.Currency
        };
        var revenueByDay = await _sender.Send(revenueByDayQuery, cancellationToken);
        
        // 3.5 Get Expenses
        var fromDate = DateOnly.FromDateTime(from.Date);
        var toDate = DateOnly.FromDateTime(to.Date);
        var currency = request.Currency ?? CurrencyCode.EGP;

        var expensesList = await _context.Expenses
            .Where(e => e.BusinessDate >= fromDate && e.BusinessDate < toDate && e.CurrencyCode == currency)
            .ToListAsync(cancellationToken);
            
        var expensesByDayDict = expensesList
            .GroupBy(e => e.BusinessDate.ToString("yyyy-MM-dd"))
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

        RevenueSummaryDto? revenueByRoomType = null;
        if (includeRoomType)
        {
            var revenueByRtQuery = revenueByDayQuery with { groupBy = "roomType" };
            revenueByRoomType = await _sender.Send(revenueByRtQuery, cancellationToken);
        }

        // 4. Build Series (By Day)
        var byDaySeries = new List<DashboardSeriesPointDto>();
        
        // Convert revenue items to dictionary for O(1) lookup
        var revenueDayDict = revenueByDay.Items.ToDictionary(k => k.Key, v => v.Revenue); // Key is "yyyy-MM-dd"

        // Occupancy "ByDay" should align with the nights.
        foreach (var occDay in occupancy.ByDay)
        {
            var rev = revenueDayDict.GetValueOrDefault(occDay.Date, 0m); // Default 0
            var exp = expensesByDayDict.GetValueOrDefault(occDay.Date, 0m);
            var net = rev - exp;
            
            // ADR = Revenue / OccupiedRooms
            decimal adr = occDay.OccupiedRooms > 0 ? rev / occDay.OccupiedRooms : 0;
            
            // RevPAR = Revenue / TotalRooms
            decimal revPar = occDay.TotalRooms > 0 ? rev / occDay.TotalRooms : 0;

            byDaySeries.Add(new DashboardSeriesPointDto
            {
                Date = occDay.Date,
                TotalRooms = occDay.TotalRooms,
                OccupiedRooms = occDay.OccupiedRooms,
                OccupancyRate = occDay.OccupancyRate,
                Revenue = rev,
                Expenses = exp,
                NetProfit = net,
                Adr = Math.Round(adr, 2),
                RevPar = Math.Round(revPar, 2)
            });
        }

        // 5. Build Summary
        var totalRev = revenueByDay.TotalRevenue; // Sum of daily revenue matches total
        var totalExp = expensesList.Sum(e => e.Amount);
        var netProfit = totalRev - totalExp;
        
        decimal avgAdr = occupancy.SoldRoomNights > 0 ? totalRev / occupancy.SoldRoomNights : 0;
        decimal avgRevPar = occupancy.SupplyRoomNights > 0 ? totalRev / occupancy.SupplyRoomNights : 0;

        var summary = new DashboardKpiSummaryDto
        {
            From = from,
            To = to,
            NightsCount = nightsCount,
            Mode = mode,
            TotalRooms = occupancy.TotalRooms, // Snapshot of current supply used by Occupancy service
            SupplyRoomNights = occupancy.SupplyRoomNights,
            SoldRoomNights = occupancy.SoldRoomNights,
            OccupancyRateOverall = occupancy.OccupancyRateOverall,
            TotalRevenue = totalRev,
            TotalExpenses = totalExp,
            NetProfit = netProfit,
            Adr = Math.Round(avgAdr, 2),
            RevPar = Math.Round(avgRevPar, 2)
        };

        // 6. Build Room Type Breakdown (Optional)
        List<DashboardRoomTypeKpiDto>? byRoomType = null;
        if (includeRoomType && revenueByRoomType != null)
        {
            byRoomType = new List<DashboardRoomTypeKpiDto>();
            
            // Group occupancy data by room type (Total across all days)
            // OccupancyByRoomTypeByDay contains daily entries. We need to sum them up per RoomType.
            var occGrouped = occupancy.ByRoomTypeByDay
                .GroupBy(x => new { x.RoomTypeId, x.RoomTypeName })
                .Select(g => new 
                {
                    g.Key.RoomTypeId,
                    g.Key.RoomTypeName,
                    Sold = g.Sum(x => x.RoomNightsSoldOfType)
                })
                .ToDictionary(k => k.RoomTypeId);

            var revDict = revenueByRoomType.Items.ToDictionary(k => k.Key, v => v.Revenue); // Key is RoomTypeName?
            // Wait, RevenueQuery with 'roomType' groups by Name? 
            // Let's check GetRevenueSummaryQuery.
            // "var key = line.RoomType?.Name ?? "Unknown";" -> Yes, it keys by Name.
            // Occupancy groups by ID AND Name.
            // This is a mismatch risk if Names change or are not unique. Ideally Revenue should use ID too or consistent Key.
            // But RevenueQuery returns <string, decimal>. 
            // Occupancy returns ID and Name.
            
            // For now, I will match by Name since that's what Revenue Query provides logic for.
            // Or I should fix RevenueQuery? 
            // Constraint: "Reuse existing... avoid duplicating".
            // RevenueQuery currently keys by Name. 
            // OccupancyByRoomTypeByDay DTO has RoomTypeId and RoomTypeName.
            
            // I'll iterate through the Occupancy groups (which we trust more for structure) and try to find Revenue by Name.
            
            foreach (var occ in occGrouped.Values)
            {
                var name = occ.RoomTypeName ?? "Unknown";
                var revenue = revDict.TryGetValue(name, out var r) ? r : 0m;
                
                decimal typeAdr = occ.Sold > 0 ? revenue / occ.Sold : 0;

                byRoomType.Add(new DashboardRoomTypeKpiDto
                {
                    RoomTypeId = occ.RoomTypeId,
                    RoomTypeName = name,
                    SoldRoomNights = occ.Sold,
                    Revenue = revenue,
                    Adr = Math.Round(typeAdr, 2),
                    OccupancyRate = null // Supply per type not strictly tracked/varied easily here
                });
            }
            
            // If there are revenue items for RoomTypes not in Occupancy (e.g. checked out but room deleted? or name mismatch), they might be missed.
            // But Occupancy should catch all sold lines.
        }

        // 7. Build Expense Category Breakdown
        var byCategory = expensesList
            .GroupBy(e => (int)e.Category)
            .Select(g => new DashboardExpenseCategoryKpiDto
            {
                CategoryId = g.Key,
                Amount = g.Sum(e => e.Amount)
            })
            .ToList();

        return new DashboardDto
        {
            Summary = summary,
            ByDay = byDaySeries,
            ByRoomType = byRoomType,
            ByCategory = byCategory
        };
    }
    
}
