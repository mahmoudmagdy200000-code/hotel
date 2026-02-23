using System.Globalization;
using System.Text.RegularExpressions;

namespace CleanArchitecture.Infrastructure.Files;

/// <summary>
/// Deterministic, anchor-based extraction rules for PDF reservation parsing.
/// Supports common OTA vendors: Booking.com, Agoda, Expedia, and generic formats.
/// </summary>
public static class PdfExtractionRules
{
    #region Date Formats (Culture-Invariant)
    
    // Supported date formats in order of preference (most specific first)
    private static readonly string[] DateFormats = new[]
    {
        "yyyy-MM-dd",           // ISO: 2026-01-27
        "dd/MM/yyyy",           // European: 27/01/2026
        "MM/dd/yyyy",           // US: 01/27/2026
        "dd-MM-yyyy",           // European dash: 27-01-2026
        "dd MMM yyyy",          // Short month: 27 Jan 2026
        "dd MMMM yyyy",         // Full month: 27 January 2026
        "MMM dd, yyyy",         // US style: Jan 27, 2026
        "MMMM dd, yyyy",        // US full: January 27, 2026
        "d MMM yyyy",           // Single digit day: 5 Jan 2026
        "d MMMM yyyy",          // Single digit day full: 5 January 2026
    };

    #endregion

    #region Label Patterns (Anchor-based)
    
    // Check-in label variants (case-insensitive, anchored)
    private static readonly string[] CheckInLabels = new[]
    {
        @"Check-?in\s*(?:date)?",
        @"Arrival\s*(?:date)?",
        @"From",
        @"Stay\s*from",
        @"Arriving",
        @"Въезд",               // Russian
        @"تاريخ الدخول",        // Arabic
    };

    // Check-out label variants
    private static readonly string[] CheckOutLabels = new[]
    {
        @"Check-?out\s*(?:date)?",
        @"Departure\s*(?:date)?",
        @"Until",
        @"To",
        @"Stay\s*to",
        @"Leaving",
        @"Выезд",               // Russian
        @"تاريخ الخروج",        // Arabic
    };

    // Guest name section labels
    private static readonly string[] GuestNameLabels = new[]
    {
        @"Guest\s*(?:name|information)?",
        @"Lead\s*guest",
        @"Main\s*guest",
        @"Name",
        @"Customer\s*(?:name)?",
        @"Reserved\s*(?:for|by)",
        @"Booked\s*by",
        @"Full\s*name",
        @"اسم الضيف",           // Arabic
    };

    // Booking number labels
    private static readonly string[] BookingNumberLabels = new[]
    {
        @"Booking\s*(?:number|#|no\.?|id|confirmation)",
        @"Confirmation\s*(?:number|#|no\.?|code)",
        @"Reservation\s*(?:number|#|no\.?|id)",
        @"Reference\s*(?:number|#)?",
        @"Conf\.\s*#",
        @"رقم الحجز",           // Arabic
    };

    // Total price labels (ordered by priority)
    private static readonly string[] TotalPriceLabels = new[]
    {
        @"Grand\s*total\b",
        @"Total\s*amount\b",
        @"Amount\s*due\b",
        @"Amount\s*payable\b",
        @"Total\s*due\b",
        @"Total\s*charges?\b",
        @"Total\s*price\b",
        @"Total\s*cost\b",
        @"Total\s*payment\b",
        @"Total\s*booking\b",
        @"Total\s*to\s*pay\b",
        @"Total\s*inc(?:l)?\.?\s*tax(?:es)?\b",
        @"Total\b",
        @"Price\b",
        @"Balance\s*due\b",
        @"Balance\b",
        @"الإجمالي",            // Arabic
        @"إجمالي\s*السعر",       // Arabic
    };

    // Phone labels
    private static readonly string[] PhoneLabels = new[]
    {
        @"Phone\s*(?:number)?",
        @"Tel(?:ephone)?",
        @"Mobile\s*(?:number)?",
        @"Contact\s*(?:number)?",
        @"Cell",
        @"الهاتف",              // Arabic
    };

    // Currency codes (ISO 4217 + common abbreviations)
    private static readonly Dictionary<string, string> CurrencyNormalization = new(StringComparer.OrdinalIgnoreCase)
    {
        { "USD", "USD" },
        { "EUR", "EUR" },
        { "GBP", "GBP" },
        { "EGP", "EGP" },
        { "LE", "EGP" },
        { "L.E", "EGP" },
        { "E.G.P", "EGP" },
        { "AED", "AED" },
        { "SAR", "SAR" },
        { "THB", "THB" },
        { "INR", "INR" },
        { "$", "USD" },
        { "€", "EUR" },
        { "£", "GBP" },
        { "ج.م", "EGP" },
    };

