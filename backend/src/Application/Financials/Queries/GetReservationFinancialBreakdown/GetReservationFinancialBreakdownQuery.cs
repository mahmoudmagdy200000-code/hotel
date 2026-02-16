using CleanArchitecture.Application.Common.Helpers;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Common.Policies;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using MediatR;

namespace CleanArchitecture.Application.Financials.Queries.GetReservationFinancialBreakdown;

public record GetReservationFinancialBreakdownQuery(int Id) : IRequest<ReservationFinancialBreakdownDto>;

public class GetReservationFinancialBreakdownQueryHandler : IRequestHandler<GetReservationFinancialBreakdownQuery, ReservationFinancialBreakdownDto>
{
    private readonly IApplicationDbContext _context;

    public GetReservationFinancialBreakdownQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReservationFinancialBreakdownDto> Handle(GetReservationFinancialBreakdownQuery request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .Include(x => x.Lines)
                .ThenInclude(l => l.Room)
            .Include(x => x.Lines)
                .ThenInclude(l => l.RoomType)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.Id);
        }

        var nights = FinancialHelper.CalculateNights(entity.CheckInDate, entity.CheckOutDate);
        
        var revenueStatuses = new[] { ReservationStatus.Confirmed, ReservationStatus.CheckedIn, ReservationStatus.CheckedOut };
        var isExcluded = !revenueStatuses.Contains(entity.Status);

        var dto = new ReservationFinancialBreakdownDto
        {
            ReservationId = entity.Id,
            CheckInDate = entity.CheckInDate,
            CheckOutDate = entity.CheckOutDate,
            Nights = nights,
            Status = entity.Status,
            TotalAmount = entity.TotalAmount,
            Currency = entity.Currency,
            IsExcludedFromRevenue = isExcluded,
            Lines = entity.Lines.Select(l => new ReservationLineBreakdownDto
            {
                ReservationLineId = l.Id,
                RoomId = l.RoomId,
                RoomNumber = l.Room?.RoomNumber ?? string.Empty,
                RoomTypeId = l.RoomTypeId,
                RoomTypeName = l.RoomType?.Name ?? string.Empty,
                RatePerNight = l.RatePerNight,
                LineTotal = l.LineTotal
            }).ToList()
        };

        // Calculate Nightly Allocation
        var nightly = new List<NightlyRevenueDto>();
        for (int i = 0; i < nights; i++)
        {
            var date = entity.CheckInDate.AddDays(i).Date;
            var nightlyAmount = entity.Lines.Sum(l => l.RatePerNight);
            
            nightly.Add(new NightlyRevenueDto
            {
                Date = date.ToString("yyyy-MM-dd"),
                Amount = Math.Round(nightlyAmount, 2)
            });
        }
        
        return dto with { Nightly = nightly };
    }
}
