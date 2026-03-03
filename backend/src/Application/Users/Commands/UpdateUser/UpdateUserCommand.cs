using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Common.Models;
using CleanArchitecture.Domain.Constants;

namespace CleanArchitecture.Application.Users.Commands.UpdateUser;

public record UpdateUserCommand : IRequest<Result>
{
    public string UserId { get; init; } = string.Empty;
    public Guid? BranchId { get; init; }
    public List<string> Roles { get; init; } = new();
    public string? NewPassword { get; init; }
}

public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, Result>
{
    private readonly IIdentityService _identityService;
    private readonly IUser _currentUser;

    public UpdateUserCommandHandler(IIdentityService identityService, IUser currentUser)
    {
        _identityService = identityService;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
    {
        // Anti-self-lock guard: prevent an Administrator from removing their own Administrator role
        bool isSelfEdit = _currentUser.Id == request.UserId;
        bool isCurrentUserAdmin = _currentUser.Roles != null && _currentUser.Roles.Contains(Roles.Administrator);
        bool newRolesExcludeAdmin = request.Roles.Any() && !request.Roles.Contains(Roles.Administrator);

        if (isSelfEdit && isCurrentUserAdmin && newRolesExcludeAdmin)
        {
            return Result.Failure(new[] { "An Administrator cannot remove their own Administrator role." });
        }

        // Update Roles
        if (request.Roles.Any())
        {
            var roleResult = await _identityService.UpdateUserRolesAsync(request.UserId, request.Roles);
            if (!roleResult.Succeeded)
            {
                return roleResult;
            }
        }

        // Update Branch (always set, could be null)
        var branchResult = await _identityService.SetBranchAsync(request.UserId, request.BranchId);
        if (!branchResult.Succeeded)
        {
            return branchResult;
        }

        // Reset password if requested
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            var passwordResult = await _identityService.UpdatePasswordAsync(request.UserId, request.NewPassword);
            if (!passwordResult.Succeeded)
            {
                return passwordResult;
            }
        }

        return Result.Success();
    }
}

