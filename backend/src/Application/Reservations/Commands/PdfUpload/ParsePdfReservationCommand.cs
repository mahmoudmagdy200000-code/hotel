using System.Text.RegularExpressions;
using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Constants;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reservations.Commands.PdfUpload;

public record ParsePdfReservationCommand : IRequest<PdfParsingResultDto>
{
    public int ReservationId { get; init; }
}

public class PdfParsingResultDto
{
    public int ReservationId { get; init; }
    public string ParsingStatus { get; init; } = string.Empty;
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }
    public string? FailureStep { get; init; }
    public string? CorrelationId { get; init; }
    public ExtractedPdfDataDto? Extracted { get; init; }
    public List<string> Errors { get; init; } = new();
}

public class ExtractedPdfDataDto
{
    public string? GuestName { get; set; }
    public string? Phone { get; set; }
    public string? CheckIn { get; set; }
    public string? CheckOut { get; set; }
    public int? RoomsCount { get; set; }
    public string? RoomTypeHint { get; set; }
    public decimal? TotalPrice { get; set; }
    public string? Currency { get; set; }
    public string? BookingNumber { get; set; }
}

public class ParsePdfReservationCommandHandler : IRequestHandler<ParsePdfReservationCommand, PdfParsingResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPdfReservationParser _parser;

    public ParsePdfReservationCommandHandler(IApplicationDbContext context, IPdfReservationParser parser)
    {
        _context = context;
        _parser = parser;
    }

    public async Task<PdfParsingResultDto> Handle(ParsePdfReservationCommand request, CancellationToken cancellationToken)
    {
        try { File.AppendAllText(@"c:\Users\Workstation\hotel\debug_log.txt", $"[DEBUG] Handling ParsePdfReservationCommand for Id: {request.ReservationId}\n"); } catch {}
        var correlationId = Guid.NewGuid().ToString();
        var startTime = DateTime.UtcNow;

        var reservation = await _context.Reservations
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId, cancellationToken);

        if (reservation == null)
        {
            throw new NotFoundException(nameof(Reservation), request.ReservationId);
        }

        // Allow 'Parsed' status specifically for Re-parse operations
        if (reservation.Status != ReservationStatus.Draft || reservation.Source != ReservationSource.PDF)
        {
             // We relax the check: if Status is Draft OR simply we are re-parsing.
             // But traditionally 'Parsed' items might still be in Draft status?
             // Wait, logic says: Status must be Draft.
             // If I successfully Parsed, status is NOT 'Parsed' enum?
             // ReservationStatus has: Draft, Confirmed, etc.
             // 'ParsingStatus' is stored in NOTES or assumed.
             
             // The original code check:
             if (reservation.Status != ReservationStatus.Draft)
             {
                 throw new ConflictException($"Reservation {request.ReservationId} is not in a valid state for parsing (Status: {reservation.Status}).");
             }
        }

        // Extract path from notes
        var match = Regex.Match(reservation.Notes ?? string.Empty, @"Internal Path:\s*(.+)");
        if (!match.Success)
        {
            throw new ConflictException("Stored PDF path not found in reservation notes.");
        }

        var filePath = match.Groups[1].Value.Trim().Replace('\\', '/');
        Console.Error.WriteLine($"[DEBUG] PDF Path: {filePath}");

        try
        {
            // Call parser
            var parseOutput = await _parser.ParseAsync(filePath, cancellationToken);

            if (parseOutput.Success && parseOutput.Data != null)
            {
                var data = parseOutput.Data;

                // Update Reservation/Guest info
                try { File.AppendAllText(@"c:\Users\Workstation\hotel\debug_log.txt", $"[DEBUG] Extracted GuestName='{data.GuestName}', RoomsCount={data.RoomsCount}, BookingNumber='{data.BookingNumber}'\n"); } catch {}
                if (!string.IsNullOrWhiteSpace(data.GuestName)) reservation.GuestName = data.GuestName;
                if (!string.IsNullOrWhiteSpace(data.Phone)) reservation.Phone = data.Phone;
                if (data.CheckIn.HasValue) reservation.CheckInDate = data.CheckIn.Value.ToDateTime(TimeOnly.MinValue);
                if (data.CheckOut.HasValue) reservation.CheckOutDate = data.CheckOut.Value.ToDateTime(TimeOnly.MinValue);

                // SAFETY: Ensure CheckOut > CheckIn
                // If CheckIn was updated (e.g. to April) but CheckOut failed (stayed Feb), default to +1 day
                if (reservation.CheckOutDate <= reservation.CheckInDate)
                {
                    reservation.CheckOutDate = reservation.CheckInDate.AddDays(1);
                    reservation.Notes += "\n[WARN] Check-out adjusted to +1 day due to extraction mismatch.";
                }
                if (data.TotalPrice.HasValue) reservation.TotalAmount = data.TotalPrice.Value;
                if (!string.IsNullOrWhiteSpace(data.Currency)) reservation.Currency = data.Currency;
                if (data.CurrencyCode.HasValue) reservation.CurrencyCode = data.CurrencyCode.Value;

                // Clean all previous parsing-related markers to avoid confusion
                var cleanNotes = reservation.Notes ?? string.Empty;
                cleanNotes = Regex.Replace(cleanNotes, @"\[PARSING_DIAGNOSTICS\].*", "", RegexOptions.IgnoreCase).Trim();
                cleanNotes = Regex.Replace(cleanNotes, @"\[EXTRACTED\].*", "", RegexOptions.IgnoreCase).Trim();
                cleanNotes = Regex.Replace(cleanNotes, @"\[PDF_EXTRACTED\].*", "", RegexOptions.IgnoreCase).Trim();
                cleanNotes = Regex.Replace(cleanNotes, @"\[EXTRACTED_V2\].*", "", RegexOptions.IgnoreCase).Trim();
                cleanNotes = Regex.Replace(cleanNotes, @"\[PARSING_STATUS\].*", "", RegexOptions.IgnoreCase).Trim();
                cleanNotes = Regex.Replace(cleanNotes, @"\[AUTO-ASSIGN\].*", "", RegexOptions.IgnoreCase).Trim();
                
                var logEntry = $"[PARSING_DIAGNOSTICS] Step=MapFields | Duration={(DateTime.UtcNow - startTime).TotalMilliseconds}ms | CorrelationId={correlationId}";
                
                // Default RoomsCount to 1 if missing (safe assumption for single reservation)
                if (!data.RoomsCount.HasValue || data.RoomsCount.Value < 1)
                {
                    data.RoomsCount = 1;
                }

                // Build extracted marker with RoomsCount and RoomTypeHint
                var extractedParts = new List<string>();
                if (data.RoomsCount.HasValue && data.RoomsCount.Value > 0)
                {
                    extractedParts.Add($"RoomsCount={data.RoomsCount.Value}");
                }
                if (!string.IsNullOrWhiteSpace(data.RoomTypeHint))
                {
                    extractedParts.Add($"RoomTypeHint={data.RoomTypeHint}");
                }
                var extractedMarker = extractedParts.Any() 
                    ? $"[EXTRACTED_V2] {string.Join(" | ", extractedParts)}" 
                    : "";
                
                reservation.Notes = $"{cleanNotes}\n{logEntry}\n{extractedMarker}\n[PARSING_STATUS] Parsed".Trim();

                // Update BookingNumber if extracted and different from auto-generated
                if (!string.IsNullOrWhiteSpace(data.BookingNumber) && reservation.BookingNumber?.StartsWith("PDF-") == true)
                {
                    reservation.BookingNumber = data.BookingNumber;
                }

                // ---------------------------------------------------------
                // AUTO-ASSIGN LOGIC (Best Practice for Automated Ingestion)
                // ---------------------------------------------------------
                // To ensure the reservation appears in 'Occupancy' and 'Financials', 
                // we must assign it to a physical Room (ReservationLine).
                
                // 1. Determine Date Range
                var checkIn = reservation.CheckInDate;
                var checkOut = reservation.CheckOutDate;

                // 2. Identify Unavailable Rooms (Confirmed/CheckedIn/CheckedOut overlap)
                // We exclude Cancelled and Draft from blocking (though we are creating a Draft, we assume we want a free spot)
                var blockingStatuses = new[] { ReservationStatus.Confirmed, ReservationStatus.CheckedIn, ReservationStatus.CheckedOut };
                
                var occupiedRoomIds = await _context.ReservationLines
                    .Where(l => blockingStatuses.Contains(l.Reservation!.Status) &&
                                l.Reservation.CheckInDate < checkOut &&
                                l.Reservation.CheckOutDate > checkIn)
                    .Select(l => l.RoomId)
                    .Distinct()
                    .ToListAsync(cancellationToken);

                // 3. Try to match Room Type
                int? targetRoomTypeId = null;
                if (!string.IsNullOrWhiteSpace(data.RoomTypeHint))
                {
                    // Fuzzy match: if PDF says "Family", match type "Family Suite"
                    var matchedType = await _context.RoomTypes
                        .Where(rt => rt.IsActive)
                        .ToListAsync(cancellationToken); 
                        
                    // Perform client-side fuzzy match string check
                    var bestMatch = matchedType.FirstOrDefault(rt => 
                        rt.Name.Contains(data.RoomTypeHint, StringComparison.OrdinalIgnoreCase) || 
                        data.RoomTypeHint.Contains(rt.Name, StringComparison.OrdinalIgnoreCase));
                    
                    if (bestMatch != null) targetRoomTypeId = bestMatch.Id;
                }

                // 4. Find and assign rooms (supports multiple rooms from PDF)
                var totalAmount = reservation.TotalAmount;
                var nights = (checkOut - checkIn).Days;
                if (nights < 1) nights = 1;
                var roomsNeeded = data.RoomsCount ?? 1;
                
                // Calculate per-room amount
                var perRoomTotal = Math.Round(totalAmount / roomsNeeded, 2);
                var perRoomRatePerNight = Math.Round(perRoomTotal / nights, 2);

                // Clean previous lines (re-parse scenario)
                var existingLines = await _context.ReservationLines
                    .Where(l => l.ReservationId == reservation.Id)
                    .ToListAsync(cancellationToken);
                _context.ReservationLines.RemoveRange(existingLines);

                // Track rooms we've already assigned in this parse
                var assignedRoomIds = new List<int>();
                var assignedNotes = new List<string>();
                var assignedCount = 0;

                for (int roomIdx = 0; roomIdx < roomsNeeded; roomIdx++)
                {
                    // Combine occupied + already-assigned to avoid double-booking
                    var excludedIds = occupiedRoomIds.Concat(assignedRoomIds).Distinct().ToList();

                    Room? availableRoom = null;

                    if (targetRoomTypeId.HasValue)
                    {
                        availableRoom = await _context.Rooms
                            .Include(r => r.RoomType)
                            .Where(r => r.IsActive && r.RoomTypeId == targetRoomTypeId.Value && !excludedIds.Contains(r.Id))
                            .FirstOrDefaultAsync(cancellationToken);
                    }

                    // Fallback: closest base rate to expected per-room rate
                    if (availableRoom == null && perRoomRatePerNight > 0)
                    {
                        var availableRoomsWithTypes = await _context.Rooms
                            .Include(r => r.RoomType)
                            .Where(r => r.IsActive && !excludedIds.Contains(r.Id))
                            .ToListAsync(cancellationToken);

                        availableRoom = availableRoomsWithTypes
                            .OrderBy(r => Math.Abs(r.RoomType!.DefaultRate - perRoomRatePerNight))
                            .FirstOrDefault();
                    }

                    // Final fallback: any available room
                    if (availableRoom == null)
                    {
                        availableRoom = await _context.Rooms
                            .Include(r => r.RoomType)
                            .Where(r => r.IsActive && !excludedIds.Contains(r.Id))
                            .FirstOrDefaultAsync(cancellationToken);
                    }

                    if (availableRoom != null)
                    {
                        // For the last room, assign the remainder to avoid rounding loss
                        var lineTotal = (roomIdx == roomsNeeded - 1)
                            ? totalAmount - (perRoomTotal * (roomsNeeded - 1))
                            : perRoomTotal;

                        var line = new ReservationLine
                        {
                            ReservationId = reservation.Id,
                            RoomId = availableRoom.Id,
                            RoomTypeId = availableRoom.RoomTypeId,
                            Nights = nights,
                            LineTotal = lineTotal,
                            RatePerNight = Math.Round(lineTotal / nights, 2)
                        };

                        _context.ReservationLines.Add(line);
                        assignedRoomIds.Add(availableRoom.Id);
                        assignedNotes.Add($"Room {availableRoom.RoomNumber} ({availableRoom.RoomType?.Name})");
                        assignedCount++;
                    }
                }

                // Update notes
                if (assignedCount > 0)
                {
                    var autoNote = $"\n[AUTO-ASSIGN] Assigned {assignedCount}/{roomsNeeded} room(s): {string.Join(", ", assignedNotes)}";
                    if (!reservation.Notes?.Contains("[AUTO-ASSIGN]") == true) reservation.Notes += autoNote;
                }
                else
                {
                    var failNote = "\n[AUTO-ASSIGN] FAILED: No available rooms found.";
                    if (!reservation.Notes?.Contains(failNote) == true) reservation.Notes += failNote;
                }

                await _context.SaveChangesAsync(cancellationToken);
                
                try { File.AppendAllText(@"c:\Users\Workstation\hotel\debug_log.txt", $"[DEBUG] Parsing Finished. Total Price: {data.TotalPrice}\n"); } catch {}

                return new PdfParsingResultDto
                {
                    ReservationId = reservation.Id,
                    ParsingStatus = "Parsed",
                    CorrelationId = correlationId,
                    Errors = parseOutput.Errors,
                    Extracted = new ExtractedPdfDataDto
                    {
                        GuestName = data.GuestName,
                        Phone = data.Phone,
                        CheckIn = data.CheckIn?.ToString("yyyy-MM-dd"),
                        CheckOut = data.CheckOut?.ToString("yyyy-MM-dd"),
                        RoomsCount = data.RoomsCount,
                        RoomTypeHint = data.RoomTypeHint,
                        TotalPrice = data.TotalPrice,
                        Currency = reservation.Currency,
                        BookingNumber = data.BookingNumber ?? reservation.BookingNumber
                    }
                };
            }
            else
            {
                // Managed failure from parser - normalize error code before storing
                Console.WriteLine($"[DEBUG] Parsing Failed: {parseOutput.ErrorMessage}");
                
                var normalizedCode = PdfParseErrorCodeNormalizer.Normalize(parseOutput.ErrorCode) ?? PdfParseErrorCodes.Unknown;
                var cleanNotes = Regex.Replace(reservation.Notes ?? string.Empty, @"\[PARSING_STATUS\].*", "").Trim();
                var logEntry = $"[PARSING_DIAGNOSTICS] Step={parseOutput.FailureStep} | Code={normalizedCode} | CorrelationId={correlationId}";
                reservation.Notes = $"{cleanNotes}\n{logEntry}\n[PARSING_STATUS] Failed".Trim();
                await _context.SaveChangesAsync(cancellationToken);

                throw new PdfParsingException(
                    parseOutput.ErrorMessage ?? PdfParseErrorMessages.ToUserMessage(normalizedCode) ?? "Parsing failed",
                    normalizedCode,
                    parseOutput.FailureStep ?? "Unknown",
                    correlationId);
            }
        }
        catch (PdfParsingException)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Unexpected failure - use canonical SERVER_ERROR code
            var cleanNotes = Regex.Replace(reservation.Notes ?? string.Empty, @"\[PARSING_STATUS\].*", "").Trim();
            reservation.Notes = $"{cleanNotes}\n[PARSING_DIAGNOSTICS] Step=Unhandled | Code={PdfParseErrorCodes.ServerError} | Err={ex.Message} | CorrelationId={correlationId}\n[PARSING_STATUS] Failed".Trim();
            await _context.SaveChangesAsync(cancellationToken);

            throw new PdfParsingException(
                PdfParseErrorMessages.ToUserMessage(PdfParseErrorCodes.ServerError)!,
                PdfParseErrorCodes.ServerError,
                "Unhandled",
                ex,
                correlationId);
        }
    }
}
