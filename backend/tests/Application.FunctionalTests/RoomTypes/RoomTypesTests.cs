using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Common.Models;
using CleanArchitecture.Application.RoomTypes.Commands.CreateRoomType;
using CleanArchitecture.Application.RoomTypes.Commands.UpdateRoomType;
using CleanArchitecture.Application.RoomTypes.Queries.GetRoomTypes;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using CleanArchitecture.Domain.ValueObjects;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.RoomTypes;

using static Testing;

public class RoomTypesTests : BaseTestFixture
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

        var response = await _client.GetAsync("/api/roomtypes");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task ShouldGetRoomTypes()
    {
        await ResetState();
        AddAuth();

        await AddAsync(new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 });
        await AddAsync(new RoomType { Name = "Deluxe", Capacity = 3, DefaultRate = 150 });

        var response = await _client.GetAsync("/api/roomtypes");

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<List<RoomTypeDto>>();

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Count, Is.EqualTo(2));
        Assert.That(result.Any(x => x.Name == "Standard"), Is.True);
    }

    [Test]
    public async Task ShouldFilterRoomTypesByIsActive()
    {
        await ResetState();
        AddAuth();

        await AddAsync(new RoomType { Name = "Active", IsActive = true, Capacity = 1 });
        await AddAsync(new RoomType { Name = "Inactive", IsActive = false, Capacity = 1 });

        var response = await _client.GetAsync("/api/roomtypes?isActive=true");

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<List<RoomTypeDto>>();

        Assert.That(result!.Count, Is.EqualTo(1));
        Assert.That(result[0].Name, Is.EqualTo("Active"));
    }

    [Test]
    public async Task ShouldGetRoomTypeById()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Suite", Capacity = 4, DefaultRate = 300 };
        await AddAsync(roomType);

        var response = await _client.GetAsync($"/api/roomtypes/{roomType.Id}");

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<RoomTypeDto>();

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Name, Is.EqualTo("Suite"));
    }

    [Test]
    public async Task ShouldReturnNotFoundForInvalidId()
    {
        AddAuth();

        var response = await _client.GetAsync("/api/roomtypes/9999");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }

    [Test]
    public async Task ShouldCreateRoomType()
    {
        await ResetState();
        AddAuth();

        var command = new CreateRoomTypeCommand
        {
            Name = "New Type",
            Capacity = 2,
            DefaultRate = 120
        };

        var response = await _client.PostAsJsonAsync("/api/roomtypes", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Created));
        
        var id = await response.Content.ReadFromJsonAsync<int>();
        var entity = await FindAsync<RoomType>(id);

        Assert.That(entity, Is.Not.Null);
        Assert.That(entity!.Name, Is.EqualTo(command.Name));
    }

    [Test]
    public async Task ShouldReturnBadRequestWhenCreatingDuplicateName()
    {
        await ResetState();
        AddAuth();

        await AddAsync(new RoomType { Name = "Duplicate", Capacity = 1 });

        var command = new CreateRoomTypeCommand
        {
            Name = "Duplicate",
            Capacity = 2
        };

        var response = await _client.PostAsJsonAsync("/api/roomtypes", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task ShouldReturnBadRequestForInvalidCreatePayload()
    {
        AddAuth();

        var command = new CreateRoomTypeCommand
        {
            Name = "", // Required
            Capacity = 0, // > 0
            DefaultRate = -1 // >= 0
        };

        var response = await _client.PostAsJsonAsync("/api/roomtypes", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task ShouldUpdateRoomType()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Old Name", Capacity = 1 };
        await AddAsync(roomType);

        var command = new UpdateRoomTypeCommand
        {
            Id = roomType.Id,
            Name = "Updated Name",
            Capacity = 5,
            DefaultRate = 200,
            IsActive = true
        };

        var response = await _client.PutAsJsonAsync($"/api/roomtypes/{roomType.Id}", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

        var entity = await FindAsync<RoomType>(roomType.Id);
        Assert.That(entity!.Name, Is.EqualTo("Updated Name"));
        Assert.That(entity.Capacity, Is.EqualTo(5));
    }

    [Test]
    public async Task ShouldReturnNotFoundWhenUpdatingNonExistingId()
    {
        AddAuth();

        var command = new UpdateRoomTypeCommand { Id = 8888, Name = "X", Capacity = 1 };

        var response = await _client.PutAsJsonAsync("/api/roomtypes/8888", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }

    [Test]
    public async Task ShouldDeleteRoomType()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "To Be Deleted", Capacity = 1 };
        await AddAsync(roomType);

        var response = await _client.DeleteAsync($"/api/roomtypes/{roomType.Id}");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

        var entity = await FindAsync<RoomType>(roomType.Id);
        Assert.That(entity, Is.Null);
    }

    [Test]
    public async Task ShouldBlockDeleteWhenRoomsExist()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "In Use", Capacity = 1 };
        await AddAsync(roomType);

        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var response = await _client.DeleteAsync($"/api/roomtypes/{roomType.Id}");

        // The handler throws InvalidOperationException which should be caught by CustomExceptionHandler
        // If it's not handled specifically, it might return 500.
        // Let's check CustomExceptionHandler.cs again or see the result.
        // The user wants 400/409 for blocked deletes.
        Assert.That(response.StatusCode, Is.AnyOf(HttpStatusCode.BadRequest, HttpStatusCode.Conflict));
    }
}
