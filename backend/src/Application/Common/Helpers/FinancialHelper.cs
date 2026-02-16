using CleanArchitecture.Domain.Entities;

namespace CleanArchitecture.Application.Common.Helpers;

public static class FinancialHelper
{
    public static int CalculateNights(DateTime checkIn, DateTime checkOut)
    {
        var nights = (int)(checkOut.Date - checkIn.Date).TotalDays;
        return nights < 1 ? 1 : nights; // Minimum 1 night policy as per hotel common practice or specify 0 if allowed
    }

    public static decimal CalculateLineTotal(decimal ratePerNight, int nights)
    {
        return Math.Round(ratePerNight * nights, 2);
    }

    public static decimal CalculateTotalAmount(IEnumerable<ReservationLine> lines)
    {
        return Math.Round(lines.Sum(x => x.LineTotal), 2);
    }
}
