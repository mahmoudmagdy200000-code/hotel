using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.ExtraCharges.Commands.MarkAsPaid;

public record MarkExtraChargeAsPaidCommand(int ReservationId, int Id) : IRequest;

public class MarkExtraChargeAsPaidCommandHandler(IApplicationDbContext context) : IRequestHandler<MarkExtraChargeAsPaidCommand>
{
    public async Task Handle(MarkExtraChargeAsPaidCommand request, CancellationToken cancellationToken)
    {
        var entity = await context.ExtraCharges
            .FirstOrDefaultAsync(e => e.Id == request.Id && e.ReservationId == request.ReservationId, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(ExtraCharge), request.Id.ToString());
        }

        entity.PaymentStatus = PaymentStatus.Paid;

        await context.SaveChangesAsync(cancellationToken);
    }
}
