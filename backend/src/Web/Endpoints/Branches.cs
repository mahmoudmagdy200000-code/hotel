using CleanArchitecture.Application.Branches.Queries.GetBranches;
using CleanArchitecture.Domain.Constants;

namespace CleanArchitecture.Web.Endpoints;

public class Branches : EndpointGroupBase
{
    public override string? GroupName => "branches";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet("", async (ISender sender) =>
        {
            return await sender.Send(new GetBranchesQuery());
        })
        .RequireAuthorization(policy => policy.RequireRole(Roles.Administrator, Roles.Owner));
    }
}
