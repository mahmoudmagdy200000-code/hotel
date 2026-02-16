namespace CleanArchitecture.Application.Rooms.Queries.GetRooms;

public class RoomDto
{
    public int Id { get; init; }
    public string RoomNumber { get; init; } = string.Empty;
    public int RoomTypeId { get; init; }
    public string RoomTypeName { get; init; } = string.Empty;
    public int? Floor { get; init; }
    public RoomStatus Status { get; init; }
    public bool IsActive { get; init; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<Room, RoomDto>()
                .ForMember(d => d.RoomTypeName, opt => opt.MapFrom(s => s.RoomType != null ? s.RoomType.Name : string.Empty));
        }
    }
}
