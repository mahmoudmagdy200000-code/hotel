using System.Runtime.InteropServices;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Common.Models;
using Microsoft.Extensions.Options;

namespace CleanArchitecture.Infrastructure.Services;

public class HotelDateTimeProvider : IDateTimeProvider
{
    private readonly HotelSettings _settings;
    private readonly TimeZoneInfo _hotelTimeZone;

    public HotelDateTimeProvider(IOptions<HotelSettings> options)
    {
        _settings = options.Value;
        _hotelTimeZone = ResolveHotelTimeZone(_settings);
    }

    private static TimeZoneInfo ResolveHotelTimeZone(HotelSettings settings)
    {
        // Try the primary timezone (usually Windows format "Egypt Standard Time")
        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                return TimeZoneInfo.FindSystemTimeZoneById(settings.TimeZoneId);
            }
            else
            {
                // Linux / macOS IANA mapping "Africa/Cairo"
                return TimeZoneInfo.FindSystemTimeZoneById(settings.FallbackTimeZoneId);
            }
        }
        catch (TimeZoneNotFoundException)
        {
            // Fallback attempt if OS is behaving unexpectedly
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(settings.TimeZoneId);
            }
            catch (TimeZoneNotFoundException)
            {
                try 
                {
                    return TimeZoneInfo.FindSystemTimeZoneById(settings.FallbackTimeZoneId);
                } 
                catch (TimeZoneNotFoundException)
                {
                    // Ultimate fallback to UTC if container completely lacks tzdata
                    return TimeZoneInfo.Utc;
                }
            }
        }
    }

    public DateTime GetHotelTimeNow()
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _hotelTimeZone);
    }

    public DateTime GetHotelToday()
    {
        return GetHotelTimeNow().Date;
    }

    public bool IsLateCheckOut(DateTime checkOutDate)
    {
        var now = GetHotelTimeNow();
        
        // Only evaluate if today is actually the checkout date (or they are already overdue)
        if (now.Date >= checkOutDate.Date)
        {
            if (TimeSpan.TryParse(_settings.CheckOutTime, out var checkoutTime))
            {
                // If the current time is strictly greater than the designated checkout time (e.g. 10:00:00), they are late.
                if (now.TimeOfDay > checkoutTime)
                {
                    return true;
                }
            }
        }

        return false;
    }
}
