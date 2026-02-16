using CleanArchitecture.Application.Rooms.Commands.CreateRoom;
using CleanArchitecture.Application.Rooms.Commands.DeleteRoom;
using CleanArchitecture.Application.Rooms.Commands.UpdateRoom;
using CleanArchitecture.Application.Rooms.Queries.GetRoomById;
using CleanArchitecture.Application.Rooms.Queries.GetRooms;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class Rooms : EndpointGroupBase
{
    public override string? GroupName => "rooms";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapGet("", GetRooms);
        group.MapGet("{id}", GetRoomById);
        group.MapPost(CreateRoom);
        group.MapPut("{id}", UpdateRoom);
        group.MapDelete("{id}", DeleteRoom);
    }

    public async Task<Ok<List<RoomDto>>> GetRooms(ISender sender, [AsParameters] GetRoomsQuery query)
    {
        return TypedResults.Ok(await sender.Send(query));
    }

    public async Task<Results<Ok<RoomDto>, NotFound>> GetRoomById(ISender sender, int id)
    {
        var item = await sender.Send(new GetRoomByIdQuery(id));
        return TypedResults.Ok(item);
    }

    public async Task<Created<int>> CreateRoom(ISender sender, CreateRoomCommand command)
    {
        var id = await sender.Send(command);
        return TypedResults.Created($"/api/rooms/{id}", id);
    }

    public async Task<Results<NoContent, BadRequest, NotFound>> UpdateRoom(ISender sender, int id, UpdateRoomCommand command)
    {
        if (id != command.Id) return TypedResults.BadRequest();

        await sender.Send(command);

        return TypedResults.NoContent();
    }

    public async Task<Results<NoContent, NotFound, BadRequest>> DeleteRoom(ISender sender, int id)
    {
        await sender.Send(new DeleteRoomCommand(id));

        return TypedResults.NoContent();
    }
}
