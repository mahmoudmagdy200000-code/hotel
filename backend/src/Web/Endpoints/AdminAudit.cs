using CleanArchitecture.Application.Admin.Commands.WipeOrphanedPayments;
using CleanArchitecture.Application.Admin.Queries;
using CleanArchitecture.Application.Admin.Queries.GetReservationAuditDetails;
using CleanArchitecture.Application.Admin.Queries.GetReservationDeletes;
using CleanArchitecture.Domain.Constants;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class AdminAudit : EndpointGroupBase
{
    public override string? GroupName => "admin/audit";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization(policy => policy.RequireRole(Roles.Administrator));

        group.MapGet("reservations/deletes", GetReservationDeletes);
        group.MapGet("reservations/{id}", GetReservationAuditDetails);
        group.MapPost("payments/wipe-orphaned", WipeOrphanedPayments);
    }

    public async Task<Ok<List<ReservationDeleteAuditListItemDto>>> GetReservationDeletes(ISender sender, [AsParameters] GetReservationDeletesQuery query)
    {
        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }

    public async Task<Ok<List<ReservationDeleteAuditListItemDto>>> GetReservationAuditDetails(ISender sender, int id)
    {
        var result = await sender.Send(new GetReservationAuditDetailsQuery(id));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<WipeOrphanedPaymentsResult>> WipeOrphanedPayments(ISender sender)
    {
        var result = await sender.Send(new WipeOrphanedPaymentsCommand());
        return TypedResults.Ok(result);
    }
}
