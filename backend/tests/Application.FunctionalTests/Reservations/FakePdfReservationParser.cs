using CleanArchitecture.Application.Common.Interfaces;

namespace CleanArchitecture.Application.FunctionalTests.Reservations;

public class FakePdfReservationParser : IPdfReservationParser
{
    public static PdfParseOutput NextResult { get; set; } = new() { Success = false };

    public Task<PdfParseOutput> ParseAsync(string filePath, CancellationToken cancellationToken)
    {
        return Task.FromResult(NextResult);
    }
}
