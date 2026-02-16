using CleanArchitecture.Application.Reservations.Commands.DeleteReservation;
using CleanArchitecture.Application.Reservations.Commands.PdfUpload;
using CleanArchitecture.Application.Reservations.Queries.GetPdfFileStream;
using CleanArchitecture.Domain.Constants;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace CleanArchitecture.Web.Endpoints;

public class PdfReservations : EndpointGroupBase
{
    public override string? GroupName => "pdf-reservations";

    public override void Map(RouteGroupBuilder group)
    {
        group.RequireAuthorization();
        
        // Single file operations
        group.MapPost("upload", UploadPdf)
            .DisableAntiforgery();
        group.MapPost("{id}/parse", ParsePdf);
        group.MapGet("{id}/download", DownloadPdf);
        group.MapDelete("{id}", DeletePendingPdf);
        
        // Batch operations
        group.MapPost("upload-batch", UploadPdfBatch)
            .DisableAntiforgery();
        group.MapPost("parse-batch", ParsePdfBatch);
    }

    // ============== Single Operations ==============

    public async Task<Results<Ok<PdfParsingResultDto>, BadRequest, NotFound>> ParsePdf(ISender sender, int id)
    {
        var result = await sender.Send(new ParsePdfReservationCommand { ReservationId = id });
        return TypedResults.Ok(result);
    }

    public async Task<Ok<PendingReservationCreatedDto>> UploadPdf(ISender sender, IFormFile file, [FromForm] Guid listingId)
    {
        using var stream = file.OpenReadStream();
        var result = await sender.Send(new CreatePendingReservationFromPdfCommand 
        { 
            Stream = stream, 
            FileName = file.FileName,
            ContentType = file.ContentType,
            Length = file.Length,
            ListingId = listingId
        });
        return TypedResults.Ok(result);
    }

    public async Task<Results<FileStreamHttpResult, NotFound, BadRequest>> DownloadPdf(ISender sender, int id)
    {
        var result = await sender.Send(new GetPdfFileStreamQuery { ReservationId = id });
        return TypedResults.File(result.Stream, result.ContentType, result.FileName);
    }

    /// <summary>
    /// Delete a pending PDF reservation. Only Draft status reservations can be deleted.
    /// Returns 409 Conflict if the reservation has already been confirmed.
    /// </summary>
    public async Task<Results<NoContent, NotFound, Conflict<string>>> DeletePendingPdf(ISender sender, int id, string? reason)
    {
        await sender.Send(new DeleteReservationCommand(id, reason));
        return TypedResults.NoContent();
    }

    // ============== Batch Operations ==============

    public async Task<Ok<PdfBatchUploadResultDto>> UploadPdfBatch(ISender sender, IFormFileCollection files, [FromForm] Guid listingId)
    {
        var fileInputs = new List<PdfFileInput>();
        var streams = new List<MemoryStream>();

        try
        {
            foreach (var file in files)
            {
                // Copy to MemoryStream to ensure stream stays open
                var memStream = new MemoryStream();
                await file.CopyToAsync(memStream);
                memStream.Position = 0;
                streams.Add(memStream);

                fileInputs.Add(new PdfFileInput
                {
                    Stream = memStream,
                    FileName = file.FileName,
                    ContentType = file.ContentType,
                    Length = file.Length
                });
            }

            var result = await sender.Send(new CreatePendingReservationsFromPdfBatchCommand 
            { 
                Files = fileInputs,
                ListingId = listingId
            });
            return TypedResults.Ok(result);
        }
        finally
        {
            // Dispose all memory streams
            foreach (var stream in streams)
            {
                await stream.DisposeAsync();
            }
        }
    }

    public async Task<Ok<PdfBatchParseResultDto>> ParsePdfBatch(ISender sender, PdfBatchParseRequestDto request)
    {
        var result = await sender.Send(new ParsePdfReservationsBatchCommand 
        { 
            ReservationIds = request.ReservationIds 
        });
        return TypedResults.Ok(result);
    }
}

/// <summary>
/// Request DTO for batch parse endpoint
/// </summary>
public class PdfBatchParseRequestDto
{
    public List<int> ReservationIds { get; set; } = new();
}
