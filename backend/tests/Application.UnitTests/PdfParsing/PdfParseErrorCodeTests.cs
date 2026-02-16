using CleanArchitecture.Domain.Constants;
using FluentAssertions;
using Xunit;

namespace CleanArchitecture.Application.UnitTests.PdfParsing;

/// <summary>
/// Unit tests for PDF parsing error code consistency.
/// Tests canonical codes, message mapping, and legacy code normalization.
/// </summary>
public class PdfParseErrorCodeTests
{
    #region Canonical Code -> Message Mapping Tests

    [Theory]
    [InlineData(PdfParseErrorCodes.FileNotFound, "The PDF file could not be found on the server.")]
    [InlineData(PdfParseErrorCodes.PdfNoText, "PDF contains no extractable text. The file may be image-based or encrypted.")]
    [InlineData(PdfParseErrorCodes.PdfEncrypted, "PDF is password-protected or encrypted.")]
    [InlineData(PdfParseErrorCodes.PdfMalformed, "The PDF file appears to be corrupted or malformed.")]
    [InlineData(PdfParseErrorCodes.InsufficientData, "Could not extract minimum required fields from the document.")]
    [InlineData(PdfParseErrorCodes.EmptyResult, "Parser could not extract any data from the document.")]
    [InlineData(PdfParseErrorCodes.ParsingError, "An error occurred while parsing the PDF document.")]
    [InlineData(PdfParseErrorCodes.ServerError, "An unexpected server error occurred during parsing.")]
    [InlineData(PdfParseErrorCodes.OcrTimeout, "OCR processing timed out. Please try again later.")]
    [InlineData(PdfParseErrorCodes.Unknown, "An unknown error occurred during parsing.")]
    public void ToUserMessage_CanonicalCode_ReturnsCorrectMessage(string code, string expectedMessage)
    {
        // Act
        var result = PdfParseErrorMessages.ToUserMessage(code);

        // Assert
        result.Should().Be(expectedMessage);
    }

