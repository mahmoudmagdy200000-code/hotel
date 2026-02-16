using System.Text.RegularExpressions;
using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reservations.Queries.GetReservationPdf;

public record GetReservationPdfQuery(int ReservationId) : IRequest<FileResponseDto>;

public record FileResponseDto(Stream Stream, string ContentType, string FileName);

public class GetReservationPdfQueryHandler : IRequestHandler<GetReservationPdfQuery, FileResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly Microsoft.Extensions.Hosting.IHostEnvironment _environment;

    public GetReservationPdfQueryHandler(IApplicationDbContext context, Microsoft.Extensions.Hosting.IHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    public async Task<FileResponseDto> Handle(GetReservationPdfQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Reservations
            .AsNoTracking();
        var reservation = await query.FirstOrDefaultAsync(x => x.Id == request.ReservationId, cancellationToken);

        if (reservation == null)
        {
            throw new NotFoundException(nameof(Reservation), request.ReservationId);
        }

        if (string.IsNullOrEmpty(reservation.Notes) || !reservation.Notes.Contains("[PDF_UPLOAD]"))
        {
            throw new NotFoundException("PDF attachment marker not found in reservation notes.");
        }

        // Marker format: [PDF_UPLOAD] File: {request.FileName} | Internal Path: {filePath}
        // Use regex for robust path extraction (stop at newline or pipe)
        var pathMatch = Regex.Match(reservation.Notes, @"Internal Path:\s*([^|\r\n]+)");
        if (!pathMatch.Success)
        {
            throw new NotFoundException("PDF path marker not found in reservation notes.");
        }

        var filePath = pathMatch.Groups[1].Value.Trim();

        // Portability Fix: Handle both absolute and relative paths
        if (!File.Exists(filePath))
        {
            // If it's a relative path starting with App_Data, resolve it relative to ContentRoot
            var relativePath = filePath;
            var resolvedPath = Path.Combine(_environment.ContentRootPath, relativePath);

            if (File.Exists(resolvedPath))
            {
                filePath = resolvedPath;
            }
            else
            {
                // Last ditch effort: try filename only in current uploads dir
                var fileNameOnly = Path.GetFileName(filePath);
                var fallbackPath = Path.Combine(_environment.ContentRootPath, "App_Data", "Uploads", fileNameOnly);

                if (File.Exists(fallbackPath))
                {
                    filePath = fallbackPath;
                }
                else
                {
                    throw new NotFoundException($"PDF file not found. Tried: {filePath}, {resolvedPath}, {fallbackPath}");
                }
            }
        }

        // Security: Path traversal check
        // Check if the file is within an App_Data/Uploads directory (case-insensitive for safety)
        var expectedPathPart = Path.Combine("App_Data", "Uploads").ToLower();
        
        if (!filePath.ToLower().Contains(expectedPathPart))
        {
             throw new InvalidOperationException("Security violation: Invalid file path.");
        }

        var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        
        return new FileResponseDto(
            stream, 
            "application/pdf", 
            $"reservation-{reservation.Id}.pdf"
        );
    }
}
