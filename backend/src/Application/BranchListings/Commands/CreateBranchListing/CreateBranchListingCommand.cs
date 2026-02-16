using FluentValidation;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Application.Common.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.BranchListings.Commands.CreateBranchListing;

public record CreateBranchListingCommand : IRequest<Guid>
{
    public string Name { get; init; } = string.Empty;
    public string? Channel { get; init; }
}

public class CreateBranchListingCommandValidator : AbstractValidator<CreateBranchListingCommand>
{
    public CreateBranchListingCommandValidator()
    {
        RuleFor(v => v.Name)
            .NotEmpty()
            .MaximumLength(120);

        RuleFor(v => v.Channel)
            .MaximumLength(20);
    }
}

public class CreateBranchListingCommandHandler : IRequestHandler<CreateBranchListingCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public CreateBranchListingCommandHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task<Guid> Handle(CreateBranchListingCommand request, CancellationToken cancellationToken)
    {
        var branchId = _user.BranchId ?? throw new ForbiddenAccessException();

        // Check uniqueness within branch
        var exists = await _context.BranchListings
            .AnyAsync(x => x.BranchId == branchId && x.Name.ToLower() == request.Name.Trim().ToLower(), cancellationToken);

        if (exists)
        {
            throw new ConflictException($"Listing with name '{request.Name}' already exists in this branch.");
        }

        var entity = new BranchListing
        {
            BranchId = branchId,
            Name = request.Name.Trim(),
            Channel = request.Channel,
            IsActive = true
        };

        _context.BranchListings.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}
