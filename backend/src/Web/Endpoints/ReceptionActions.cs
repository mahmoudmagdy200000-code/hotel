using CleanArchitecture.Application.Reservations.Commands.ReceptionActions;
using CleanArchitecture.Application.Reservations.Queries.GetConfirmationPlan;
using CleanArchitecture.Application.Reservations.Commands.ConfirmReservations;
using CleanArchitecture.Domain.Enums;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class ReceptionActions : EndpointGroupBase
{
    public override string? GroupName => "reception";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();
        group.WithTags("Reception Quick Actions");

        group.MapPost("reservations/{id}/check-in", CheckInReservation);
        group.MapPost("reservations/{id}/check-out", CheckOutReservation);
        group.MapPost("reservations/{id}/cancel", CancelReservation);
        group.MapPost("reservations/{id}/no-show", MarkNoShow);
        group.MapPost("reservations/{id}/confirm", ConfirmReservation);

        // Confirm All with Review Flow
        group.MapPost("pending-requests/confirm-all/plan", GetConfirmationPlan);
        group.MapPost("pending-requests/confirm-all/apply", ApplyConfirmationPlan);
    }

    public async Task<Ok<ReservationStatusChangedDto>> ConfirmReservation(ISender sender, int id)
    {
        var result = await sender.Send(new ConfirmDraftReservationCommand { ReservationId = id });
        return TypedResults.Ok(result);
    }

    public async Task<Ok<ReservationStatusChangedDto>> CheckInReservation(ISender sender, int id, CheckInRequest request)
    {
        var result = await sender.Send(new CheckInReservationCommand 
        { 
            ReservationId = id, 
            BusinessDate = request.BusinessDate,
            ForceCheckIn = request.ForceCheckIn,
            GuestName = request.GuestName,
            Phone = request.Phone,
            BookingNumber = request.BookingNumber,
            CheckInDate = request.CheckInDate,
            CheckOutDate = request.CheckOutDate,
            TotalAmount = request.TotalAmount,
            BalanceDue = request.BalanceDue,
            PaymentMethod = request.PaymentMethod,
            CurrencyCode = request.CurrencyCode
        });
        return TypedResults.Ok(result);
    }

    public async Task<Ok<ReservationStatusChangedDto>> CheckOutReservation(ISender sender, int id, CheckOutRequest request)
    {
        var result = await sender.Send(new CheckOutReservationCommand 
        { 
            ReservationId = id, 
            BusinessDate = request.BusinessDate,
            BalanceDue = request.BalanceDue,
            PaymentMethod = request.PaymentMethod
        });
        return TypedResults.Ok(result);
    }

    public async Task<Ok<ReservationStatusChangedDto>> CancelReservation(ISender sender, int id, CancelRequest request)
    {
        var result = await sender.Send(new CancelReservationCommand 
        { 
            ReservationId = id, 
            Reason = request.Reason 
        });
        return TypedResults.Ok(result);
    }

    public async Task<Ok<ReservationStatusChangedDto>> MarkNoShow(ISender sender, int id, NoShowRequest request)
    {
        var result = await sender.Send(new MarkNoShowCommand 
        { 
            ReservationId = id, 
            Reason = request.Reason,
            BusinessDate = request.BusinessDate
        });
        return TypedResults.Ok(result);
    }

    public async Task<Ok<ReservationAllocationPlanDto>> GetConfirmationPlan(ISender sender, GetConfirmationPlanRequest request)
    {
        var query = new GetConfirmationPlanQuery { ReservationIds = request.ReservationIds };
        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }

    public async Task<Ok<ConfirmAllocationResultDto>> ApplyConfirmationPlan(ISender sender, ConfirmAllocationRequest request)
    {
        var command = new ConfirmAllocationCommand { Request = request };
        var result = await sender.Send(command);
        return TypedResults.Ok(result);
    }
}

public class GetConfirmationPlanRequest
{
    public List<int>? ReservationIds { get; set; }
}

public record CheckInRequest(DateOnly BusinessDate, bool ForceCheckIn = false, string? GuestName = null, string? Phone = null, string? BookingNumber = null, DateTime? CheckInDate = null, DateTime? CheckOutDate = null, decimal? TotalAmount = null, decimal? BalanceDue = null, PaymentMethod? PaymentMethod = null, CurrencyCode? CurrencyCode = null);
public record CheckOutRequest(DateOnly BusinessDate, decimal? BalanceDue = null, PaymentMethod? PaymentMethod = null);
public record CancelRequest(string? Reason);
public record NoShowRequest(string? Reason, DateOnly BusinessDate);
