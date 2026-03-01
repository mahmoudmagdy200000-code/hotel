using System.Text.RegularExpressions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Constants;
using UglyToad.PdfPig;

namespace CleanArchitecture.Infrastructure.Files;

/// <summary>
/// Structured PDF reservation parser using anchor-based extraction rules.
/// Extracts guest information, dates, booking numbers, and pricing from PDF text.
/// </summary>
public class StructuredPdfReservationParser : IPdfReservationParser
{
    private const int TextLengthThreshold = 100;

    public async Task<PdfParseOutput> ParseAsync(string filePath, CancellationToken cancellationToken)
    {
        var output = new PdfParseOutput();

        // Step 1: Validate file exists
        output.FailureStep = "Validate";
        if (!File.Exists(filePath))
        {
            return Fail(output, PdfParseErrorCodes.FileNotFound, PdfParseErrorMessages.ToUserMessage(PdfParseErrorCodes.FileNotFound)!, "Validate");
        }

        try
        {
            // Step 2: Load PDF and extract text
            output.FailureStep = "Load";
            string fullText;
            
            using (var document = PdfDocument.Open(filePath, new ParsingOptions { UseLenientParsing = true }))
            {
                output.FailureStep = "ExtractText";
                
                var textBuilder = new System.Text.StringBuilder();
                var pageCount = Math.Min(document.NumberOfPages, 5); // Limit to first 5 pages
                
                for (int i = 1; i <= pageCount; i++)
                {
                    var page = document.GetPage(i);
                    textBuilder.AppendLine(page.Text);
                }
                
                fullText = textBuilder.ToString();
            }

            // Step 3: Validate text extraction
            if (string.IsNullOrWhiteSpace(fullText) || fullText.Length < TextLengthThreshold)
            {
                return Fail(output, PdfParseErrorCodes.PdfNoText, 
                    PdfParseErrorMessages.ToUserMessage(PdfParseErrorCodes.PdfNoText)!, 
                    "ExtractText");
            }

            // Step 4: Extract fields using anchor-based rules
            output.FailureStep = "MapFields";
            var data = ExtractAllFields(fullText);

            // Step 5: Validate extracted data
            output.FailureStep = "Validate";
            var validationErrors = PdfExtractionRules.ValidateExtraction(
                data.CheckIn,
                data.CheckOut,
                data.GuestName,
                data.BookingNumber);

            if (validationErrors.Count > 0)
            {
                output.Errors.AddRange(validationErrors);
                
                // If we have some data but validation failed, still return partial data
                // but mark as failed if critical fields are missing
                var hasMinimumData = (data.CheckIn.HasValue && data.CheckOut.HasValue) ||
                                     !string.IsNullOrWhiteSpace(data.GuestName) ||
                                     !string.IsNullOrWhiteSpace(data.BookingNumber);

                if (!hasMinimumData)
                {
                    return Fail(output, PdfParseErrorCodes.InsufficientData, 
                        $"{PdfParseErrorMessages.ToUserMessage(PdfParseErrorCodes.InsufficientData)} {string.Join(" ", validationErrors)}", 
                        "Validate");
                }
                
                // We have partial data - return success but include warnings
                output.Data = data;
                output.Success = true;
                output.ErrorMessage = string.Join(" ", validationErrors);
                return output;
            }

            // Success
            output.Data = data;
            output.Success = true;
            return output;
        }
        catch (Exception ex) when (IsEncryptionError(ex))
        {
            return Fail(output, PdfParseErrorCodes.PdfEncrypted, 
                $"{PdfParseErrorMessages.ToUserMessage(PdfParseErrorCodes.PdfEncrypted)} (Details: {ex.Message})", 
                "Load");
        }
        catch (Exception ex) when (IsMalformedPdfError(ex))
        {
            return Fail(output, PdfParseErrorCodes.PdfMalformed, 
                $"{PdfParseErrorMessages.ToUserMessage(PdfParseErrorCodes.PdfMalformed)}: {ex.Message}", 
                "Load");
        }
        catch (Exception ex)
        {
            return Fail(output, PdfParseErrorCodes.ParsingError, 
                $"{PdfParseErrorMessages.ToUserMessage(PdfParseErrorCodes.ParsingError)}: {ex.Message}", 
                output.FailureStep ?? "Unhandled");
        }
    }

    /// <summary>
    /// Extracts all fields from the PDF text using anchor-based rules.
    /// </summary>
    private ExtractedPdfData ExtractAllFields(string text)
    {
        var bookingNumber = PdfExtractionRules.ExtractBookingNumber(text);
        var (totalPrice, currency) = PdfExtractionRules.ExtractTotalPrice(text, bookingNumber);

        return new ExtractedPdfData
        {
            GuestName = PdfExtractionRules.ExtractGuestName(text),
            Phone = PdfExtractionRules.ExtractPhone(text),
            CheckIn = PdfExtractionRules.ExtractCheckIn(text),
            CheckOut = PdfExtractionRules.ExtractCheckOut(text),
            RoomsCount = PdfExtractionRules.ExtractRoomsCount(text),
            RoomTypeHint = PdfExtractionRules.ExtractRoomTypeHint(text),
            NumberOfPersons = PdfExtractionRules.ExtractNumberOfPersons(text),
            HotelName = PdfExtractionRules.ExtractHotelName(text),
            BookingNumber = bookingNumber,
            TotalPrice = totalPrice,
            Currency = currency,
            CurrencyCode = PdfExtractionRules.DetectCurrencyCode(text, currency, totalPrice),
            MealPlan = PdfExtractionRules.ExtractMealPlan(text, bookingNumber)
        };
    }

    /// <summary>
    /// Creates a failure output with specified error details.
    /// </summary>
    private static PdfParseOutput Fail(PdfParseOutput output, string errorCode, string errorMessage, string failureStep)
    {
        output.Success = false;
        output.ErrorCode = errorCode;
        output.ErrorMessage = errorMessage;
        output.FailureStep = failureStep;
        return output;
    }

    /// <summary>
    /// Checks if the exception is related to PDF encryption.
    /// </summary>
    private static bool IsEncryptionError(Exception ex)
    {
        return ex.Message.Contains("password", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("encrypted", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("decrypt", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Checks if the exception indicates a malformed PDF.
    /// </summary>
    private static bool IsMalformedPdfError(Exception ex)
    {
        return ex.Message.Contains("invalid", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("corrupt", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("malformed", StringComparison.OrdinalIgnoreCase);
    }
}
