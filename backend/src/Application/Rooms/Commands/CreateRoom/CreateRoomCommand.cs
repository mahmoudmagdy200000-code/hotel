namespace CleanArchitecture.Application.Rooms.Commands.CreateRoom;

public record CreateRoomCommand : IRequest<int>
{
    public string RoomNumber { get; init; } = string.Empty;
    public int RoomTypeId { get; init; }
    public int? Floor { get; init; }
    public bool IsActive { get; init; } = true;
}

public class CreateRoomCommandValidator : AbstractValidator<CreateRoomCommand>
{
    private readonly IApplicationDbContext _context;

    public CreateRoomCommandValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(v => v.RoomNumber)
            .NotEmpty()
            .MaximumLength(20)
            .MustAsync(BeUniqueRoomNumber).WithMessage("The specified room number already exists.");

        RuleFor(v => v.RoomTypeId)
            .NotEmpty()
            .MustAsync(RoomTypeExists).WithMessage("The specified RoomTypeId does not exist.");

        RuleFor(v => v.Floor)
            .GreaterThanOrEqualTo(0)
            .When(v => v.Floor.HasValue);
    }

    public async Task<bool> BeUniqueRoomNumber(string roomNumber, CancellationToken cancellationToken)
    {
        return await _context.Rooms
            .AllAsync(r => r.RoomNumber.ToLower() != roomNumber.ToLower(), cancellationToken);
    }

    public async Task<bool> RoomTypeExists(int roomTypeId, CancellationToken cancellationToken)
    {
        return await _context.RoomTypes.AnyAsync(rt => rt.Id == roomTypeId, cancellationToken);
    }
}

public class CreateRoomCommandHandler : IRequestHandler<CreateRoomCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public CreateRoomCommandHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task<int> Handle(CreateRoomCommand request, CancellationToken cancellationToken)
    {
        var entity = new Room
        {
            BranchId = _user.BranchId ?? throw new ForbiddenAccessException(),
            RoomNumber = request.RoomNumber,
            RoomTypeId = request.RoomTypeId,
            Floor = request.Floor,
            IsActive = request.IsActive,
            Status = RoomStatus.Available
        };

        _context.Rooms.Add(entity);

        await _context.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}
