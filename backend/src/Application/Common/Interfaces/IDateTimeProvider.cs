namespace CleanArchitecture.Application.Common.Interfaces;

public interface IDateTimeProvider
{
    /// <summary>
    /// Gets the current precise time according to the configured Hotel TimeZone (e.g. Egypt Standard Time).
    /// </summary>
    DateTime GetHotelTimeNow();

    /// <summary>
    /// Gets the current date (00:00:00) according to the configured Hotel TimeZone.
    /// </summary>
    DateTime GetHotelToday();

    /// <summary>
    /// Evaluates whether the current local time has breached the late check-out boundary
    /// threshold (e.g. 10:00 AM) for a specific checkout date.
    /// </summary>
    bool IsLateCheckOut(DateTime checkOutDate);

    /// <summary>
    /// Converts a hotel-local <see cref="DateTime"/> (DateTimeKind.Unspecified) to UTC
    /// using the configured hotel timezone (e.g. Egypt Standard Time).
    /// Use this when building UTC range filters for <see cref="DateTimeOffset"/> columns.
    /// </summary>
    DateTime ToUtc(DateTime hotelLocalTime);
}
