using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Common.Models;

namespace CleanArchitecture.Application.Users.Commands.CreateUser;

public record CreateUserCommand : IRequest<Result>
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public Guid? BranchId { get; init; }
    public string Role { get; init; } = string.Empty;
}

public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, Result>
{
    private readonly IIdentityService _identityService;

    public CreateUserCommandHandler(IIdentityService identityService)
    {
        _identityService = identityService;
    }

    public async Task<Result> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        var (result, userId) = await _identityService.CreateUserAsync(request.Email, request.Password);

        if (!result.Succeeded)
        {
            return result;
        }

        if (!string.IsNullOrEmpty(request.Role))
        {
            var roleResult = await _identityService.UpdateUserRolesAsync(userId, new[] { request.Role });
            if (!roleResult.Succeeded) return roleResult;
        }

        if (request.BranchId.HasValue)
        {
            var branchResult = await _identityService.SetBranchAsync(userId, request.BranchId);
            if (!branchResult.Succeeded) return branchResult;
        }

        return result;
    }
}
