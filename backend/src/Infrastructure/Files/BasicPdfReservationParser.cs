using CleanArchitecture.Application.Common.Interfaces;

namespace CleanArchitecture.Infrastructure.Files;

public class BasicPdfReservationParser : IPdfReservationParser
{
    public Task<PdfParseOutput> ParseAsync(string filePath, CancellationToken cancellationToken)
    {
        // Default implementation that does nothing but fails gracefully.
        // In a real scenario, this would use an OCR library like Tesseract or a cloud service like Azure Form Recognizer.
        return Task.FromResult(new PdfParseOutput
        {
            Success = false,
            Errors = new List<string> { "OCR Parser not configured. Please implement a real parser." }
        });
    }
}
