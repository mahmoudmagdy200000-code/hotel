namespace CleanArchitecture.Domain.Constants;

/// <summary>
/// Canonical PDF parsing error codes.
/// These are the ONLY error codes that should be stored in the database.
/// Use <see cref="PdfParseErrorMessages.ToUserMessage"/> for user-friendly messages.
/// Use <see cref="PdfParseErrorCodeNormalizer.Normalize"/> to convert legacy codes.
/// </summary>
public static class PdfParseErrorCodes
{
    /// <summary>
    /// The PDF file could not be found on the server.
    /// </summary>
    public const string FileNotFound = "FILE_NOT_FOUND";

    /// <summary>
    /// The PDF contains no extractable text (may be a scan/image).
    /// </summary>
    public const string PdfNoText = "PDF_NO_TEXT";

    /// <summary>
    /// The PDF is password-protected or encrypted.
    /// </summary>
    public const string PdfEncrypted = "PDF_ENCRYPTED";

    /// <summary>
    /// The PDF file is corrupted or malformed.
    /// </summary>
    public const string PdfMalformed = "PDF_MALFORMED";

    /// <summary>
    /// Minimum required fields could not be extracted.
    /// </summary>
    public const string InsufficientData = "INSUFFICIENT_DATA";

    /// <summary>
    /// Parser could not extract any data from the document.
    /// </summary>
    public const string EmptyResult = "EMPTY_RESULT";

    /// <summary>
    /// A generic parsing error occurred.
    /// </summary>
    public const string ParsingError = "PARSING_ERROR";

    /// <summary>
    /// An unexpected server error occurred.
    /// </summary>
    public const string ServerError = "SERVER_ERROR";

    /// <summary>
    /// OCR processing timed out.
    /// </summary>
    public const string OcrTimeout = "OCR_TIMEOUT";

    /// <summary>
    /// Unknown error code.
    /// </summary>
    public const string Unknown = "UNKNOWN";

    /// <summary>
    /// All canonical error codes for validation.
    /// </summary>
    public static readonly IReadOnlyList<string> AllCodes = new[]
    {
        FileNotFound,
        PdfNoText,
        PdfEncrypted,
        PdfMalformed,
        InsufficientData,
        EmptyResult,
        ParsingError,
        ServerError,
        OcrTimeout,
        Unknown
    };
}