    [Fact]
    public void ToUserMessage_NullCode_ReturnsNull()
    {
        // Act
        var result = PdfParseErrorMessages.ToUserMessage(null);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void ToUserMessage_EmptyCode_ReturnsNull()
    {
        // Act
        var result = PdfParseErrorMessages.ToUserMessage(string.Empty);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void ToUserMessage_WhitespaceCode_ReturnsNull()
    {
        // Act
        var result = PdfParseErrorMessages.ToUserMessage("   ");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void ToUserMessage_UnknownCode_ReturnsGenericMessage()
    {
        // Arrange
        var unknownCode = "SOME_RANDOM_CODE";

        // Act
        var result = PdfParseErrorMessages.ToUserMessage(unknownCode);

        // Assert
        result.Should().Be($"Parsing error: {unknownCode}");
    }

    #endregion

    #region Legacy Code Normalization Tests

    [Theory]
    [InlineData("NO_TEXT_PDF", PdfParseErrorCodes.PdfNoText)]
    [InlineData("PROTECTED_PDF", PdfParseErrorCodes.PdfEncrypted)]
    [InlineData("NO_TEXT", PdfParseErrorCodes.PdfNoText)]
    [InlineData("ENCRYPTED", PdfParseErrorCodes.PdfEncrypted)]
    [InlineData("MALFORMED", PdfParseErrorCodes.PdfMalformed)]
    [InlineData("TIMEOUT", PdfParseErrorCodes.OcrTimeout)]
    [InlineData("ERROR", PdfParseErrorCodes.ServerError)]
    public void Normalize_LegacyCode_ReturnsCanonicalCode(string legacyCode, string expectedCanonical)
    {
        // Act
        var result = PdfParseErrorCodeNormalizer.Normalize(legacyCode);

        // Assert
        result.Should().Be(expectedCanonical);
    }

    [Theory]
    [InlineData("no_text_pdf", PdfParseErrorCodes.PdfNoText)]
    [InlineData("Protected_PDF", PdfParseErrorCodes.PdfEncrypted)]
    [InlineData("No_Text", PdfParseErrorCodes.PdfNoText)]
    public void Normalize_LegacyCodeCaseInsensitive_ReturnsCanonicalCode(string legacyCode, string expectedCanonical)
    {
        // Act
        var result = PdfParseErrorCodeNormalizer.Normalize(legacyCode);

        // Assert
        result.Should().Be(expectedCanonical);
    }

    [Theory]
    [InlineData(PdfParseErrorCodes.FileNotFound)]
    [InlineData(PdfParseErrorCodes.PdfNoText)]
    [InlineData(PdfParseErrorCodes.PdfEncrypted)]
    [InlineData(PdfParseErrorCodes.PdfMalformed)]
    [InlineData(PdfParseErrorCodes.InsufficientData)]
    [InlineData(PdfParseErrorCodes.EmptyResult)]
    [InlineData(PdfParseErrorCodes.ParsingError)]
    [InlineData(PdfParseErrorCodes.ServerError)]
    [InlineData(PdfParseErrorCodes.OcrTimeout)]
    [InlineData(PdfParseErrorCodes.Unknown)]
    public void Normalize_CanonicalCode_ReturnsUnchanged(string canonicalCode)
    {
        // Act
        var result = PdfParseErrorCodeNormalizer.Normalize(canonicalCode);

        // Assert
        result.Should().Be(canonicalCode);
    }

    [Fact]
    public void Normalize_UnknownCode_ReturnsUnchanged()
    {
        // Arrange
        var unknownCode = "SOME_RANDOM_CODE";

        // Act
        var result = PdfParseErrorCodeNormalizer.Normalize(unknownCode);

        // Assert
        result.Should().Be(unknownCode);
    }

    [Fact]
    public void Normalize_NullCode_ReturnsNull()
    {
        // Act
        var result = PdfParseErrorCodeNormalizer.Normalize(null);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void Normalize_EmptyCode_ReturnsNull()
    {
        // Act
        var result = PdfParseErrorCodeNormalizer.Normalize(string.Empty);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void Normalize_WhitespaceCode_ReturnsNull()
    {
        // Act
        var result = PdfParseErrorCodeNormalizer.Normalize("   ");

        // Assert
        result.Should().BeNull();
    }

    [Theory]
    [InlineData("  NO_TEXT_PDF  ", PdfParseErrorCodes.PdfNoText)]
    [InlineData("\tPROTECTED_PDF\t", PdfParseErrorCodes.PdfEncrypted)]
    public void Normalize_LegacyCodeWithWhitespace_TrimsAndNormalizes(string legacyCode, string expectedCanonical)
    {
        // Act
        var result = PdfParseErrorCodeNormalizer.Normalize(legacyCode);

        // Assert
        result.Should().Be(expectedCanonical);
    }

    #endregion

    #region Legacy Code -> Message Integration Tests

    [Theory]
    [InlineData("NO_TEXT_PDF", "PDF contains no extractable text. The file may be image-based or encrypted.")]
    [InlineData("PROTECTED_PDF", "PDF is password-protected or encrypted.")]
    public void LegacyCode_NormalizedThenMapped_ReturnsCorrectMessage(string legacyCode, string expectedMessage)
    {
        // Act - normalize then get message (same flow as GetPendingRequestsQuery)
        var normalizedCode = PdfParseErrorCodeNormalizer.Normalize(legacyCode);
        var result = PdfParseErrorMessages.ToUserMessage(normalizedCode);

        // Assert
        result.Should().Be(expectedMessage);
    }

    #endregion

    #region IsLegacyCode and IsCanonicalCode Tests

    [Theory]
    [InlineData("NO_TEXT_PDF", true)]
    [InlineData("PROTECTED_PDF", true)]
    [InlineData("PDF_NO_TEXT", false)]
    [InlineData("PDF_ENCRYPTED", false)]
    [InlineData("RANDOM_CODE", false)]
    public void IsLegacyCode_VariousCodes_ReturnsCorrectResult(string code, bool expectedResult)
    {
        // Act
        var result = PdfParseErrorCodeNormalizer.IsLegacyCode(code);

        // Assert
        result.Should().Be(expectedResult);
    }

    [Theory]
    [InlineData("PDF_NO_TEXT", true)]
    [InlineData("PDF_ENCRYPTED", true)]
    [InlineData("SERVER_ERROR", true)]
    [InlineData("NO_TEXT_PDF", false)]
    [InlineData("PROTECTED_PDF", false)]
    [InlineData("RANDOM_CODE", false)]
    public void IsCanonicalCode_VariousCodes_ReturnsCorrectResult(string code, bool expectedResult)
    {
        // Act
        var result = PdfParseErrorCodeNormalizer.IsCanonicalCode(code);

        // Assert
        result.Should().Be(expectedResult);
    }

    [Fact]
    public void IsLegacyCode_NullOrEmpty_ReturnsFalse()
    {
        // Act & Assert
        PdfParseErrorCodeNormalizer.IsLegacyCode(null).Should().BeFalse();
        PdfParseErrorCodeNormalizer.IsLegacyCode(string.Empty).Should().BeFalse();
        PdfParseErrorCodeNormalizer.IsLegacyCode("   ").Should().BeFalse();
    }

    [Fact]
    public void IsCanonicalCode_NullOrEmpty_ReturnsFalse()
    {
        // Act & Assert
        PdfParseErrorCodeNormalizer.IsCanonicalCode(null).Should().BeFalse();
        PdfParseErrorCodeNormalizer.IsCanonicalCode(string.Empty).Should().BeFalse();
        PdfParseErrorCodeNormalizer.IsCanonicalCode("   ").Should().BeFalse();
    }

    #endregion

    #region AllCodes Collection Tests

    [Fact]
    public void AllCodes_ContainsExpectedCodes()
    {
        // Assert
        PdfParseErrorCodes.AllCodes.Should().Contain(PdfParseErrorCodes.FileNotFound);
        PdfParseErrorCodes.AllCodes.Should().Contain(PdfParseErrorCodes.PdfNoText);
        PdfParseErrorCodes.AllCodes.Should().Contain(PdfParseErrorCodes.PdfEncrypted);
        PdfParseErrorCodes.AllCodes.Should().Contain(PdfParseErrorCodes.PdfMalformed);
        PdfParseErrorCodes.AllCodes.Should().Contain(PdfParseErrorCodes.InsufficientData);
        PdfParseErrorCodes.AllCodes.Should().Contain(PdfParseErrorCodes.EmptyResult);
        PdfParseErrorCodes.AllCodes.Should().Contain(PdfParseErrorCodes.ParsingError);
        PdfParseErrorCodes.AllCodes.Should().Contain(PdfParseErrorCodes.ServerError);
        PdfParseErrorCodes.AllCodes.Should().Contain(PdfParseErrorCodes.OcrTimeout);
        PdfParseErrorCodes.AllCodes.Should().Contain(PdfParseErrorCodes.Unknown);
    }

    [Fact]
    public void AllCodes_HasCorrectCount()
    {
        // Assert
        PdfParseErrorCodes.AllCodes.Should().HaveCount(10);
    }

    #endregion
}
