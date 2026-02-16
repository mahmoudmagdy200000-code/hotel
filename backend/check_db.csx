using Microsoft.EntityFrameworkCore;
using CleanArchitecture.Infrastructure.Persistence;
using CleanArchitecture.Domain.Entities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;

var config = new ConfigurationBuilder().AddJsonFile("src/Web/appsettings.json").Build();
var connectionString = config.GetConnectionString("DefaultConnection");

var services = new ServiceCollection();
services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString));

var serviceProvider = services.BuildServiceProvider();
using var scope = serviceProvider.CreateScope();
var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

var reservations = await context.Reservations
    .Include(r => r.Lines)
    .Where(r => r.Status == CleanArchitecture.Domain.Enums.ReservationStatus.Draft)
    .ToListAsync();

foreach (var res in reservations)
{
    Console.WriteLine($"ID: {res.Id}, Booking: {res.BookingNumber}, Guest: {res.GuestName}, Lines: {res.Lines?.Count ?? 0}");
    Console.WriteLine($"Notes: {res.Notes}");
    Console.WriteLine("-----------------------------------");
}
