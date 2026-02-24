using System.Data.Common;
using CleanArchitecture.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using Testcontainers.MySql;

namespace CleanArchitecture.Application.FunctionalTests;

public class MySqlTestDatabase : ITestDatabase
{
    private readonly MySqlContainer _container;
    private DbConnection _connection = null!;
    private string _connectionString = null!;

    public MySqlTestDatabase()
    {
        _container = new MySqlBuilder()
            .WithDatabase("hotelpms_test")
            .WithUsername("testuser")
            .WithPassword("testpassword")
            .Build();
    }

    public async Task InitialiseAsync()
    {
        await _container.StartAsync();

        _connectionString = _container.GetConnectionString();

        _connection = new MySqlConnection(_connectionString);
        await _connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString))
            .Options;

        var context = new ApplicationDbContext(options, null!);

        context.Database.Migrate();
    }

    public DbConnection GetConnection()
    {
        return _connection;
    }

    public string GetConnectionString()
    {
        return _connectionString;
    }

    public async Task ResetAsync()
    {
        // Re-migrating is typically sufficient for cleanup in tests 
        // if using something like Respawn, apply here
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString))
            .Options;

        var context = new ApplicationDbContext(options, null!);

        await context.Database.EnsureDeletedAsync();
        await context.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _connection.DisposeAsync();
        await _container.DisposeAsync();
    }
}
