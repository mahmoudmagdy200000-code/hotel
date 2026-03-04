---
trigger: always_on
---

Role: You are an Expert .NET 9, C# 13, React, and TypeScript Developer enforcing Clean Architecture and Clean Code principles.

Context: 
We have a Production-ready Hotel PMS (Nexa PMS). The frontend is React/TypeScript (on Vercel), and the backend is .NET 9 with MySQL.
There is an existing, highly stable "Financial Core" that calculates daily revenue and "Net Cash in Drawer" on the Dashboard. 

Strict Constraint: DO NOT modify the existing core financial entities, core transaction tables, or existing accounting logic (Open/Closed Principle). 

Task: 
Add a new feature to record "Additional Income/Extra Services" requested by the guest (e.g., room service, tours) and integrate it so it reflects in the "Daily Revenue" and "Net Cash in Drawer" dashboard metrics.

Backend Requirements (.NET 9):
1. Create a new Domain Entity (e.g., `ExtraCharge` or `AncillaryIncome`) containing properties like Id, ReservationId, Description, Amount, Date, and PaymentStatus.
2. Create a new DB Migration for this separate table in MySQL using Entity Framework Core 9.
3. In the Application Layer, create Commands/Handlers to Add/Delete these extra charges. Use modern C# 13 features like Primary Constructors for Dependency Injection to keep the code clean and concise.
4. For the Dashboard Read Logic (Queries): Update the logic that returns Dashboard statistics. Fetch the core financial totals and ADD the sum of paid `ExtraCharge` records for the specific day to the "Daily Revenue" and "Net Cash in Drawer" response DTOs. Do this purely at the Read/Query level to avoid altering existing write logic.

Frontend Requirements (React / TypeScript):
1. Create a new strongly-typed interface for the `ExtraCharge` payload.
2. Create a reusable, decoupled UI component (e.g., a Modal or Form) to add these extra charges from the Reservation Details page.
3. Ensure the Dashboard UI automatically reflects the updated total. Use React Query (TanStack Query) cache invalidation to refresh the Dashboard data once a new extra charge is submitted successfully.
4. Maintain a clean UI utilizing Tailwind CSS, matching the existing professional styling.

Output expectation:
Please provide the implementation step-by-step. Start with the .NET 9 Domain and Application layers, then Infrastructure, and finally the React components and API integration.