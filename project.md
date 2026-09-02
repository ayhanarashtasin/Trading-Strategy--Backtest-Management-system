# Escanor Strategy Lab

## 1. Project Overview

**Project Name:** Escanor Strategy Lab  
**Application Type:** Private, shared, web-based trading strategy research database  
**Primary Purpose:** Store, organize, compare, and review manually entered trading strategies and backtest results from TradingView, Freqtrade, Python, VS Code/Codex workflows, and other research tools.

The application will act as the central source of truth for all strategy research conducted by the team.

The system is not intended to perform backtests in Version 1. Backtests are performed externally, then the important information and results are manually entered into Escanor Strategy Lab.

Because the application is web-based, approved team members in different countries must be able to log in and view the same up-to-date strategies, backtests, notes, attachments, and research information.

---

# 2. Core Goals

The application must:

1. Store all trading strategies in one central online database.
2. Store multiple versions of each strategy.
3. Store multiple backtests for each strategy version.
4. Allow manual entry of TradingView, Freqtrade, Python, Codex, and other backtest results.
5. Enforce a uniform result structure across all backtests.
6. Allow optional fields when a backtesting platform does not provide a metric.
7. Allow team members in different countries to securely access the same data.
8. Support Owner, Editor, and Viewer permission levels.
9. Allow users to search, filter, sort, reorder, resize, hide, and pin result-table columns.
10. Save each user's preferred table layout.
11. Provide a Details field for important information that does not belong in standardized columns.
12. Provide Research Notes for team discussion and observations.
13. Support attachments such as screenshots, reports, CSV files, Pine Script files, Python strategy files, PDFs, and images.
14. Support strategy comparison.
15. Support customizable leaderboards.
16. Support saved filters and saved views.
17. Maintain an activity history showing who added or changed information.
18. Reduce accidental duplicate backtest entries.
19. Keep strategy records separate from individual backtest records.
20. Be designed so advanced analytics and automation can be added later without rebuilding the core database.

---

# 3. Recommended Technology Stack

## Frontend and Application Framework

- Next.js
- TypeScript
- React

## UI

- Tailwind CSS
- shadcn/ui
- TanStack Table

## Backend and Database

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- PostgreSQL Row Level Security

## Hosting

- Vercel

## Source Control

- GitHub

## Architecture

```text
Users
  |
  v
Private Web Application
  |
  v
Next.js
  |
  +-------------------+
  |                   |
  v                   v
Supabase Database   Supabase Auth
  |
  +-------------------+
  |                   |
  v                   v
PostgreSQL        Supabase Storage
                    |
                    v
             Strategy Files
             Screenshots
             Reports
             Attachments
```

---

# 4. Product Philosophy

Escanor Strategy Lab is primarily a research-management system.

Backtesting tools remain separate.

```text
TradingView --------\
                     \
Freqtrade ------------> Escanor Strategy Lab
                       /
Python / Codex -------/
                     /
Manual Research -----/
```

TradingView, Freqtrade, Python, and Codex perform the analysis.

Escanor Strategy Lab stores the permanent research record.

---

# 5. Authentication and Access

The application must require authentication.

It must not expose private trading research publicly by default.

Approved users log in using individual accounts.

## Roles

### Owner

Permissions:

- View all strategies
- View all backtests
- Create strategies
- Edit strategies
- Delete strategies
- Create backtests
- Edit backtests
- Delete backtests
- Upload attachments
- Delete attachments
- Add research notes
- Manage users
- Change user roles
- Manage application settings
- Export database data
- View activity logs

### Editor

Permissions:

- View strategies
- View backtests
- Create strategies
- Edit strategies
- Create backtests
- Edit backtests
- Upload attachments
- Add research notes
- Use comparison tools
- Use filters and leaderboards

Editors should not be able to manage team members.

Deletion permissions should either be disabled for Editors or handled through soft-delete/archive functionality.

### Viewer

Permissions:

- View strategies
- View backtests
- Search
- Filter
- Sort
- Reorder columns
- Use saved personal layouts
- View details
- View notes
- View permitted attachments
- Use comparison tools
- View leaderboards

Viewers cannot modify research data.

---

# 6. Main Navigation

Version 1 should use the following navigation:

```text
Dashboard

Strategies

Backtests

Compare

Leaderboard

Team

Settings
```

Possible later sections:

```text
Analytics

Research

Datasets

Activity

Reports
```

---

