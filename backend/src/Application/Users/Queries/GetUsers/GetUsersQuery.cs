using CleanArchitecture.Application.Common.Interfaces;

namespace CleanArchitecture.Application.Users.Queries.GetUsers;

public record GetUsersQuery : IRequest<List<UserDto>>;

public record UserDto(string Id, string Email, Guid? BranchId, List<string> Roles);

public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, List<UserDto>>
{
    private readonly IIdentityService _identityService;

    public GetUsersQueryHandler(IIdentityService identityService)
    {
        _identityService = identityService;
    }

    public async Task<List<UserDto>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        var users = await _identityService.GetUsersAsync();
        return users.Select(u => new UserDto(u.Id, u.Email ?? "", u.BranchId, u.Roles)).ToList();
    }
}
