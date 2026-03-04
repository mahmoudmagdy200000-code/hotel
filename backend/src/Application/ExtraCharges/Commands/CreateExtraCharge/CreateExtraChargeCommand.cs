using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CleanArchitecture.Application.ExtraCharges.Commands.CreateExtraCharge;

public record CreateExtraChargeCommand : IRequest<int>
{
    public int ReservationId { get; init; }
    public string Description { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public DateTime Date { get; init; }
    public CurrencyCode CurrencyCode { get; init; }
    public PaymentStatus PaymentStatus { get; init; }
}

public class CreateExtraChargeCommandValidator : AbstractValidator<CreateExtraChargeCommand>
{
    public CreateExtraChargeCommandValidator()
    {
        RuleFor(v => v.ReservationId).NotEmpty();
        RuleFor(v => v.Description).NotEmpty().MaximumLength(200);
        RuleFor(v => v.Amount).GreaterThan(0);
        RuleFor(v => v.Date).NotEmpty();
        RuleFor(v => v.CurrencyCode).IsInEnum();
        RuleFor(v => v.PaymentStatus).IsInEnum();
    }
}

public class CreateExtraChargeCommandHandler(IApplicationDbContext context) : IRequestHandler<CreateExtraChargeCommand, int>
{
    public async Task<int> Handle(CreateExtraChargeCommand request, CancellationToken cancellationToken)
    {
        var entity = new ExtraCharge
        {
            ReservationId = request.ReservationId,
            Description = request.Description,
            Amount = request.Amount,
            Date = request.Date,
            CurrencyCode = request.CurrencyCode,
            PaymentStatus = request.PaymentStatus
        };

        context.ExtraCharges.Add(entity);

        await context.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}
