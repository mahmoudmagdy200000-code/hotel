using System.Linq.Expressions;
using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Reservations.Commands.ReceptionActions;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Query;
using Moq;
using NUnit.Framework;
using Shouldly;

namespace CleanArchitecture.Application.UnitTests.Reservations.Commands.ReceptionActions;

public class CheckOutReservationTests
{
    private Mock<IApplicationDbContext> _context;
    private Mock<IUser> _user;
    private CheckOutReservationCommandHandler _handler;

    [SetUp]
    public void SetUp()
    {
        _context = new Mock<IApplicationDbContext>();
        _user = new Mock<IUser>();
        _handler = new CheckOutReservationCommandHandler(_context.Object, _user.Object);
    }

    [Test]
    public async Task Handle_ShouldSucceed_WhenValidCheckOut()
    {
        // Arrange
        var reservationId = 1;
        var businessDate = new DateOnly(2026, 2, 27);
        var reservation = new Reservation 
        { 
            Id = reservationId, 
            Status = ReservationStatus.CheckedIn,
            CheckInDate = new DateTime(2026, 2, 25),
            CheckOutDate = new DateTime(2026, 3, 1)
        };

        _context.Setup(x => x.Reservations).Returns(CreateMockDbSet(reservation).Object);

        var command = new CheckOutReservationCommand 
        { 
            ReservationId = reservationId, 
            BusinessDate = businessDate 
        };

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        reservation.Status.ShouldBe(ReservationStatus.CheckedOut);
        reservation.ActualCheckOutDate.ShouldBe(businessDate.ToDateTime(TimeOnly.MinValue));
        _context.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Handle_ShouldThrowNotFoundException_WhenReservationDoesNotExist()
    {
        // Arrange
        _context.Setup(x => x.Reservations).Returns(CreateMockDbSet<Reservation>().Object);

        var command = new CheckOutReservationCommand 
        { 
            ReservationId = 99, 
            BusinessDate = new DateOnly(2026, 2, 27) 
        };

        // Act & Assert
        await Should.ThrowAsync<NotFoundException>(() => _handler.Handle(command, CancellationToken.None));
    }

    private static Mock<DbSet<T>> CreateMockDbSet<T>(params T[] elements) where T : class
    {
        var queryable = elements.AsQueryable();
        var mockSet = new Mock<DbSet<T>>();

        mockSet.As<IAsyncEnumerable<T>>()
            .Setup(m => m.GetAsyncEnumerator(It.IsAny<CancellationToken>()))
            .Returns(new TestAsyncEnumerator<T>(queryable.GetEnumerator()));

        mockSet.As<IQueryable<T>>()
            .Setup(m => m.Provider)
            .Returns(new TestAsyncQueryProvider<T>(queryable.Provider));

        mockSet.As<IQueryable<T>>().Setup(m => m.Expression).Returns(queryable.Expression);
        mockSet.As<IQueryable<T>>().Setup(m => m.ElementType).Returns(queryable.ElementType);
        mockSet.As<IQueryable<T>>().Setup(m => m.GetEnumerator()).Returns(queryable.GetEnumerator());

        return mockSet;
    }

    private class TestAsyncQueryProvider<TEntity> : IAsyncQueryProvider
    {
        private readonly IQueryProvider _inner;

        internal TestAsyncQueryProvider(IQueryProvider inner)
        {
            _inner = inner;
        }

        public IQueryable CreateQuery(Expression expression)
        {
            return new TestAsyncEnumerable<TEntity>(expression);
        }

        public IQueryable<TElement> CreateQuery<TElement>(Expression expression)
        {
            return new TestAsyncEnumerable<TElement>(expression);
        }

        public object Execute(Expression expression)
        {
            return _inner.Execute(expression)!;
        }

        public TResult Execute<TResult>(Expression expression)
        {
            return _inner.Execute<TResult>(expression);
        }

        public TResult ExecuteAsync<TResult>(Expression expression, CancellationToken cancellationToken = default)
        {
            var expectedResultType = typeof(TResult).GetGenericArguments()[0];
            var executionResult = ((IQueryProvider)this).Execute(expression);

            return (TResult)typeof(Task).GetMethod(nameof(Task.FromResult))!
                .MakeGenericMethod(expectedResultType)
                .Invoke(null, new[] { executionResult })!;
        }
    }

    private class TestAsyncEnumerable<T> : EnumerableQuery<T>, IAsyncEnumerable<T>, IQueryable<T>
    {
        public TestAsyncEnumerable(IEnumerable<T> enumerable) : base(enumerable) { }
        public TestAsyncEnumerable(Expression expression) : base(expression) { }

        public IAsyncEnumerator<T> GetAsyncEnumerator(CancellationToken cancellationToken = default)
        {
            return new TestAsyncEnumerator<T>(this.AsEnumerable().GetEnumerator());
        }

        IQueryProvider IQueryable.Provider => new TestAsyncQueryProvider<T>(this);
    }

    private class TestAsyncEnumerator<T> : IAsyncEnumerator<T>
    {
        private readonly IEnumerator<T> _inner;

        public TestAsyncEnumerator(IEnumerator<T> inner)
        {
            _inner = inner;
        }

        public ValueTask<bool> MoveNextAsync()
        {
            return new ValueTask<bool>(_inner.MoveNext());
        }

        public T Current => _inner.Current;

        public ValueTask DisposeAsync()
        {
            _inner.Dispose();
            return new ValueTask();
        }
    }
}
