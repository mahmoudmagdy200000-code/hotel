using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.ExtraCharges.Commands.CreateExtraCharge;
using CleanArchitecture.Domain.Enums;
using Moq;
using Xunit;
using FluentValidation.TestHelper;
using CleanArchitecture.Domain.Entities;
using FluentAssertions;

namespace CleanArchitecture.Application.UnitTests.ExtraCharges.Commands;

public class CreateExtraChargeCommandTests
{
    private readonly Mock<IApplicationDbContext> _context;
    private readonly CreateExtraChargeCommandHandler _handler;
    private readonly CreateExtraChargeCommandValidator _validator;

    public CreateExtraChargeCommandTests()
    {
        _context = new Mock<IApplicationDbContext>();
        _handler = new CreateExtraChargeCommandHandler(_context.Object);
        _validator = new CreateExtraChargeCommandValidator();
    }

    [Fact]
    public async Task Handle_ShouldAddExtraChargeToContext()
    {
        // Arrange
        var command = new CreateExtraChargeCommand
        {
            ReservationId = 1,
            Description = "Room Service",
            Amount = 50.0m,
            Date = DateTime.Now,
            CurrencyCode = CurrencyCode.EGP,
            PaymentStatus = PaymentStatus.Paid
        };

        _context.Setup(c => c.ExtraCharges.Add(It.IsAny<ExtraCharge>()));
        _context.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        _context.Verify(c => c.ExtraCharges.Add(It.Is<ExtraCharge>(e => 
            e.ReservationId == command.ReservationId &&
            e.Description == command.Description &&
            e.Amount == command.Amount)), Times.Once);

        _context.Verify(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-10)]
    public void Validator_ShouldHaveError_WhenAmountIsInvalid(decimal amount)
    {
        // Arrange
        var command = new CreateExtraChargeCommand
        {
            ReservationId = 1,
            Description = "Test",
            Amount = amount,
            Date = DateTime.Now,
            CurrencyCode = CurrencyCode.EGP,
            PaymentStatus = PaymentStatus.Paid
        };

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(v => v.Amount);
    }

    [Fact]
    public void Validator_ShouldNotHaveError_WhenCommandIsValid()
    {
        // Arrange
        var command = new CreateExtraChargeCommand
        {
            ReservationId = 1,
            Description = "Valid Charge",
            Amount = 100.0m,
            Date = DateTime.Now,
            CurrencyCode = CurrencyCode.EGP,
            PaymentStatus = PaymentStatus.Paid
        };

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }
}