# 7. Core Data Model

The application must distinguish between:

1. Strategy
2. Strategy Version
3. Backtest

These are separate entities.

## Example

```text
Supertrend MTF ADX
|
+-- V1
|   |
|   +-- TradingView 15m Test
|   +-- Freqtrade 15m Test
|
+-- V2
|   |
|   +-- Freqtrade Development Test
|   +-- Freqtrade Prior-Period Test
|   +-- Freqtrade OOS Test
|
+-- V3
    |
    +-- TradingView Test
    +-- Freqtrade Test
```

This prevents duplicate strategy records and makes version history understandable.

---

# 8. Database Tables

Initial database tables:

```text
profiles
strategies
strategy_versions
backtests
backtest_yearly_results
research_notes
attachments
tags
strategy_tags
saved_views
activity_logs
```

Optional future tables:

```text
backtest_monthly_results
datasets
comments
notifications
strategy_scores
portfolio_tests
custom_metrics
parameter_sets
```

---

# 9. Profiles Table

Suggested fields:

```text
id
email
display_name
role
avatar_url
created_at
updated_at
last_seen_at
```

Role values:

```text
owner
editor
viewer
```

---

# 10. Strategies Table

A Strategy represents the core trading idea.

Suggested fields:

```text
id
name
strategy_family
description
default_direction
status
created_by
created_at
updated_by
updated_at
archived_at
```

## Example

```text
Name:
Supertrend MTF ADX

Family:
Supertrend

Description:
15m Supertrend trend-following strategy using
1h Supertrend confirmation and ADX filtering.

Direction:
Long

Status:
Candidate
```

---

# 11. Strategy Families

Initial predefined strategy families:

```text
Supertrend
Momentum
Trend Following
Mean Reversion
Breakout
Scalping
Swing
Moving Average
RSI
MACD
VWAP
Volume
Multi-Timeframe
Custom
Other
```

The system should allow new categories later.

---

# 12. Strategy Status

Recommended statuses:

```text
Idea
Baseline
Experimental
Candidate
Validation
OOS Passed
Paper Trading
Production Candidate
Live
Rejected
Archived
```

Status should be filterable.

Color indicators may be used in the interface, but status must always be stored as structured text rather than color alone.

---

# 13. Strategy Versions Table

Each strategy can have multiple versions.

Suggested fields:

```text
id
strategy_id
version_name
version_number
description
entry_rules
exit_rules
risk_rules
parameter_summary
parameters_json
is_current
created_by
created_at
updated_by
updated_at
```

## Example

```text
Strategy:
Supertrend MTF ADX

Version:
V9

Entry Rules:
15m Supertrend green
1h Supertrend bullish
ADX14 > 18

Exit Rules:
15m Supertrend green to red

Risk:
1.5% hard stop
```

---

# 14. Parameters

Parameters differ significantly between strategy types.

The system should support:

1. Human-readable parameter summary.
2. Structured JSON parameters.

Example:

```json
{
  "supertrend": {
    "atr_length": 10,
    "multiplier": 2.5
  },
  "higher_timeframe_supertrend": {
    "timeframe": "1h",
    "atr_length": 10,
    "multiplier": 3.0
  },
  "adx": {
    "length": 14,
    "threshold": 18
  },
  "stop_loss": {
    "type": "hard",
    "percent": 1.5
  }
}
```

Important metrics that users may need to filter should not exist only inside JSON.

---

# 15. Backtests Table

Every backtest is one experiment performed against one strategy version.

A backtest must not overwrite previous tests.

Suggested fields are grouped below.

---

# 16. Backtest Identification Fields

```text
id
strategy_version_id
backtest_name
test_type
source
engine_version
status
created_by
created_at
updated_by
updated_at
```

## Backtest Source Values

```text
TradingView
Freqtrade
Python
Codex
Manual
Other
```

## Test Type Values

```text
Development
Optimization
Prior Period
Out of Sample
Walk Forward
Robustness
Monte Carlo
Paper Trading
Live
Other
```

---

# 17. Market Information Fields

```text
exchange
market_type
symbol
base_asset
quote_asset
direction
timeframe
higher_timeframe
intrabar_timeframe
data_source
start_date
end_date
```

## Example

```text
Exchange:
Binance

Market:
USD-M Futures

Symbol:
BTCUSDT

Direction:
Long

Timeframe:
15m

Higher Timeframe:
1h

Intrabar:
1m

Start:
2022-01-01

End:
2026-08-31
```

