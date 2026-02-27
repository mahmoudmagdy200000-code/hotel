using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;
using Shouldly;

namespace CleanArchitecture.Domain.UnitTests.Entities;

public class ReservationTests
{
    [Test]
    public void CheckOut_ShouldSetStatusToCheckedOut_WhenStatusIsCheckedIn()
    {
        // Arrange
        var reservation = new Reservation { Status = ReservationStatus.CheckedIn };
        var now = DateTime.UtcNow;

        // Act
        reservation.CheckOut(now);

        // Assert
        reservation.Status.ShouldBe(ReservationStatus.CheckedOut);
        reservation.CheckedOutAt.ShouldBe(now);
    }

    [Test]
    public void CheckOut_ShouldSetActualCheckOutDateToProvidedValue()
    {
        // Arrange
        var reservation = new Reservation { Status = ReservationStatus.CheckedIn };
        var now = DateTime.UtcNow;
        var actualDate = new DateTime(2026, 2, 27);

        // Act
        reservation.CheckOut(now, actualDate);

        // Assert
        reservation.ActualCheckOutDate.ShouldBe(actualDate);
    }

    [Test]
    public void CheckOut_ShouldSetActualCheckOutDateToCheckedOutAtDate_WhenNotProvided()
    {
        // Arrange
        var reservation = new Reservation { Status = ReservationStatus.CheckedIn };
        var now = new DateTime(2026, 2, 27, 14, 30, 0);

        // Act
        reservation.CheckOut(now);

        // Assert
        reservation.ActualCheckOutDate.ShouldBe(now.Date);
    }

    [Test]
    public void CheckOut_ShouldThrowInvalidOperationException_WhenStatusIsNotCheckedIn()
    {
        // Arrange
        var reservation = new Reservation { Status = ReservationStatus.Confirmed };
        var now = DateTime.UtcNow;

        // Act & Assert
        Should.Throw<InvalidOperationException>(() => reservation.CheckOut(now));
    }
}
