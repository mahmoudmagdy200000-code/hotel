using System;
using CleanArchitecture.Application.Common.Interfaces;

using CleanArchitecture.Domain.Constants;
using CleanArchitecture.Infrastructure.Data;
using CleanArchitecture.Infrastructure.Data.Interceptors;
using CleanArchitecture.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        var connectionString = builder.Configuration.GetConnectionString("CleanArchitectureDb");
        
        // Resolve environment variable placeholders if present
        if (connectionString != null && connectionString.Contains("${"))
        {
            connectionString = connectionString
                .Replace("${DB_SERVER}", Environment.GetEnvironmentVariable("DB_SERVER") ?? "localhost")
                .Replace("${DB_DATABASE}", Environment.GetEnvironmentVariable("DB_DATABASE") ?? "hotel")
                .Replace("${DB_USER}", Environment.GetEnvironmentVariable("DB_USER") ?? "root")
                .Replace("${DB_PASSWORD}", Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "");
        }

        Guard.Against.Null(connectionString, message: "Connection string 'CleanArchitectureDb' not found.");


        builder.Services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
        builder.Services.AddScoped<ISaveChangesInterceptor, DispatchDomainEventsInterceptor>();

        builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.AddInterceptors(sp.GetServices<ISaveChangesInterceptor>());
            options.UseMySql(
                connectionString,
                ServerVersion.AutoDetect(connectionString)
            );
            options.ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning));
        });

#if (UseAspire)
#if (UsePostgreSQL)
        builder.EnrichNpgsqlDbContext<ApplicationDbContext>();
#elif (UseSqlServer)
        builder.EnrichSqlServerDbContext<ApplicationDbContext>();
#endif
#endif

        builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        builder.Services.AddScoped<ApplicationDbContextInitialiser>();

        builder.Services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = IdentityConstants.BearerScheme;
            options.DefaultChallengeScheme = IdentityConstants.BearerScheme;
            options.DefaultScheme = IdentityConstants.BearerScheme;
        });

        builder.Services.AddAuthorizationBuilder();

        builder.Services
            .AddIdentityApiEndpoints<ApplicationUser>(options =>
            {
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
                options.Password.RequiredLength = 6;
            })
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddClaimsPrincipalFactory<ApplicationUserClaimsPrincipalFactory>();

        builder.Services.AddSingleton(TimeProvider.System);
        
        builder.Services.Configure<CleanArchitecture.Application.Common.Models.HotelSettings>(
            builder.Configuration.GetSection(CleanArchitecture.Application.Common.Models.HotelSettings.SectionName));
        builder.Services.AddSingleton<IDateTimeProvider, CleanArchitecture.Infrastructure.Services.HotelDateTimeProvider>();

        builder.Services.AddTransient<IIdentityService, IdentityService>();
        builder.Services.AddTransient<IFileStorage, CleanArchitecture.Infrastructure.Files.LocalFileStorage>();
        builder.Services.AddTransient<IPdfReservationParser, CleanArchitecture.Infrastructure.Files.StructuredPdfReservationParser>();
        builder.Services.AddTransient<IBranchResolver, CleanArchitecture.Infrastructure.Services.BranchResolver>();

        builder.Services.AddAuthorization(options =>
            options.AddPolicy(Policies.CanPurge, policy => policy.RequireRole(Roles.Administrator)));
    }
}
