using System.Text.RegularExpressions;
using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Constants;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reservations.Commands.PdfUpload;

/// <summary>
/// Batch parse multiple PDF reservations. Each is processed independently - failures don't fail entire batch.
/// </summary>
public record ParsePdfReservationsBatchCommand : IRequest<PdfBatchParseResultDto>
{
    public List<int> ReservationIds { get; init; } = new();
}

// ============== DTOs ==============

public class PdfBatchParseResultDto
{
    public int TotalCount { get; init; }
    public int SuccessCount { get; init; }
    public int FailedCount { get; init; }
    public List<PdfBatchParseItemResultDto> Items { get; init; } = new();
}

public class PdfBatchParseItemResultDto
{
    public int Index { get; init; }
    public int ReservationId { get; init; }
    public string Status { get; init; } = string.Empty; // "Parsed" | "Failed"
    public string? ParsingStatus { get; init; }
    public string? Message { get; init; }
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }
    public ExtractedPdfDataDto? Extracted { get; init; }
}

// ============== Handler ==============

public class ParsePdfReservationsBatchCommandHandler 
    : IRequestHandler<ParsePdfReservationsBatchCommand, PdfBatchParseResultDto>
{
    private const int MaxBatchSize = 50;

    private readonly IApplicationDbContext _context;
    private readonly IPdfReservationParser _parser;

    public ParsePdfReservationsBatchCommandHandler(
        IApplicationDbContext context, 
        IPdfReservationParser parser)
    {
        _context = context;
        _parser = parser;
    }

    public async Task<PdfBatchParseResultDto> Handle(
        ParsePdfReservationsBatchCommand request, 
        CancellationToken cancellationToken)
    {
        var items = new List<PdfBatchParseItemResultDto>();
        var successCount = 0;
        var failedCount = 0;

        // Validate batch size
        if (request.ReservationIds.Count > MaxBatchSize)
        {
            for (int i = 0; i < request.ReservationIds.Count; i++)
            {
                items.Add(new PdfBatchParseItemResultDto
                {
                    Index = i,
                    ReservationId = request.ReservationIds[i],
                    Status = "Failed",
                    ParsingStatus = "Failed",
                    ErrorCode = "BATCH_SIZE_EXCEEDED",
                    ErrorMessage = $"Maximum batch size is {MaxBatchSize} reservations."
                });
            }
            return new PdfBatchParseResultDto
            {
                TotalCount = request.ReservationIds.Count,
                SuccessCount = 0,
                FailedCount = request.ReservationIds.Count,
                Items = items
            };
        }

        // Process each reservation independently
        for (int i = 0; i < request.ReservationIds.Count; i++)
        {
            var reservationId = request.ReservationIds[i];
            var result = await ProcessSingleParseAsync(i, reservationId, cancellationToken);
            items.Add(result);

            if (result.Status == "Parsed")
                successCount++;
            else
                failedCount++;
        }

        return new PdfBatchParseResultDto
        {
            TotalCount = request.ReservationIds.Count,
            SuccessCount = successCount,
            FailedCount = failedCount,
            Items = items
        };
    }

    private async Task<PdfBatchParseItemResultDto> ProcessSingleParseAsync(
        int index,
        int reservationId,
        CancellationToken cancellationToken)
    {
        var correlationId = Guid.NewGuid().ToString();
        var startTime = DateTime.UtcNow;

        try
        {
            var reservation = await _context.Reservations
                .FirstOrDefaultAsync(r => r.Id == reservationId, cancellationToken);

            if (reservation == null)
            {
                return new PdfBatchParseItemResultDto
                {
                    Index = index,
                    ReservationId = reservationId,
                    Status = "Failed",
                    ParsingStatus = "Failed",
                    ErrorCode = "NOT_FOUND",
                    ErrorMessage = $"Reservation {reservationId} not found."
                };
            }

            // Check eligibility: must be Draft + PDF source
            if (reservation.Status != ReservationStatus.Draft || reservation.Source != ReservationSource.PDF)
            {
                return new PdfBatchParseItemResultDto
                {
                    Index = index,
                    ReservationId = reservationId,
                    Status = "Failed",
                    ParsingStatus = "Failed",
                    ErrorCode = "NOT_ELIGIBLE",
                    ErrorMessage = $"Reservation {reservationId} is not eligible for parsing (Status: {reservation.Status}, Source: {reservation.Source})."
                };
            }

            // Check if already parsed
            if (reservation.Notes?.Contains("[PARSING_STATUS] Parsed") == true)
            {
                return new PdfBatchParseItemResultDto
                {
                    Index = index,
                    ReservationId = reservationId,
                    Status = "Failed",
                    ParsingStatus = "Parsed",
                    ErrorCode = "ALREADY_PARSED",
                    ErrorMessage = $"Reservation {reservationId} has already been parsed."
                };
            }

            // Extract path from notes
            var match = Regex.Match(reservation.Notes ?? string.Empty, @"Internal Path:\s*(.+)");
            if (!match.Success)
            {
                return await RecordFailureAsync(index, reservation, "NO_PDF_PATH", 
                    "Stored PDF path not found in reservation notes.", correlationId, cancellationToken);
            }

            var filePath = match.Groups[1].Value.Trim().Replace('\\', '/');

            // Call parser
            var parseOutput = await _parser.ParseAsync(filePath, cancellationToken);

            if (parseOutput.Success && parseOutput.Data != null)
            {
                var data = parseOutput.Data;

                // Update Reservation fields
                if (!string.IsNullOrWhiteSpace(data.GuestName)) reservation.GuestName = data.GuestName;
                if (!string.IsNullOrWhiteSpace(data.Phone)) reservation.Phone = data.Phone;
                if (data.CheckIn.HasValue) reservation.CheckInDate = data.CheckIn.Value.ToDateTime(TimeOnly.MinValue);
                if (data.CheckOut.HasValue) reservation.CheckOutDate = data.CheckOut.Value.ToDateTime(TimeOnly.MinValue);
                if (data.TotalPrice.HasValue) reservation.TotalAmount = data.TotalPrice.Value;
                if (!string.IsNullOrWhiteSpace(data.Currency)) reservation.Currency = data.Currency;

                // Update Notes with stable markers
                var cleanNotes = Regex.Replace(reservation.Notes ?? string.Empty, @"\[PARSING_STATUS\].*", "", RegexOptions.IgnoreCase).Trim();
                // Clean old markers too to avoid duplicates
                cleanNotes = Regex.Replace(cleanNotes, @"\[EXTRACTED\].*", "", RegexOptions.IgnoreCase).Trim();
                cleanNotes = Regex.Replace(cleanNotes, @"\[PDF_EXTRACTED\].*", "", RegexOptions.IgnoreCase).Trim();
                cleanNotes = Regex.Replace(cleanNotes, @"\[EXTRACTED_V2\].*", "", RegexOptions.IgnoreCase).Trim();
                
                var logEntry = $"[PARSING_DIAGNOSTICS] Step=MapFields | Duration={(DateTime.UtcNow - startTime).TotalMilliseconds}ms | CorrelationId={correlationId}";
                
                // Build extracted marker (Unified with Single Command — includes all metadata)
                var extractedParts = new List<string>();
                if (data.RoomsCount.HasValue && data.RoomsCount.Value > 0)
                    extractedParts.Add($"RoomsCount={data.RoomsCount.Value}");
                if (!string.IsNullOrWhiteSpace(data.RoomTypeHint))
                    extractedParts.Add($"RoomTypeHint={data.RoomTypeHint}");
                if (!string.IsNullOrWhiteSpace(data.MealPlan))
                    extractedParts.Add($"MealPlan={data.MealPlan}");
                if (data.NumberOfPersons.HasValue)
                    extractedParts.Add($"Guests={data.NumberOfPersons.Value}");
                if (!string.IsNullOrWhiteSpace(data.HotelName))
                    extractedParts.Add($"Hotel={data.HotelName}");
                if (!string.IsNullOrWhiteSpace(data.Phone))
                    extractedParts.Add($"Phone={data.Phone}");

                var extractedMarker = extractedParts.Any()
                    ? $"[EXTRACTED_V2] {string.Join(" | ", extractedParts)}"
                    : "";
                    
                reservation.Notes = $"{cleanNotes}\n{logEntry}\n{extractedMarker}\n[PARSING_STATUS] Parsed".Trim();

                // Update BookingNumber if extracted
                if (!string.IsNullOrWhiteSpace(data.BookingNumber) && reservation.BookingNumber?.StartsWith("PDF-") == true)
                {
                    reservation.BookingNumber = data.BookingNumber;
                }

                await _context.SaveChangesAsync(cancellationToken);

                return new PdfBatchParseItemResultDto
                {
                    Index = index,
                    ReservationId = reservationId,
                    Status = "Parsed",
                    ParsingStatus = "Parsed",
                    Message = "PDF parsed successfully.",
                    Extracted = new ExtractedPdfDataDto
                    {
                        GuestName = data.GuestName,
                        Phone = data.Phone,
                        CheckIn = data.CheckIn?.ToString("yyyy-MM-dd"),
                        CheckOut = data.CheckOut?.ToString("yyyy-MM-dd"),
                        RoomsCount = data.RoomsCount,
                        RoomTypeHint = data.RoomTypeHint,
                        MealPlan = data.MealPlan,
                        TotalPrice = data.TotalPrice,
                        Currency = reservation.Currency,
                        BookingNumber = data.BookingNumber ?? reservation.BookingNumber
                    }
                };
            }
            else
            {
                // Parser returned failure
                var normalizedCode = PdfParseErrorCodeNormalizer.Normalize(parseOutput.ErrorCode) 
                    ?? PdfParseErrorCodes.Unknown;
                return await RecordFailureAsync(index, reservation, normalizedCode, 
                    parseOutput.ErrorMessage ?? PdfParseErrorMessages.ToUserMessage(normalizedCode) ?? "Parsing failed", 
                    correlationId, cancellationToken, parseOutput.FailureStep);
            }
        }
        catch (Exception ex)
        {
            // Try to record failure in notes if reservation exists
            try
            {
                var reservation = await _context.Reservations
                    .FirstOrDefaultAsync(r => r.Id == reservationId, cancellationToken);
                if (reservation != null)
                {
                    return await RecordFailureAsync(index, reservation, PdfParseErrorCodes.ServerError, 
                        ex.Message, correlationId, cancellationToken);
                }
            }
            catch { /* Ignore errors during failure recording */ }

            return new PdfBatchParseItemResultDto
            {
                Index = index,
                ReservationId = reservationId,
                Status = "Failed",
                ParsingStatus = "Failed",
                ErrorCode = PdfParseErrorCodes.ServerError,
                ErrorMessage = ex.Message
            };
        }
    }

    private async Task<PdfBatchParseItemResultDto> RecordFailureAsync(
        int index,
        Reservation reservation,
        string errorCode,
        string errorMessage,
        string correlationId,
        CancellationToken cancellationToken,
        string? failureStep = null)
    {
        var cleanNotes = Regex.Replace(reservation.Notes ?? string.Empty, @"\[PARSING_STATUS\].*", "").Trim();
        var logEntry = $"[PARSING_DIAGNOSTICS] Step={failureStep ?? "Unknown"} | Code={errorCode} | CorrelationId={correlationId}";
        reservation.Notes = $"{cleanNotes}\n{logEntry}\n[PDF_PARSE_FAILED] {errorMessage}\n[PARSING_STATUS] Failed".Trim();
        await _context.SaveChangesAsync(cancellationToken);

        return new PdfBatchParseItemResultDto
        {
            Index = index,
            ReservationId = reservation.Id,
            Status = "Failed",
            ParsingStatus = "Failed",
            ErrorCode = errorCode,
            ErrorMessage = errorMessage
        };
    }
}
