using CleanArchitecture.Application.Common.Interfaces;

namespace CleanArchitecture.Application.RoomTypes.Commands.CreateRoomType;

public record CreateRoomTypeCommand : IRequest<int>
{
    public string Name { get; init; } = string.Empty;
    public int Capacity { get; init; }
    public decimal DefaultRate { get; init; }
    public bool IsActive { get; init; } = true;
}

public class CreateRoomTypeCommandValidator : AbstractValidator<CreateRoomTypeCommand>
{
    private readonly IApplicationDbContext _context;

    public CreateRoomTypeCommandValidator(IApplicationDbContext _context)
    {
        this._context = _context;

        RuleFor(v => v.Name)
            .NotEmpty()
            .MaximumLength(100)
            .MustAsync(BeUniqueName).WithMessage("The specified room type name already exists.");

        RuleFor(v => v.Capacity)
            .GreaterThan(0)
            .WithMessage("Capacity must be greater than 0.");

        RuleFor(v => v.DefaultRate)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Default rate must be non-negative.");
    }

    public async Task<bool> BeUniqueName(string name, CancellationToken cancellationToken)
    {
        return await _context.RoomTypes
            .AllAsync(l => l.Name.ToLower() != name.ToLower(), cancellationToken);
    }
}

public class CreateRoomTypeCommandHandler : IRequestHandler<CreateRoomTypeCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public CreateRoomTypeCommandHandler(IApplicationDbContext _context, IUser user)
    {
        this._context = _context;
        _user = user;
    }

    public async Task<int> Handle(CreateRoomTypeCommand request, CancellationToken cancellationToken)
    {
        var entity = new RoomType
        {
            BranchId = _user.BranchId ?? throw new ForbiddenAccessException(),
            Name = request.Name,
            Capacity = request.Capacity,
            DefaultRate = request.DefaultRate,
            IsActive = request.IsActive
        };

        _context.RoomTypes.Add(entity);

        await _context.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}