---

# 18. Execution Assumption Fields

```text
fee_per_side_percent
slippage_per_side_percent
starting_capital
leverage
position_size_percent
compounding
stop_loss_description
take_profit_description
trailing_stop_description
funding_included
```

These fields are important because two backtests should not be compared without understanding their assumptions.

---

# 19. Standard Performance Columns

Every backtest should use the same canonical result schema.

Fields may contain NULL when the source platform does not provide the metric.

## Required Core Metrics

```text
total_trades
profit_factor
net_profit_percent
max_drawdown_percent
win_rate_percent
average_trade_percent
```

## Recommended Additional Metrics

```text
net_profit_amount
cagr_percent
payoff_ratio
expectancy_percent
average_win_percent
average_loss_percent
largest_win_percent
largest_loss_percent
sharpe_ratio
sortino_ratio
calmar_ratio
recovery_factor
exposure_percent
average_trade_duration
long_trades
short_trades
winning_trades
losing_trades
```

---

# 20. Important Data Rule

Do not create different result schemas for TradingView and Freqtrade.

Example:

Bad:

```text
TradingView Results Table
Freqtrade Results Table
Python Results Table
```

Correct:

```text
Backtests Table

Source = TradingView
Source = Freqtrade
Source = Python
```

All results map into the same standard columns.

Unavailable fields remain empty.

---

# 21. Details Field

Every backtest must include an optional Details field.

Purpose:

Store important technical information that is useful to understand the backtest but does not belong in one of the standard columns.

Example:

```text
15m long-only Supertrend.

ATR Length 10.
Multiplier 2.5.

1h Supertrend confirmation:
ATR Length 10.
Multiplier 3.

ADX14 > 18.

Exit when 15m Supertrend changes from green to red.

1.5% hard stop.

1m detail candles used for intrabar simulation.

No trailing stop.
```

The Details field must not replace structured performance columns.

---

# 22. Research Notes

Research Notes are different from Details.

## Details

Technical backtest specification.

## Research Notes

Human observations and team discussion.

Example:

```text
Strong improvement over V8.

2023 performance is unusually strong.

Need to test ADX thresholds between 16 and 22.

Prior-period test required before qualification.
```

Research notes should store:

```text
id
entity_type
entity_id
content
created_by
created_at
updated_at
```

Entity type may include:

```text
strategy
strategy_version
backtest
```

---

# 23. Backtest Integrity Fields

Recommended integrity fields:

```text
fees_included
slippage_included
intrabar_simulation
lookahead_checked
lookahead_bias_detected
data_gaps_checked
warmup_checked
funding_included
liquidation_modeled
same_bar_execution_checked
oos_tested
walk_forward_tested
```

The purpose is to distinguish a promising result from a trustworthy result.

---

# 24. Backtest Table UI

The Backtests page is the main research workspace.

Example:

```text
BACKTESTS

Search: [ BTC Supertrend                    ]

Filters:
[BTCUSDT] [15m] [Freqtrade] [PF >= 1.15] [DD <= 25%]

+ Add Backtest

--------------------------------------------------------------------
Strategy | Version | Symbol | TF | Trades | PF | Avg | DD | Return
--------------------------------------------------------------------
ST MTF   | V9      | BTC    |15m | 1043   |1.24|.082 |21.3|142.5%
Momentum | V13     | BTC    | 5m | 1394   |1.21|.071 |22.1|134.0%
--------------------------------------------------------------------
```

---

# 25. Column Controls

Every table column must support, where technically appropriate:

```text
Sort ascending
Sort descending
Drag left
Drag right
Resize
Hide
Show
Pin left
Pin right
Filter
Reset
```

The interface should support a Column Settings menu.

---

# 26. User-Specific Column Preferences

Column settings should be saved per user.

Example:

User A may prefer:

```text
Strategy
PF
Trades
Avg Trade
Max DD
Return
Details
```

User B may prefer:

```text
Strategy
Timeframe
Source
Return
Profit Factor
Max Drawdown
Status
Details
```

Each user's configuration should persist after logout.

---

# 27. Saved Views

Users must be able to save reusable combinations of:

- Filters
- Sort order
- Column order
- Column visibility
- Pinned columns

Examples:

```text
Strong Candidates
TradingView Tests
15m Supertrend
Needs Validation
Low Drawdown
High Sample Size
```

Saved views can initially be private to each user.

