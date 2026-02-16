using CleanArchitecture.Application.Reservations.Queries.SearchReservations;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class ReceptionSearch : EndpointGroupBase
{
    public override string? GroupName => "reception/reservations";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();
        group.WithTags("Reception Search");

        group.MapGet("search", SearchReservations);
    }

    public async Task<Results<Ok<ReceptionSearchResultDto>, BadRequest>> SearchReservations(
        ISender sender, 
        string query, 
        DateOnly? date = null, 
        int limit = 20)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
        {
            return TypedResults.BadRequest();
        }

        var result = await sender.Send(new SearchReservationsQuery 
        { 
            Query = query, 
            Date = date, 
            Limit = limit 
        });

        return TypedResults.Ok(result);
    }
}
