namespace CleanArchitecture.Application.Common.Exceptions;

public class PdfParsingException : Exception
{
    public string ErrorCode { get; }
    public string FailureStep { get; }
    public string? CorrelationId { get; }

    public PdfParsingException(string message, string errorCode, string failureStep, string? correlationId = null)
        : base(message)
    {
        ErrorCode = errorCode;
        FailureStep = failureStep;
        CorrelationId = correlationId;
    }

    public PdfParsingException(string message, string errorCode, string failureStep, Exception innerException, string? correlationId = null)
        : base(message, innerException)
    {
        ErrorCode = errorCode;
        FailureStep = failureStep;
        CorrelationId = correlationId;
    }
}