    #endregion

    #region Extraction Methods

    /// <summary>
    /// Extracts check-in date using anchor-based matching.
    /// Finds the label first, then captures the closest date after it.
    /// </summary>
    public static DateOnly? ExtractCheckIn(string text)
    {
        return ExtractDateNearLabel(text, CheckInLabels);
    }

    /// <summary>
    /// Extracts check-out date using anchor-based matching.
    /// </summary>
    public static DateOnly? ExtractCheckOut(string text)
    {
        return ExtractDateNearLabel(text, CheckOutLabels);
    }

    /// <summary>
    /// Extracts guest name from the text.
    /// Looks for guest section label, then captures the line content.
    /// </summary>
    public static string? ExtractGuestName(string text)
    {
        // Common field boundary markers that indicate end of guest name
        var boundaryMarkers = new[]
        {
            "Total guests", "Total units", "Preferred language", "Country", 
            "Nationality", "Email", "Phone", "Mobile", "Address", "Check-in",
            "Check-out", "Arrival", "Departure", "Turkey", "Egypt", "Russia",
            "Germany", "France", "Italy", "Spain", "China", "India", "Brazil",
            "Ukraine", "Greece", "USA", "UK", "Poland", "England",
            "Adult", "adult", "1 adult", "2 adults"
        };
        
        foreach (var label in GuestNameLabels)
        {
            // Pattern: Label followed by colon/space, then capture until newline, pipe, or known boundary
            // We use (?<![a-zA-Z]) instead of \b to handle cases where OCR merges the label with previous field (e.g. "12345Guest")
            // Removed trailing \b from label to handle fused text like "GuestName" although \b is usually okay there.
            // The important part is handling what follows the capture.
            var pattern = $@"(?<![a-zA-Z]){label}\b\s*[:：]?\s*([^\n\r\|]+)";
            var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
            if (match.Success)
            {
                var rawName = match.Groups[1].Value;
                
                // If the name starts with "Name:" or "Guest:", it means we matched a too-generic label
                // and the actual name is further ahead. We should strip it if it was part of the capture.
                rawName = Regex.Replace(rawName, @"^(?:Name|Guest|Main Guest|Lead Guest)\s*[:：]?\s*", "", RegexOptions.IgnoreCase);

                // Check for boundary markers and truncate at the first one found
                int earliestBoundary = rawName.Length;
                foreach (var marker in boundaryMarkers)
                {
                    var markerPos = rawName.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
                    if (markerPos != -1 && markerPos < earliestBoundary)
                    {
                        earliestBoundary = markerPos;
                    }
                }
                
                // Truncate at boundary
                var name = rawName.Substring(0, earliestBoundary);
                name = CleanExtractedText(name);
                
                // Validate: name should have at least 2 characters and not be a date/number
                if (!string.IsNullOrWhiteSpace(name) && name.Length >= 2 && name.Length <= 100 && !Regex.IsMatch(name, @"^\d+$"))
                {
                    return name;
                }
            }
        }
        return null;
    }

    /// <summary>
    /// Extracts booking/confirmation number.
    /// </summary>
    public static string? ExtractBookingNumber(string text)
    {
        foreach (var label in BookingNumberLabels)
        {
            // Pattern: Label followed by colon/space, then alphanumeric booking ID
            // Restricted to single-line matching ([ \t] instead of \s) to avoid matching "Booking Confirmation" title
            // and jumping to the next line to capture "Confirmation".
            // Use (?<![a-zA-Z]) to handle fused OCR text.
            var pattern = $@"(?<![a-zA-Z]){label}\b[ \t]*[:：#]?[ \t]*(?:number|no\.?|id|code)?[ \t]*[:：#]?[ \t]*([A-Z0-9]+[\dA-Z\-\.]*)";
            var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
            if (match.Success)
            {
                var number = CleanExtractedText(match.Groups[1].Value);

                // Truncate if fused with next label (e.g., "6693946220Guest")
                var stopWords = new[] { "Guest", "Check-in", "Check-out", "Arrival", "Departure", "Total", "Price" };
                foreach (var stopWord in stopWords)
                {
                    var stopIdx = number.IndexOf(stopWord, StringComparison.OrdinalIgnoreCase);
                    if (stopIdx > 0)
                    {
                        number = number.Substring(0, stopIdx);
                    }
                }

                // Validate: booking number should have at least 4 characters
                if (!string.IsNullOrWhiteSpace(number) && number.Length >= 4)
                {
                    return number.ToUpperInvariant();
                }
            }
        }
        return null;
    }