Shared team views may be added later.

---

# 28. Filtering

The Backtests page should support structured filtering.

Recommended filters:

```text
Strategy
Strategy Family
Version
Status
Source
Test Type
Exchange
Market Type
Symbol
Direction
Timeframe
Higher Timeframe
Intrabar Timeframe
Start Date
End Date
Total Trades
Profit Factor
Net Profit
Win Rate
Average Trade
Payoff Ratio
Max Drawdown
Sharpe
Sortino
Created By
Created Date
Tags
```

Numeric filtering should support:

```text
=
>
>=
<
<=
between
```

---

# 29. Example Research Filter

Saved View:

```text
Strong Candidates

Trades >= 1000
Profit Factor >= 1.15
Average Trade >= 0.05%
Max Drawdown <= 25%
Status != Rejected
```

This should immediately show qualifying backtests.

---

# 30. Add Strategy Workflow

Button:

```text
+ New Strategy
```

Form fields:

```text
Strategy Name *
Strategy Family *
Description
Default Direction
Status
Tags
```

Actions:

```text
Save
Save and Add Version
Cancel
```

---

# 31. Add Strategy Version Workflow

Inside a Strategy:

```text
+ New Version
```

Fields:

```text
Version Name *
Description
Entry Rules
Exit Rules
Risk Rules
Parameter Summary
Parameters
Current Version
```

---

# 32. Add Backtest Workflow

Inside a Strategy Version:

```text
+ Add Backtest
```

Recommended form sections:

## General

```text
Backtest Name
Source
Test Type
Status
```

## Market

```text
Exchange
Market Type
Symbol
Direction
Timeframe
Higher Timeframe
Intrabar Timeframe
Data Source
Start Date
End Date
```

## Execution

```text
Fee Per Side
Slippage
Starting Capital
Leverage
Position Size
Compounding
Stop Loss
Take Profit
Trailing Stop
```

## Results

```text
Total Trades
Profit Factor
Net Profit %
Net Profit Amount
Win Rate %
Average Trade %
Payoff Ratio
Max Drawdown %
CAGR %
Expectancy %
Average Win %
Average Loss %
Largest Win %
Largest Loss %
Sharpe
Sortino
Calmar
Recovery Factor
Exposure %
Average Trade Duration
Long Trades
Short Trades
```

## Integrity

```text
Fees Included
Slippage Included
Intrabar Simulation
Lookahead Checked
Lookahead Bias
Data Gaps Checked
Warmup Checked
Funding Included
Liquidation Modeled
OOS Tested
Walk Forward Tested
```

## Details

Large multiline text box.

## Research Notes

Large multiline text box.

## Attachments

Optional upload section.

---

# 33. Required Backtest Fields

Keep required fields minimal.

Recommended required fields:

```text
Strategy Version
Source
Symbol
Timeframe
Start Date
End Date
```

At least one result metric should also be entered before saving.

Most performance metrics should remain optional.

---

# 34. Duplicate Protection

Before creating a backtest, the system should search for similar records.

Potential duplicate criteria:

```text
strategy_version_id
source
symbol
timeframe
start_date
end_date
test_type
```

If a likely duplicate exists:

```text
Possible Duplicate

A similar backtest already exists.

Strategy:
Supertrend MTF ADX V9

Source:
Freqtrade

BTCUSDT
15m
2022-01-01 to 2026-08-31

[View Existing]

[Save Anyway]

[Cancel]
```

Do not completely prevent duplicates because legitimate repeated tests may exist.

---

# 35. Strategy Detail Page

Recommended structure:

```text
Supertrend MTF ADX

Status: Candidate
Family: Supertrend
Direction: Long

Description
--------------------------------------------------

15m trend strategy using 1h Supertrend confirmation
and ADX filtering.


Versions
--------------------------------------------------

V9     Current
V8
V7


Backtests
--------------------------------------------------

Name          Source       TF      Trades   PF     DD
Dev Test      Freqtrade    15m     1043     1.24   21.3%
TradingView   TradingView  15m      998     1.21   20.7%
Prior Period  Freqtrade    15m      721     1.18   17.2%
OOS           Freqtrade    15m      416     1.16   15.8%


Attachments
--------------------------------------------------

strategy_v9.py
strategy_v9.pine
tradingview_result.png
research_report.pdf


Research Notes
--------------------------------------------------

User A:
Need additional robustness testing.

User B:
Test ATR lengths 8 through 14 next.
```

