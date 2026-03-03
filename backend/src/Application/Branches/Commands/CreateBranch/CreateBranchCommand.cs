using FluentValidation;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;

namespace CleanArchitecture.Application.Branches.Commands.CreateBranch;

public record CreateBranchCommand : IRequest<Guid>
{
    public string Name { get; init; } = string.Empty;
}

public class CreateBranchCommandValidator : AbstractValidator<CreateBranchCommand>
{
    public CreateBranchCommandValidator()
    {
        RuleFor(v => v.Name)
            .NotEmpty()
            .MaximumLength(120);
    }
}

public class CreateBranchCommandHandler : IRequestHandler<CreateBranchCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateBranchCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateBranchCommand request, CancellationToken cancellationToken)
    {
        var entity = new Branch
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim()
        };

        _context.Branches.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}
