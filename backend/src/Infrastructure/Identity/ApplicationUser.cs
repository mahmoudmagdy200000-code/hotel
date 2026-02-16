using Microsoft.AspNetCore.Identity;

namespace CleanArchitecture.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public Guid? BranchId { get; set; }
}
