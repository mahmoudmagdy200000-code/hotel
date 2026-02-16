namespace CleanArchitecture.Application.RoomTypes.Queries.GetRoomTypes;

public class RoomTypeDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public int Capacity { get; init; }
    public decimal DefaultRate { get; init; }
    public bool IsActive { get; init; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<RoomType, RoomTypeDto>();
        }
    }
}
