using CleanArchitecture.Domain.Entities;

namespace CleanArchitecture.Application.Common.Models;

public class LookupDto
{
    public int Id { get; init; }

    public string? Title { get; init; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<RoomType, LookupDto>()
                .ForMember(d => d.Title, opt => opt.MapFrom(s => s.Name));
            CreateMap<Room, LookupDto>()
                .ForMember(d => d.Title, opt => opt.MapFrom(s => s.RoomNumber));
        }
    }
}
