# Sentinel Pro — Complete Application Memory File

> Use this file at the start of every session to understand the full codebase before making any changes.

---

## 1. PRODUCT OVERVIEW

**Sentinel Pro** is a luxury hotel guest experience and staff productivity SaaS platform.

- **Owner / Developer:** Satnam Singh
- **Contact:** +971 585 445 642 | singh7naamg@gmail.com
- **Business model:** Multi-tenant SaaS — one deployment serves multiple hotel clients
- **Demo brand:** Grand Palace Hotel
- **Status:** Pre-release / active demo to hotel GMs

---

## 2. TECH STACK

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 + tailwind-merge + clsx |
| Animation | Motion (Framer Motion v12) |
| Icons | lucide-react |
| Charts | recharts |
| Backend / DB | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel |
| Source control | GitHub |

---

## 3. REPOSITORY & DEPLOYMENT

| Item | Value |
|---|---|
| GitHub repo | `github.com/singh7naamg-stack/Smart-service` |
| Vercel project | `smart-service` (correct one — there are 3 forks, use this one) |
| Live URL | `smart-service-rho.vercel.app` |
| Supabase URL | `https://tztydfegheocwlruyncb.supabase.co` |
| Env vars (Vercel) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Build command | `npm run build` (runs `tsc -b && vite build`) |
| Routing | `vercel.json` rewrites all paths to `/index.html` (SPA) |

**Deploy process:** Push to GitHub → Vercel auto-builds → live in ~2 minutes.

---

## 4. KEY SOURCE FILES

| File | Purpose |
|---|---|
| `src/App.tsx` | Main application — ALL portals and components (~3800 lines) |
| `src/SentinelAdmin.tsx` | Super Admin portal — hotel management, room management |
| `src/types.ts` | TypeScript types — UserProfile, Department, ServiceRequest |
| `src/TranslationContext.tsx` | 7-language translation context |
| `src/supabase.ts` | Supabase client init (reads from env vars) |
| `src/main.tsx` | React entry point |
| `vercel.json` | SPA routing rewrite |
| `package.json` | Dependencies |

> **Critical:** When changing types (e.g. adding fields to UserProfile), BOTH `src/types.ts` AND `src/App.tsx` must be pushed. TypeScript errors about missing properties almost always mean `types.ts` was not pushed.

---

## 5. DATABASE SCHEMA

### Core Tables

#### `requests`
Guest service requests.
```
id, created_at, room_number, guest_id, guest_name, department, service,
message, status, assigned_to, assigned_to_email, accepted_at, closed_at,
late_reason, line_items, total_price, language, rating, feedback,
hotel_id (UUID — multi-hotel isolation)
```

#### `staff`
All staff profiles (pending approval and approved).
```
id, name, staff_id, email, password, department, occupation, approved,
needs_executive_approval, logged_in, tasks_completed, tasks_on_time,
violations, failed_attempts, locked_until, hotel_id (UUID)
```

#### `rooms`
Hotel room registry.
```
id, room_number, room_type, floor, status, assigned_to, last_updated,
cleaning_at, cleaned_at, inspected_at, hotel_id (UUID)
```

#### `sla_settings`
SLA time per department per hotel.
```
id, department, sla_minutes, hotel_id (UUID)
```

#### `restaurant_bookings`
Restaurant reservation records.
```
id, guest_name, room_number, restaurant_name, date, time, guests,
special_requests, status, confirmed_by, walk_in, hotel_id (UUID)
```

#### `restaurant_settings`
Per-restaurant configuration.
```
id, restaurant_name, opening_time, closing_time, closed_days, hotel_id (UUID)
```

#### `menu_items`
Room service menu.
```
id, name, category, price, description, available, hotel_id (UUID)
```

#### `guests`
Guest session records.
```
id, room_number, name, hotel_id (UUID)
```

#### `managers`
Manager approval records.
```
id, hotel_id (UUID)
```

### Admin Tables

#### `hotel_clients`
One row per hotel client managed by Super Admin.
```
id, hotel_name, contact_name, contact_email, contact_phone, city, country,
rooms_count, entry_code (staff portal code), executive_password,
access_mode ('open' | 'qr_only'), status ('active'|'trial'|'suspended'|'inactive'),
plan ('trial'|'basic'|'premium'), monthly_fee, notes, trial_ends_at, created_at
```

