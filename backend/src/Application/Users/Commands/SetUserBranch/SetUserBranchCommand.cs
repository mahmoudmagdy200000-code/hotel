using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Common.Models;

namespace CleanArchitecture.Application.Users.Commands.SetUserBranch;

public record SetUserBranchCommand : IRequest<Result>
{
    public string UserId { get; init; } = string.Empty;
    public Guid BranchId { get; init; }
}

public class SetUserBranchCommandValidator : AbstractValidator<SetUserBranchCommand>
{
    public SetUserBranchCommandValidator()
    {
        RuleFor(v => v.UserId).NotEmpty();
        RuleFor(v => v.BranchId).NotEmpty();
    }
}

public class SetUserBranchCommandHandler : IRequestHandler<SetUserBranchCommand, Result>
{
    private readonly IIdentityService _identityService;
    private readonly IApplicationDbContext _context;

    public SetUserBranchCommandHandler(IIdentityService identityService, IApplicationDbContext context)
    {
        _identityService = identityService;
        _context = context;
    }

    public async Task<Result> Handle(SetUserBranchCommand request, CancellationToken cancellationToken)
    {
        var branchExists = await _context.Branches.AnyAsync(b => b.Id == request.BranchId, cancellationToken);
        if (!branchExists)
        {
            return Result.Failure(new[] { "Branch not found." });
        }

        return await _identityService.SetBranchAsync(request.UserId, request.BranchId);
    }
}