---

# 36. Backtest Detail Page

The Backtest Detail page should organize data into sections rather than displaying one huge form.

Sections:

```text
Overview
Market
Execution
Performance
Integrity
Details
Yearly Results
Attachments
Research Notes
Activity
```

---

# 37. Compare Feature

Users should be able to select multiple backtests and click:

```text
Compare
```

Initial recommended maximum:

```text
10 backtests
```

Comparison layout:

| Metric | Strategy A | Strategy B | Strategy C |
|---|---:|---:|---:|
| Trades | 1043 | 1389 | 1221 |
| Profit Factor | 1.24 | 1.19 | 1.21 |
| Average Trade | 0.082% | 0.061% | 0.074% |
| Win Rate | 37.2% | 42.1% | 51.3% |
| Max DD | 21.3% | 18.7% | 23.1% |
| Return | 142% | 126% | 119% |

The best value may be visually highlighted when the metric has an obvious positive or negative direction.

Example:

Higher is generally better:

```text
Profit Factor
Net Profit
Average Trade
Sharpe
Sortino
```

Lower is generally better:

```text
Max Drawdown
```

Avoid assuming that higher win rate is always better.

---

# 38. Leaderboard

The leaderboard should rank backtests based on user-selected metrics and filters.

Example:

```text
Filters

Symbol = BTCUSDT
Timeframe = 15m
Trades >= 500
Max DD <= 25%
```

Then rank by:

```text
Profit Factor
Average Trade
Return
Max Drawdown
Sharpe
Sortino
Trades
```

The user should choose the ranking metric.

Do not create one opaque "best strategy" ranking in Version 1.

---

# 39. Year-by-Year Results

Backtests may optionally have annual results.

Suggested fields:

```text
id
backtest_id
year
trades
net_profit_percent
profit_factor
win_rate_percent
average_trade_percent
max_drawdown_percent
```

Example:

| Year | Trades | Return | PF | Win Rate | Avg Trade | DD |
|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 213 | 18% | 1.14 | 38% | 0.06% | 11% |
| 2023 | 244 | 31% | 1.21 | 37% | 0.08% | 9% |
| 2024 | 228 | 24% | 1.17 | 39% | 0.07% | 12% |
| 2025 | 249 | 39% | 1.26 | 36% | 0.09% | 10% |
| 2026 | 142 | 15% | 1.12 | 38% | 0.05% | 8% |

Derived metrics may include:

```text
Positive Years
Negative Years
Worst Year PF
Best Year PF
Worst Year Return
Best Year Return
```

---

# 40. Attachments

Users should be able to upload files to Strategies, Strategy Versions, and Backtests.

Supported initial file types should include:

```text
.png
.jpg
.jpeg
.webp
.pdf
.csv
.json
.md
.txt
.py
.pine
```

Other safe file types may be added later.

Examples:

```text
TradingView screenshot
Equity curve
Freqtrade report
CSV export
Python strategy
Pine Script
Research report
Markdown notes
```

Attachments should be stored using Supabase Storage.

The database should store attachment metadata.

Suggested fields:

```text
id
entity_type
entity_id
file_name
storage_path
mime_type
file_size
uploaded_by
created_at
```

---

# 41. Activity Log

Every important write operation should create an activity record.

Suggested actions:

```text
strategy_created
strategy_updated
strategy_archived
strategy_version_created
strategy_version_updated
backtest_created
backtest_updated
backtest_deleted
attachment_uploaded
attachment_deleted
note_created
note_updated
status_changed
```

Suggested fields:

```text
id
user_id
action
entity_type
entity_id
before_data
after_data
created_at
```

Example:

```text
01 Sep 2026 15:30

Alex updated backtest BT-1043

Profit Factor:
1.21 -> 1.24
```

---

# 42. Audit and Safety Rules

For research integrity:

1. Records should use soft deletion where practical.
2. Owners should be able to restore archived records.
3. Editing should store `updated_by` and `updated_at`.
4. Important changes should appear in activity logs.
5. Backtest results should never silently overwrite previous experiments.
6. Duplicate warnings should be shown.
7. Database backups must be enabled.
8. Sensitive strategy data must require authentication.

---

# 43. Dashboard

Initial Dashboard cards:

```text
Total Strategies
Total Strategy Versions
Total Backtests
Candidates
Validated Strategies
Rejected Strategies
```

Sections:

