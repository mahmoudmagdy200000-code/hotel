using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using MediatR;

namespace CleanArchitecture.Application.Dashboard.Queries.GetDailyCashFlow;

public record DailyCashFlowDto
{
    public decimal NetCashInDrawer { get; init; }
    public CurrencyCode Currency { get; init; }
}

public record GetDailyCashFlowQuery : IRequest<DailyCashFlowDto>
{
    public DateOnly? BusinessDate { get; init; }
    public CurrencyCode? Currency { get; init; }
}

public class GetDailyCashFlowQueryHandler : IRequestHandler<GetDailyCashFlowQuery, DailyCashFlowDto>
{
    private readonly ICashFlowService _cashFlowService;
    private readonly IDateTimeProvider _dateTimeProvider;

    public GetDailyCashFlowQueryHandler(ICashFlowService cashFlowService, IDateTimeProvider dateTimeProvider)
    {
        _cashFlowService = cashFlowService;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<DailyCashFlowDto> Handle(GetDailyCashFlowQuery request, CancellationToken cancellationToken)
    {
        var businessDate = request.BusinessDate ?? DateOnly.FromDateTime(_dateTimeProvider.GetHotelToday());
        var currency = request.Currency ?? CurrencyCode.EGP;

        var netCash = await _cashFlowService.GetNetCashTodayAsync(businessDate, currency, cancellationToken);

        return new DailyCashFlowDto
        {
            NetCashInDrawer = netCash,
            Currency = currency
        };
    }
}
