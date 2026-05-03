# Sentinel Pro — Complete Application Memory File

> Use this file at the start of every session to understand the full codebase before making any changes.
> Last updated: Session 3 (Multi-hotel isolation, dynamic restaurants, concierge system, services config)

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
| Auth / Passwords | bcryptjs (hash on register, compare on login) |
| Backend / DB | Supabase (PostgreSQL + RLS) |
| File Storage | Supabase Storage — bucket: hotel-assets (public) |
| Hosting | Vercel |
| Source control | GitHub |

---

## 3. REPOSITORY & DEPLOYMENT

| Item | Value |
|---|---|
| GitHub repo | github.com/singh7naamg-stack/Smart-service |
| Vercel project | smart-service (correct one — 3 forks exist) |
| Live URL | smart-service-rho.vercel.app |
| Supabase URL | https://tztydfegheocwlruyncb.supabase.co |
| Env vars | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |
| Build command | npm run build |
| Super Admin route | /admin → SentinelAdmin.tsx |

---

## 4. KEY SOURCE FILES

| File | Purpose |
|---|---|
| src/App.tsx | Main app — ALL portals (~4400 lines) |
| src/SentinelAdmin.tsx | Super Admin portal (~900 lines) |
| src/types.ts | TypeScript types |
| src/TranslationContext.tsx | 7-language translations |
| src/supabase.ts | Supabase client |
| src/main.tsx | React entry point |
| vercel.json | SPA routing rewrite |
| package.json | Dependencies incl. bcryptjs |

CRITICAL: Always push types.ts together with App.tsx — missing this causes all "property does not exist" errors.

---

## 5. DATABASE SCHEMA

### requests
id, created_at, guest_room, guest_id, guest_name, department, service,
notes, status, assigned_to, assigned_to_email, accepted_at, closed_at,
late_reason, line_items, total_price, language, rating, feedback, hotel_id

### staff
id, name, staff_id, email, password (bcrypt hashed), department, occupation,
approved, needs_executive_approval, logged_in, tasks_completed, tasks_on_time,
violations, failed_attempts, locked_until, hotel_id

### rooms
id, room_number, room_type, floor, status, assigned_to, last_updated,
cleaning_at, cleaned_at, inspected_at, hotel_id

### sla_settings
id, department, sla_minutes, hotel_id

### restaurants (NEW — dynamic per hotel)
id, hotel_id, name, cuisine, description, emoji, logo_url, cover_url, active, created_at

### restaurant_settings
id, restaurant (UUID → restaurants.id), opening_time, closing_time, closed_days, hotel_id

### restaurant_bookings
id, guest_name, room_number, restaurant, restaurant_name, date, time,
guests, special_requests, status, confirmed_by, walk_in, hotel_id

### menu_items
id, name, category, price, description, available, restaurant (UUID), hotel_id

### concierge_services (NEW)
id, hotel_id, category (tour/car_rental/taxi/luggage), name, description,
price, price_unit, duration, availability (TEXT[]), image_url, active, created_at

### concierge_bookings (NEW)
id, hotel_id, service_id, service_name, category, guest_id, guest_name,
room_number, guests_count, pickup_date, pickup_time, return_date, return_time,
special_requests, status (Pending/Confirmed/Cancelled/Completed),
confirmed_by, total_price, created_at

### hotel_clients
id, hotel_name, contact_name, contact_email, contact_phone, city, country,
rooms_count, entry_code, executive_password, access_mode, services_config (JSONB),
status (active/trial/suspended/inactive), plan, monthly_fee, notes, trial_ends_at

services_config structure:
{
  "housekeeping": true, "room_service": true, "restaurant": true,
  "concierge": true, "security": true, "maintenance": true,
  "concierge_items": ["Car Rental","Taxi","Limo","Luggage Assistance","Tours","City Guide"]
}

### super_admin
id, email, password (plain text — hash before production), name

