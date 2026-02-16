using CleanArchitecture.Infrastructure.Identity;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Users.Commands.SetUserBranch;
using CleanArchitecture.Domain.Constants;
using MediatR;

namespace CleanArchitecture.Web.Endpoints;

public class Users : EndpointGroupBase
{
    public override string? GroupName => "users";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapIdentityApi<ApplicationUser>();
        
        groupBuilder.MapGet("me", async (IUser user) =>
        {
            if (user.Id == null) return Results.Unauthorized();
            
            return Results.Ok(new 
            {
                user.Id,
                user.Email,
                Roles = user.Roles ?? new List<string>(),
                user.BranchId
            });
        })
        .RequireAuthorization();

        groupBuilder.MapGet("", async (ISender sender) =>
        {
            return await sender.Send(new CleanArchitecture.Application.Users.Queries.GetUsers.GetUsersQuery());
        })
        .RequireAuthorization(policy => policy.RequireRole(Roles.Administrator, Roles.Owner));

        groupBuilder.MapPost("", async (ISender sender, CleanArchitecture.Application.Users.Commands.CreateUser.CreateUserCommand command) =>
        {
            var result = await sender.Send(command);
            return result.Succeeded ? Results.Ok() : Results.BadRequest(result.Errors);
        })
        .RequireAuthorization(policy => policy.RequireRole(Roles.Administrator, Roles.Owner));

        groupBuilder.MapPut("{userId}", async (ISender sender, string userId, CleanArchitecture.Application.Users.Commands.UpdateUser.UpdateUserCommand command) =>
        {
            if (userId != command.UserId) return Results.BadRequest();
            var result = await sender.Send(command);
            return result.Succeeded ? Results.NoContent() : Results.BadRequest(result.Errors);
        })
        .RequireAuthorization(policy => policy.RequireRole(Roles.Administrator, Roles.Owner));
    }
}
