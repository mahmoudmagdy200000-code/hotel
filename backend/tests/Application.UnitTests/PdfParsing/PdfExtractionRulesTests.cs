using CleanArchitecture.Infrastructure.Files;
using FluentAssertions;
using Xunit;

namespace CleanArchitecture.Application.UnitTests.PdfParsing;

/// <summary>
/// Unit tests for PDF extraction rules.
/// Tests anchor-based extraction, normalization, and validation.
/// </summary>
public class PdfExtractionRulesTests
{
    private static string LoadFixture(string name)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "PdfParsing", "Fixtures", name);
        if (!File.Exists(path))
        {
            // Fallback for test runner working directory differences
            path = Path.Combine("PdfParsing", "Fixtures", name);
        }
        return File.ReadAllText(path);
    }

    #region Booking.com Format Tests

    [Fact]
    public void ExtractCheckIn_BookingComFormat_ReturnsCorrectDate()
    {
        // Arrange
        var text = LoadFixture("booking_com_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractCheckIn(text);

        // Assert
        result.Should().NotBeNull();
        result!.Value.ToString("yyyy-MM-dd").Should().Be("2026-02-15");
    }

    [Fact]
    public void ExtractCheckOut_BookingComFormat_ReturnsCorrectDate()
    {
        // Arrange
        var text = LoadFixture("booking_com_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractCheckOut(text);

        // Assert
        result.Should().NotBeNull();
        result!.Value.ToString("yyyy-MM-dd").Should().Be("2026-02-18");
    }

    [Fact]
    public void ExtractGuestName_BookingComFormat_ReturnsFullName()
    {
        // Arrange
        var text = LoadFixture("booking_com_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractGuestName(text);

        // Assert
        result.Should().Be("John Michael Smith");
    }

    [Fact]
    public void ExtractBookingNumber_BookingComFormat_ReturnsConfirmationNumber()
    {
        // Arrange
        var text = LoadFixture("booking_com_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractBookingNumber(text);

        // Assert
        result.Should().Be("4598271234");
    }

    [Fact]
    public void ExtractTotalPrice_BookingComFormat_ReturnsAmountAndCurrency()
    {
        // Arrange
        var text = LoadFixture("booking_com_sample.txt");

        // Act
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);

        // Assert
        amount.Should().Be(450.00m);
        currency.Should().Be("USD");
    }

    [Fact]
    public void ExtractPhone_BookingComFormat_ReturnsNormalizedPhone()
    {
        // Arrange
        var text = LoadFixture("booking_com_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractPhone(text);

        // Assert
        result.Should().Be("+15551234567");
    }

    [Fact]
    public void ExtractRoomsCount_BookingComFormat_ReturnsOne()
    {
        // Arrange
        var text = LoadFixture("booking_com_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractRoomsCount(text);

        // Assert
        result.Should().Be(1);
    }

    #endregion

    #region Agoda Format Tests (European Dates)

    [Fact]
    public void ExtractCheckIn_AgodaFormat_ParsesEuropeanDate()
    {
        // Arrange
        var text = LoadFixture("agoda_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractCheckIn(text);

        // Assert
        result.Should().NotBeNull();
        result!.Value.ToString("yyyy-MM-dd").Should().Be("2026-01-27");
    }

    [Fact]
    public void ExtractCheckOut_AgodaFormat_ParsesEuropeanDate()
    {
        // Arrange
        var text = LoadFixture("agoda_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractCheckOut(text);

        // Assert
        result.Should().NotBeNull();
        result!.Value.ToString("yyyy-MM-dd").Should().Be("2026-01-30");
    }

    [Fact]
    public void ExtractGuestName_AgodaFormat_ReturnsReservedForName()
    {
        // Arrange
        var text = LoadFixture("agoda_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractGuestName(text);

        // Assert
        result.Should().Be("Maria Elena González");
    }

    [Fact]
    public void ExtractBookingNumber_AgodaFormat_ReturnsReference()
    {
        // Arrange
        var text = LoadFixture("agoda_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractBookingNumber(text);

        // Assert
        result.Should().Be("AGD-8765432109");
    }

    [Fact]
    public void ExtractTotalPrice_AgodaFormat_ReturnsEuroAmount()
    {
        // Arrange
        var text = LoadFixture("agoda_sample.txt");

        // Act
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);

        // Assert
        amount.Should().Be(330.00m);
        currency.Should().Be("EUR");
    }

    #endregion

    #region Arabic Format Tests

    [Fact]
    public void ExtractCheckIn_ArabicFormat_ParsesIsoDate()
    {
        // Arrange
        var text = LoadFixture("arabic_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractCheckIn(text);

        // Assert
        result.Should().NotBeNull();
        result!.Value.ToString("yyyy-MM-dd").Should().Be("2026-03-10");
    }

    [Fact]
    public void ExtractCheckOut_ArabicFormat_ParsesIsoDate()
    {
        // Arrange
        var text = LoadFixture("arabic_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractCheckOut(text);

        // Assert
        result.Should().NotBeNull();
        result!.Value.ToString("yyyy-MM-dd").Should().Be("2026-03-12");
    }

    [Fact]
    public void ExtractGuestName_ArabicFormat_ReturnsArabicName()
    {
        // Arrange
        var text = LoadFixture("arabic_sample.txt");

        // Act
        var result = PdfExtractionRules.ExtractGuestName(text);

        // Assert
        result.Should().Be("أحمد محمد علي");
    }

    [Fact]
    public void ExtractTotalPrice_ArabicFormat_NormalizesEgyptianPound()
    {
        // Arrange
        var text = LoadFixture("arabic_sample.txt");

        // Act
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);

        // Assert
        amount.Should().Be(2500.00m);
        currency.Should().Be("EGP"); // LE normalized to EGP
    }

    #endregion

    #region Currency Normalization Tests

    [Theory]
    [InlineData("LE", "EGP")]
    [InlineData("L.E", "EGP")]
    [InlineData("E.G.P", "EGP")]
    [InlineData("EGP", "EGP")]
    [InlineData("usd", "USD")]
    [InlineData("EUR", "EUR")]
    [InlineData("$", "USD")]
    [InlineData("€", "EUR")]
    [InlineData("£", "GBP")]
    public void NormalizeCurrency_VariousFormats_ReturnsIsoCode(string input, string expected)
    {
        // Act
        var result = PdfExtractionRules.NormalizeCurrency(input);

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void NormalizeCurrency_EmptyInput_ReturnsNull(string? input)
    {
        // Act
        var result = PdfExtractionRules.NormalizeCurrency(input);

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region Validation Tests

    [Fact]
    public void ValidateExtraction_ValidDates_ReturnsNoErrors()
    {
        // Arrange
        var checkIn = new DateOnly(2026, 2, 15);
        var checkOut = new DateOnly(2026, 2, 18);

        // Act
        var errors = PdfExtractionRules.ValidateExtraction(checkIn, checkOut, "John Smith", null);

        // Assert
        errors.Should().BeEmpty();
    }

    [Fact]
    public void ValidateExtraction_CheckOutBeforeCheckIn_ReturnsError()
    {
        // Arrange
        var checkIn = new DateOnly(2026, 2, 18);
        var checkOut = new DateOnly(2026, 2, 15);

        // Act
        var errors = PdfExtractionRules.ValidateExtraction(checkIn, checkOut, "John Smith", null);

        // Assert
        errors.Should().Contain(e => e.Contains("Check-out date must be after check-in"));
    }

    [Fact]
    public void ValidateExtraction_NightsMismatch_ReturnsError()
    {
        // Arrange
        var checkIn = new DateOnly(2026, 2, 15);
        var checkOut = new DateOnly(2026, 2, 18);
        var wrongNights = 5;

        // Act
        var errors = PdfExtractionRules.ValidateExtraction(checkIn, checkOut, "John Smith", null, wrongNights);

        // Assert
        errors.Should().Contain(e => e.Contains("Nights mismatch"));
    }

    [Fact]
    public void ValidateExtraction_NoDatesNoIdentifier_ReturnsInsufficientDataError()
    {
        // Arrange - no dates, no guest name, no booking number

        // Act
        var errors = PdfExtractionRules.ValidateExtraction(null, null, null, null);

        // Assert
        errors.Should().Contain(e => e.Contains("Insufficient data"));
    }

    [Fact]
    public void ValidateExtraction_OnlyGuestName_ReturnsNoErrors()
    {
        // Arrange - guest name is sufficient identifier

        // Act
        var errors = PdfExtractionRules.ValidateExtraction(null, null, "John Smith", null);

        // Assert
        errors.Should().BeEmpty();
    }

    [Fact]
    public void ValidateExtraction_OnlyBookingNumber_ReturnsNoErrors()
    {
        // Arrange - booking number is sufficient identifier

        // Act
        var errors = PdfExtractionRules.ValidateExtraction(null, null, null, "ABC-123456");

        // Assert
        errors.Should().BeEmpty();
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void ExtractCheckIn_InlineText_ExtractsCorrectly()
    {
        // Arrange
        var text = "Your check-in: 2026-05-20 from 14:00";

        // Act
        var result = PdfExtractionRules.ExtractCheckIn(text);

        // Assert
        result.Should().NotBeNull();
        result!.Value.ToString("yyyy-MM-dd").Should().Be("2026-05-20");
    }

    [Fact]
    public void ExtractGuestName_WithTrailingPunctuation_TrimsCorrectly()
    {
        // Arrange
        var text = "Guest Name: Sarah Johnson, ";

        // Act
        var result = PdfExtractionRules.ExtractGuestName(text);

        // Assert
        result.Should().Be("Sarah Johnson");
    }

    [Fact]
    public void ExtractBookingNumber_ShortNumber_ReturnsNull()
    {
        // Arrange - booking numbers should be at least 4 chars
        var text = "Booking Number: 123";

        // Act
        var result = PdfExtractionRules.ExtractBookingNumber(text);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void ExtractTotalPrice_EuropeanFormat_ParsesCorrectly()
    {
        // Arrange - European format: 1.234,56
        var text = "Grand Total: EUR 1.234,56";

        // Act
        var (amount, currency) = PdfExtractionRules.ExtractTotalPrice(text);

        // Assert
        amount.Should().Be(1234.56m);
        currency.Should().Be("EUR");
    }

    #endregion

    #region Fused OCR Tests

    [Fact]
    public void ExtractGuestName_FusedWithBookingNumber_ExtractsCorrectly()
    {
        // Arrange - Label "Guest information" fused with preceding booking number
        var text = "Booking number:6715814614Guest information:Oleksandr ArapovTotal guests:2 adults";

        // Act
        var result = PdfExtractionRules.ExtractGuestName(text);

        // Assert
        result.Should().Be("Oleksandr Arapov");
    }

    [Fact]
    public void ExtractBookingNumber_FusedWithGuestLabel_TruncatesCorrectly()
    {
        // Arrange - Booking number fused with "Guest" label
        var text = "Booking number:6693946220Guest information:Christophe Raynaud";

        // Act
        var result = PdfExtractionRules.ExtractBookingNumber(text);

        // Assert
        result.Should().Be("6693946220");
    }

    [Fact]
    public void ExtractRoomsCount_FusedWithText_ExtractsCorrectly()
    {
        // Arrange - Rooms count fused with preceding text
        var text = "Stay detailsCheck-in:Wed 12 Feb 2026Rooms:1Total guests:2 adults";

        // Act
        var result = PdfExtractionRules.ExtractRoomsCount(text);

        // Assert
        result.Should().Be(1);
    }

    #endregion
}
