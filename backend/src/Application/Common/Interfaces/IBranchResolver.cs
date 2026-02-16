namespace CleanArchitecture.Application.Common.Interfaces;

public interface IBranchResolver
{
    Task<Guid> GetDefaultBranchIdAsync();
}
