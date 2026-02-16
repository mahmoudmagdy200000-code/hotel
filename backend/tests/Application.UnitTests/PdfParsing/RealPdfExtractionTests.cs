using CleanArchitecture.Infrastructure.Files;
using FluentAssertions;
using UglyToad.PdfPig;
using Xunit;
using Xunit.Abstractions;

namespace CleanArchitecture.Application.UnitTests.PdfParsing;

public class RealPdfExtractionTests
{
    private readonly ITestOutputHelper _output;
    
    public RealPdfExtractionTests(ITestOutputHelper output)
    {
        _output = output;
    }
    
    [Fact]
    public void ExtractFromRealPdf_6715814614_ShowsRawText()
    {
        // Arrange
        var filePath = @"c:\Users\Workstation\Downloads\6715814614.pdf";
        if (!File.Exists(filePath))
        {
            _output.WriteLine("PDF not found, skipping");
            return;
        }
        
        using var doc = PdfDocument.Open(filePath, new ParsingOptions { UseLenientParsing = true });
        var sb = new System.Text.StringBuilder();
        for (int i = 1; i <= doc.NumberOfPages; i++)
        {
            var page = doc.GetPage(i);
            sb.AppendLine(page.Text);
        }
        
        var text = sb.ToString();
        _output.WriteLine("=== RAW TEXT ===");
        _output.WriteLine(text);
        _output.WriteLine($"=== LENGTH: {text.Length} ===");
        
        // Write to file for inspection
        File.WriteAllText(@"c:\Users\Workstation\hotel\pdf_raw_text.txt", text);
        
        // Test extractions
        var guestName = PdfExtractionRules.ExtractGuestName(text);
        var rooms = PdfExtractionRules.ExtractRoomsCount(text);
        var booking = PdfExtractionRules.ExtractBookingNumber(text);
        var checkIn = PdfExtractionRules.ExtractCheckIn(text);
        var checkOut = PdfExtractionRules.ExtractCheckOut(text);
        var (totalPrice, currency) = PdfExtractionRules.ExtractTotalPrice(text);
        
        _output.WriteLine($"GuestName: '{guestName ?? "NULL"}'");
        _output.WriteLine($"RoomsCount: {rooms?.ToString() ?? "NULL"}");
        _output.WriteLine($"BookingNumber: '{booking ?? "NULL"}'");
        _output.WriteLine($"CheckIn: {checkIn?.ToString("yyyy-MM-dd") ?? "NULL"}");
        _output.WriteLine($"CheckOut: {checkOut?.ToString("yyyy-MM-dd") ?? "NULL"}");
        _output.WriteLine($"TotalPrice: {totalPrice?.ToString() ?? "NULL"} {currency ?? ""}");
        
        // These should pass
        guestName.Should().Be("Oleksandr Arapov", "Guest name should be extracted from PDF");
        rooms.Should().Be(2, "Total units/rooms: 2 in the PDF");
    }
}
