# Hotel PMS Frontend

A modern Hotel Property Management System dashboard built with React, TypeScript, and Tailwind CSS.

## 🚀 Tech Stack

- **Framework**: Vite + React 19 + TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: @tanstack/react-query
- **HTTP Client**: Axios
- **i18n**: i18next + react-i18next

## 🎯 Features & Status

### ✅ Phase 1: Foundation
- [x] Vite + React + TypeScript bootstrap
- [x] Responsive layout (sidebar + header)
- [x] Mobile-friendly navigation
- [x] Axios + React Query setup

### ✅ Phase 2: Core UI & Auth
- [x] i18next configuration (EN/AR)
- [x] Mock authentication flow (Redirects to Dashboard)
- [x] Shared UI components (Table, Modal, Form, Badge)

### ✅ Phase 3: Reception Operations
- [x] Business Date & Context
- [x] Reception Today (Arrivals/Departures/In-house)
- [x] Check-in / Check-out / Cancel / No-show actions

### ✅ Phase 4: Reservations & PDF Workflow
- [x] Reservations List & Details
- [x] PDF Upload (Single & Batch)
- [x] PDF Parsing (OCR Trigger)
- [x] Pending Requests Queue with Selection
- [x] Confirm / Cancel Parsed Drafts

### ✅ Phase 5: Advanced Search
- [x] Global search by Guest, Phone, or Booking #

### ✅ Phase 6: Inventory Management
- [x] Rooms List / Create / Edit
- [x] Room Types List / Create / Edit
- [x] Active / Inactive states

### ✅ Phase 7: Analytics (MVP)
- [x] Dashboard KPI Cards
- [x] Daily Occupancy Forecast
- [x] Revenue Breakdown (Day/Room Type)

### ✅ Phase 8: Attachments
- [x] PDF Viewer Integration
- [x] Secure Download

## 🛠️ Development

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

The app expects `VITE_API_BASE_URL` in `.env`.
The current configuration points to `https://localhost:5003/api/` to match the backend `Web_AltPorts` profile.

## 📄 License

Private - Hotel PMS Project

## 👥 Team

Development: January 2026
