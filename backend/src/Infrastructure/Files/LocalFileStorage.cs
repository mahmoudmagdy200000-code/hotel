using CleanArchitecture.Application.Common.Interfaces;
using Microsoft.AspNetCore.Hosting;

namespace CleanArchitecture.Infrastructure.Files;

public class LocalFileStorage : IFileStorage
{
    private readonly IWebHostEnvironment _environment;

    public LocalFileStorage(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<string> SaveFileAsync(Stream content, string fileName, string contentType, CancellationToken cancellationToken = default)
    {
        var uploadPath = Path.Combine(_environment.ContentRootPath, "App_Data", "Uploads");

        if (!Directory.Exists(uploadPath))
        {
            Directory.CreateDirectory(uploadPath);
        }

        var uniqueFileName = $"{Guid.NewGuid()}_{fileName}";
        var fullPath = Path.Combine(uploadPath, uniqueFileName);

        using var fileStream = new FileStream(fullPath, FileMode.Create);
        await content.CopyToAsync(fileStream, cancellationToken);

        // Return relative path for portability
        return Path.Combine("App_Data", "Uploads", uniqueFileName);
    }
}
