using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reservations.Commands.ReceptionActions;

// ── Command ──────────────────────────────────────────────────────────────────
public record ProcessRefundCommand : IRequest<RefundResultDto>
{
    public int ReservationId { get; init; }
    public decimal RefundAmount { get; init; }
    public PaymentMethod PaymentMethod { get; init; } = PaymentMethod.Cash;
    public CurrencyCode? CurrencyCode { get; init; }
    public string? Reason { get; init; }
    public DateOnly BusinessDate { get; init; }
}

// ── Response DTO ─────────────────────────────────────────────────────────────
public record RefundResultDto
{
    public int ReservationId { get; init; }
    public decimal RefundAmount { get; init; }
    public decimal NewTotalAmount { get; init; }
    public decimal NewBalanceDue { get; init; }
    public string PaymentType { get; init; } = "Refund";
}

// ── Validator ────────────────────────────────────────────────────────────────
public class ProcessRefundCommandValidator : AbstractValidator<ProcessRefundCommand>
{
    public ProcessRefundCommandValidator()
    {
        RuleFor(v => v.ReservationId)
            .GreaterThan(0)
            .WithMessage("Reservation ID is required.");

        RuleFor(v => v.RefundAmount)
            .GreaterThan(0)
            .WithMessage("Refund amount must be greater than zero.");

        RuleFor(v => v.PaymentMethod)
            .IsInEnum();
    }
}

// ── Handler ──────────────────────────────────────────────────────────────────
public class ProcessRefundCommandHandler : IRequestHandler<ProcessRefundCommand, RefundResultDto>
{
    private readonly IApplicationDbContext _context;

    public ProcessRefundCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RefundResultDto> Handle(ProcessRefundCommand request, CancellationToken cancellationToken)
    {
        // ── 1. Load Reservation ──────────────────────────────────────────
        var reservation = await _context.Reservations
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId, cancellationToken);

        if (reservation == null)
            throw new NotFoundException(nameof(Reservation), request.ReservationId);

        // ── 2. Fail Fast: Status Guard ───────────────────────────────────
        if (reservation.Status != ReservationStatus.CheckedIn &&
            reservation.Status != ReservationStatus.CheckedOut)
        {
            throw new ConflictException(
                $"Cannot process refund for reservation with status '{reservation.Status}'. " +
                "Only CheckedIn or CheckedOut reservations are eligible for refunds.");
        }

        // ── 3. Fail Fast: Refund Cap ─────────────────────────────────────
        // Sum of all previous refunds for this reservation
        var existingRefunds = await _context.Payments
            .Where(p => p.ReservationId == request.ReservationId &&
                        p.PaymentType == PaymentType.Refund)
            .SumAsync(p => p.Amount, cancellationToken);

        var maxRefundable = reservation.TotalAmount - existingRefunds;

        if (request.RefundAmount > maxRefundable)
        {
            throw new ConflictException(
                $"Refund amount ({request.RefundAmount:F2}) exceeds the maximum refundable amount ({maxRefundable:F2}). " +
                $"Total: {reservation.TotalAmount:F2}, Already refunded: {existingRefunds:F2}.");
        }

        // ── 4. Record Refund as Payment with PaymentType.Refund ──────────
        var currency = request.CurrencyCode ?? reservation.CurrencyCode;

        _context.Payments.Add(new Domain.Entities.Payment
        {
            ReservationId = reservation.Id,
            Amount = request.RefundAmount,
            CurrencyCode = currency,
            PaymentMethod = request.PaymentMethod,
            PaymentType = PaymentType.Refund,
            BranchId = reservation.BranchId,
            Notes = !string.IsNullOrWhiteSpace(request.Reason)
                ? $"Refund: {request.Reason}"
                : $"Refund for reservation {reservation.Id}"
        });

        // ── 5. Reduce TotalAmount (Revenue Deduction) ────────────────────
        reservation.TotalAmount -= request.RefundAmount;

        // ── 6. Persist (Single Unit of Work — ACID) ──────────────────────
        await _context.SaveChangesAsync(cancellationToken);

        return new RefundResultDto
        {
            ReservationId = reservation.Id,
            RefundAmount = request.RefundAmount,
            NewTotalAmount = reservation.TotalAmount,
            NewBalanceDue = reservation.BalanceDue
        };
    }
}