```text
Top Recent Backtests
Recent Activity
Recently Added Strategies
Backtests Needing Validation
```

Possible later additions:

```text
Best Profit Factor
Lowest Drawdown
Most Tested Strategy
Backtests by Timeframe
Backtests by Strategy Family
Backtests by User
```

---

# 44. Team Page

Owner-only management section:

```text
Members

Name
Email
Role
Status
Last Active
```

Actions:

```text
Invite
Change Role
Disable Access
Remove
```

Initial roles:

```text
Owner
Editor
Viewer
```

---

# 45. Search

Global search should support:

```text
Strategy name
Version
Symbol
Description
Details
Research Notes
Tags
Backtest name
```

Example:

```text
Search: ADX 18
```

Possible results:

```text
Supertrend MTF ADX V9
Momentum ADX Breakout V3
Backtest BT-000492
```

---

# 46. Tags

Strategies should support multiple tags.

Examples:

```text
BTC
Supertrend
Trend
MTF
Long
15m
Momentum
Experimental
Robust
High DD
```

Tags should be searchable and filterable.

---

# 47. Responsive Design

Primary usage is expected on desktop and laptop.

Desktop must receive the best table experience.

Tablet should remain functional.

Mobile should support:

```text
Viewing strategies
Viewing backtests
Searching
Filtering
Reading details
Adding notes
```

Complex wide comparison tables may use horizontal scrolling on mobile.

---

# 48. User Experience Requirements

The design should be:

```text
Professional
Minimal
Fast
Research-focused
Dense enough for data analysis
Easy to scan
Consistent
```

Avoid excessive decorative animation.

Priority should be given to:

```text
Readable tables
Fast filtering
Clear metric labels
Compact forms
Strong information hierarchy
Easy navigation
```

---

# 49. Important Metric Formatting

Percentages:

```text
21.30%
0.082%
142.50%
```

Profit Factor:

```text
1.24
```

Trade counts:

```text
1,043
```

Money:

```text
$10,000.00
```

Dates:

```text
2022-01-01
```

Frontend may optionally display friendlier date formatting while preserving ISO dates in storage.

---

# 50. Database Value Rules

Store numeric values as numeric database types.

Do not store:

```text
"21.3%"
```

Store:

```text
21.3
```

The frontend adds the `%` display.

Do not store:

```text
"1,043 trades"
```

Store:

```text
1043
```

This is essential for correct filtering and sorting.

---

# 51. Null Values

If a platform does not provide a statistic:

Store:

```text
NULL
```

Display:

```text
N/A
```

Do not use:

```text
0
```

unless the result is genuinely zero.

---

# 52. Database Relationships

Recommended high-level relationship:

```text
profiles
   |
   +------------------------+
   |                        |
strategies               research_notes
   |
   v
strategy_versions
   |
   v
backtests
   |
   +------------------+------------------+
   |                  |                  |
   v                  v                  v
yearly_results     attachments      research_notes
```

---

# 53. Suggested SQL-Level Security Model

Use Supabase Row Level Security.

General rules:

### Viewer

```text
SELECT allowed
INSERT denied
UPDATE denied
DELETE denied
```

### Editor

```text
SELECT allowed
INSERT allowed
UPDATE allowed
DELETE restricted
```

### Owner

```text
SELECT allowed
INSERT allowed
UPDATE allowed
DELETE allowed
User management allowed
```

Server-side authorization must not rely only on hidden frontend buttons.

---

# 54. Deployment

Recommended deployment:

```text
GitHub
   |
   v
Vercel
   |
   v
Next.js Application
   |
   v
Supabase
```

Production domain example:

```text
strategy.escanorcapital.com
```

Possible environments:

```text
Development
Staging
Production
```

For the first MVP, Development and Production may be sufficient.

---

# 55. Environment Variables

Never commit secrets into Git.

Typical variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Service-role keys must only be used server-side.

---

# 56. MVP Scope

The first usable release must include:

## Authentication

- Login
- Logout
- Protected routes

## Team

- Owner
- Editor
- Viewer

## Strategies

- Create
- View
- Edit
- Archive
- Search
- Filter

## Strategy Versions

- Create
- View
- Edit

## Backtests

- Create
- View
- Edit
- Archive/Delete according to permissions
- Uniform columns
- Manual data entry
- Details field
- Research Notes
- Search
- Filters
- Sorting
- Movable columns
- Resizable columns
- Hidden columns
- Pinned columns