### Supabase Storage
Bucket: hotel-assets (public)
Paths: restaurants/{restaurant_id}/logo_{timestamp}.ext
       restaurants/{restaurant_id}/cover_{timestamp}.ext
logo_url and cover_url saved to restaurants table (NOT restaurant_settings)

---

## 6. MULTI-HOTEL ISOLATION

Every table has hotel_id. All queries filter by hotel_id.

How hotel context loads:
1. Staff types entry code → fetches hotel_clients → stores in localStorage('sentinel_hotel')
2. Guest scans QR (?room=401&hotel=UUID) → fetches hotel → stores in localStorage
3. Legacy 12345 → no hotel context → all services, no isolation (owner testing only)

Security:
- Suspended/inactive → blocked at entry code
- Staff hotel_id must match session hotel_id (NULL also blocked)
- Room validated against rooms table on guest login
- Manager12345 only works when hotelCtx is null

localStorage keys:
- sentinel_hotel — {id, hotel_name, entry_code, executive_password, access_mode, services_config, status}
- sentinel_local_session — UserProfile JSON
- sentinel_admin_session — Super Admin session
- google_translate_key — Google Translate API key

---

## 7. ACCESS / ROLE SYSTEM

Guest: URL + name + room OR scan QR → enter name only
Staff: Entry code → secret menu → Staff Portal → email + bcrypt password
Executive: Entry code → secret menu → Executive → hotel exec password
Super Admin: /admin → email + password (super_admin table)

UserProfile interface:
  uid, email, displayName, role (guest/staff/manager), department,
  roomNumber?, staffIdNumber?, occupation?, status?,
  hotelId?, hotelName?, entryCode?

Department type:
  Housekeeping | F&B | Concierge | Security & Safety |
  Front Office | Maintenance | None

MANAGER_OCCUPATIONS (get DeptManagerDashboard):
  Housekeeping Manager, Housekeeping Supervisor, F&B Manager,
  Concierge Manager, Security Manager, Front Office Manager, Executive

---

## 8. COMPONENT ARCHITECTURE (App.tsx)

App
├── Auth — guest login + hotel code entry
├── StaffLogin — email + bcrypt password
├── RoomService — dynamic menu from menu_items per hotel
├── RestaurantBooking — guest restaurant booking
├── Concierge — dynamic services from concierge_services per hotel
├── RestaurantPortal — full F&B management
│   ├── fetchRestaurants() — from restaurants table per hotel
│   ├── fetchBookings() — filtered hotel_id
│   ├── fetchMenuItems() — filtered hotel_id
│   └── Tabs: book | mybookings | manage | walkin | menu | settings
├── StaffPortal
│   └── Tabs: active | history | rooms (HK) | maintenance
├── DeptManagerDashboard
│   └── Tabs: requests | sla | staff | settings | report |
│           restaurants (F&B) | rooms (HK) | concierge (Concierge)
├── ConciergeManagerTab (NEW)
│   └── Sections: Manage Services | Bookings
└── ExecutiveDashboard
    └── Tabs: analytics | leaderboard | sla | requests | staff | qr | restaurants

---

## 9. SERVICES CONFIG SYSTEM

Super Admin sets services_config per hotel in hotel_clients.
App reads from localStorage('sentinel_hotel').services_config.
Guest portal shows ONLY enabled tiles.
If no config (12345 testing) → ALL services shown.

---

## 10. RESTAURANT SYSTEM

IMPORTANT: No hardcoded restaurants. All from restaurants table per hotel.
New hotel = zero restaurants until F&B Manager adds them.

F&B Manager flow:
1. Manager Dashboard → Restaurants tab → Settings
2. Add Restaurant (name, cuisine, emoji, description)
3. Upload logo → saved to restaurants.logo_url via Supabase Storage
4. Upload cover → saved to restaurants.cover_url via Supabase Storage
5. Set opening hours + closed days → saved to restaurant_settings

