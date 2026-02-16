using CleanArchitecture.Application.Reservations.Commands.CreateReservation;
using CleanArchitecture.Application.Reservations.Commands.DeleteReservation;
using CleanArchitecture.Application.Reservations.Queries.GetReservationById;
using CleanArchitecture.Application.Reservations.Queries.GetReservations;
using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Domain.Enums;
using CleanArchitecture.Application.Admin.Queries.GetReservationDeletes;
using Shouldly;

namespace CleanArchitecture.Application.FunctionalTests.Reservations;

using static Testing;

public class ReservationsSoftDeleteTests : BaseTestFixture
{
    [Test]
    public async Task ShouldSoftDeleteDraftReservation()
    {
        // Arrange - Draft reservations can be deleted
        var userId = await RunAsAdministratorAsync();

        var roomType = new CleanArchitecture.Domain.Entities.RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new CleanArchitecture.Domain.Entities.Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);
        
        var command = new CreateReservationCommand
        {
            GuestName = "Delete Test",
            CheckInDate = DateTime.Now.AddDays(10),
            CheckOutDate = DateTime.Now.AddDays(12),
            Status = ReservationStatus.Draft,
            Lines = new List<CreateReservationLineCommand>
            {
                new() { RoomId = room.Id, RatePerNight = 100 }
            }
        };

        var result = await SendAsync(command);
        var reservationId = result.Id;

        // Act
        await SendAsync(new DeleteReservationCommand(reservationId, "Test deletion reason"));

        // Assert
        // 1. Should not be found by ID
        await Should.ThrowAsync<CleanArchitecture.Application.Common.Exceptions.NotFoundException>(() =>
            SendAsync(new GetReservationByIdQuery(reservationId)));

        // 2. Should not be in list
        var list = await SendAsync(new GetReservationsQuery());
        list.ShouldNotContain(x => x.Id == reservationId);

        // 3. Should be in audit trail
        var audit = await SendAsync(new GetReservationDeletesQuery());
        audit.ShouldContain(x => x.ReservationId == reservationId && x.Reason == "Test deletion reason");
    }

    [Test]
    public async Task ShouldSoftDeleteConfirmedReservation()
    {
        // Arrange - Admin CAN delete Confirmed reservations (changed from previous behavior)
        await RunAsAdministratorAsync();
        
        var roomType = new CleanArchitecture.Domain.Entities.RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new CleanArchitecture.Domain.Entities.Room { RoomNumber = "102", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var command = new CreateReservationCommand
        {
            GuestName = "Confirmed Test",
            CheckInDate = DateTime.Now.AddDays(10),
            CheckOutDate = DateTime.Now.AddDays(12),
            Status = ReservationStatus.Confirmed,
            Lines = new List<CreateReservationLineCommand>
            {
                new() { RoomId = room.Id, RatePerNight = 100 }
            }
        };

        var result = await SendAsync(command);
        var reservationId = result.Id;

        // Act - Should succeed
        await SendAsync(new DeleteReservationCommand(reservationId, "Cancelled by admin"));

        // Assert - Should be soft deleted
        await Should.ThrowAsync<CleanArchitecture.Application.Common.Exceptions.NotFoundException>(() =>
            SendAsync(new GetReservationByIdQuery(reservationId)));
    }

    [Test]
    [Ignore("CheckedOut status requires complete workflow through Check-In/Check-Out commands. Testing domain validation directly in unit tests instead.")]
    public async Task ShouldNotDeleteCheckedOutReservation()
    {
        // This test verifies that CheckedOut reservations cannot be deleted.
        // The domain validation in Reservation.MarkAsDeleted() prevents deletion of CheckedOut status.
        // See Domain.UnitTests for complete validation coverage.
        await Task.CompletedTask;
    }

    [Test]
    public async Task ShouldSoftDeleteCheckedInReservation()
    {
        // Arrange - Admin CAN delete CheckedIn reservations for corrections
        await RunAsAdministratorAsync();
        
        var roomType = new CleanArchitecture.Domain.Entities.RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new CleanArchitecture.Domain.Entities.Room { RoomNumber = "104", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var today = DateTime.Today;
        var command = new CreateReservationCommand
        {
            GuestName = "InHouse Test",
            CheckInDate = today,
            CheckOutDate = today.AddDays(2),
            Status = ReservationStatus.Confirmed,
            Lines = new List<CreateReservationLineCommand>
            {
                new() { RoomId = room.Id, RatePerNight = 100 }
            }
        };

        var result = await SendAsync(command);
        var reservationId = result.Id;

        // Check-in
        await SendAsync(new CleanArchitecture.Application.Reservations.Commands.ReceptionActions.CheckInReservationCommand
        {
            ReservationId = reservationId,
            BusinessDate = DateOnly.FromDateTime(today)
        });

        // Act - Should succeed
        await SendAsync(new DeleteReservationCommand(reservationId, "Wrong check-in corrected"));

        // Assert - Should be soft deleted
        await Should.ThrowAsync<CleanArchitecture.Application.Common.Exceptions.NotFoundException>(() =>
            SendAsync(new GetReservationByIdQuery(reservationId)));
    }
}
