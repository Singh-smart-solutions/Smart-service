Here's everything that's now built into the updated `App.tsx`. Replace your existing file in GitHub with this one.

---

## ✅ All Features Added

**Staff Registration:**
- Full Name, Staff ID Number, Occupation (15 roles), Department (auto-set based on occupation)
- `Department Manager / Senior Manager / Executive` → flagged with ⚡ warning → goes to **Executive approval only**, not department manager

**Executive Operations Centre — 5 Tabs:**

| Tab | What it does |
|---|---|
| **Analytics** | Revenue KPIs, bar chart (Weekly/Monthly toggle), guest feedback |
| **Leaderboard** | Staff ranked 🥇🥈🥉 by on-time rate, tasks completed, violations |
| **SLA** | Live delayed tasks (blinking red), full violation history table with rate% |
| **Requests** | All requests with red blinking SLA badges + delay reasons shown |
| **Staff** | Separate section for Manager approvals (Executive only) + regular pending/approved |

**Report Generator (top right):**
- Weekly / Monthly dropdown
- **Download PDF** — full text report with metrics, violations, top performers
- **Email to Departments** — simulated alert to all managers
- **Export CSV** — real download with all request data

**SLA Alerts:**
- Staff screen: red blinking banner, red progress bar, button changes to `⚠ Close (Reason Required)`
- Manager SLA tab: currently delayed staff shown with blinking red cards
- Executive header: red pulsing alert banner with room numbers when any task is late

**Mandatory Delay Reason:**
- Staff **cannot close** any SLA-exceeded task without picking a reason from the dropdown
- Options: High Volume, Staff Shortage, Technical Issue, Guest Not in Room, Waiting for Supplies, Too Many Simultaneous Requests, Other
- Reason is stored in DB and shown on manager's view
