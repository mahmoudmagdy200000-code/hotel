using System.Text.RegularExpressions;
using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reservations.Queries.GetPdfFileStream;

public record GetPdfFileStreamQuery : IRequest<PdfFileStreamDto>
{
    public int ReservationId { get; init; }
}

public class PdfFileStreamDto
{
    public Stream Stream { get; init; } = Stream.Null;
    public string FileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = "application/pdf";
}

public class GetPdfFileStreamQueryHandler : IRequestHandler<GetPdfFileStreamQuery, PdfFileStreamDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorage _fileStorage;
    private readonly Microsoft.Extensions.Hosting.IHostEnvironment _environment;

    public GetPdfFileStreamQueryHandler(IApplicationDbContext context, IFileStorage fileStorage, Microsoft.Extensions.Hosting.IHostEnvironment environment)
    {
        _context = context;
        _fileStorage = fileStorage;
        _environment = environment;
    }

    public async Task<PdfFileStreamDto> Handle(GetPdfFileStreamQuery request, CancellationToken cancellationToken)
    {
        var reservation = await _context.Reservations
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId, cancellationToken);

        if (reservation == null) throw new NotFoundException(nameof(Reservation), request.ReservationId);

        var match = Regex.Match(reservation.Notes ?? string.Empty, @"Internal Path:\s*([^|\r\n]+)");
        if (!match.Success) throw new ConflictException("PDF file path not found.");

        var filePath = match.Groups[1].Value.Trim();
        var fileNameMatch = Regex.Match(reservation.Notes ?? string.Empty, @"File:\s*([^\s|]+)");
        var fileName = fileNameMatch.Success ? fileNameMatch.Groups[1].Value : "reservation.pdf";

        if (!File.Exists(filePath)) 
        {
            // Try relative resolution
            var relativePath = filePath;
            var resolvedPath = Path.Combine(_environment.ContentRootPath, relativePath);

            if (File.Exists(resolvedPath))
            {
                filePath = resolvedPath;
            }
            else
            {
                // Fallback to filename in current uploads
                var fileNameOnly = Path.GetFileName(filePath);
                var fallbackPath = Path.Combine(_environment.ContentRootPath, "App_Data", "Uploads", fileNameOnly);

                if (File.Exists(fallbackPath))
                {
                    filePath = fallbackPath;
                }
                else
                {
                     throw new NotFoundException($"PDF File not found. Tried: {filePath}, {resolvedPath}, {fallbackPath}");
                }
            }
        }

        var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);

        return new PdfFileStreamDto
        {
            Stream = stream,
            FileName = fileName,
            ContentType = "application/pdf"
        };
    }
}
