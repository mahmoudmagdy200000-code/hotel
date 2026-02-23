namespace CleanArchitecture.Application.Common.Models;

public class HotelSettings
{
    public const string SectionName = "HotelSettings";

    public string TimeZoneId { get; set; } = "Egypt Standard Time";
    public string FallbackTimeZoneId { get; set; } = "Africa/Cairo";
    public string CheckInTime { get; set; } = "14:00:00";
    public string CheckOutTime { get; set; } = "10:00:00";
}
