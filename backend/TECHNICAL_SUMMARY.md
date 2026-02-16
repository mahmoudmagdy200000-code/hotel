# Technical Summary: Hotel/Chalet Booking System

**Generated:** 2026-01-23  
**Reviewer:** Senior Software Architect  
**Status:** Pre-Implementation / Template State

---

## 1. Overall Project Purpose and Current Status

### Project Type
This is a **Hotel/Chalet Reservation System** based on Jason Taylor's Clean Architecture template for ASP.NET Core.

### Current Implementation Status
**⚠️ CRITICAL: The project is in TEMPLATE STATE - NO HOTEL-SPECIFIC FEATURES HAVE BEEN IMPLEMENTED YET**

The codebase currently contains:
- ✅ Clean Architecture foundation (fully scaffolded)
- ✅ Todo List sample application (template demo code)
- ✅ ASP.NET Identity integration
- ✅ Angular frontend (ClientApp) and React alternative (ClientApp-React)
- ❌ **NO hotel/reservation domain entities**
- ❌ **NO booking logic or workflows**
- ❌ **NO room management**
- ❌ **NO availability system**
- ❌ **NO PDF parsing capability**

### Reference Documentation
The file `Cursor_Agent_Backlog_Prompts_HotelSystem_v3_Responsive.md` contains a comprehensive implementation roadmap with:
- 80+ feature prompts organized in 14 sections
- Detailed acceptance criteria
- Clean Architecture enforcement rules
- Mobile-first responsive design requirements
- Complete feature backlog from Auth → Rooms → Reservations → PDF Upload → Owner Dashboard

---

## 2. Architecture Overview

### Layer Structure
The project follows **Clean Architecture** with strict dependency rules:

```
┌─────────────────────────────────────┐
│          Web (API Layer)            │  ← HTTP, Controllers/Endpoints, Middleware
├─────────────────────────────────────┤
│       Infrastructure Layer          │  ← EF Core, Identity, External Services
├─────────────────────────────────────┤
│       Application Layer             │  ← CQRS Handlers, DTOs, Validation, Business Rules
├─────────────────────────────────────┤
│         Domain Layer                │  ← Entities, Value Objects, Enums, Domain Events
└─────────────────────────────────────┘
```

### Layer Responsibilities

#### **Domain Layer** (`src/Domain`)
- **Purpose:** Pure business logic, no dependencies on other layers
- **Current Contents:**
  - `Entities/`: `TodoItem`, `TodoList` (sample only)
  - `ValueObjects/`: `Colour` (sample only)
  - `Enums/`: `PriorityLevel` (sample only)
  - `Events/`: `TodoItemCompletedEvent`, `TodoItemCreatedEvent`, `TodoItemDeletedEvent`
  - `Common/`: `BaseEntity`, `BaseAuditableEntity`, `BaseEvent`
  - `Constants/`: `Roles` (Administrator), `Policies` (CanPurge)
- **Dependencies:** Only MediatR.Contracts
- **⚠️ HOTEL-SPECIFIC NEEDED:** Reservation, Room, RoomType, Guest entities, booking status enums

#### **Application Layer** (`src/Application`)
- **Purpose:** CQRS commands/queries, DTOs, validation, business orchestration
- **Current Structure:**
  - `TodoLists/` and `TodoItems/` CQRS features (sample only)
  - `Common/Behaviours/`: Logging, Validation, Authorization, Performance, Exception handling
  - `Common/Interfaces/`: `IApplicationDbContext`, `IIdentityService`, `IUser`
  - `Common/Models/`: `PaginatedList`, `Result`, `LookupDto`
  - `WeatherForecasts/` (sample endpoint)
- **MediatR Pipeline:** Request → Logging → Validation → Authorization → Handler → Performance Monitoring
- **⚠️ HOTEL-SPECIFIC NEEDED:** Reservation commands/queries, availability queries, PDF parsing commands

#### **Infrastructure Layer** (`src/Infrastructure`)
- **Purpose:** External concerns - database, identity, file storage
- **Current Implementation:**
  - `Data/ApplicationDbContext`: EF Core DbContext with Identity
  - `Data/ApplicationDbContextInitialiser`: Database initialization (EnsureDeleted → EnsureCreated → Seed)
  - `Data/Interceptors/`: `AuditableEntityInterceptor`, `DispatchDomainEventsInterceptor`
  - `Data/Configurations/`: Entity configurations for TodoItem, TodoList
  - `Identity/`: `ApplicationUser`, `IdentityService`
