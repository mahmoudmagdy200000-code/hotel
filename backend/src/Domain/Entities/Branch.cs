using CleanArchitecture.Domain.Common;

namespace CleanArchitecture.Domain.Entities;

public class Branch : BaseAuditableEntity<Guid>
{
    private string _name = string.Empty;

    public string Name
    {
        get => _name;
        set
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Branch name cannot be null or empty.");

            if (value.Length > 120)
                throw new ArgumentException("Branch name must be 120 characters or less.");

            _name = value;
        }
    }
}
