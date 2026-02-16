using CleanArchitecture.Application.Reservations.Queries.GetReservationPdf;
using CleanArchitecture.Domain.Constants;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CleanArchitecture.Web.Endpoints;

public class Attachments : EndpointGroupBase
{
    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();
        
        group.MapMethods("reservations/{id}/pdf", new[] { "GET", "HEAD" }, GetReservationPdf);
    }

    public async Task<FileStreamHttpResult> GetReservationPdf(ISender sender, int id)
    {
        var result = await sender.Send(new GetReservationPdfQuery(id));
        
        return TypedResults.File(
            result.Stream, 
            result.ContentType, 
            result.FileName,
            enableRangeProcessing: true);
    }
}
