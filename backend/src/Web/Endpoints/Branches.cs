using CleanArchitecture.Application.Branches.Commands.CreateBranch;
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

        groupBuilder.MapPost("", async (ISender sender, CreateBranchCommand command) =>
        {
            var id = await sender.Send(command);
            return Results.Ok(id);
        })
        .RequireAuthorization(policy => policy.RequireRole(Roles.Administrator, Roles.Owner));
    }
}
