using FluentValidation;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Application.Common.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.BranchListings.Commands.UpdateBranchListing;

public record UpdateBranchListingCommand : IRequest
{
    public Guid Id { get; init; }
    public string? Name { get; init; }
    public string? Channel { get; init; }
    public bool? IsActive { get; init; }
}

public class UpdateBranchListingCommandValidator : AbstractValidator<UpdateBranchListingCommand>
{
    public UpdateBranchListingCommandValidator()
    {
        RuleFor(v => v.Name)
            .MaximumLength(120)
            .When(v => v.Name != null);

        RuleFor(v => v.Channel)
            .MaximumLength(20)
            .When(v => v.Channel != null);
    }
}

public class UpdateBranchListingCommandHandler : IRequestHandler<UpdateBranchListingCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public UpdateBranchListingCommandHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task Handle(UpdateBranchListingCommand request, CancellationToken cancellationToken)
    {
        var branchId = _user.BranchId ?? throw new ForbiddenAccessException();

        var entity = await _context.BranchListings
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null || entity.BranchId != branchId)
        {
            throw new NotFoundException(nameof(BranchListing), request.Id);
        }

        if (request.Name != null)
        {
            var name = request.Name.Trim();
            if (entity.Name.ToLower() != name.ToLower())
            {
                // Check uniqueness within branch if name changed
                var exists = await _context.BranchListings
                    .AnyAsync(x => x.BranchId == branchId && x.Id != request.Id && x.Name.ToLower() == name.ToLower(), cancellationToken);

                if (exists)
                {
                    throw new ConflictException($"Listing with name '{name}' already exists in this branch.");
                }
                entity.Name = name;
            }
        }

        if (request.Channel != null)
        {
            entity.Channel = request.Channel;
        }

        if (request.IsActive.HasValue)
        {
            entity.IsActive = request.IsActive.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
