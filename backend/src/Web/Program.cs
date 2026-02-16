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
if (app.Environment.IsDevelopment())
{
    await app.InitialiseDatabaseAsync();
}
else
{
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHealthChecks("/health");
app.UseCors("ViteDev");
// app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.UseOpenApi(options => options.Path = "/api/specification.json");

app.UseSwaggerUi(settings =>
{
    settings.Path = "/api";
    settings.DocumentPath = "specification.json";
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
