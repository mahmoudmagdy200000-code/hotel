You are working in the Hotel PMS frontend foundation (Phase 1 already done).
Now implement i18n + API + React Query wiring.

CONSTRAINTS:
- Keep it simple and production-ready
- Do not redesign UI
- Do not add Redux
- Use localStorage for language and token
- RTL must be correct when language is Arabic

TASKS:

1) Environment:
- Create .env.example with:
  VITE_API_BASE_URL=http://localhost:5000
- Ensure axios uses import.meta.env.VITE_API_BASE_URL

2) i18n setup:
- Create:
  src/i18n/index.ts
  src/i18n/locales/en.json
  src/i18n/locales/ar.json
- Configure i18next + react-i18next.
- Include a small initial dictionary for:
  - sidebar items (dashboard, reception today/search/pending, reservations, rooms, room types, occupancy, financials, settings)
  - common (loading, error, retry, save, cancel, confirm, search)
- Implement a helper:
  src/i18n/setDirection.ts
  that sets:
  document.documentElement.lang = 'ar'/'en'
  document.documentElement.dir = 'rtl'/'ltr'

3) Language switch:
- Add a LanguageToggle in Header:
  - Button or dropdown: AR / EN
  - On change: i18n.changeLanguage()
  - Persist to localStorage key: "lang"
  - Call setDirection(lang)
- On app start: read localStorage lang and initialize i18n + direction accordingly.

4) Update UI labels:
- Replace Sidebar labels with t("nav.dashboard") etc.
- Keep routes the same (no localized routes)

5) React Query Provider:
- Create src/app/providers/QueryProvider.tsx
- Wrap the app root (main.tsx or App.tsx) with QueryClientProvider.
- Set sane defaults:
  - retry: 1
  - refetchOnWindowFocus: false

6) Axios client:
- Create src/api/http.ts:
  - axios.create({ baseURL })
  - request interceptor attaches:
    Authorization: Bearer <token> (token from localStorage key "access_token")
  - response interceptor placeholder:
    if 401 -> optional console.warn("unauthorized") (no redirect yet)

7) API layer convention:
- Create small example endpoint file:
  src/api/reception.ts
  with functions:
    getToday(params)
    searchReservations(params)
    getPendingRequests(params)
  Only define function signatures + URL paths, no UI usage required yet.

8) Confirm everything compiles and runs:
- npm run dev works
- Toggle AR/EN changes direction immediately
- Sidebar stays usable in RTL

OUTPUT:
- i18n working with RTL/LTR
- Language toggle in Header
- API http client wired
- React Query provider wired
- Minimal example api functions created