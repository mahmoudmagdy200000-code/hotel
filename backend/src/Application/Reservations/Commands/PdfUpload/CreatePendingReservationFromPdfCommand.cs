using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CleanArchitecture.Application.Reservations.Commands.PdfUpload;

public record CreatePendingReservationFromPdfCommand : IRequest<PendingReservationCreatedDto>
{
    public Stream Stream { get; init; } = null!;
    public string FileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public long Length { get; init; }
    public Guid ListingId { get; init; }
}

public class CreatePendingReservationFromPdfCommandValidator : AbstractValidator<CreatePendingReservationFromPdfCommand>
{
    public CreatePendingReservationFromPdfCommandValidator()
    {
        RuleFor(v => v.ListingId)
            .NotEmpty();
    }
}

public class PendingReservationCreatedDto
{
    public int ReservationId { get; init; }
    public string BookingNumber { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public DateTime CreatedAtUtc { get; init; }
    public string ParsingStatus { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
}

public class CreatePendingReservationFromPdfCommandHandler : IRequestHandler<CreatePendingReservationFromPdfCommand, PendingReservationCreatedDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorage _fileStorage;
    private readonly IUser _user;

    public CreatePendingReservationFromPdfCommandHandler(IApplicationDbContext context, IFileStorage fileStorage, IUser user)
    {
        _context = context;
        _fileStorage = fileStorage;
        _user = user;
    }

    public async Task<PendingReservationCreatedDto> Handle(CreatePendingReservationFromPdfCommand request, CancellationToken cancellationToken)
    {
        var branchId = _user.BranchId ?? throw new ForbiddenAccessException();

        // 0. Resolve Listing
        var listing = await _context.BranchListings
            .FirstOrDefaultAsync(x => x.Id == request.ListingId && x.BranchId == branchId && x.IsActive, cancellationToken);

        if (listing == null)
        {
            throw new NotFoundException(nameof(BranchListing), request.ListingId);
        }

        // 1. Validation
        if (request.Stream == null || request.Length == 0)
        {
            throw new InvalidOperationException("File is empty.");
        }

        if (Path.GetExtension(request.FileName).ToLower() != ".pdf")
        {
            throw new InvalidOperationException("Only PDF files are allowed.");
        }

        // Max size 10MB
        if (request.Length > 10 * 1024 * 1024)
        {
            throw new InvalidOperationException("File size exceeds 10MB limit.");
        }

        // 2. Save File
        var filePath = await _fileStorage.SaveFileAsync(request.Stream, request.FileName, request.ContentType, cancellationToken);

        // 3. Create Reservation with Pending status
        // Generate booking number (deterministic format)
        var bookingNumber = $"PDF-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";

        var reservation = new Reservation
        {
            BranchId = listing.BranchId,
            Source = ReservationSource.PDF,
            BookingNumber = bookingNumber,
            GuestName = "PDF Guest",
            Status = ReservationStatus.Draft,
            CheckInDate = DateTime.UtcNow.Date.AddDays(1), // Placeholder dates until parsing
            CheckOutDate = DateTime.UtcNow.Date.AddDays(2),
            Currency = "USD", // Default to USD until parsing extracts actual currency
            HotelName = listing.Name,
            Notes = $"[PDF_UPLOAD] File: {request.FileName} | Internal Path: {filePath}"
        };

        _context.Reservations.Add(reservation);
        await _context.SaveChangesAsync(cancellationToken);

        // NO AUTO-PARSE: Parsing is triggered explicitly via POST /api/pdf-reservations/{id}/parse
        // ParsingStatus remains "Pending" until explicit parse is called

        return new PendingReservationCreatedDto
        {
            ReservationId = reservation.Id,
            BookingNumber = reservation.BookingNumber,
            Status = reservation.Status.ToString(),
            CreatedAtUtc = DateTime.UtcNow,
            ParsingStatus = "Pending",
            Message = "PDF uploaded successfully. Call parse endpoint to extract reservation details."
        };
    }
}
