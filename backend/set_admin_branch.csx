using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using CleanArchitecture.Infrastructure.Data;
using CleanArchitecture.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

var config = new ConfigurationBuilder().AddJsonFile("src/Web/appsettings.Development.json").Build();
var connectionString = config.GetConnectionString("CleanArchitectureDb");

var services = new ServiceCollection();
services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connectionString));
services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>();
services.AddLogging();

var serviceProvider = services.BuildServiceProvider();
using var scope = serviceProvider.BuildServiceProvider().CreateScope();
var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

var admin = await userManager.FindByNameAsync("administrator@localhost");
if (admin != null)
{
    var branch = await context.Branches.FirstOrDefaultAsync(b => b.Name == "Branch A");
    if (branch != null)
    {
        admin.BranchId = branch.Id;
        await userManager.UpdateAsync(admin);
        Console.WriteLine($"Updated admin {admin.UserName} with BranchId {branch.Id} ({branch.Name})");
    }
    else
    {
        Console.WriteLine("Branch A not found.");
    }
}
else
{
    Console.WriteLine("Admin user not found.");
}