#### `super_admin`
Super Admin login credentials.
```
id, email, password (plain text — needs hashing before production), name
```

#### `app_settings`
Global key-value settings.
```
key (PRIMARY KEY), value, updated_at
```
Currently used for: `access_mode` (fallback when no hotel context)

---

## 6. MULTI-HOTEL ISOLATION ARCHITECTURE

Every table has a `hotel_id UUID` column. All queries filter by `hotel_id`.

**How hotel context is established:**

1. **Staff login:** Types hotel entry code (e.g. `HILTON1`) → App fetches `hotel_clients` where `entry_code = typed_code` → stores hotel in `localStorage('sentinel_hotel')` → all queries use that hotel's UUID

2. **Guest login:** Scans QR (`?room=401&hotel=abc-123`) → App fetches hotel by UUID from URL param → stores in `localStorage('sentinel_hotel')`

3. **Legacy testing:** Code `12345` → opens secret menu without setting hotel context → uses global `Manager12345` exec password (only when NO hotel context set)

**Security rules:**
- Suspended/inactive hotel → login blocked at entry code step
- Staff `hotel_id` must match session hotel_id → cross-hotel login blocked
- NULL `hotel_id` staff → blocked when hotel context exists (no legacy bypass)
- `Manager12345` → only works when `hotelCtx` is null (owner testing only)
- Room number validated against `rooms` table on guest login

---

## 7. ACCESS / ROLE SYSTEM

### Entry Points

| Who | How to access |
|---|---|
| **Guest** | Scan room QR (`?room=401&hotel=UUID`) → enter name → portal |
| **Staff** | Type hotel entry code → secret menu → Staff Portal → email + password |
| **Executive** | Type hotel entry code → secret menu → Executive Dashboard → hotel's exec password |
| **Super Admin** | `/admin` route (SentinelAdmin.tsx) → email + password from `super_admin` table |

### UserProfile Object
```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'guest' | 'staff' | 'manager';
  department: Department;
  roomNumber?: string;
  staffIdNumber?: string;
  occupation?: string;
  status?: string;
  hotelId?: string;    // Hotel isolation
  hotelName?: string;
  entryCode?: string;
}
```

### Occupations → Departments
```
Housekeeping Manager / Housekeeping Supervisor / Housekeeping Attendant → Housekeeping
F&B Manager / F&B Supervisor / F&B Waiter / Chef / Reservation Agent → F&B
Concierge Manager / Concierge Supervisor / Concierge Agent → Concierge
Security Manager / Security Supervisor / Security Officer → Security & Safety
Front Office Manager / Front Office Supervisor / Front Office Agent → Front Office
Executive → None
Maintenance Engineer / Maintenance Supervisor → Maintenance
```

### MANAGER_OCCUPATIONS (get DeptManagerDashboard)
```
Housekeeping Manager, Housekeeping Supervisor, F&B Manager,
Concierge Manager, Security Manager, Front Office Manager, Executive
```

---

## 8. COMPONENT ARCHITECTURE (App.tsx)

```
App (export default)
├── ToastContainer
├── GlobalLanguageSelector
├── Auth                        ← Guest login screen (name + room)
│   ├── handles hotel entry code lookup
│   ├── handles QR-only mode from hotel context
│   └── shows secret menu (setShowSecret)
├── StaffLogin                  ← Email + password login
├── StaffPortal                 ← Staff dashboard
│   ├── fetchTasks (filtered by hotel_id + dept)
│   ├── fetchSLA
│   ├── fetchRooms (HK only)
│   ├── handleAccept / handleComplete / handleCompleteWithReason
│   ├── updateRoomStatus (saves cleaning_at/cleaned_at/inspected_at)
│   └── Tabs: active | history | rooms (HK) | maintenance
├── DeptManagerDashboard        ← Manager/Supervisor dashboard
│   ├── fetchData (requests + staff filtered by hotel_id)
│   ├── fetchRoomsMgr (HK rooms)
│   └── Tabs: requests | sla | staff | settings | report | restaurants (F&B) | rooms (HK)
├── GuestAccessToggle           ← (REMOVED — was in wrong place)
└── ExecutiveDashboard          ← Full hotel view
    ├── fetchData (all depts, filtered by hotel_id)
    └── Tabs: analytics | leaderboard | sla | requests | staff | qr | restaurants
```