Room Service Menu:
- F&B Manager adds items in Menu tab
- Saved to menu_items with hotel_id
- RoomService component fetches from DB — NO hardcoded items
- Categories: Breakfast, All Day Dining, Main Course, Starters,
  Beverages, Desserts, Healthy, Kids Menu

---

## 11. CONCIERGE SYSTEM

Concierge Manager (Manager Dashboard → Services tab):
- Add/edit/delete services per category (Tours/Car Rental/Taxi/Luggage)
- Set: name, description, price, price_unit, duration, availability days, image
- Manage bookings: confirm/cancel/complete

Guest Concierge Portal:
- Browse services from concierge_services per hotel
- Book: pickup date/time, return date/time, guests count, special requests
- My Bookings: modify (Pending only) or cancel
- Payment at concierge desk

---

## 12. SLA SYSTEM

Default: 30 min. Custom per dept in sla_settings.
Violations: 80% = orange warning. 100% = red alert + mandatory delay reason.
Enforced: elapsed > limit || task.status === 'Violated'
Timestamps: .replace(' ', 'T') ONLY — never strip timezone.

---

## 13. HOUSEKEEPING SYSTEM

Statuses: Clean | Dirty | Cleaning | Inspected | Do Not Disturb | Out of Order | Checked Out
Staff: cannot select Inspected
Supervisor/Manager: all statuses
Timestamps: cleaning_at (Cleaning), cleaned_at (Clean), inspected_at (Inspected)

---

## 14. PASSWORD SECURITY

Staff: bcrypt.hash(password, 10) on register, bcrypt.compare on login
Super Admin: plain text (hash before production)
Library: bcryptjs in package.json

---

## 15. SUPER ADMIN (SentinelAdmin.tsx)

Hotels tab: create/edit/suspend hotels + services config toggles
Rooms tab: bulk create (floor + range + type, max 100), single add, delete
Room types: Standard, Deluxe, Suite, Junior Suite, Presidential Suite,
            Studio, Villa, Penthouse, Connecting Room

---

## 16. QR CODE SYSTEM

URL: smart-service-rho.vercel.app?room=401&hotel=abc-uuid-123
Generated in Executive Dashboard → QR tab
Card shows: room number + QR + welcome message (no URL shown)
Requires rooms in DB — no fallback dummy rooms

---

## 17. PERFORMANCE REPORTS

Manager → Report tab: Today | This Week | This Month
Badges: Supernova / North Star / Rising Comet
On-time colours: Green ≥90% | Yellow ≥70% | Red <70%

---

## 18. KNOWN GOTCHAS

1. Never strip timezone from timestamps — just .replace(' ','T')
2. useState inside JSX = React hooks crash
3. Unclosed JSX divs = cascading TypeScript errors
4. Always push types.ts WITH App.tsx
5. Multiple JSX siblings in ternary branches need <></> fragment wrapper
6. Logo/cover from restaurants table (r.logo_url) NOT restaurant_settings (s.logo_url)
7. RESTAURANTS constant REMOVED — use restaurants state from DB
8. MENU_ITEMS constant REMOVED — use menuItems state from DB
9. services_config null = all services shown (testing mode)
10. Regex query scans can give false negatives — verify actual code lines

---

## 19. BUSINESS PRICING

Trial: AED 0 (30 days)
Basic: AED 2,999/mo | AED 29,999/yr
Standard: AED 4,999/mo | AED 49,999/yr
Premium: AED 7,999/mo | AED 79,999/yr

---

## 20. PENDING

- [ ] Hash super_admin passwords before first paying client
- [ ] Full Supabase Auth migration
- [ ] Native iOS/Android app (Expo at /workspaces/Smart-service/SentinelProApp2)
- [ ] Per-hotel subdomain routing

---

## 21. SESSION RULES

Before every change:
1. Fetch: https://raw.githubusercontent.com/singh7naamg-stack/Smart-service/main/memory.md
2. Read fully
3. Ask if anything is unclear
4. Change ONLY what was asked — nothing else
5. Final audit before presenting file
6. State which files to replace and in what order
