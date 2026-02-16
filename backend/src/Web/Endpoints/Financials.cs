using CleanArchitecture.Application.Financials.Queries.GetReservationFinancialBreakdown;
using CleanArchitecture.Application.Financials.Queries.GetRevenueSummary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class Financials : EndpointGroupBase
{
    public override string? GroupName => "financials";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapGet("reservations/{id}/breakdown", GetReservationBreakdown);
        group.MapGet("revenue", GetRevenueSummary);
    }

    public async Task<Results<Ok<ReservationFinancialBreakdownDto>, NotFound>> GetReservationBreakdown(ISender sender, int id)
    {
        var result = await sender.Send(new GetReservationFinancialBreakdownQuery(id));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<RevenueSummaryDto>> GetRevenueSummary(ISender sender, [AsParameters] GetRevenueSummaryQuery query)
    {
        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }
}
