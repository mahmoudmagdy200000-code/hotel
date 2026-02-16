using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Rooms.Commands.CreateRoom;
using CleanArchitecture.Application.Rooms.Commands.UpdateRoom;
using CleanArchitecture.Application.Rooms.Queries.GetRooms;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Rooms;

using static Testing;

public class RoomsTests : BaseTestFixture
{
    private HttpClient _client = null!;

    [SetUp]
    public void SetUp()
    {
        _client = _factory.CreateClient();
    }

    [TearDown]
    public void TearDown()
    {
        _client.Dispose();
    }

    private void AddAuth(bool authenticated = true)
    {
        _client.DefaultRequestHeaders.Remove("SkipAuthentication");
        if (!authenticated)
        {
            _client.DefaultRequestHeaders.Add("SkipAuthentication", "true");
        }
    }

    [Test]
    public async Task ShouldRequireMinimumAuthentication()
    {
        AddAuth(false);

        var response = await _client.GetAsync("/api/rooms");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task ShouldGetRooms()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(roomType);

        await AddAsync(new Room { RoomNumber = "101", RoomTypeId = roomType.Id });
        await AddAsync(new Room { RoomNumber = "102", RoomTypeId = roomType.Id });

        var response = await _client.GetAsync("/api/rooms");

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<List<RoomDto>>();

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Count, Is.EqualTo(2));
        Assert.That(result.Any(x => x.RoomNumber == "101"), Is.True);
    }

    [Test]
    public async Task ShouldFilterRooms()
    {
        await ResetState();
        AddAuth();

        var type1 = new RoomType { Name = "T1", Capacity = 2 };
        var type2 = new RoomType { Name = "T2", Capacity = 2 };
        await AddAsync(type1);
        await AddAsync(type2);

        await AddAsync(new Room { RoomNumber = "101", RoomTypeId = type1.Id, IsActive = true });
        await AddAsync(new Room { RoomNumber = "102", RoomTypeId = type2.Id, IsActive = false });

        // Filter by RoomTypeId
        var response1 = await _client.GetAsync($"/api/rooms?roomTypeId={type1.Id}");
        var result1 = await response1.Content.ReadFromJsonAsync<List<RoomDto>>();
        Assert.That(result1!.Count, Is.EqualTo(1));
        Assert.That(result1[0].RoomNumber, Is.EqualTo("101"));

        // Filter by IsActive
        var response2 = await _client.GetAsync("/api/rooms?isActive=false");
        var result2 = await response2.Content.ReadFromJsonAsync<List<RoomDto>>();
        Assert.That(result2!.Count, Is.EqualTo(1));
        Assert.That(result2[0].RoomNumber, Is.EqualTo("102"));

        // Filter by Search
        var response3 = await _client.GetAsync("/api/rooms?search=101");
        var result3 = await response3.Content.ReadFromJsonAsync<List<RoomDto>>();
        Assert.That(result3!.Count, Is.EqualTo(1));
        Assert.That(result3[0].RoomNumber, Is.EqualTo("101"));
    }

    [Test]
    public async Task ShouldGetRoomById()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "201", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var response = await _client.GetAsync($"/api/rooms/{room.Id}");

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<RoomDto>();

        Assert.That(result!.RoomNumber, Is.EqualTo("201"));
    }

    [Test]
    public async Task ShouldCreateRoom()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(roomType);

        var command = new CreateRoomCommand
        {
            RoomNumber = "301",
            RoomTypeId = roomType.Id,
            Floor = 3
        };

        var response = await _client.PostAsJsonAsync("/api/rooms", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Created));
        
        var id = await response.Content.ReadFromJsonAsync<int>();
        var entity = await FindAsync<Room>(id);

        Assert.That(entity, Is.Not.Null);
        Assert.That(entity!.RoomNumber, Is.EqualTo("301"));
    }

    [Test]
    public async Task ShouldReturnBadRequestWhenCreatingWithDuplicateNumber()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(roomType);
        await AddAsync(new Room { RoomNumber = "401", RoomTypeId = roomType.Id });

        var command = new CreateRoomCommand { RoomNumber = "401", RoomTypeId = roomType.Id };

        var response = await _client.PostAsJsonAsync("/api/rooms", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task ShouldReturnBadRequestWhenRoomTypeDoesNotExist()
    {
        await ResetState();
        AddAuth();

        var command = new CreateRoomCommand { RoomNumber = "501", RoomTypeId = 9999 };

        var response = await _client.PostAsJsonAsync("/api/rooms", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task ShouldUpdateRoom()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "601", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var command = new UpdateRoomCommand
        {
            Id = room.Id,
            RoomNumber = "601-Updated",
            RoomTypeId = roomType.Id,
            IsActive = false,
            Status = RoomStatus.OutOfService
        };

        var response = await _client.PutAsJsonAsync($"/api/rooms/{room.Id}", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

        var entity = await FindAsync<Room>(room.Id);
        Assert.That(entity!.RoomNumber, Is.EqualTo("601-Updated"));
        Assert.That(entity.IsActive, Is.False);
        Assert.That(entity.Status, Is.EqualTo(RoomStatus.OutOfService));
    }

    [Test]
    public async Task ShouldDeleteRoom()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "701", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var response = await _client.DeleteAsync($"/api/rooms/{room.Id}");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

        var entity = await FindAsync<Room>(room.Id);
        Assert.That(entity, Is.Null);
    }

    [Test]
    public async Task ShouldBlockDeleteWhenReservationsExist()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "801", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var reservation = new Reservation 
        { 
            GuestName = "Test",
            CheckInDate = DateTime.Now,
            CheckOutDate = DateTime.Now.AddDays(1),
            Currency = "USD",
            TotalAmount = 100,
            Nationality = "N/A"
        };
        reservation.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id });
        await AddAsync(reservation);

        var response = await _client.DeleteAsync($"/api/rooms/{room.Id}");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }
}
