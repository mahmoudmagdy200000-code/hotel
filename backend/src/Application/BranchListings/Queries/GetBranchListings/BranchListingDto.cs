using AutoMapper;
using CleanArchitecture.Domain.Entities;

namespace CleanArchitecture.Application.BranchListings.Queries.GetBranchListings;

public class BranchListingDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Channel { get; init; }
    public bool IsActive { get; init; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<BranchListing, BranchListingDto>();
        }
    }
}
