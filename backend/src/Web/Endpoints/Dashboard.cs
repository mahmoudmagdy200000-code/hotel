using CleanArchitecture.Application.Dashboard.Queries.GetDashboard;
using CleanArchitecture.Application.Dashboard.Queries.GetDailyCashFlow;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class Dashboard : EndpointGroupBase
{
    public override string? GroupName => "dashboard";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapGet("", GetDashboard);
        group.MapGet("cash-flow", GetDailyCashFlow);
    }

    public async Task<Ok<DashboardDto>> GetDashboard(ISender sender, [AsParameters] GetDashboardQuery query)
    {
        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }

    public async Task<Ok<DailyCashFlowDto>> GetDailyCashFlow(ISender sender, [AsParameters] GetDailyCashFlowQuery query)
    {
        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }
}