## Preferences

- Persist each user's column layout

## Attachments

- Upload
- View
- Download permitted files

## Activity

- Created by
- Updated by
- Created time
- Updated time
- Basic activity log

---

# 57. Phase 2

After the MVP is stable:

```text
Saved Views
Advanced Filters
Strategy Compare
Leaderboard
Yearly Results
Tags
Duplicate Detection
Improved Activity History
Strategy Status Workflow
```

---

# 58. Phase 3

Collaboration improvements:

```text
Comments
Mentions
Shared Views
Notifications
User Invitations
Attachment Preview
Advanced Permissions
```

---

# 59. Phase 4

Analytics:

```text
Performance Charts
Drawdown Charts
Yearly Performance Charts
Strategy Family Analytics
Parameter Comparisons
Robustness Summaries
Research Dashboards
```

---

# 60. Phase 5

Potential automation:

```text
TradingView CSV Import
Freqtrade JSON Import
Bulk Backtest Import
API Access
Codex Export Format
Automatic Duplicate Detection
Automatic Metric Parsing
```

These features are explicitly outside Version 1.

---

# 61. Out of Scope for Version 1

Do not build the following in the first release:

```text
Backtesting engine
Trading execution
Exchange API trading
Live order placement
Portfolio execution
Automatic TradingView scraping
Automatic Freqtrade execution
AI strategy generation
Optimization engine
Monte Carlo engine
Walk-forward engine
Advanced portfolio optimizer
Real-time market data
```

The first priority is a trustworthy shared research database.

---

# 62. Performance Requirements

The system should feel responsive with:

```text
10,000+ backtests
1,000+ strategies
Multiple team members
Large result tables
```

Use server-side pagination, filtering, or virtualization when needed.

Avoid loading the complete database into the browser for every page.

---

# 63. Data Export

Owners should eventually be able to export:

```text
Strategies CSV
Backtests CSV
Yearly Results CSV
Full Database JSON
```

Version 1 should ideally include at least Backtests CSV export.

---

# 64. Backups

Database backups are mandatory.

Requirements:

1. Supabase backups enabled where supported by the selected plan.
2. Periodic manual export option.
3. Attachment storage separated from core relational data.
4. Restore process documented before production use.

---

# 65. Initial Backtest Table Columns

Recommended default visible columns:

```text
Strategy
Version
Status
Symbol
Timeframe
Source
Test Type
Start Date
End Date
Trades
Profit Factor
Average Trade %
Win Rate %
Payoff Ratio
Max Drawdown %
Net Profit %
Details
Created By
```

Default hidden but available:

```text
Exchange
Market Type
Direction
Higher Timeframe
Intrabar Timeframe
Data Source
Fee Per Side
Slippage
CAGR
Sharpe
Sortino
Expectancy
Average Win
Average Loss
Largest Win
Largest Loss
Exposure
Leverage
Starting Capital
Created At
Updated At
```

---

# 66. Default Backtest Table Behavior

Initial sort:

```text
Created At descending
```

Default page size:

```text
50
```

Page size options:

```text
25
50
100
250
```

Global search should remain visible.

Filters should be collapsible.

---

# 67. Details Display

The table should not show the complete Details text.

Use:

```text
View
```

Clicking View opens either:

1. Right-side drawer, preferred.
2. Modal.
3. Backtest detail page.

The drawer should display:

```text
Strategy
Version
Technical Specification
Execution Assumptions
Details
Research Notes
Attachments
```

---

# 68. Validation Rules

Examples:

Profit Factor:

```text
minimum: 0
```

Win Rate:

```text
0 to 100
```

Maximum Drawdown:

```text
0 to 100
```

Average Trade:

May be positive or negative.

Trades:

```text
integer >= 0
```

Start Date must not occur after End Date.

Fee must not be negative.

Leverage must be greater than zero when provided.

---

# 69. Unsaved Changes

When editing a Strategy, Version, or Backtest, warn before leaving if there are unsaved changes.

Example:

```text
You have unsaved changes.

Discard changes?

[Stay]

[Discard]
```

---

# 70. Archive Instead of Destructive Delete

For strategies and backtests, prefer:

```text
Archive
```

over permanent deletion.

Archived records should:

- Disappear from normal views.
- Remain searchable when "Show Archived" is enabled.
- Remain in audit history.
- Be restorable by an Owner.

Permanent deletion may be limited to Owners.

---

# 71. Research Quality Principle