---

## 9. SLA SYSTEM

- **Default:** 30 minutes per department (if no `sla_settings` row)
- **Custom:** Set per department in Manager → Settings tab → saved to `sla_settings` table
- **Timer:** Uses `now` state (updates every 1 second via `setInterval`) → `getElapsed(ts)` uses `now` to calculate
- **Timestamp format:** Supabase returns `2026-05-01T12:37:00+04:00` (with UAE timezone) — normalization is `.replace(' ', 'T')` ONLY — do NOT strip timezone
- **Violations:** At 80% → orange warning. At 100% → red alert, sound, mandatory delay reason on close
- **Delay reason:** Enforced when `elapsed > limit || task.status === 'Violated'` — no bypass

---

## 10. TIMESTAMP HANDLING (CRITICAL)

**Problem history:** Multiple bugs caused by wrong timestamp normalization.

**Correct approach:**
```typescript
const normalized = String(ts).trim().replace(' ', 'T');
// Do NOT strip +04:00 — JS Date handles it correctly
const d = new Date(normalized);
```

**Never do:**
```typescript
.replace(/[+-]\d{2}:?\d{0,4}$/, '').replace(/Z$/, '') + 'Z'
// This strips UAE timezone and breaks all time displays
```

**UTC timestamps** (accepted_at, closed_at from `new Date().toISOString()`):
These come back as `+00` from Supabase. Add `.replace('+00','Z')` for display.

---

## 11. HOUSEKEEPING SYSTEM

**Status options:**
Clean | Dirty | Cleaning | Inspected | Do Not Disturb | Out of Order | Checked Out

**Staff portal:** All statuses EXCEPT `Inspected`
**Supervisor/Manager portal:** ALL statuses including `Inspected`

**Timestamps saved per status change:**
- Select `Cleaning` → saves `cleaning_at`
- Select `Clean` → saves `cleaned_at`
- Select `Inspected` → saves `inspected_at` + inspector name

**HK PDF Report:** Manager → Rooms tab → PDF Report button
→ Includes: room status, staff name, cleaning started, cleaned at, inspected by, inspected at
→ Heroes of the Day leaderboard (Supernova 🥇, North Star 🥈, Rising Comet 🥉)

---

## 12. RESTAURANT SYSTEM

**Access:**
- Reservation Agent (occupation) → F&B Manager approves → sees Restaurant Reservations button in staff portal header
- F&B Manager → also sees the button
- Both access `RestaurantPortal` component

**Flow:**
Guest books → `Pending` → Agent confirms/rejects → Guest notified live
Walk-in: Agent adds directly → auto-confirmed → WhatsApp/email option

**F&B Manager extra access:**
- Set opening hours per restaurant
- Set closed days per week
- Manage menu items
- Manager dashboard → Restaurants tab
- Executive → Restaurants tab

---

## 13. PERFORMANCE REPORT SYSTEM

Available for ALL department managers.

**Location:** Manager Dashboard → 📊 Report tab

**Periods:** Today | This Week (7 days) | This Month (30 days)

**Data source:** Completed `requests` filtered by `hotel_id` + `department`

**Staff ranking:**
- Ranked by on-time rate (desc), then avg time (asc)
- On-time = closed within SLA limit
- Rate colour: Green ≥90% | Yellow ≥70% | Red <70%

**Badges:**
- 🥇 ⭐ The Supernova — top performer
- 🥈 🌟 The North Star — second
- 🥉 🚀 The Rising Comet — third

**PDF:** Professional Sentinel Pro branded report with podium + full staff table

---

## 14. SUPER ADMIN PORTAL (SentinelAdmin.tsx)

**Route:** `/admin`
**Login:** Email + password checked against `super_admin` table (plain text — hash before production)

**Tabs:**
1. **🏨 Hotels** — Add/edit/delete/suspend hotel clients
2. **🛏 Rooms** — Room management per hotel

