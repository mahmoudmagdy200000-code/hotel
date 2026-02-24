using CleanArchitecture.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// builder.AddServiceDefaults(); // Disabled Aspire by default unless explicitly needed
builder.AddKeyVaultIfConfigured();
builder.AddApplicationServices();
builder.AddInfrastructureServices();
builder.AddWebServices();

var app = builder.Build();

// Configure the HTTP request pipeline.
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    await app.InitialiseDatabaseAsync();
}
else
{
    // Try to init DB in production too (for first deployment)
    try 
    {
        await app.InitialiseDatabaseAsync();
    }
    catch (Exception ex)
    {
        // Log but continue if it fails (might be permissions)
        Console.WriteLine($"DB Init failed: {ex.Message}");
    }

    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHealthChecks("/health");
app.UseCors("ViteDev");
// app.UseHttpsRedirection();
app.UseStaticFiles();
// Global Anti-Cache Middleware for API Endpoints to ensure mobile browsers fetch real-time data
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
            context.Response.Headers["Pragma"] = "no-cache";
            context.Response.Headers["Expires"] = "-1";
            return Task.CompletedTask;
        });
    }
    await next();
});

app.UseAuthentication();
app.UseAuthorization();

app.UseOpenApi(options => options.Path = "/api/specification.json");

app.UseSwaggerUi(settings =>
{
    settings.Path = "/api";
    // زود السلاش هنا كمان عشان الـ UI ميتوهش وهو بيدور على الملف
    settings.DocumentPath = "/api/specification.json"; 
});

app.MapGet("/", () => Results.Redirect("/api"));

app.UseExceptionHandler(options => { });

// app.MapDefaultEndpoints();
app.MapEndpoints();

app.MapGet("/debug-routes", (IEnumerable<EndpointDataSource> endpointSources) =>
{
    var routes = endpointSources
        .SelectMany(source => source.Endpoints)
        .Select(e => e.DisplayName + " (" + (e.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods.FirstOrDefault() ?? "ANY") + ")")
        .ToList();
    return string.Join("\n", routes);
});

app.Run();

public partial class Program { }
