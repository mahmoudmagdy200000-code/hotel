using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Common.Models;

namespace CleanArchitecture.Application.Users.Commands.UpdateUser;

public record UpdateUserCommand : IRequest<Result>
{
    public string UserId { get; init; } = string.Empty;
    public Guid? BranchId { get; init; }
    public List<string> Roles { get; init; } = new();
}

public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, Result>
{
    private readonly IIdentityService _identityService;

    public UpdateUserCommandHandler(IIdentityService identityService)
    {
        _identityService = identityService;
    }

    public async Task<Result> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
    {
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
        return await _identityService.SetBranchAsync(request.UserId, request.BranchId);
    }
}
