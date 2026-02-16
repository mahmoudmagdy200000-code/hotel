using CleanArchitecture.Application.Common.Interfaces;

namespace CleanArchitecture.Application.RoomTypes.Commands.UpdateRoomType;

public record UpdateRoomTypeCommand : IRequest
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public int Capacity { get; init; }
    public decimal DefaultRate { get; init; }
    public bool IsActive { get; init; }
}

public class UpdateRoomTypeCommandValidator : AbstractValidator<UpdateRoomTypeCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateRoomTypeCommandValidator(IApplicationDbContext _context)
    {
        this._context = _context;

        RuleFor(v => v.Name)
            .NotEmpty()
            .MaximumLength(100)
            .MustAsync(BeUniqueName).WithMessage("The specified room type name already exists.");

        RuleFor(v => v.Capacity)
            .GreaterThan(0);

        RuleFor(v => v.DefaultRate)
            .GreaterThanOrEqualTo(0);
    }

    public async Task<bool> BeUniqueName(UpdateRoomTypeCommand model, string name, CancellationToken cancellationToken)
    {
        return await _context.RoomTypes
            .Where(l => l.Id != model.Id)
            .AllAsync(l => l.Name.ToLower() != name.ToLower(), cancellationToken);
    }
}

public class UpdateRoomTypeCommandHandler : IRequestHandler<UpdateRoomTypeCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateRoomTypeCommandHandler(IApplicationDbContext _context)
    {
        this._context = _context;
    }

    public async Task Handle(UpdateRoomTypeCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.RoomTypes
            .FindAsync(new object[] { request.Id }, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(RoomType), request.Id);
        }

        entity.Name = request.Name;
        entity.Capacity = request.Capacity;
        entity.DefaultRate = request.DefaultRate;
        entity.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
    }
}
