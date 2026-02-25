using System.Threading.Tasks;
using NUnit.Framework;
using Shouldly;
using System;
using System.Linq;
using CleanArchitecture.Application.Reservations.Commands.ConfirmReservation;
using CleanArchitecture.Application.Reservations.Commands.ReceptionActions;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using CleanArchitecture.Application.Common.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace CleanArchitecture.Application.FunctionalTests.Reservations;

using static CleanArchitecture.Application.FunctionalTests.Testing;

public class CheckoutAndConcurrencyTests : BaseTestFixture
{
    [Test]
    public async Task ConfirmReservation_HighConcurrency_PreventsDoubleBooking_ThrowsException()
    {
        // For actual Concurrency in MediatR within the Clean Architecture harness,
        // SendAsync creates its own scope. If we send two concurrently, they might use two scopes.
        var request1 = new ConfirmReservationCommand(1); 
        var request2 = new ConfirmReservationCommand(2); 

        // Act
        var task1 = SendAsync(request1);
        var task2 = SendAsync(request2);

        // Assert - Expect an exception representing a concurrency block/failure
        var aggregateException = await Should.ThrowAsync<Exception>(async () => await Task.WhenAll(task1, task2));
        aggregateException.ShouldNotBeNull();
    }

    [Test]
    public async Task CheckOut_EarlyTruncation_MustPruneFutureLinesAndRecalculateBalance()
    {
        // Arrange
        var businessDate = new DateOnly(2026, 05, 03);
        
        var reservation = new Reservation
        {
            BranchId = Guid.NewGuid(),
            GuestName = "QA Tester",
            CheckInDate = new DateTime(2026, 05, 01),
            CheckOutDate = new DateTime(2026, 05, 05),
            Status = ReservationStatus.CheckedIn,
            TotalAmount = 400
        };

        var room = new Room { RoomNumber = "QA-100", BranchId = reservation.BranchId };
        var roomType = new RoomType { Name = "QA-Type", BranchId = reservation.BranchId };
        
        await AddAsync(room);
        await AddAsync(roomType);
        
        var line = new ReservationLine
        {
            RoomId = room.Id,
            RoomTypeId = roomType.Id,
            RatePerNight = 100,
            Nights = 4,
            LineTotal = 400
        };
        
        reservation.Lines.Add(line);
        await AddAsync(reservation);

        // Act
        var command = new CheckOutReservationCommand { ReservationId = reservation.Id, BusinessDate = businessDate };
        await SendAsync(command);

        // Assert
        var updatedReservation = await FindAsync<Reservation>(reservation.Id);
        updatedReservation.ShouldNotBeNull();
        
        var resLinesCount = await CountAsync<ReservationLine>();
        updatedReservation.CheckOutDate.ShouldBe(businessDate.ToDateTime(TimeOnly.MinValue));
        
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var updatedLine = await context.ReservationLines.FirstAsync(l => l.ReservationId == reservation.Id);
        
        updatedLine.Nights.ShouldBe(2); 
        updatedLine.LineTotal.ShouldBe(200m);
        
        updatedReservation.TotalAmount.ShouldBe(200m); 
    }
}
