namespace CleanArchitecture.Domain.Constants;

/// <summary>
/// Normalizes legacy error codes to canonical codes.
/// Provides backward compatibility for old records stored with legacy codes.
/// </summary>
public static class PdfParseErrorCodeNormalizer
{
    // Mapping of legacy codes to canonical codes
    private static readonly Dictionary<string, string> LegacyToCanonical = new(StringComparer.OrdinalIgnoreCase)
    {
        // Legacy codes found in GetPendingRequestsQuery
        { "NO_TEXT_PDF", PdfParseErrorCodes.PdfNoText },
        { "PROTECTED_PDF", PdfParseErrorCodes.PdfEncrypted },
        
        // Additional potential legacy mappings for completeness
        { "NO_TEXT", PdfParseErrorCodes.PdfNoText },
        { "ENCRYPTED", PdfParseErrorCodes.PdfEncrypted },
        { "MALFORMED", PdfParseErrorCodes.PdfMalformed },
        { "TIMEOUT", PdfParseErrorCodes.OcrTimeout },
        { "ERROR", PdfParseErrorCodes.ServerError },
    };

    /// <summary>
    /// Normalizes a legacy error code to its canonical equivalent.
    /// If the code is already canonical or unknown, returns it unchanged.
    /// </summary>
    /// <param name="code">The error code (legacy or canonical).</param>
    /// <returns>The canonical error code, or the original code if not recognized as legacy.</returns>
    public static string? Normalize(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return null;

        var trimmed = code.Trim();

        // Check if it's a known legacy code
        if (LegacyToCanonical.TryGetValue(trimmed, out var canonical))
            return canonical;

        // Already canonical or unknown - return as-is
        return trimmed;
    }

    /// <summary>
    /// Checks if a code is a known legacy code that should be normalized.
    /// </summary>
    /// <param name="code">The error code to check.</param>
    /// <returns>True if the code is a legacy code.</returns>
    public static bool IsLegacyCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return false;

        return LegacyToCanonical.ContainsKey(code.Trim());
    }

    /// <summary>
    /// Checks if a code is a known canonical code.
    /// </summary>
    /// <param name="code">The error code to check.</param>
    /// <returns>True if the code is a canonical code.</returns>
    public static bool IsCanonicalCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return false;

        return PdfParseErrorCodes.AllCodes.Contains(code.Trim());
    }
}
