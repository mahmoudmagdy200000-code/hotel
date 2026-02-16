# Bug Fix Resolved: 404 on Startup

## Root Cause
1. **Missing OpenAPI Spec:** `app.UseOpenApi()` was missing, causing Swagger UI to fail loading the spec (404 on `specification.json`).
2. **Missing SPA:** The root URL `/` was trying to proxy to the SPA (Angular/React), which is not running, causing a fallback error or 404.

## Fixes Applied
1. **Served OpenAPI Spec:** Added `app.UseOpenApi(...)` in `Program.cs`.
2. **Redirected Root:** Changed `Program.cs` to redirect `/` directly to `/api`, bypassing the failing SPA proxy.

## Result
- **Status:** ✅ Fixed.
- **Action:** Open `https://localhost:5001`. It will redirect to Swagger UI automatically.
