using CleanArchitecture.Application.Reservations.Commands.CancelReservation;
using CleanArchitecture.Application.Reservations.Commands.CheckInReservation;
using CleanArchitecture.Application.Reservations.Commands.CheckOutReservation;
using CleanArchitecture.Application.Reservations.Commands.ConfirmReservation;
using CleanArchitecture.Application.Reservations.Commands.CreateReservation;
using CleanArchitecture.Application.Reservations.Commands.DeleteReservation;
using CleanArchitecture.Application.Reservations.Commands.NoShowReservation;
using CleanArchitecture.Application.Reservations.Commands.UpdateReservation;
using CleanArchitecture.Application.Reservations.Queries.GetReservationById;
using CleanArchitecture.Application.Reservations.Queries.GetReservations;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class Reservations : EndpointGroupBase
{
    public override string? GroupName => "reservations";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapGet("", GetReservations);
        group.MapGet("{id}", GetReservationById);
        group.MapPost(CreateReservation);
        group.MapPut("{id}", UpdateReservation);
        group.MapPost("{id}/confirm", ConfirmReservation);
        group.MapPost("{id}/checkin", CheckInReservation);
        group.MapPost("{id}/checkout", CheckOutReservation);
        group.MapPost("{id}/noshow", NoShowReservation);
        group.MapPost("{id}/cancel", CancelReservation);
        group.MapDelete("{id}", DeleteReservation);
    }

    public async Task<Ok<List<ReservationDto>>> GetReservations(ISender sender, [AsParameters] GetReservationsQuery query)
    {
        return TypedResults.Ok(await sender.Send(query));
    }

    public async Task<Results<Ok<ReservationDto>, NotFound>> GetReservationById(ISender sender, int id)
    {
        var item = await sender.Send(new GetReservationByIdQuery(id));
        return TypedResults.Ok(item);
    }

    public async Task<Created<ReservationDto>> CreateReservation(ISender sender, CreateReservationCommand command)
    {
        var result = await sender.Send(command);
        return TypedResults.Created($"/api/reservations/{result.Id}", result);
    }

    public async Task<Results<NoContent, BadRequest, NotFound>> UpdateReservation(ISender sender, int id, UpdateReservationCommand command)
    {
        if (id != command.Id) return TypedResults.BadRequest();

        await sender.Send(command);

        return TypedResults.NoContent();
    }

    public async Task<Results<NoContent, NotFound>> ConfirmReservation(ISender sender, int id)
    {
        await sender.Send(new ConfirmReservationCommand(id));
        return TypedResults.NoContent();
    }

    public async Task<Results<NoContent, NotFound>> CheckInReservation(ISender sender, int id)
    {
        await sender.Send(new CheckInReservationCommand(id));
        return TypedResults.NoContent();
    }

    public async Task<Results<NoContent, NotFound>> CheckOutReservation(ISender sender, int id)
    {
        await sender.Send(new CheckOutReservationCommand(id));
        return TypedResults.NoContent();
    }

    public async Task<Results<NoContent, NotFound>> NoShowReservation(ISender sender, int id)
    {
        await sender.Send(new NoShowReservationCommand(id));
        return TypedResults.NoContent();
    }

    public async Task<Results<NoContent, NotFound>> CancelReservation(ISender sender, int id, CancelReservationRequest request)
    {
        await sender.Send(new CancelReservationCommand(id, request.Reason));
        return TypedResults.NoContent();
    }

    public record CancelReservationRequest(string? Reason);

    public async Task<Results<NoContent, NotFound>> DeleteReservation(ISender sender, int id, string? reason)
    {
        await sender.Send(new DeleteReservationCommand(id, reason));
        return TypedResults.NoContent();
    }
}
