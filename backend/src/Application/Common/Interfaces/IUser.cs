namespace CleanArchitecture.Application.Common.Interfaces;

public interface IUser
{
    string? Id { get; }
    string? Email { get; }
    List<string>? Roles { get; }
    Guid? BranchId { get; }
}