- **⚠️ HOTEL-SPECIFIC NEEDED:** File storage service for PDFs, reservation/room configurations

#### **Web Layer** (`src/Web`)
- **Purpose:** HTTP layer, endpoint registration, middleware
- **Endpoint Strategy:** 
  - Uses **minimal APIs** with `EndpointGroupBase` pattern (NOT traditional controllers)
  - Current endpoints: `TodoLists.cs`, `TodoItems.cs`, `Users.cs`, `WeatherForecasts.cs`
  - Endpoints use `ISender` (MediatR) to dispatch commands/queries
- **Frontend Integration:**
  - `ClientApp/` - Angular 18 SPA
  - `ClientApp-React/` - React 18 alternative
  - Both configured for HTTPS proxy to backend
- **Middleware:**
  - Custom exception handler (ProblemDetails)
  - Swagger/NSwag for API documentation
  - Health checks
- **⚠️ HOTEL-SPECIFIC NEEDED:** Reservation endpoints, availability endpoints, PDF upload endpoints

---

## 3. Current Domain Model

### Existing Entities (SAMPLE DATA ONLY - TO BE REPLACED)

#### `TodoList`
```csharp
public class TodoList : BaseAuditableEntity
{
    public string? Title { get; set; }
    public Colour Colour { get; set; }
    public IList<TodoItem> Items { get; private set; }
}
```

#### `TodoItem`
```csharp
public class TodoItem : BaseAuditableEntity
{
    public int ListId { get; set; }
    public string? Title { get; set; }
    public string? Note { get; set; }
    public PriorityLevel Priority { get; set; }
    public DateTime? Reminder { get; set; }
    public bool Done { get; set; }  // Raises TodoItemCompletedEvent on transition
    public TodoList List { get; set; }
}
```

#### Base Classes
- **`BaseEntity`:** Provides `Id` (int), domain events collection
- **`BaseAuditableEntity`:** Extends BaseEntity with `Created`, `CreatedBy`, `LastModified`, `LastModifiedBy`

### Key Relationships
- TodoList 1→N TodoItem (sample aggregation)

### ⚠️ REQUIRED HOTEL DOMAIN MODEL (NOT YET IMPLEMENTED)
According to the backlog document, the following entities are needed:

**Core Entities:**
- `Reservation` (GuestName, CheckIn/Out, Status, RoomId, Source, BookingNumber, TotalAmount, etc.)
- `Room` (RoomNumber, RoomTypeId, Floor, Status)
- `RoomType` (Name, Capacity, DefaultRate)
- `Guest` (potentially - or embedded in Reservation)
- `PdfAttachment` (for linking uploaded PDFs to reservations)
- `ActivityLog` (audit trail for reservation actions)

**Enums:**
- `ReservationStatus` (New, Confirmed, CheckedIn, CheckedOut, Cancelled, NoShow)
- `ReservationSource` (Manual, PDF, WhatsApp, Booking)
- `RoomStatus` (Available, OutOfService, Occupied)

**Value Objects:**
- `DateRange` (CheckIn/Out with validation)
- `Money` (Amount + Currency)
- `PhoneNumber`

---

## 4. Implemented Use Cases / Business Flows

### Current CQRS Commands (Sample Only)

#### TodoLists
- ✅ `CreateTodoListCommand` → Returns int (ID)
- ✅ `UpdateTodoListCommand` → Returns void
- ✅ `DeleteTodoListCommand` → Returns void
- ✅ `PurgeTodoListsCommand` → Purges all (Admin only)

#### TodoItems
- ✅ `CreateTodoItemCommand`
- ✅ `UpdateTodoItemCommand`
- ✅ `UpdateTodoItemDetailCommand`
- ✅ `DeleteTodoItemCommand`

### Current CQRS Queries (Sample Only)
- ✅ `GetTodosQuery` → Returns `TodosVm` (lists + priority lookup)
- ✅ `GetTodoItemsWithPaginationQuery` → Returns `PaginatedList<TodoItemBriefDto>`

