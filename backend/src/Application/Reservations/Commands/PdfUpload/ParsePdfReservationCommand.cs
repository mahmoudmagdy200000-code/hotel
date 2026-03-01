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
    public string? MealPlan { get; set; }
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

                // Build extracted marker — include all metadata in EXTRACTED_V2 tag
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

                // Update BookingNumber if extracted and different from auto-generated
                if (!string.IsNullOrWhiteSpace(data.BookingNumber) && reservation.BookingNumber?.StartsWith("PDF-") == true)
                {
                    reservation.BookingNumber = data.BookingNumber;
                }

                // ---------------------------------------------------------
                // AUTO-ASSIGN LOGIC — TEXT/KEYWORD BASED ONLY (Bug 1 Fix)
                // ---------------------------------------------------------
                // Room matching is performed ONLY via text matching of RoomTypeHint.
                // Price-based fallback has been removed: OTA prices (with Genius discounts,
                // seasonal rates, etc.) must NEVER drive room type selection.
                // Safe Fallback: if no text match → leave reservation unassigned.
                // The receptionist will manually pick the correct room before Check-in.

                var checkIn = reservation.CheckInDate;
                var checkOut = reservation.CheckOutDate;

                // Identify occupied rooms (overlapping confirmed/checked-in bookings only)
                var blockingStatuses = new[] { ReservationStatus.Confirmed, ReservationStatus.CheckedIn, ReservationStatus.CheckedOut };
                var occupiedRoomIds = await _context.ReservationLines
                    .Where(l => blockingStatuses.Contains(l.Reservation!.Status) &&
                                l.Reservation.CheckInDate < checkOut &&
                                l.Reservation.CheckOutDate > checkIn)
                    .Select(l => l.RoomId)
                    .Distinct()
                    .ToListAsync(cancellationToken);

                // Resolve target RoomType ID via keyword/text match only
                int? targetRoomTypeId = null;
                if (!string.IsNullOrWhiteSpace(data.RoomTypeHint))
                {
                    var activeRoomTypes = await _context.RoomTypes
                        .Where(rt => rt.IsActive)
                        .ToListAsync(cancellationToken);

                    // Score each room type: higher score = better match
                    // Strategy: split the hint into keywords and count how many appear in the type name (and vice-versa)
                    var hint = data.RoomTypeHint.ToUpperInvariant();
                    var hintKeywords = Regex.Split(hint, @"\W+").Where(w => w.Length >= 3).ToArray();

                    int bestScore = 0;
                    Domain.Entities.RoomType? bestType = null;

                    foreach (var rt in activeRoomTypes)
                    {
                        var rtName = rt.Name.ToUpperInvariant();
                        var rtKeywords = Regex.Split(rtName, @"\W+").Where(w => w.Length >= 3).ToArray();

                        int score = 0;
                        // Keyword overlap: hint keywords found in room type name
                        score += hintKeywords.Count(k => rtName.Contains(k));
                        // Keyword overlap: room type name keywords found in hint
                        score += rtKeywords.Count(k => hint.Contains(k));
                        // Bonus: exact substring match in either direction
                        if (rtName.Contains(hint) || hint.Contains(rtName)) score += 5;

                        if (score > bestScore)
                        {
                            bestScore = score;
                            bestType = rt;
                        }
                    }

                    // Only use the match if confidence is sufficient (score >= 2 means at least one keyword matched bidirectionally)
                    if (bestScore >= 2 && bestType != null)
                    {
                        targetRoomTypeId = bestType.Id;
                        Console.WriteLine($"[AUTO-ASSIGN] RoomType matched: '{bestType.Name}' (score={bestScore}) for hint '{data.RoomTypeHint}'");
                    }
                    else
                    {
                        Console.WriteLine($"[AUTO-ASSIGN] No confident RoomType match for hint '{data.RoomTypeHint}'. Leaving unassigned.");
                    }
                }

                // Remove previous lines (re-parse scenario)
                var existingLines = await _context.ReservationLines
                    .Where(l => l.ReservationId == reservation.Id)
                    .ToListAsync(cancellationToken);
                _context.ReservationLines.RemoveRange(existingLines);

                var roomsNeeded = data.RoomsCount ?? 1;
                var nights = (checkOut - checkIn).Days;
                if (nights < 1) nights = 1;
                var totalAmount = reservation.TotalAmount;
                var perRoomTotal = Math.Round(totalAmount / roomsNeeded, 2);

                var assignedRoomIds = new List<int>();
                var assignedNotes = new List<string>();
                var assignedCount = 0;

                if (targetRoomTypeId.HasValue)
                {
                    for (int roomIdx = 0; roomIdx < roomsNeeded; roomIdx++)
                    {
                        var excludedIds = occupiedRoomIds.Concat(assignedRoomIds).Distinct().ToList();

                        var availableRoom = await _context.Rooms
                            .Include(r => r.RoomType)
                            .Where(r => r.IsActive && r.RoomTypeId == targetRoomTypeId.Value && !excludedIds.Contains(r.Id))
                            .FirstOrDefaultAsync(cancellationToken);

                        if (availableRoom != null)
                        {
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
                }

                // Update notes with assignment result
                if (assignedCount > 0)
                {
                    reservation.Notes += $"\n[AUTO-ASSIGN] Assigned {assignedCount}/{roomsNeeded} room(s): {string.Join(", ", assignedNotes)}";
                }
                else
                {
                    // Safe fallback: no room assigned — receptionist must assign manually before Check-in
                    var reason = targetRoomTypeId.HasValue
                        ? "No available rooms found for matched type."
                        : string.IsNullOrWhiteSpace(data.RoomTypeHint)
                            ? "Room type not found in PDF."
                            : $"No confident RoomType match for '{data.RoomTypeHint}'.";
                    reservation.Notes += $"\n[WARN] Room unassigned — {reason} Please assign a room manually before Check-in.";
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
                        MealPlan = data.MealPlan,
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
