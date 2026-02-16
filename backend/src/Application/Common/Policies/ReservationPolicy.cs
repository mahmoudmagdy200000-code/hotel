using CleanArchitecture.Domain.Enums;

namespace CleanArchitecture.Application.Common.Policies;

public static class ReservationPolicy
{
    public static readonly ReservationStatus[] BlockingStatuses = new[]
    {
        ReservationStatus.Confirmed,
        ReservationStatus.CheckedIn,
        ReservationStatus.CheckedOut
    };

    public static bool IsBlocking(ReservationStatus status)
    {
        return BlockingStatuses.Contains(status);
    }
}
