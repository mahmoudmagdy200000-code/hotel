using CleanArchitecture.Application.Occupancy.Queries.GetOccupancy;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class Occupancy : EndpointGroupBase
{
    public override string? GroupName => "occupancy";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapGet("", GetOccupancy);
    }

    public async Task<Ok<OccupancySummaryDto>> GetOccupancy(ISender sender, [AsParameters] GetOccupancyQuery query)
    {
        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }
}
