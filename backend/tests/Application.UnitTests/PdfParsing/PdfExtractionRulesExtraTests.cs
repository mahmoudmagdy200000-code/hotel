using CleanArchitecture.Application.UnitTests.PdfParsing;
using CleanArchitecture.Infrastructure.Files;
using FluentAssertions;
using Xunit;

namespace CleanArchitecture.Application.UnitTests.PdfParsing;

public class PdfExtractionRulesExtraTests
{
    [Fact]
    public void ExtractTotalPrice_UserImageCase_ReturnsCorrectAmount()
    {
        // Based on user image
        var text = @"
Rate per night: 1,200 EGP
Nights: 4 Rooms: 2
Total: 9,600 EGP
";
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);
        
        amount.Should().Be(9600.00m);
        currency.Should().Be("EGP");
    }

    [Fact]
    public void ExtractTotalPrice_UserImageCase_Multiline_ReturnsCorrectAmount()
    {
        // Based on multiline hypothesis
        var text = @"
Total:
9,600 EGP
";
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);
        
        amount.Should().Be(9600.00m);
        currency.Should().Be("EGP");
    }

    [Fact]
    public void ExtractTotalPrice_MultilineLabelAndAmount_ReturnsCorrectAmount()
    {
        var text = "Total price\n100.00 USD";
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);
        amount.Should().Be(100.00m);
        currency.Should().Be("USD");
    }

    [Fact]
    public void ExtractTotalPrice_LabelWithColonAndNewline_ReturnsCorrectAmount()
    {
        var text = "Grand Total:\n   2,500.00\nEUR";
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);
        amount.Should().Be(2500.00m);
        currency.Should().Be("EUR");
    }

    [Fact]
    public void ExtractTotalPrice_AmountWithSpaceSeparator_ReturnsCorrectAmount()
    {
        var text = "Total due: 1 234.56 USD";
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);
        amount.Should().Be(1234.56m);
    }

    [Fact]
    public void ExtractTotalPrice_AmountWithNoDecimal_ReturnsCorrectAmount()
    {
        var text = "Total: 500 USD";
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);
        amount.Should().Be(500m);
    }
    
    [Fact]
    public void ExtractTotalPrice_CurrencySymbolPrefix_ReturnsCorrectAmount()
    {
        var text = "Total payment: $150.00";
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);
        amount.Should().Be(150.00m);
        currency.Should().Be("USD");
    }
    
    [Fact]
    public void ExtractTotalPrice_ComplexMultiline_ReturnsCorrectAmount()
    {
        var text = @"
Invoice details
Room Charges: 500
Taxes: 50
Total amount
:
550.00
USD
";
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);
        amount.Should().Be(550.00m);
        currency.Should().Be("USD");
    }

    [Fact]
    public void ExtractTotalPrice_LargeNumberNoSeparators_ReturnsCorrectAmount()
    {
        var text = "Total Price: 1530.50 USD";
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);
        amount.Should().Be(1530.50m);
    }
}