The application must never automatically label a strategy as good based only on Total Return.

Users need to evaluate:

```text
Sample Size
Profit Factor
Average Trade
Max Drawdown
Consistency
Execution Assumptions
Out-of-Sample Results
Robustness
Fees
Intrabar Method
```

Any later automated score should remain transparent and secondary to the underlying metrics.

---

# 72. Example Record

## Strategy

```text
Supertrend MTF ADX
```

## Version

```text
V9
```

## Description

```text
15m Supertrend strategy with 1h Supertrend trend
confirmation and ADX momentum filtering.
```

## Backtest

```text
Source:
Freqtrade

Test Type:
Development

Exchange:
Binance

Market:
USD-M Futures

Symbol:
BTCUSDT

Direction:
Long

Timeframe:
15m

Higher Timeframe:
1h

Intrabar:
1m

Start:
2022-01-01

End:
2026-08-31

Fee:
0.05% per side

Trades:
1043

Profit Factor:
1.24

Average Trade:
0.082%

Win Rate:
37.2%

Payoff:
2.18

Max Drawdown:
21.3%

Net Profit:
142.5%
```

## Details

```text
Base Supertrend ATR 10, multiplier 2.5.

1h Supertrend ATR 10, multiplier 3.0.

ADX14 > 18.

Entry only when base Supertrend is bullish,
HTF Supertrend is bullish, and ADX filter passes.

Exit on 15m Supertrend bullish-to-bearish change.

1.5% hard stop.

No trailing stop.

1m detail candles used for intrabar simulation.
```

## Research Notes

```text
Strong development candidate.

Need prior-period and out-of-sample testing.

Test ADX thresholds 16 to 22 before promotion.
```

---

# 73. Acceptance Criteria for MVP

The MVP is considered complete when all of the following are true:

1. A user can log in securely.
2. Unauthorized visitors cannot access research pages.
3. An Owner can create users or manage approved team access.
4. A user with permission can create a Strategy.
5. A user can create multiple Strategy Versions.
6. A user can manually create multiple Backtests for each Version.
7. Backtests use one uniform metric schema.
8. Missing metrics can remain empty.
9. The Backtests table supports sorting.
10. The Backtests table supports filtering.
11. Columns can be reordered.
12. Columns can be resized.
13. Columns can be hidden.
14. Columns can be pinned.
15. User table preferences persist after logout.
16. Backtests can contain Details.
17. Backtests can contain Research Notes.
18. Users can upload attachments.
19. Users can view who created a record.
20. Users can view who last edited a record.
21. Multiple team members can see the same saved data from different devices.
22. Permissions prevent Viewers from editing.
23. The database is hosted online.
24. The application is deployed to a production URL.
25. Important write actions appear in an activity log.
26. Archived records can be restored by authorized users.
27. Numeric columns sort numerically rather than alphabetically.
28. Percent values are stored numerically and displayed correctly.
29. Search works across key strategy and backtest fields.
30. The system remains usable with at least 10,000 backtest records.

---

# 74. Development Priority

Build features in this order:

## Priority 1

```text
Database schema
Authentication
Authorization
Strategies
Strategy Versions
Backtests
```

## Priority 2

```text
Backtest table
Uniform columns
Filtering
Sorting
Column management
Details
```

## Priority 3

```text
Notes
Attachments
Activity Log
Archive
Duplicate Warning
```

## Priority 4

```text
Saved Views
Compare
Leaderboard
Yearly Results
Tags
```

## Priority 5

```text
Analytics
Imports
Automation
Advanced Research Features
```

---

# 75. Final Product Definition

Escanor Strategy Lab should become the team's permanent online research database.

The core workflow is:

```text
Research Strategy
      |
      v
Backtest in TradingView / Freqtrade / Python
      |
      v
Review Result
      |
      v
Open Escanor Strategy Lab
      |
      v
Select Strategy + Version
      |
      v
Add Backtest
      |
      v
Enter Standard Results
      |
      v
Add Technical Details
      |
      v
Add Research Notes / Attachments
      |
      v
Save
      |
      v
Entire Team Can Immediately View the Result
```

The application should optimize for:

```text
Consistency
Traceability
Collaboration
Comparison
Research Quality
Ease of Use
Long-Term Data Integrity
```

The first version should remain focused on manually storing and reviewing research.

Do not overcomplicate the MVP with automated backtesting, trading execution, or unnecessary infrastructure.
