// Quick test script to see what text PdfPig extracts
#r "nuget: UglyToad.PdfPig, 0.1.9"

using UglyToad.PdfPig;

var filePath = @"c:\Users\Workstation\Downloads\6715814614.pdf";
Console.WriteLine("=== Extracting text from PDF ===");

using var doc = PdfDocument.Open(filePath, new UglyToad.PdfPig.Parsing.ParsingOptions { UseLenientParsing = true });
var sb = new System.Text.StringBuilder();
for (int i = 1; i <= doc.NumberOfPages; i++)
{
    var page = doc.GetPage(i);
    sb.AppendLine(page.Text);
    Console.WriteLine($"--- Page {i} ---");
    Console.WriteLine(page.Text);
}

Console.WriteLine($"\n=== Total text length: {sb.Length} ===");
