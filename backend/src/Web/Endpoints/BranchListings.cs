using CleanArchitecture.Application.BranchListings.Queries.GetBranchListings;
using CleanArchitecture.Application.BranchListings.Commands.CreateBranchListing;
using CleanArchitecture.Application.BranchListings.Commands.UpdateBranchListing;
using CleanArchitecture.Domain.Constants;

namespace CleanArchitecture.Web.Endpoints;

public class BranchListings : EndpointGroupBase
{
    public override string? GroupName => "admin/listings";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization(policy => policy.RequireRole(Roles.Administrator, Roles.Owner, Roles.Receptionist));

        group.MapGet("", GetListings);
        group.MapPost(CreateListing);
        group.MapPatch("{id}", UpdateListing);
    }

    public async Task<List<BranchListingDto>> GetListings(ISender sender, [AsParameters] GetBranchListingsQuery query)
    {
        return await sender.Send(query);
    }

    public async Task<Guid> CreateListing(ISender sender, CreateBranchListingCommand command)
    {
        return await sender.Send(command);
    }

    public async Task<IResult> UpdateListing(ISender sender, Guid id, UpdateBranchListingCommand command)
    {
        if (id != command.Id) return Results.BadRequest();
        await sender.Send(command);
        return Results.NoContent();
    }
}