**Hotel management:**
- Create hotel with: name, contact, city, country, entry_code (manual), executive_password, plan, fee
- Suspend/activate hotels
- Auto-checks status on login → suspended = blocked

**Room management:**
- Select hotel from dropdown
- Bulk create: floor + room range + type → creates all rooms in one click (max 100 per batch)
- Add single room for special categories
- View all rooms table with status
- Delete individual or all rooms

**Room types:** Standard, Deluxe, Suite, Junior Suite, Presidential Suite, Studio, Villa, Penthouse, Connecting Room

---

## 15. QR CODE SYSTEM

**Generation:** Executive Dashboard → QR Codes tab → Generate All

**URL format:** `smart-service-rho.vercel.app?room=401&hotel=abc-uuid-123`

**Hotel ID embedded** so guest scans → correct hotel context loaded automatically

**QR card design:** Room number, QR code, "📱 Scan to Request Services", welcome message in gold italic (NO URL shown)

**Checkout reset:** HK staff sets room to `Checked Out` → QR resets (new guest gets clean state)

**Important:** QR codes only generate if rooms exist in DB. No fallback dummy rooms.

---

## 16. LANGUAGE SUPPORT

7 languages: English (en), Arabic (ar), Russian (ru), Chinese (zh), French (fr), German (de), Spanish (es)

Context: `TranslationContext.tsx` → `useLanguage()` hook → `t('key')` function

Language saved with guest request for staff reference.

---

## 17. KNOWN PATTERNS & GOTCHAS

**localStorage keys used:**
- `sentinel_hotel` — current hotel context (id, name, entry_code, exec_password, access_mode)
- `sentinel_local_session` — logged-in user profile
- `sentinel_device_id` — device fingerprint
- `sentinel_admin_session` — super admin session
- `google_translate_key` — Google Translate API key

**Common bugs to avoid:**
1. Never strip timezone from Supabase timestamps — just `.replace(' ','T')`
2. `useState` inside JSX IIFE → causes React hooks violation → "Service Interruption" crash — always declare state at component level
3. Unclosed JSX divs → cascading TypeScript errors across entire file
4. Always push `types.ts` with `App.tsx` — TypeScript errors about missing properties mean this was missed
5. `fetchTasks` is only in scope of `StaffPortal` — don't reference it in other components

**SLA in manager portal uses `getElapsedMin`** — separate function from staff portal's `getElapsed`. Both must be kept correct.

---

## 18. BUSINESS DETAILS

| Plan | Monthly (AED) | Yearly (AED) | Monthly (INR) |
|---|---|---|---|
| Trial | 0 (30 days) | — | — |
| Basic | 2,999 | 29,999 | ₹2,999 |
| Standard | 4,999 | 49,999 | ₹4,999 |
| Premium | 7,999 | 79,999 | ₹7,999 |

**Target markets:** UAE luxury hotels, India (Himachal Pradesh, Punjab — 50-100 room properties)

**Developer contact:**
- Name: Satnam Singh
- Mobile: +971 585 445 642
- Email: singh7naamg@gmail.com
- Platform: smart-service-rho.vercel.app

---

## 19. PENDING / FUTURE WORK

- [ ] Hash super_admin passwords before first paying client
- [ ] Full Supabase Auth migration (replace custom email/password in staff table)
- [ ] Native iOS/Android app (Expo project exists at `/workspaces/Smart-service/SentinelProApp2`)
- [ ] Per-hotel subdomain routing (Option B) when client requests custom domain
- [ ] Multi-language: add more languages as needed
- [ ] Webhook/email notifications (currently simulated)

---

## 20. INSTRUCTIONS FOR FUTURE SESSIONS

**Before making any change:**
1. Read this file for full context
2. Ask clarifying questions if the request is ambiguous
3. Only change what was explicitly asked — nothing else
4. Run a final audit verifying the change is present and existing features are untouched
5. Always check for TypeScript type errors before presenting the file

**Files to always check before editing:**
- `src/types.ts` for type definitions
- The specific component being changed
- Other components that might reference the same state/functions

**When pushing:** Always tell the user which files to replace and in which order.