    /// <summary>
    /// Extracts total price amount and currency.
    /// </summary>
    public static (decimal? Amount, string? Currency) ExtractTotalPrice(string text)
    {
        try {
            File.AppendAllText(@"c:\Users\Workstation\hotel\debug_log.txt", $"[DEBUG] Extracting Total Price. Text Length: {text.Length}\n");
            if (text.Length > 0) 
            {
                var preview = text.Substring(0, Math.Min(1000, text.Length)).Replace("\n", "\\n").Replace("\r", "");
                File.AppendAllText(@"c:\Users\Workstation\hotel\debug_log.txt", $"[DEBUG] Text Dump: {preview}\n");
            }
        } catch {}
        
            // Primary Strategy: Structured Regex
            foreach (var label in TotalPriceLabels)
            {
                // Debug: Print if label is found
                if (Regex.IsMatch(text, Regex.Escape(label), RegexOptions.IgnoreCase))
                {
                   Console.WriteLine($"[DEBUG] Found label: {label}");
                }

                // Pattern: Label, optional colon, optional currency code/symbol, then number
                // We use [\s\r\n]* explicitly to ensure we match across lines reliably
                // We use ([\d\., ]+) for amount to be permissive (OCRs are messy, formats vary), relying on NormalizeAmount to clean it up.
                // UPDATED REGEX: Now supports symbols ($ € £) or codes (USD EUR) both BEFORE and AFTER the amount.
                var pattern = $@"{label}[\s\r\n]*[:：]?[\s\r\n]*(?:([A-Z€£$]{{1,3}})[\s\r\n]*)?([\d\., ]+)(?:[\s\r\n]*([A-Z€£$]{{1,3}}|[A-Z]{{2,3}}))?";
                var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase | RegexOptions.Multiline);
                if (match.Success)
                {
                    Console.WriteLine($"[DEBUG] Strict Match Success! Groups: '{match.Groups[1].Value}', '{match.Groups[2].Value}', '{match.Groups[3].Value}'");
                    
                    // Currency might be before or after the amount
                    var currencyBefore = match.Groups[1].Value.Trim();
                    var amountStr = match.Groups[2].Value;
                    var currencyAfter = match.Groups[3].Value.Trim();

                    // Double-check we didn't match a "subtotal" if we have other options
                    // Though \bTotal\b should already prevent this.
                    int checkStart = Math.Max(0, match.Index - 10);
                    int checkLength = Math.Min(match.Length + 20, text.Length - checkStart);
                    
                    if (label.Contains("Total", StringComparison.OrdinalIgnoreCase) && 
                        text.Substring(checkStart, checkLength).Contains("subtotal", StringComparison.OrdinalIgnoreCase))
                    {
                         continue;
                    }

                    // Normalize amount (handle different decimal separators)
                    var normalizedAmount = NormalizeAmount(amountStr);
                    Console.WriteLine($"[DEBUG] Normalized Amount: {normalizedAmount}");
                    
                    if (normalizedAmount.HasValue)
                    {
                        var currency = NormalizeCurrency(!string.IsNullOrEmpty(currencyBefore) ? currencyBefore : currencyAfter);
                        
                        // Debug: What did we find?
                        Console.WriteLine($"[DEBUG] Found currency: {currency}");

                        return (normalizedAmount, currency);
                    }
                }
            }
        
        // Fallback Strategy: Aggressive scan (Loose)
        // If structured regex failed, look for [Label] ... [Number] within 50 chars context
        foreach (var label in TotalPriceLabels)
        {
             // Match label, then any chars (non-greedy), then a number-like sequence
             // Singleline mode (.) matches newlines
             var pattern = $@"{label}.{{0,50}}?([\d\., ]+\d)"; 
             var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase | RegexOptions.Singleline);
             
