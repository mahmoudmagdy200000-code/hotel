using CleanArchitecture.Application.ExtraCharges.Commands.CreateExtraCharge;
using CleanArchitecture.Application.ExtraCharges.Commands.DeleteExtraCharge;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class ExtraCharges : EndpointGroupBase
{
    public override string? GroupName => "extra-charges";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapPost("", CreateExtraCharge);
        group.MapDelete("{id}", DeleteExtraCharge);
    }

    public async Task<Created<int>> CreateExtraCharge(ISender sender, CreateExtraChargeCommand command)
    {
        var result = await sender.Send(command);
        return TypedResults.Created($"/api/extra-charges/{result}", result);
    }

    public async Task<Results<NoContent, NotFound>> DeleteExtraCharge(ISender sender, int id)
    {
        await sender.Send(new DeleteExtraChargeCommand(id));
        return TypedResults.NoContent();
    }
}
