using CleanArchitecture.Application.Admin.Queries;
using CleanArchitecture.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Admin.Queries.GetReservationDeletes;

public record GetReservationDeletesQuery : IRequest<List<ReservationDeleteAuditListItemDto>>
{
    public DateTime? From { get; init; }
    public DateTime? To { get; init; }
    public string? Query { get; init; }
    public string? EventType { get; init; } // "Deleted" or "Cancelled"
    public string? HotelName { get; init; }
    public int? Limit { get; init; } = 50;
}

public class GetReservationDeletesQueryHandler : IRequestHandler<GetReservationDeletesQuery, List<ReservationDeleteAuditListItemDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public GetReservationDeletesQueryHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task<List<ReservationDeleteAuditListItemDto>> Handle(GetReservationDeletesQuery request, CancellationToken cancellationToken)
    {
        var eventType = request.EventType ?? "Deleted";

        var query = _context.ReservationAuditEvents
            .IgnoreQueryFilters()
            .Include(e => e.Reservation)
            .Where(e => e.EventType == eventType)
            .Where(e => !_user.BranchId.HasValue || (e.Reservation != null && e.Reservation.BranchId == _user.BranchId))
            .AsNoTracking();

        if (request.From.HasValue)
        {
            query = query.Where(e => e.OccurredAtUtc >= request.From.Value);
        }

        if (request.To.HasValue)
        {
            query = query.Where(e => e.OccurredAtUtc <= request.To.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var search = $"%{request.Query}%";
            
            // Try parse as ID for direct comparison
            bool isId = int.TryParse(request.Query, out int id);

            query = query.Where(e => 
                EF.Functions.Like(e.ActorEmail, search) ||
                (e.Reason != null && EF.Functions.Like(e.Reason, search)) ||
                (isId && e.ReservationId == id));
        }

        if (!string.IsNullOrWhiteSpace(request.HotelName))
        {
            var hotelSearch = $"%{request.HotelName}%";
            query = query.Where(e => e.Reservation != null && EF.Functions.Like(e.Reservation.HotelName!, hotelSearch));
        }

        return await query
            .OrderByDescending(e => e.OccurredAtUtc)
            .Take(request.Limit ?? 50)
            .Select(e => new ReservationDeleteAuditListItemDto
            {
                Id = e.Id,
                ReservationId = e.ReservationId,
                EventType = e.EventType,
                ActorEmail = e.ActorEmail,
                OccurredAtUtc = e.OccurredAtUtc,
                Reason = e.Reason,
                HotelName = e.Reservation != null ? e.Reservation.HotelName : null,
                SnapshotJson = e.SnapshotJson
            })
            .ToListAsync(cancellationToken);
    }
}
