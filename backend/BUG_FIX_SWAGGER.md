# Bug Fix: 404 Swagger Specification

## Issue
User reported `404 Failed to load resource` when accessing the application (implicitly Swagger UI).
Code analysis showed `app.UseOpenApi()` was missing in `Program.cs`, so the Swagger JSON specification was not being served.

## Fix
1. **Added Middleware:** In `src/Web/Program.cs`:
   ```csharp
   app.UseOpenApi(options => options.Path = "/api/specification.json");
   ```
2. **Result:** The API now serves the OpenAPI specification at the path expected by the Swagger UI.

## Status
- App restarted successfully.
- Listening on `https://localhost:5001`.
- Swagger UI available at `/api/index.html`.
