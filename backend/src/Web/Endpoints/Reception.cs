using CleanArchitecture.Application.Reception.Queries.GetPendingRequests;
using CleanArchitecture.Application.Reception.Queries.GetReceptionToday;
using CleanArchitecture.Application.Reception.Queries.GetReceptionRoomsStatus;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class Reception : EndpointGroupBase
{
    public override string? GroupName => "reception";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();
        
        // Maps to /api/reception/today
        group.MapGet("today", GetReceptionToday);

        group.MapGet("pending-requests", GetPendingRequests);

        group.MapGet("rooms-status", GetReceptionRoomsStatus);
    }

    public async Task<Results<Ok<PendingRequestsDto>, BadRequest>> GetPendingRequests(
        ISender sender, 
        DateOnly from, 
        DateOnly to, 
        bool includeHint = true, 
        int limit = 50)
    {
        if (to <= from) return TypedResults.BadRequest();
        if ((to.ToDateTime(TimeOnly.MinValue) - from.ToDateTime(TimeOnly.MinValue)).TotalDays > 90) 
            return TypedResults.BadRequest();

        var result = await sender.Send(new GetPendingRequestsQuery 
        { 
            From = from, 
            To = to, 
            IncludeHint = includeHint, 
            Limit = limit 
        });

        return TypedResults.Ok(result);
    }

    public async Task<Ok<ReceptionTodayDto>> GetReceptionToday(ISender sender, DateOnly date)
    {
        var result = await sender.Send(new GetReceptionTodayQuery(date));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<ReceptionRoomsStatusDto>> GetReceptionRoomsStatus(ISender sender, DateOnly date)
    {
        var result = await sender.Send(new GetReceptionRoomsStatusQuery(date));
        return TypedResults.Ok(result);
    }
}
