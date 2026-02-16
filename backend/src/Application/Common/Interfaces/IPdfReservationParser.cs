namespace CleanArchitecture.Application.Common.Interfaces;

public interface IPdfReservationParser
{
    Task<PdfParseOutput> ParseAsync(string filePath, CancellationToken cancellationToken);
}

public class PdfParseOutput
{
    public bool Success { get; set; }
    public ExtractedPdfData? Data { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public string? FailureStep { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class ExtractedPdfData
{
    public string? GuestName { get; set; }
    public string? Phone { get; set; }
    public DateOnly? CheckIn { get; set; }
    public DateOnly? CheckOut { get; set; }
    public int? RoomsCount { get; set; }
    public string? RoomTypeHint { get; set; }
    public decimal? TotalPrice { get; set; }
    public string? Currency { get; set; }
    public CleanArchitecture.Domain.Enums.CurrencyCode? CurrencyCode { get; set; }
    public string? BookingNumber { get; set; }
}
