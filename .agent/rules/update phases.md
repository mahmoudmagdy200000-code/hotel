---
trigger: always_on
---

# Role
You are an Expert Full-Stack .NET Developer and Software Architect specializing in Clean Architecture, Domain-Driven Design (DDD), and secure enterprise systems.

# Context
We are implementing backend updates for "Nexa PMS" (currently in PRODUCTION) based on the previous architecture analysis. We are now executing **Phase 1 (Update User Password)** and **Phase 2 (Create Branch)** strictly in the Backend (.NET). 

# Task
Write the exact, production-ready C# code to implement these features. Adhere strictly to Clean Code, SOLID principles, and our existing Clean Architecture structure (Domain, Application, Infrastructure, Web/API). 
**CONSTRAINT:** Do NOT create or run any EF Core Migrations, as the database schema already supports these changes. Do NOT modify any React/Frontend files in this prompt.

# Implementation Requirements

## Phase 1: Update User & Password Reset
1. **IIdentityService & IdentityService (Infrastructure layer):**
   - Add `Task<Result> UpdatePasswordAsync(string userId, string newPassword);` to the interface.
   - Implement it in `IdentityService` using ASP.NET Core Identity: Generate a reset token (`GeneratePasswordResetTokenAsync`) and reset the password (`ResetPasswordAsync`).
2. **UpdateUserCommand & Handler (Application layer):**
   - Add an optional property: `public string? NewPassword { get; init; }`
   - In the Handler, check if `NewPassword` is provided and not empty, then call `_identityService.UpdatePasswordAsync(...)`.
   - **CRITICAL SECURITY GUARD (Anti-Self-Lock):** Inject the `ICurrentUserService` (or equivalent context accessor). If the user executing the request is an "Administrator" and they are updating their *own* user profile, throw a validation exception or return a failure result if the new roles list does NOT include "Administrator". They must not be able to accidentally strip their own admin privileges.

## Phase 2: Create Branch (Vertical Slice)
1. **CreateBranchCommand & Handler (Application layer):**
   - Create `CreateBranchCommand` containing a `Name` property (string).
   - Create the corresponding Handler. Instantiate a new `Branch` entity, add it to the context, and save changes. Return the new `Guid`.
2. **API Endpoint (Web/API layer):**
   - Add the `POST /branches` minimal API endpoint (e.g., in a `Branches.cs` endpoint configuration file).
   - Ensure it is secured: `.RequireAuthorization(policy => policy.RequireRole(Roles.Administrator, Roles.Owner));`
   - Return `Results.Ok(id)` upon successful creation.

# Output Format
Please provide the exact code blocks for each modified or newly created file. Include the expected file path as a comment at the top of each code block so I know exactly where to place it. Ensure the code is robust and ready for production.

# Role
You are an Expert Full-Stack (.NET/React) Developer and QA Automation Engineer specializing in Clean Architecture, React Best Practices, and Test-Driven Development (TDD).

# Context
We are continuing the implementation for "Nexa PMS" (Production Environment). The Backend endpoints and commands for "Update User (with Password Reset)" and "Create Branch" have been created. 
We now need to execute **Phase 3 & Phase 4 (Frontend React/TypeScript Implementation)** and **Phase 5 (Backend Unit Testing)** to guarantee production stability.

# Task 1: Frontend Implementation (React + TypeScript)
Please provide the exact code changes for the following frontend files. Ensure you use existing UI patterns (Tailwind CSS, React hooks, existing state management):

1. **API & Types (`api/types/auth.ts` & `api/branches.ts`):**
   - Add optional `newPassword?: string` to the `UpdateUserCommand` TS interface.
   - Create `createBranch(name: string): Promise<string>` in the branches API service.
2. **Hooks (`hooks/admin/useUserManagement.ts`):**
   - Add a `useCreateBranch` mutation hook that calls the new API and invalidates the branches query cache (e.g., using React Query if applicable, or updating local state).
3. **UI Components (`pages/admin/UserManagement.tsx`):**
   - **Password Reset UI:** Add a "Reset Password" action for existing users. This can be a secondary dialog/modal triggered by a button in the user row. It should accept a new password and call `updateUser` with the new payload.
   - **Create Branch UI:** Add a "Create Branch" button (perhaps near the Global Nodes KPI card) that opens a simple modal with a "Branch Name" input and a submit button.

# Task 2: Backend Unit Tests (Guaranteeing Stability)
To ensure our new backend logic does not break production or allow invalid states, write Unit Tests (using xUnit, Moq, and FluentAssertions) for the newly modified Application Layer Handlers.

1. **Test `UpdateUserCommandHandler`:**
   - **Test Case 1:** Successfully updates user roles and calls `_identityService.UpdatePasswordAsync` when `NewPassword` is provided.
   - **Test Case 2 (CRITICAL):** Throws a validation exception (or returns Failure) when an Administrator attempts to remove their own "Administrator" role (Anti-Self-Lock guard).
2. **Test `CreateBranchCommandHandler`:**
   - **Test Case 1:** Successfully adds a new branch to the mocked DbContext and returns a valid Guid.

# Output Format
Provide the implementation in clearly separated code blocks with the intended file paths as comments at the top of each block. Start with the Frontend changes, followed by the Backend Unit Tests. Do NOT execute files directly; provide the code for review.