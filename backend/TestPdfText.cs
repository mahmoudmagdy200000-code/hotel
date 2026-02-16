using UglyToad.PdfPig;

var filePath = @"c:\Users\Workstation\Downloads\6715814614.pdf";
Console.WriteLine("=== Extracting text from PDF ===");

using var doc = PdfDocument.Open(filePath, new ParsingOptions { UseLenientParsing = true });
var sb = new System.Text.StringBuilder();
for (int i = 1; i <= doc.NumberOfPages; i++)
{
    var page = doc.GetPage(i);
    sb.AppendLine(page.Text);
}

var text = sb.ToString();
Console.WriteLine("--- RAW TEXT ---");
Console.WriteLine(text);
Console.WriteLine($"--- LENGTH: {text.Length} ---");
Console.WriteLine();

// Test extraction
Console.WriteLine("=== Testing ExtractGuestName ===");
var guestName = CleanArchitecture.Infrastructure.Files.PdfExtractionRules.ExtractGuestName(text);
Console.WriteLine($"GuestName: '{guestName ?? "NULL"}'");

Console.WriteLine("=== Testing ExtractRoomsCount ===");
var rooms = CleanArchitecture.Infrastructure.Files.PdfExtractionRules.ExtractRoomsCount(text);
Console.WriteLine($"RoomsCount: {rooms?.ToString() ?? "NULL"}");

Console.WriteLine("=== Testing ExtractBookingNumber ===");
var booking = CleanArchitecture.Infrastructure.Files.PdfExtractionRules.ExtractBookingNumber(text);
Console.WriteLine($"BookingNumber: '{booking ?? "NULL"}'");
