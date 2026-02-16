namespace CleanArchitecture.Application.Rooms.Commands.UpdateRoom;

public record UpdateRoomCommand : IRequest
{
    public int Id { get; init; }
    public string RoomNumber { get; init; } = string.Empty;
    public int RoomTypeId { get; init; }
    public int? Floor { get; init; }
    public RoomStatus Status { get; init; }
    public bool IsActive { get; init; }
}

public class UpdateRoomCommandValidator : AbstractValidator<UpdateRoomCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateRoomCommandValidator(IApplicationDbContext context)
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

    public async Task<bool> BeUniqueRoomNumber(UpdateRoomCommand model, string roomNumber, CancellationToken cancellationToken)
    {
        return await _context.Rooms
            .Where(r => r.Id != model.Id)
            .AllAsync(r => r.RoomNumber.ToLower() != roomNumber.ToLower(), cancellationToken);
    }

    public async Task<bool> RoomTypeExists(int roomTypeId, CancellationToken cancellationToken)
    {
        return await _context.RoomTypes.AnyAsync(rt => rt.Id == roomTypeId, cancellationToken);
    }
}

public class UpdateRoomCommandHandler : IRequestHandler<UpdateRoomCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateRoomCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateRoomCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Rooms
            .FindAsync(new object[] { request.Id }, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Room), request.Id);
        }

        entity.RoomNumber = request.RoomNumber;
        entity.RoomTypeId = request.RoomTypeId;
        entity.Floor = request.Floor;
        entity.Status = request.Status;
        entity.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
    }
}
