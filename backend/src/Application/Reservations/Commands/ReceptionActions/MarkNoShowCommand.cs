using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reservations.Commands.ReceptionActions;

public record MarkNoShowCommand : IRequest<ReservationStatusChangedDto>
{
    public int ReservationId { get; init; }
    public string? Reason { get; init; }
    public DateOnly BusinessDate { get; init; }
}

public class MarkNoShowCommandHandler : IRequestHandler<MarkNoShowCommand, ReservationStatusChangedDto>
{
    private readonly IApplicationDbContext _context;

    public MarkNoShowCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReservationStatusChangedDto> Handle(MarkNoShowCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.ReservationId);
        }

        // Idempotency
        if (entity.Status == ReservationStatus.NoShow)
        {
            return MapToDto(entity, request.BusinessDate);
        }

        // Validate transitions rules
        if (entity.Status != ReservationStatus.Confirmed && entity.Status != ReservationStatus.Draft)
        {
            throw new ConflictException($"Cannot mark reservation as NoShow with status {entity.Status}. Only Confirmed or Draft reservations can be marked as NoShow.");
        }

        if (!string.IsNullOrWhiteSpace(request.Reason))
        {
            entity.Notes = string.IsNullOrWhiteSpace(entity.Notes) 
                ? $"NoShow Reason: {request.Reason}" 
                : $"{entity.Notes} | NoShow Reason: {request.Reason}";
        }

        var oldStatus = entity.Status;
        entity.MarkNoShow(DateTime.UtcNow);

        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, request.BusinessDate, oldStatus);
    }

    private ReservationStatusChangedDto MapToDto(CleanArchitecture.Domain.Entities.Reservation entity, DateOnly businessDate, ReservationStatus? oldStatus = null)
    {
        return new ReservationStatusChangedDto
        {
            ReservationId = entity.Id,
            OldStatus = (oldStatus ?? entity.Status).ToString(),
            NewStatus = entity.Status.ToString(),
            ChangedAtUtc = entity.NoShowAt ?? DateTime.UtcNow,
            BusinessDate = businessDate.ToString("yyyy-MM-dd")
        };
    }
}