### Validation
- ✅ FluentValidation integrated via `ValidationBehaviour<TRequest, TResponse>`
- ✅ Validators: `CreateTodoListCommandValidator`, `UpdateTodoListCommandValidator`

### Authorization
- ✅ `[Authorize]` attribute on queries/commands
- ✅ `AuthorizationBehaviour` enforces policies before handler execution
- ✅ Policy example: `CanPurge` requires `Administrator` role

### Domain Events
- ✅ `TodoItemCompletedEvent` raised when `Done` property transitions to true
- ✅ `DispatchDomainEventsInterceptor` dispatches events after SaveChanges

### ⚠️ HOTEL-SPECIFIC USE CASES (NOT IMPLEMENTED)
Required per backlog:
- Reservation CRUD + status transitions
- Room assignment with conflict detection
- Availability calendar per room
- PDF upload → parse → review → create reservation
- Reception "Today View" (arrivals/departures/in-house)
- Owner dashboard (KPIs, revenue, occupancy, ADR, RevPAR)
- Activity log for transparency
- Multi-template PDF parsing with confidence scores

---

## 5. API Endpoints

### Endpoint Pattern
The project uses **ASP.NET Core minimal APIs** with a custom `EndpointGroupBase` abstraction:

```csharp
public class TodoLists : EndpointGroupBase
{
    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetTodoLists).RequireAuthorization();
        groupBuilder.MapPost(CreateTodoList).RequireAuthorization();
        // ...
    }
}
```

### Current Endpoints (Sample Only)

#### `/api/todolists`
- `GET /api/todolists` → GetTodosQuery
- `POST /api/todolists` → CreateTodoListCommand
- `PUT /api/todolists/{id}` → UpdateTodoListCommand
- `DELETE /api/todolists/{id}` → DeleteTodoListCommand

#### `/api/todoitems`
- `GET /api/todoitems` → GetTodoItemsWithPagination (supports pagination)
- `POST /api/todoitems` → CreateTodoItemCommand
- `PUT /api/todoitems/{id}` → UpdateTodoItemCommand
- `PUT /api/todoitems/UpdateDetail/{id}` → UpdateTodoItemDetailCommand
- `DELETE /api/todoitems/{id}` → DeleteTodoItemCommand

#### `/api/users`
- Identity endpoints (login, register, refresh token)

#### `/api/weatherforecasts`
- Sample endpoint

### Swagger/OpenAPI
- ✅ NSwag integrated
- ✅ Auto-generated on build (`config.nswag`)
- ✅ Accessible at `/api` in development
- ✅ JWT bearer token support configured

### ⚠️ MISSING HOTEL ENDPOINTS
Per backlog, the following are needed:
- `/api/reservations` (CRUD + filters)
- `/api/rooms`, `/api/roomtypes`
- `/api/availability` (calendar data)
- `/api/reception/today` (daily operations)
- `/api/pdf-reservations/parse` + `/create-from-extracted`
- `/api/owner/dashboard`, `/api/reports/*`
- `/api/activity` (audit log)

---

## 6. Data Layer

### Database Technology
**Configured for:** SQL Server (default), SQLite, or PostgreSQL (template conditionals)

**Current Environment:**
- **Development:** SQL Server LocalDB  
  Connection String: `Server=(localdb)\\mssqllocaldb;Database=CleanArchitectureDb;Trusted_Connection=True;MultipleActiveResultSets=true`
- **SQLite Alternative:** `DataSource=app.db;Cache=Shared` (file `app.db` exists in Web project - 118KB)

### Migrations Strategy
**⚠️ CRITICAL: No EF Migrations are used!**

The project uses a **"delete and recreate"** strategy for development:
```csharp
// ApplicationDbContextInitialiser.cs
await _context.Database.EnsureDeletedAsync();
await _context.Database.EnsureCreatedAsync();
```

This runs automatically on startup in Development environment (see `Program.cs` line 19).

**Implications:**
- Fast prototyping (schema auto-synced with model)
- Data lost on every restart
- No migration history
- ⚠️ **Must implement EF migrations before production**

### Seed Data
Current seeding (sample only):
- Default role: `Administrator`
- Default user: `administrator@localhost` / `Administrator1!`
- Sample TodoList with 4 TodoItems

