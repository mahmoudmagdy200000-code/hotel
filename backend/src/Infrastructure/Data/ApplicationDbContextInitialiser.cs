using CleanArchitecture.Domain.Constants;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using CleanArchitecture.Infrastructure.Identity;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CleanArchitecture.Infrastructure.Data;

public static class InitialiserExtensions
{
    public static async Task InitialiseDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();

        var initialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitialiser>();

        await initialiser.InitialiseAsync();
        await initialiser.SeedAsync();
    }
}

public class ApplicationDbContextInitialiser
{
    private readonly ILogger<ApplicationDbContextInitialiser> _logger;
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;

    public ApplicationDbContextInitialiser(ILogger<ApplicationDbContextInitialiser> logger, ApplicationDbContext context, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
    {
        _logger = logger;
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
    }

    public async Task InitialiseAsync()
    {
        try
        {
            // Apply any pending migrations
            await _context.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while initialising the database.");
            throw;
        }
    }

    public async Task SeedAsync()
    {
        try
        {
            await TrySeedAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }

    public async Task TrySeedAsync()
    {
        // Default roles
        var roles = new[] { Roles.Administrator, Roles.Owner, Roles.Receptionist };

        foreach (var roleName in roles)
        {
            if (_roleManager.Roles.All(r => r.Name != roleName))
            {
                await _roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }

        // Default users
        var administrator = new ApplicationUser { UserName = "administrator@localhost", Email = "administrator@localhost" };

        if (_userManager.Users.All(u => u.UserName != administrator.UserName))
        {
            var branchA = await _context.Branches.FirstOrDefaultAsync(b => b.Name == "Branch A");
            administrator.BranchId = branchA?.Id;

            await _userManager.CreateAsync(administrator, "Administrator1!");
            
            await _userManager.AddToRolesAsync(administrator, new [] { Roles.Administrator });
        }
        else
        {
            // Backfill branch for existing admin if needed
            var existingAdmin = await _userManager.FindByNameAsync(administrator.UserName);
            if (existingAdmin != null && existingAdmin.BranchId == null)
            {
                var branchA = await _context.Branches.FirstOrDefaultAsync(b => b.Name == "Branch A");
                existingAdmin.BranchId = branchA?.Id;
                await _userManager.UpdateAsync(existingAdmin);
            }
        }

        // Default Owner
        var owner = new ApplicationUser { UserName = "owner@localhost", Email = "owner@localhost" };
        if (_userManager.Users.All(u => u.UserName != owner.UserName))
        {
            await _userManager.CreateAsync(owner, "Owner1!");
            await _userManager.AddToRolesAsync(owner, new [] { Roles.Owner });
        }

        // Default Receptionist
        var receptionist = new ApplicationUser { UserName = "receptionist@localhost", Email = "receptionist@localhost" };
        if (_userManager.Users.All(u => u.UserName != receptionist.UserName))
        {
            await _userManager.CreateAsync(receptionist, "Receptionist1!");
            await _userManager.AddToRolesAsync(receptionist, new [] { Roles.Receptionist });
        }

        // Default data
        // Seed, if necessary
        // Default data
        // Seed, if necessary
        if (!_context.Branches.Any())
        {
            _context.Branches.AddRange(
                new Branch { Name = "Branch A" },
                new Branch { Name = "Branch B" }
            );
            await _context.SaveChangesAsync();
        }

        if (!_context.RoomTypes.Any())
        {
            var defaultBranch = await _context.Branches.FirstAsync(b => b.Name == "Branch A");

            var roomTypes = new List<RoomType>
            {
                new() { BranchId = defaultBranch.Id, Name = "Standard", Capacity = 2, DefaultRate = 100, IsActive = true },
                new() { BranchId = defaultBranch.Id, Name = "Deluxe", Capacity = 2, DefaultRate = 200, IsActive = true },
                new() { BranchId = defaultBranch.Id, Name = "Suite", Capacity = 4, DefaultRate = 500, IsActive = true }
            };

            _context.RoomTypes.AddRange(roomTypes);
            await _context.SaveChangesAsync();

            var rooms = new List<Room>();
            for (int i = 1; i <= 10; i++)
            {
                var roomTypeId = roomTypes[(i - 1) % 3].Id; 
                rooms.Add(new Room 
                { 
                    BranchId = defaultBranch.Id,
                    RoomNumber = $"10{i}", 
                    RoomTypeId = roomTypeId,
                    Floor = 1,
                    Status = Domain.Enums.RoomStatus.Available,
                    IsActive = true
                });
            }
            _context.Rooms.AddRange(rooms);
            await _context.SaveChangesAsync();
        }

        if (!_context.Reservations.IgnoreQueryFilters().Any())
        {
            var defaultBranch = await _context.Branches.FirstAsync(b => b.Name == "Branch A");
            var rooms = await _context.Rooms.ToListAsync();

            var reservation1 = new Reservation
            {
                BranchId = defaultBranch.Id,
                GuestName = "John Doe",
                CheckInDate = DateTime.Now.AddDays(1),
                CheckOutDate = DateTime.Now.AddDays(4),
                Status = ReservationStatus.Confirmed,
                TotalAmount = 300,
                Currency = "USD",
                Source = ReservationSource.Manual,
                CurrencyCode = CurrencyCode.USD,
                PaymentMethod = PaymentMethod.Cash,
                BalanceDue = 300
            };

            reservation1.Lines.Add(new ReservationLine
            {
                RoomId = rooms[0].Id,
                RoomTypeId = rooms[0].RoomTypeId,
                RatePerNight = 100,
                Nights = 3,
                LineTotal = 300
            });

            var reservation2 = new Reservation
            {
                BranchId = defaultBranch.Id,
                GuestName = "Jane Smith",
                CheckInDate = DateTime.Now.AddDays(5),
                CheckOutDate = DateTime.Now.AddDays(7),
                Status = ReservationStatus.Confirmed,
                TotalAmount = 450,
                Currency = "USD",
                Source = ReservationSource.Manual,
                CurrencyCode = CurrencyCode.USD,
                PaymentMethod = PaymentMethod.Visa,
                BalanceDue = 0
            };

            // Two rooms for Jane
            reservation2.Lines.Add(new ReservationLine
            {
                RoomId = rooms[1].Id,
                RoomTypeId = rooms[1].RoomTypeId,
                RatePerNight = 200,
                Nights = 2,
                LineTotal = 400
            });
            reservation2.Lines.Add(new ReservationLine
            {
                RoomId = rooms[2].Id,
                RoomTypeId = rooms[2].RoomTypeId,
                RatePerNight = 25,
                Nights = 2,
                LineTotal = 50
            });

            var cancelledRes = new Reservation
            {
                BranchId = defaultBranch.Id,
                GuestName = "Cancelled Guest",
                CheckInDate = DateTime.Now.AddDays(10),
                CheckOutDate = DateTime.Now.AddDays(12),
                Status = ReservationStatus.Cancelled,
                TotalAmount = 200,
                Currency = "USD",
                Source = ReservationSource.Manual,
                CurrencyCode = CurrencyCode.USD,
                PaymentMethod = PaymentMethod.Cash,
                BalanceDue = 200
            };
            cancelledRes.Lines.Add(new ReservationLine
            {
                RoomId = rooms[0].Id,
                RoomTypeId = rooms[0].RoomTypeId,
                RatePerNight = 100,
                Nights = 2,
                LineTotal = 200
            });

            _context.Reservations.AddRange(reservation1, reservation2, cancelledRes);
            await _context.SaveChangesAsync();

            // 4. PDF Draft Seed Data (Phase 6 demo)
            var draft1 = new Reservation
            {
                BranchId = defaultBranch.Id,
                Source = ReservationSource.PDF,
                BookingNumber = "PDF-SEED-001",
                GuestName = "Pending PDF Guest",
                Status = ReservationStatus.Draft,
                CheckInDate = DateTime.Now.Date.AddDays(10),
                CheckOutDate = DateTime.Now.Date.AddDays(11),
                Currency = "USD",
                Notes = "[PDF_UPLOAD] File: reservation_pending.pdf | Internal Path: seed_data/pending.pdf\n[PARSING_STATUS] Pending"
            };

            var draft2 = new Reservation
            {
                BranchId = defaultBranch.Id,
                Source = ReservationSource.PDF,
                BookingNumber = "PDF-SEED-002",
                GuestName = "Parsed PDF Guest",
                Status = ReservationStatus.Draft,
                CheckInDate = DateTime.Now.Date.AddDays(14),
                CheckOutDate = DateTime.Now.Date.AddDays(17),
                Currency = "USD",
                Notes = "[PDF_UPLOAD] File: reservation_parsed.pdf | Internal Path: seed_data/parsed.pdf\n[PARSING_STATUS] Parsed\n[EXTRACTED] RoomsCount=2"
            };

            _context.Reservations.AddRange(draft1, draft2);
            await _context.SaveChangesAsync();
        }

        if (!_context.BranchListings.IgnoreQueryFilters().Any())
        {
            var defaultBranch = await _context.Branches.FirstAsync(b => b.Name == "Branch A");

            var listings = new List<BranchListing>
            {
                new() { BranchId = defaultBranch.Id, Name = "Continental terrace", IsActive = true },
                new() { BranchId = defaultBranch.Id, Name = "Continental view", IsActive = true },
                new() { BranchId = defaultBranch.Id, Name = "Continental inn", IsActive = true },
                new() { BranchId = defaultBranch.Id, Name = "Happy days", IsActive = true },
                new() { BranchId = defaultBranch.Id, Name = "Aida", IsActive = true },
                new() { BranchId = defaultBranch.Id, Name = "Family", IsActive = true }
            };

            _context.BranchListings.AddRange(listings);
            await _context.SaveChangesAsync();
        }
    }
}

