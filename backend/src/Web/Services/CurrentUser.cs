using System.Security.Claims;

using CleanArchitecture.Application.Common.Interfaces;

namespace CleanArchitecture.Web.Services;

public class CurrentUser : IUser
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? Id => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
    public string? Email => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Name);
    public List<string>? Roles => _httpContextAccessor.HttpContext?.User?.FindAll(ClaimTypes.Role).Select(x => x.Value).ToList();
    public Guid? BranchId
    {
        get
        {
            // 1. Check for fixed branch claim (e.g. Receptionist)
            var branchIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirstValue("branch_id");
            if (!string.IsNullOrEmpty(branchIdClaim) && Guid.TryParse(branchIdClaim, out var fixedBranchId))
            {
                return fixedBranchId;
            }

            // 2. If no fixed branch (Owner role), check for X-Branch-Id header override
            var branchIdHeader = _httpContextAccessor.HttpContext?.Request.Headers["X-Branch-Id"].ToString();
            if (!string.IsNullOrEmpty(branchIdHeader) && Guid.TryParse(branchIdHeader, out var headerBranchId))
            {
                return headerBranchId;
            }

            return null;
        }
    }
}
