using CleanArchitecture.Application.Admin.Queries;
using CleanArchitecture.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Admin.Queries.GetReservationAuditDetails;

public record GetReservationAuditDetailsQuery(int ReservationId) : IRequest<List<ReservationDeleteAuditListItemDto>>;

public class GetReservationAuditDetailsQueryHandler : IRequestHandler<GetReservationAuditDetailsQuery, List<ReservationDeleteAuditListItemDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public GetReservationAuditDetailsQueryHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task<List<ReservationDeleteAuditListItemDto>> Handle(GetReservationAuditDetailsQuery request, CancellationToken cancellationToken)
    {
        return await _context.ReservationAuditEvents
            .IgnoreQueryFilters()
            .Include(e => e.Reservation)
            .Where(e => e.ReservationId == request.ReservationId)
            .Where(e => !_user.BranchId.HasValue || (e.Reservation != null && e.Reservation.BranchId == _user.BranchId))
            .AsNoTracking()
            .OrderByDescending(e => e.OccurredAtUtc)
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