### Entity Configurations
- `TodoItemConfiguration` and `TodoListConfiguration` in `Infrastructure/Data/Configurations/`
- Uses Fluent API for constraints and relationships

### ⚠️ HOTEL DATABASE REQUIREMENTS
- Entity configurations for Reservation, Room, RoomType
- Indexes for performance (CheckIn/Out dates, RoomId, Status)
- Unique constraints (RoomNumber, BookingNumber)
- Seed data for demo rooms and room types

---

## 7. Configuration

### Target Framework
```xml
<TargetFramework>net10.0</TargetFramework>
```

**⚠️ NOTE:** The project targets **.NET 10.0** (pre-release/RC as of Jan 2026)

### SDK Version
```json
{
  "sdk": {
    "version": "9.0.305",
    "rollForward": "latestFeature"
  }
}
```

**⚠️ MISMATCH:** `global.json` specifies SDK 9.0.305, but `TargetFramework` is net10.0  
This may cause build issues if .NET 10 SDK is not installed or if using .NET 9 SDK.

**RECOMMENDATION:** Align SDK and target framework:
- Option A: Downgrade to net9.0 if using .NET 9 SDK
- Option B: Upgrade to .NET 10 SDK (verify availability)

### Key NuGet Packages
- **EF Core:** 10.0.0
- **ASP.NET Core:** 10.0.0
- **MediatR:** 13.1.0
- **AutoMapper:** 15.1.0
- **FluentValidation:** 12.1.0
- **NSwag:** 14.6.2
- **Ardalis.GuardClauses:** 5.0.0

### Build Settings
- `TreatWarningsAsErrors: true` (strict mode)
- `ImplicitUsings: enable`
- `Nullable: enable` (nullable reference types enforced)

### Frontend
- **Angular 18.2.13** (primary)
- **React 18** (alternative in ClientApp-React)
- Both use HTTPS dev server on port 44447

---

## 8. Code Quality Notes

### ✅ Strengths
1. **Clean Architecture Boundaries Respected**
   - Domain has no infrastructure dependencies
   - Application only depends on Domain
   - Proper separation of concerns

2. **CQRS Pattern**
   - Clear command/query separation
   - MediatR used consistently
   - Request/response pattern enforced

3. **Cross-Cutting Concerns**
   - Pipeline behaviors for logging, validation, authorization, performance, exception handling
   - Centralized exception handling via custom middleware
   - Consistent ProblemDetails responses

4. **Domain Events**
   - Proper use of domain events in entities
   - Interceptor-based event dispatching

5. **Testing Structure**
   - Multiple test projects: Unit, Integration, Functional, Acceptance
   - Respawn for database cleanup
   - NUnit + Shouldly + Moq

6. **Code Standards**
   - `.editorconfig` enforced (18KB of rules)
   - Nullable reference types enabled
   - Warnings treated as errors

### ⚠️ Risks and Issues

#### **CRITICAL: Template Code Still Present**
- The entire codebase is sample Todo application code
- **ZERO hotel-specific implementation**
- Must delete TodoList/TodoItem and replace with hotel domain

#### **Database Initialization Strategy**
- `EnsureDeleted()` + `EnsureCreated()` is **destructive**
- Not suitable for production
- No migration history
- **MUST** switch to EF Migrations before production

#### **SDK/Framework Version Mismatch**
- `global.json` specifies .NET 9 SDK (9.0.305)
- `Directory.Build.props` targets net10.0
- Potential compatibility issues

#### **No Hotel Domain Validation**
- No business rules for reservation conflicts
- No date range validation (check-out > check-in)
- No room capacity constraints
- No status transition rules

#### **Missing Infrastructure**
- No file storage service (needed for PDF uploads)
- No email service (for owner reports)
- No external API integrations (Booking.com, WhatsApp)

### ⚠️ Architecture Coupling Issues
**None observed** - the template follows Clean Architecture strictly. However, when implementing hotel features, ensure:
- Business rules stay in Application layer, not in API endpoints
- EF entities don't leak to API responses (always use DTOs)
- Domain entities remain persistence-ignorant

---

## 9. What's Missing or Incomplete