             if (match.Success)
             {
                 var amountStr = match.Groups[1].Value;
                 Console.WriteLine($"[DEBUG] Fallback Match: '{amountStr}' near label '{label}'");

                 // Avoid picking up year 2026 as price if it appears right after
                 if (amountStr.Contains("2024") || amountStr.Contains("2025") || amountStr.Contains("2026")) continue;

                 var normalizedAmount = NormalizeAmount(amountStr);
                 if (normalizedAmount.HasValue && normalizedAmount.Value > 0)
                 {
                     // Try to find currency near the number
                     var contextStart = match.Index;
                     var contextLength = Math.Min(match.Length + 10, text.Length - contextStart);
                     var context = text.Substring(contextStart, contextLength);
                     
                     string? currency = null;
                     foreach (var kvp in CurrencyNormalization)
                     {
                         if (context.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase))
                         {
                             currency = kvp.Value;
                             break;
                         }
                     }
                     
                     // Default to USD if no currency symbol/code was found near the amount
                     if (currency == null) {
                         currency = "USD";
                     }

                     Console.WriteLine($"[DEBUG] Fallback Success: {normalizedAmount} {currency}");
                     return (normalizedAmount, currency);
                 }
             }
        }
        
        Console.WriteLine("[DEBUG] No Price extracted.");
        return (null, null);
    }

    /// <summary>
    /// Phase 7.2: Auto-detect CurrencyCode from PDF extracted text.
    /// Priority is given to the 'hint' (currency string found near price).
    /// </summary>
    /// <summary>
    /// Phase 7.2: Auto-detect CurrencyCode from PDF extracted text.
    /// Priority is given to the 'hint' (currency string found near price).
    /// </summary>
    public static CleanArchitecture.Domain.Enums.CurrencyCode DetectCurrencyCode(string text, string? hint = null, decimal? amount = null)
    {
        // 1. Check hint first (most reliable as it was found near the actual price)
        if (!string.IsNullOrWhiteSpace(hint))
        {
            var normalizedHint = NormalizeCurrency(hint);
            if (normalizedHint == "USD") return Domain.Enums.CurrencyCode.USD;
            if (normalizedHint == "EUR") return Domain.Enums.CurrencyCode.EUR;
            if (normalizedHint == "EGP") return Domain.Enums.CurrencyCode.EGP;
        }

        // 2. Heuristic: Price Plausibility (Higher priority than global scan if amount is unambiguous)
        // If amount is < 400 and NO hints found, it's very likely USD/EUR.
        // In Egypt, a hotel for < 400 EGP ($8) is rare, but $100 is common.
        if (amount.HasValue && amount.Value > 0 && amount.Value < 400)
        {
            return Domain.Enums.CurrencyCode.USD;
        }

        if (string.IsNullOrWhiteSpace(text)) return Domain.Enums.CurrencyCode.USD; // Default to USD per system preference

        // 3. Global scan as fallback
        // EUR: € OR EUR
        if (Regex.IsMatch(text, @"€|\bEUR\b|\bEuro\b", RegexOptions.IgnoreCase))
            return Domain.Enums.CurrencyCode.EUR;

        // USD: $ OR USD OR US Dollar
        if (Regex.IsMatch(text, @"\$|\bUSD\b|\bUS\s*Dollar|\bU\.S\.\s*Dollar", RegexOptions.IgnoreCase))
            return Domain.Enums.CurrencyCode.USD;

        // EGP: EGP OR LE OR ج.م
        if (Regex.IsMatch(text, @"\bEGP\b|\bLE\b|ج\.م", RegexOptions.IgnoreCase))
            return Domain.Enums.CurrencyCode.EGP;

        // Default to USD (Center of gravity for the system)
        return Domain.Enums.CurrencyCode.USD;
    }

    /// <summary>
    /// Extracts phone number.
    /// </summary>
    public static string? ExtractPhone(string text)
    {
        foreach (var label in PhoneLabels)
        {
            var pattern = $@"{label}\s*[:：]?\s*([\+\d\s\-\(\)]+)";
            var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
            if (match.Success)
            {
                var phone = Regex.Replace(match.Groups[1].Value, @"[^\d\+]", "");
                // Validate: phone should have at least 7 digits
                if (phone.Length >= 7)
                {
                    return phone;
                }
            }
        }
        return null;
    }

    /// <summary>
    /// Extracts room count.
    /// </summary>
    /// <summary>
    /// Extracts room count.
    /// </summary>
    public static int? ExtractRoomsCount(string text)
    {
        // 1. Line-by-line precise scanning (Safe)
        var lines = text.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries);

        var linePatterns = new[]
        {
            @"(?<![a-zA-Z])(?:room|rooms|unit|units|apartment|apartments|accommodation)\b\s*[:：]?\s*(\d{1,2})(?![0-9])",
            @"(?<![a-zA-Z])number\s*of\s*(?:rooms|units|apartments)\b\s*[:：]?\s*(\d{1,2})(?![0-9])",
            @"(?<![a-zA-Z])(\d{1,2})\s*(?:[xX*]\s*)?(?:room|rooms|unit|units|apartment|apartments|accommodation)(?![a-zA-Z0-9])",
            @"Total\s*(?:rooms|units)\b\s*[:：]?\s*(\d{1,2})(?![0-9])",
            @"Quantity\b\s*[:：]?\s*(\d{1,2})(?![0-9])",
            @"Qty\b\s*[:：]?\s*(\d{1,2})(?![0-9])",
            @"No\.\s*of\s*rooms\b\s*[:：]?\s*(\d{1,2})(?![0-9])",
            @"(?:عدد الغرف|الوحدات|الغرف)\s*[:：]?\s*(\d{1,2})(?![0-9])", // Arabic
        };

        foreach (var line in lines)
        {
            foreach (var pattern in linePatterns)
            {
                var match = Regex.Match(line, pattern, RegexOptions.IgnoreCase);
                if (match.Success && int.TryParse(match.Groups[1].Value, out var count) && count > 0 && count <= 50)
                {
                    // nights check logic (avoid extracting '2 nights' as 2 rooms)
                    if (line.Contains("night", StringComparison.OrdinalIgnoreCase) && !line.Contains("room", StringComparison.OrdinalIgnoreCase))
                    {
                         continue;
                    }
                    // If line says "2 nights" AND "1 room", we want to be careful not to match the nights number
                    // The regexes try to anchor to 'room', but '2 * room' might match '2 * nights' if we are careless.
                    // The specific patterns above include 'room' keyword, so it should be safe.
                    
                    return count;
                }
            }
        }

        // 2. Multi-line fallback
        var multiPatterns = new[]
        {
            @"(?:room|rooms|unit|units|apartment|apartments)\b[\s\r\n]*[:：]?[\s\r\n]*(\d{1,2})(?![0-9])",
            @"(?:accommodation|quantity|qty)\b[\s\r\n]*[:：]?[\s\r\n]*(\d{1,2})(?![0-9])",
        };

        foreach (var pattern in multiPatterns)
        {
            var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase | RegexOptions.Singleline);
            if (match.Success && int.TryParse(match.Groups[1].Value, out var count) && count > 0 && count <= 50)
            {
                if (match.Length < 30)
                {
                    return count;
                }
            }
        }

        return null;
    }

    #endregion

    #region Private Helpers

    /// <summary>
    /// Extracts a date near the given label patterns.
    /// </summary>
    private static DateOnly? ExtractDateNearLabel(string text, string[] labels)
    {
        foreach (var label in labels)
        {
            // Find label position
            var labelMatch = Regex.Match(text, $@"{label}\s*[:：]?\s*", RegexOptions.IgnoreCase);
            if (labelMatch.Success)
            {
                // Get text after the label (up to 50 chars or next newline)
                var startPos = labelMatch.Index + labelMatch.Length;
                var remaining = text.Substring(startPos, Math.Min(50, text.Length - startPos));
                
                // Try to extract date from the remaining text
                var date = ParseDateFromText(remaining);
                if (date.HasValue)
                {
                    return date;
                }
            }
        }
        return null;
    }

    /// <summary>
    /// Parses a date from text using multiple formats.
    /// Uses InvariantCulture to prevent DD/MM vs MM/DD ambiguity.
    /// </summary>
    private static DateOnly? ParseDateFromText(string text)
    {
        // First, try to extract a date-like pattern
        var datePatterns = new[]
        {
            @"(\d{4}-\d{2}-\d{2})",                          // 2026-01-27
            @"(\d{1,2}/\d{1,2}/\d{4})",                      // 27/01/2026 or 1/27/2026
            @"(\d{1,2}-\d{1,2}-\d{4})",                      // 27-01-2026
            @"(\d{1,2}\s+\w{3,9}\s+\d{4})",                  // 27 January 2026
            @"(\w{3,9}\s+\d{1,2},?\s+\d{4})",                // January 27, 2026
        };

        foreach (var pattern in datePatterns)
        {
            var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);
            if (match.Success)
            {
                var dateStr = match.Groups[1].Value.Trim();
                
                // Try parsing with explicit formats (culture-invariant)
                foreach (var format in DateFormats)
                {
                    if (DateTime.TryParseExact(dateStr, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
                    {
                        return DateOnly.FromDateTime(dt);
                    }
                }

                // Fallback: try standard parsing (for flexibility)
                if (DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var fallbackDt))
                {
                    return DateOnly.FromDateTime(fallbackDt);
                }
            }
        }
        return null;
    }

    /// <summary>
    /// Normalizes amount string to decimal (handles 1,234.56 and 1.234,56 formats).
    /// </summary>
    private static decimal? NormalizeAmount(string amountStr)
    {
        if (string.IsNullOrWhiteSpace(amountStr)) return null;

        // Remove spaces
        amountStr = Regex.Replace(amountStr, @"\s", "");

        // Determine format: if last separator is comma with 2 digits after, it's the decimal sep
        var lastComma = amountStr.LastIndexOf(',');
        var lastDot = amountStr.LastIndexOf('.');

        if (lastComma > lastDot && amountStr.Length - lastComma <= 3)
        {
            // European format: 1.234,56 -> 1234.56
            amountStr = amountStr.Replace(".", "").Replace(",", ".");
        }
        else
        {
            // US format or no decimal: 1,234.56 -> 1234.56
            amountStr = amountStr.Replace(",", "");
        }

        if (decimal.TryParse(amountStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var amount))
        {
            return amount;
        }
        return null;
    }

    /// <summary>
    /// Normalizes currency code to ISO 4217.
    /// </summary>
    public static string? NormalizeCurrency(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        raw = raw.Trim().Replace(".", "").ToUpperInvariant();
        return CurrencyNormalization.TryGetValue(raw, out var normalized) ? normalized : raw;
    }

    /// <summary>
    /// Cleans extracted text (trims, removes extra whitespace).
    /// </summary>
    private static string CleanExtractedText(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        
        // Remove BOM and Zero Width characters from start
        text = Regex.Replace(text, @"^[\uFEFF\u200B\u200C\u200D\u2060]+", "");
        
        // Remove extra whitespace, trim
        text = Regex.Replace(text, @"\s+", " ").Trim();
        // Remove trailing punctuation
        text = Regex.Replace(text, @"[,;:\-]+$", "").Trim();
        return text;
    }

    #endregion

    #region Validation

    /// <summary>
    /// Validates extracted data and returns a list of validation errors.
    /// </summary>
    public static List<string> ValidateExtraction(
        DateOnly? checkIn,
        DateOnly? checkOut,
        string? guestName,
        string? bookingNumber,
        int? nights = null)
    {
        var errors = new List<string>();

        // Rule 1: checkOut must be after checkIn
        if (checkIn.HasValue && checkOut.HasValue)
        {
            if (checkOut.Value <= checkIn.Value)
            {
                errors.Add("Check-out date must be after check-in date.");
            }
        }

        // Rule 2: If nights is provided, verify it matches
        if (checkIn.HasValue && checkOut.HasValue && nights.HasValue)
        {
            var calculatedNights = (checkOut.Value.ToDateTime(TimeOnly.MinValue) - checkIn.Value.ToDateTime(TimeOnly.MinValue)).Days;
            if (calculatedNights != nights.Value)
            {
                errors.Add($"Nights mismatch: document says {nights.Value}, calculated {calculatedNights}.");
            }
        }

        // Rule 3: At minimum, we need either (checkIn AND checkOut) OR (guestName OR bookingNumber)
        var hasDates = checkIn.HasValue && checkOut.HasValue;
        var hasIdentifier = !string.IsNullOrWhiteSpace(guestName) || !string.IsNullOrWhiteSpace(bookingNumber);

        if (!hasDates && !hasIdentifier)
        {
            errors.Add("Insufficient data: need dates or guest/booking identifier.");
        }

        // Rule 4: If dates exist but are unreasonable
        // Phase 7.2: Allow past dates for PDF flow. We widen the range significantly.
        if (checkIn.HasValue)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var tenYearsAgo = today.AddYears(-10);
            var tenYearsAhead = today.AddYears(10);

            if (checkIn.Value < tenYearsAgo || checkIn.Value > tenYearsAhead)
            {
                errors.Add($"Check-in date {checkIn.Value:yyyy-MM-dd} seems unreasonable (outside 10-year range).");
            }
        }

        return errors;
    }

    #endregion
}
