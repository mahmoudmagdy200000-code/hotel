using System;
using System.Threading;
using System.Threading.Tasks;
using CleanArchitecture.Domain.Enums;

namespace CleanArchitecture.Application.Common.Interfaces;

public interface ICashFlowService
{
    Task<decimal> GetNetCashTodayAsync(DateOnly businessDate, CurrencyCode currency, CancellationToken cancellationToken);
}
