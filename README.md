# Trading-Strategy--Backtest-Management-system
> **Escanor Strategy Lab** — A collaborative, centralized web-based research management platform for algorithmic and discretionary trading strategies, versions, backtest results, comparison metrics, and attachments.

---

## 📌 Project Overview

**Escanor Strategy Lab** serves as the central source of truth for all quantitative and qualitative trading strategy research. It brings together backtest results from disparate platforms (TradingView, Freqtrade, Python, Codex, Manual) into one standardized, high-performance database with advanced sorting, filtering, comparison leaderboards, and role-based permissions.

---

## 🚀 Key Features

- **Centralized Strategy & Version Management**: Track trading ideas from inception (`Idea`, `Candidate`, `Validation`, `Live`) with full version history (`V1`, `V2`, etc.) and structured JSON parameter sets.
- **Canonical Backtest Result Schema**: Enforces uniform metrics (Net Profit %, Max Drawdown %, Profit Factor, Sharpe/Sortino ratios, Win Rate %, CAGR %, Expectancy, and yearly breakdown) regardless of whether the source is TradingView, Freqtrade, Python, or Codex.
- **Advanced Interactive Table (TanStack Table v8)**:
  - Fast client-side & server-side sorting, multi-criteria filtering, column reordering, resizing, hiding, and pinning.
  - Per-user saved table preferences and custom saved views persisted in database.
- **Side-by-Side Strategy Comparison**: Compare multiple backtests across standardized risk and return metrics.
- **Leaderboards**: Ranked performance leaderboards by Profit Factor, Net Profit %, Sharpe Ratio, Calmar Ratio, and Custom Scoring.
- **Research Notes & Attachments**: Attach Pine Scripts, Python strategy files, CSVs, PDFs, and screenshots with author attribution.
- **Granular Role-Based Security (RLS)**:
  - **Owner**: Full access, user management, archiving, system settings.
  - **Editor**: Create & edit strategies, versions, backtests, notes, and attachments.
  - **Viewer**: Read-only research access with custom table layouts and filters.
- **Audit & Activity History**: Preserves actor, timestamp, and activity history for all critical actions.

---

## 🛠️ Technology Stack

- **Frontend & App Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components, Server Actions)
- **UI Library**: React 19, [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), Lucide Icons
- **Data Table**: [TanStack Table v8](https://tanstack.com/table)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, Supabase Auth & Storage)
- **Validation**: [Zod](https://zod.dev/)

---

## ⚙️ Getting Started

### 1. Prerequisites
- Node.js 18.x or 20.x+
- A Supabase account ([supabase.com](https://supabase.com))

### 2. Clone the Repository
```bash
git clone https://github.com/ayhanarashtasin/Trading-Strategy--Backtest-Management-system.git
cd Trading-Strategy--Backtest-Management-system
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your Supabase credentials:
```bash
cp .env.example .env.local
```

Fill in:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.your-project:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.your-project:password@aws-0-region.pooler.supabase.com:5432/postgres
```

### 5. Apply Database Migrations
Run the SQL schema located in `supabase/migrations/20260901000000_init_schema.sql` inside your Supabase SQL Editor, or run:
```bash
npm run db:migrate
```

### 6. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Add the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. In Supabase Dashboard, set the **Site URL** and **Redirect URLs** to your Vercel deployment domain.

---

## 👥 Credits & Attribution

- **Concept, Requirements & System Planning:** [Ayhan Arash Tasin](https://github.com/ayhanarashtasin)
- **Code Implementation & Engineering:** Antigravity AI (Pair-programmed with Google DeepMind Antigravity Assistant)

---

## 📄 License

Private & Proprietary research software. All rights reserved.