### **Domain Layer**
- ❌ Reservation entity with status transitions
- ❌ Room and RoomType entities
- ❌ Booking status enum (New, Confirmed, CheckedIn, etc.)
- ❌ Reservation source enum (Manual, PDF, WhatsApp, Booking)
- ❌ Value objects (Money, DateRange, PhoneNumber)
- ❌ Domain events for reservation lifecycle
- ❌ Business rule validators (no overlapping bookings, valid date ranges)

### **Application Layer**
- ❌ Reservation CQRS commands/queries
- ❌ Room management features
- ❌ Availability calendar query
- ❌ Conflict detection query
- ❌ PDF parsing command (requires UglyToad.PdfPig package)
- ❌ Reception "Today View" query
- ❌ Owner dashboard queries (KPIs, revenue, occupancy)
- ❌ Activity log commands/queries
- ❌ Report generation (CSV export, revenue charts)

### **Infrastructure Layer**
- ❌ File storage service (IFileStorageService + LocalFileStorageService)
- ❌ PDF parser service
- ❌ Entity configurations for hotel entities
- ❌ EF Migrations
- ❌ Production-ready database seeding (room types, demo rooms)

### **Web Layer**
- ❌ All hotel-specific API endpoints
- ❌ CORS configuration for production frontend
- ❌ Rate limiting (for auth endpoints, PDF uploads)
- ❌ Role-based authorization (Owner, Reception, Admin roles don't exist)
- ❌ File upload endpoints

### **Frontend**
- ❌ Hotel reservation UI (both Angular and React are template demos)
- ❌ Mobile-responsive reservation forms
- ❌ Calendar component (FullCalendar integration)
- ❌ PDF upload + review flow
- ❌ Reception dashboard
- ❌ Owner analytics dashboard
- ❌ Role-based navigation

### **Testing**
- ❌ Hotel-specific unit tests (reservation logic, conflict detection)
- ❌ Integration tests for API endpoints
- ❌ PDF parsing tests

### **DevOps**
- ❌ Docker Compose setup
- ❌ Production deployment configuration
- ❌ CI/CD pipelines (Azure DevOps YAML exists but may need updates)
- ❌ Database backup strategy
- ❌ Monitoring/logging configuration

---

## 10. Recommended Next Steps (Ordered)

### **Phase 0: Foundation Fix (IMMEDIATE)**
1. **Resolve SDK/Framework Mismatch**
   - Decide: Use .NET 9 or .NET 10
   - Update `global.json` and `Directory.Build.props` to match
   - Verify build succeeds

2. **Switch to EF Migrations**
   - Replace `EnsureDeleted/EnsureCreated` with migration-based initialization
   - Create initial migration for Identity tables
   - Update seeding to use `DbContext.Database.Migrate()`

3. **Verify Template Runs**
   - Build solution
   - Run Web project
   - Access Swagger at `/api`
   - Test sample Todo endpoints
   - Confirm both frontends (Angular/React) launch

### **Phase 1: Domain Implementation (1-2 weeks)**
4. **Delete Sample Code**
   - Remove TodoList/TodoItem entities
   - Remove TodoList/TodoItem CQRS features
   - Keep Common infrastructure (Behaviours, Interfaces, etc.)

5. **Implement Core Domain**
   - Create Reservation entity (all fields per backlog)
   - Create Room and RoomType entities
   - Create enums (ReservationStatus, ReservationSource, RoomStatus)
   - Create value objects (Money, DateRange)
   - Add domain events (ReservationCreated, StatusChanged, RoomAssigned)

6. **Add Entity Configurations**
   - Configure Reservation (indexes, relationships)
   - Configure Room and RoomType
   - Create and apply EF migration

7. **Implement Roles**
   - Add Owner, Reception, Admin to `Roles` constant class
   - Seed roles in `ApplicationDbContextInitialiser`
   - Update policies (protect purge, owner reports, reception actions)

### **Phase 2: Basic CRUD (1 week)**
8. **Room Management**
   - RoomType CRUD (commands, queries, validators)
   - Room CRUD with filters (active/status/type)
   - API endpoints (`/api/roomtypes`, `/api/rooms`)

9. **Reservation CRUD**
   - CreateReservation, UpdateReservation, DeleteReservation
   - GetReservations with filters (status, date, source)
   - GetReservationById
   - Validation (CheckOut > CheckIn, Adults >= 1)
   - API endpoints (`/api/reservations`)

### **Phase 3: Business Rules (1 week)**
10. **Status Transitions**
    - Implement status machine in Application layer
    - Command: ChangeReservationStatus (with validation)
    - Tests for invalid transitions

11. **Room Assignment**
    - Command: AssignRoomToReservation
    - Query: GetAvailableRooms(dateRange, roomTypeId)
    - Conflict detection (prevent overlap per room)

12. **Availability Calendar**
    - Query: GetAvailabilityCalendar(start, end)
    - Return resources (rooms) + events (reservations)
    - Handle unassigned reservations

### **Phase 4: Reception & Owner Features (2 weeks)**
13. **Reception Dashboard**
    - Query: GetReceptionTodayView(date)
    - Commands: QuickCheckIn, QuickCheckOut, MarkNoShow
    - Print-friendly list endpoint

14. **Owner Dashboard**
    - Query: GetOwnerKPIs(start, end)
    - Calculate: Revenue, Occupancy, ADR, RevPAR
    - Source breakdown

15. **PDF Upload & Parsing**
    - Install UglyToad.PdfPig
    - Implement IFileStorageService (local storage)
    - Command: ParsePdfReservation (returns extracted data + confidence)
    - Command: CreateReservationFromPdf (save + attach file)

16. **Activity Log**
    - Create ActivityLog entity
    - Implement logging on reservation changes
    - Query: GetActivityLog(filters)

### **Phase 5: Frontend (2-3 weeks)**
17. **Choose Frontend Stack**
    - Decide: Angular or React (or separate hotel frontend)
    - Update package.json, remove unused ClientApp

18. **Basic UI**
    - Auth (login, role-based nav)
    - Reservation list + filters
    - Add/Edit reservation form
    - Room management screens

19. **Advanced UI**
    - Calendar component (FullCalendar or custom)
    - Reception Today dashboard
    - Owner KPI charts (Chart.js/Recharts)
    - PDF upload + review flow
    - Mobile-responsive (360px, 768px, 1024px breakpoints)

### **Phase 6: Production Hardening (1 week)**
20. **Security**
    - CORS configuration
    - Rate limiting (auth, uploads)
    - Input sanitization
    - JWT expiration policies

21. **DevOps**
    - Docker Compose (API + database)
    - Environment-based configuration
    - Health checks
    - Logging (Serilog)

22. **Testing**
    - Integration tests for key flows
    - PDF parsing unit tests
    - Conflict detection tests
    - E2E acceptance tests (Playwright)

23. **Documentation**
    - Update README with hotel context
    - API documentation (Swagger annotations)
    - Deployment guide

---

## Summary Assessment

### **Current State:** ⚠️ TEMPLATE - NOT PRODUCTION READY

This is a **pristine Clean Architecture template** with:
- ✅ Excellent architectural foundation
- ✅ Production-grade cross-cutting concerns
- ✅ Comprehensive testing infrastructure
- ✅ Modern tech stack (.NET 10, EF Core 10, Angular 18/React 18)

**BUT:**
- ❌ **Zero hotel domain implementation**
- ❌ **No reservation or booking logic**
- ❌ **Database initialization strategy unsuitable for production**
- ❌ **SDK version mismatch risk**

### **Estimated Implementation Effort**
Assuming 1 senior developer:
- **Phases 0-3** (Foundation + Domain + CRUD + Business Rules): ~5 weeks
- **Phase 4** (Reception + Owner + PDF): ~2 weeks
- **Phase 5** (Frontend): ~3 weeks
- **Phase 6** (Hardening): ~1 week

**Total: ~11 weeks (2.5 months)** for MVP with basic hotel features

### **Risk Level: MEDIUM**
- **Technical Risk:** LOW (proven template, solid architecture)
- **Implementation Risk:** MEDIUM (significant greenfield development required)
- **Operational Risk:** HIGH if database strategy isn't fixed

### **Confidence Level: HIGH**
The architectural foundation is sound. Following the backlog prompts systematically will result in a production-ready hotel booking system. The key is to **not skip the foundational fixes** (SDK alignment, migrations) before building features.

---

**End of Technical Summary**
