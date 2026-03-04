using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;
using MediatR;

namespace CleanArchitecture.Application.ExtraCharges.Commands.DeleteExtraCharge;

public record DeleteExtraChargeCommand(int Id) : IRequest;

public class DeleteExtraChargeCommandHandler(IApplicationDbContext context) : IRequestHandler<DeleteExtraChargeCommand>
{
    public async Task Handle(DeleteExtraChargeCommand request, CancellationToken cancellationToken)
    {
        var entity = await context.ExtraCharges
            .FindAsync(new object[] { request.Id }, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(ExtraCharge), request.Id.ToString());
        }

        context.ExtraCharges.Remove(entity);

        await context.SaveChangesAsync(cancellationToken);
    }
}
