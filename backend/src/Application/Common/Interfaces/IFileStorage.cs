namespace CleanArchitecture.Application.Common.Interfaces;

public interface IFileStorage
{
    Task<string> SaveFileAsync(Stream content, string fileName, string contentType, CancellationToken cancellationToken = default);
}
