namespace CleanArchitecture.Domain.Constants;

/// <summary>
/// Centralized user-friendly error message mapping for PDF parsing errors.
/// This is the single source of truth for error message translation.
/// </summary>
public static class PdfParseErrorMessages
{
    /// <summary>
    /// Converts a canonical error code to a user-friendly message.
    /// Returns null if the code is null or unknown.
    /// </summary>
    /// <param name="code">The canonical error code (or legacy code after normalization).</param>
    /// <returns>User-friendly error message, or null if code is null/unknown.</returns>
    public static string? ToUserMessage(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return null;

        return code switch
        {
            PdfParseErrorCodes.FileNotFound => 
                "The PDF file could not be found on the server.",
            
            PdfParseErrorCodes.PdfNoText => 
                "PDF contains no extractable text. The file may be image-based or encrypted.",
            
            PdfParseErrorCodes.PdfEncrypted => 
                "PDF is password-protected or encrypted.",
            
            PdfParseErrorCodes.PdfMalformed => 
                "The PDF file appears to be corrupted or malformed.",
            
            PdfParseErrorCodes.InsufficientData => 
                "Could not extract minimum required fields from the document.",
            
            PdfParseErrorCodes.EmptyResult => 
                "Parser could not extract any data from the document.",
            
            PdfParseErrorCodes.ParsingError => 
                "An error occurred while parsing the PDF document.",
            
            PdfParseErrorCodes.ServerError => 
                "An unexpected server error occurred during parsing.",
            
            PdfParseErrorCodes.OcrTimeout => 
                "OCR processing timed out. Please try again later.",
            
            PdfParseErrorCodes.Unknown => 
                "An unknown error occurred during parsing.",
            
            _ => $"Parsing error: {code}"
        };
    }
}
