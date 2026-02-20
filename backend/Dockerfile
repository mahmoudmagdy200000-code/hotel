# .NET 10 optimized Dockerfile for Hotel PMS deployment (Inside backend folder)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files first to leverage Docker layer caching
COPY ["CleanArchitecture.slnx", "./"]
COPY ["Directory.Build.props", "./"]
COPY ["Directory.Packages.props", "./"]
COPY ["global.json", "./"]
COPY ["src/Domain/Domain.csproj", "src/Domain/"]
COPY ["src/Application/Application.csproj", "src/Application/"]
COPY ["src/Infrastructure/Infrastructure.csproj", "src/Infrastructure/"]
COPY ["src/Web/Web.csproj", "src/Web/"]

# Restore dependencies
RUN dotnet restore "src/Web/Web.csproj"

# Copy the entire backend source code into /src
COPY . .

# Build and publish for Release
WORKDIR "/src/src/Web"
RUN dotnet publish "Web.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Set required environment variables and expose port
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

# Copy published artifacts from build stage
COPY --from=build /app/publish .

# Point to hotel.dll as requested
ENTRYPOINT ["dotnet", "hotel.dll"]
