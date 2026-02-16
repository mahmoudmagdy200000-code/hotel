using CleanArchitecture.Application.RoomTypes.Commands.CreateRoomType;
using CleanArchitecture.Application.RoomTypes.Commands.DeleteRoomType;
using CleanArchitecture.Application.RoomTypes.Commands.UpdateRoomType;
using CleanArchitecture.Application.RoomTypes.Queries.GetRoomTypeById;
using CleanArchitecture.Application.RoomTypes.Queries.GetRoomTypes;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class RoomTypes : EndpointGroupBase
{
    public override string? GroupName => "roomtypes";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapGet("", GetRoomTypes);
        group.MapGet("{id}", GetRoomTypeById);
        group.MapPost(CreateRoomType);
        group.MapPut("{id}", UpdateRoomType);
        group.MapDelete("{id}", DeleteRoomType);
    }

    public async Task<Ok<List<RoomTypeDto>>> GetRoomTypes(ISender sender, [AsParameters] GetRoomTypesQuery query)
    {
        return TypedResults.Ok(await sender.Send(query));
    }

    public async Task<Results<Ok<RoomTypeDto>, NotFound>> GetRoomTypeById(ISender sender, int id)
    {
        var item = await sender.Send(new GetRoomTypeByIdQuery(id));
        return TypedResults.Ok(item);
    }

    public async Task<Created<int>> CreateRoomType(ISender sender, CreateRoomTypeCommand command)
    {
        var id = await sender.Send(command);
        return TypedResults.Created($"/api/roomtypes/{id}", id);
    }

    public async Task<Results<NoContent, BadRequest, NotFound>> UpdateRoomType(ISender sender, int id, UpdateRoomTypeCommand command)
    {
        if (id != command.Id) return TypedResults.BadRequest();

        await sender.Send(command);

        return TypedResults.NoContent();
    }

    public async Task<Results<NoContent, NotFound>> DeleteRoomType(ISender sender, int id)
    {
        await sender.Send(new DeleteRoomTypeCommand(id));

        return TypedResults.NoContent();
    }
}
