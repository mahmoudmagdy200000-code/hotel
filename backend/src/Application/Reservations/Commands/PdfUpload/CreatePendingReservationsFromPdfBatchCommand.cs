using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CleanArchitecture.Application.Reservations.Commands.PdfUpload;

/// <summary>
/// Batch upload multiple PDF files. Each file is processed independently.
/// Does NOT auto-parse - parsing must be triggered explicitly via parse endpoint.
/// </summary>
public record CreatePendingReservationsFromPdfBatchCommand : IRequest<PdfBatchUploadResultDto>
{
    public List<PdfFileInput> Files { get; init; } = new();
    public Guid ListingId { get; init; }
}

public class CreatePendingReservationsFromPdfBatchCommandValidator : AbstractValidator<CreatePendingReservationsFromPdfBatchCommand>
{
    public CreatePendingReservationsFromPdfBatchCommandValidator()
    {
        RuleFor(v => v.ListingId)
            .NotEmpty();
    }
}

public class PdfFileInput
{
    public Stream Stream { get; init; } = null!;
    public string FileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public long Length { get; init; }
}

// ============== DTOs ==============

public class PdfBatchUploadResultDto
{
    public int TotalCount { get; init; }
    public int SuccessCount { get; init; }
    public int FailedCount { get; init; }
    public List<PdfBatchUploadItemResultDto> Items { get; init; } = new();
}

public class PdfBatchUploadItemResultDto
{
    public int Index { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty; // "Created" | "Failed"
    public int? ReservationId { get; init; }
    public string? ParsingStatus { get; init; }
    public string? Message { get; init; }
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }
}

// ============== Handler ==============

public class CreatePendingReservationsFromPdfBatchCommandHandler 
    : IRequestHandler<CreatePendingReservationsFromPdfBatchCommand, PdfBatchUploadResultDto>
{
    private const int MaxBatchSize = 20;
    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10MB

    private readonly IApplicationDbContext _context;
    private readonly IFileStorage _fileStorage;
    private readonly IUser _user;

    public CreatePendingReservationsFromPdfBatchCommandHandler(
        IApplicationDbContext context, 
        IFileStorage fileStorage,
        IUser user)
    {
        _context = context;
        _fileStorage = fileStorage;
        _user = user;
    }

    public async Task<PdfBatchUploadResultDto> Handle(
        CreatePendingReservationsFromPdfBatchCommand request, 
        CancellationToken cancellationToken)
    {
        var branchId = _user.BranchId ?? throw new ForbiddenAccessException();

        // Resolve Listing
        var listing = await _context.BranchListings
            .FirstOrDefaultAsync(x => x.Id == request.ListingId && x.BranchId == branchId && x.IsActive, cancellationToken);

        if (listing == null)
        {
            throw new NotFoundException(nameof(BranchListing), request.ListingId);
        }

        var items = new List<PdfBatchUploadItemResultDto>();
        var successCount = 0;
        var failedCount = 0;

        // Validate batch size
        if (request.Files.Count > MaxBatchSize)
        {
            // Return all as failed with batch size error
            for (int i = 0; i < request.Files.Count; i++)
            {
                items.Add(new PdfBatchUploadItemResultDto
                {
                    Index = i,
                    FileName = request.Files[i].FileName,
                    Status = "Failed",
                    ErrorCode = "BATCH_SIZE_EXCEEDED",
                    ErrorMessage = $"Maximum batch size is {MaxBatchSize} files."
                });
            }
            return new PdfBatchUploadResultDto
            {
                TotalCount = request.Files.Count,
                SuccessCount = 0,
                FailedCount = request.Files.Count,
                Items = items
            };
        }

        // Process each file independently
        for (int i = 0; i < request.Files.Count; i++)
        {
            var file = request.Files[i];
            var result = await ProcessSingleFileAsync(i, file, listing, cancellationToken);
            items.Add(result);

            if (result.Status == "Created")
                successCount++;
            else
                failedCount++;
        }

        return new PdfBatchUploadResultDto
        {
            TotalCount = request.Files.Count,
            SuccessCount = successCount,
            FailedCount = failedCount,
            Items = items
        };
    }

    private async Task<PdfBatchUploadItemResultDto> ProcessSingleFileAsync(
        int index,
        PdfFileInput file,
        BranchListing listing,
        CancellationToken cancellationToken)
    {
        try
        {
            // Validation
            if (file.Stream == null || file.Length == 0)
            {
                return new PdfBatchUploadItemResultDto
                {
                    Index = index,
                    FileName = file.FileName,
                    Status = "Failed",
                    ErrorCode = "EMPTY_FILE",
                    ErrorMessage = "File is empty."
                };
            }

            if (Path.GetExtension(file.FileName).ToLower() != ".pdf")
            {
                return new PdfBatchUploadItemResultDto
                {
                    Index = index,
                    FileName = file.FileName,
                    Status = "Failed",
                    ErrorCode = "INVALID_FILE_TYPE",
                    ErrorMessage = "Only PDF files are allowed."
                };
            }

            if (file.Length > MaxFileSizeBytes)
            {
                return new PdfBatchUploadItemResultDto
                {
                    Index = index,
                    FileName = file.FileName,
                    Status = "Failed",
                    ErrorCode = "FILE_TOO_LARGE",
                    ErrorMessage = "File size exceeds 10MB limit."
                };
            }

            // Save File
            var filePath = await _fileStorage.SaveFileAsync(
                file.Stream, file.FileName, file.ContentType, cancellationToken);

            // Create Reservation with Pending status
            var bookingNumber = $"PDF-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";

            var reservation = new Reservation
            {
                BranchId = listing.BranchId,
                Source = ReservationSource.PDF,
                BookingNumber = bookingNumber,
                GuestName = "PDF Guest",
                Status = ReservationStatus.Draft,
                CheckInDate = DateTime.UtcNow.Date.AddDays(1),
                CheckOutDate = DateTime.UtcNow.Date.AddDays(2),
                Currency = "USD",
                HotelName = listing.Name,
                Notes = $"[PDF_UPLOAD] File: {file.FileName} | Internal Path: {filePath}"
            };

            _context.Reservations.Add(reservation);
            await _context.SaveChangesAsync(cancellationToken);

            return new PdfBatchUploadItemResultDto
            {
                Index = index,
                FileName = file.FileName,
                Status = "Created",
                ReservationId = reservation.Id,
                ParsingStatus = "Pending",
                Message = "PDF uploaded successfully. Call parse endpoint to extract reservation details."
            };
        }
        catch (Exception ex)
        {
            return new PdfBatchUploadItemResultDto
            {
                Index = index,
                FileName = file.FileName,
                Status = "Failed",
                ErrorCode = "UPLOAD_FAILED",
                ErrorMessage = ex.Message
            };
        }
    }
}
