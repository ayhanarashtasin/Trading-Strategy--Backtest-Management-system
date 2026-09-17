/**
 * Verify the ZECUSDT 5m AggTrades sweep, with month-wise coverage as the focus.
 *
 *   node scripts/verify-zec-5m-aggtrades-sweep.js
 */
require("./load-env");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { Client } = require("pg");

const DIR = "E:/EC/Binance-AggTrades/Test-08-17-Sept/opt/lab_payload";
const CSV = "E:/EC/Binance-AggTrades/Test-08-17-Sept/monthly_performance.csv";
/* Scope strictly to the ids THIS import created. The lab already holds 64 older
   ZECUSDT 5m AggTrades backtests (an Aug-2025 tick-replay run) whose own monthly
   rows would otherwise be counted as discrepancies. */
const SEL = `id = ANY($ids)`;

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`  PASS  ${m}`); };
const bad = (m) => { fail++; console.log(`  FAIL  ${m}`); };
const check = (c, m) => (c ? ok(m) : bad(m));

async function countLines(file) {
  let n = 0;
  for await (const l of readline.createInterface({
    input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity })) if (l.trim()) n++;
  return n;
}

(async () => {
  const c = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, statement_timeout: 0, query_timeout: 0 });
  await c.connect();

  const IDS = [];
  for await (const l of readline.createInterface({
    input: fs.createReadStream(path.join(DIR, "backtests.jsonl"), { encoding: "utf8" }),
    crlfDelay: Infinity })) if (l.trim()) IDS.push(JSON.parse(l).id);
  console.log(`scope: ${IDS.length} backtest ids from this import
`);
  const Q = (sql, extra = []) => c.query(sql.replace(/\$ids/g, "$1"), [IDS, ...extra]);

  console.log("=".repeat(76));
  console.log("1. MONTH-WISE COVERAGE - every imported backtest must have a breakdown");
  console.log("=".repeat(76));
  const { rows: cov } = await Q(
    `SELECT count(*)::int backtests,
            count(*) FILTER (WHERE m.n > 0)::int with_monthly,
            count(*) FILTER (WHERE m.n = 0 OR m.n IS NULL)::int without_monthly,
            count(*) FILTER (WHERE y.n > 0)::int with_yearly,
            min(m.n) min_months, max(m.n) max_months, round(avg(m.n),2) avg_months
       FROM public.backtests b
       LEFT JOIN LATERAL (SELECT count(*)::int n FROM public.backtest_monthly_results r
                           WHERE r.backtest_id=b.id) m ON true
       LEFT JOIN LATERAL (SELECT count(*)::int n FROM public.backtest_yearly_results r
                           WHERE r.backtest_id=b.id) y ON true
      WHERE ${SEL}`);
  console.table(cov);
  check(cov[0].without_monthly === 0,
    `${cov[0].with_monthly}/${cov[0].backtests} backtests have monthly rows (${cov[0].without_monthly} missing)`);
  check(cov[0].with_yearly === cov[0].backtests,
    `${cov[0].with_yearly}/${cov[0].backtests} backtests have yearly rows`);

  const { rows: tot } = await Q(
    `SELECT (SELECT count(*)::int FROM public.backtest_monthly_results m
              JOIN public.backtests b ON b.id=m.backtest_id WHERE b.${SEL}) m,
            (SELECT count(*)::int FROM public.backtest_yearly_results y
              JOIN public.backtests b ON b.id=y.backtest_id WHERE b.${SEL}) y`);
  const pm = await countLines(path.join(DIR, "backtest_monthly_results.jsonl"));
  const py = await countLines(path.join(DIR, "backtest_yearly_results.jsonl"));
  check(tot[0].m === pm, `monthly rows in db for this import: ${tot[0].m} == payload ${pm}`);
  check(tot[0].y === py, `yearly  rows in db for this import: ${tot[0].y} == payload ${py}`);

  console.log("\n" + "=".repeat(76));
  console.log("2. RECONCILIATION - monthly and yearly must sum to the parent backtest");
  console.log("=".repeat(76));
  const { rows: rc } = await Q(
    `WITH s AS (
       SELECT b.id, b.total_trades, b.winning_trades, b.net_profit_amount,
              sum(m.trades)::int mt, sum(m.winning_trades)::int mw,
              round(sum(m.net_profit_amount),2) mn
         FROM public.backtests b JOIN public.backtest_monthly_results m ON m.backtest_id=b.id
        WHERE b.${SEL} GROUP BY b.id, b.total_trades, b.winning_trades, b.net_profit_amount)
     SELECT count(*)::int n,
            count(*) FILTER (WHERE mt <> total_trades)::int bad_trades,
            count(*) FILTER (WHERE mw <> winning_trades)::int bad_wins,
            count(*) FILTER (WHERE abs(mn - net_profit_amount) > 0.05)::int bad_net,
            round(max(abs(mn - net_profit_amount)),4) worst_net_diff
       FROM s`);
  console.table(rc);
  check(rc[0].bad_trades === 0, `trade counts reconcile on all ${rc[0].n} backtests (${rc[0].bad_trades} off)`);
  check(rc[0].bad_wins === 0, `winning-trade counts reconcile (${rc[0].bad_wins} off)`);
  check(rc[0].bad_net === 0, `net P&L reconciles within $0.05 (${rc[0].bad_net} off, worst ${rc[0].worst_net_diff})`);

  const { rows: ry } = await Q(
    `WITH s AS (
       SELECT b.id, b.total_trades, sum(y.trades)::int yt
         FROM public.backtests b JOIN public.backtest_yearly_results y ON y.backtest_id=b.id
        WHERE b.${SEL} GROUP BY b.id, b.total_trades)
     SELECT count(*)::int n, count(*) FILTER (WHERE yt <> total_trades)::int bad FROM s`);
  check(ry[0].bad === 0, `yearly trade counts reconcile on all ${ry[0].n} backtests (${ry[0].bad} off)`);

  console.log("\n" + "=".repeat(76));
  console.log("3. SHAPE - months land inside the evaluation window, no duplicates, no orphans");
  console.log("=".repeat(76));
  const { rows: rng } = await Q(
    `SELECT min(m.year*100+m.month) lo, max(m.year*100+m.month) hi,
            count(*) FILTER (WHERE m.month < 1 OR m.month > 12)::int bad_month,
            count(*) FILTER (WHERE m.trades <= 0)::int empty_months
       FROM public.backtest_monthly_results m JOIN public.backtests b ON b.id=m.backtest_id
      WHERE b.${SEL}`);
  check(rng[0].lo === 202509 && rng[0].hi === 202609 && rng[0].bad_month === 0,
    `months span 2025-09..2026-09 only (lo=${rng[0].lo} hi=${rng[0].hi}, ${rng[0].bad_month} invalid)`);
  check(rng[0].empty_months === 0, `no zero-trade month rows: ${rng[0].empty_months}`);

  const { rows: dup } = await Q(
    `SELECT count(*)::int n FROM (
       SELECT m.backtest_id, m.year, m.month FROM public.backtest_monthly_results m
        JOIN public.backtests b ON b.id=m.backtest_id WHERE b.${SEL}
        GROUP BY 1,2,3 HAVING count(*) > 1) d`);
  check(dup[0].n === 0, `no duplicate (backtest, year, month) rows: ${dup[0].n}`);

  const { rows: orph } = await c.query(
    `SELECT count(*)::int n FROM public.backtest_monthly_results m
      WHERE NOT EXISTS (SELECT 1 FROM public.backtests b WHERE b.id=m.backtest_id)`);
  check(orph[0].n === 0, `no orphaned monthly rows anywhere in the table: ${orph[0].n}`);

  console.log("\n" + "=".repeat(76));
  console.log("4. FINAL SELECTED - monthly rows vs the delivered monthly_performance.csv");
  console.log("=".repeat(76));
  const { rows: fin } = await c.query(
    `SELECT b.test_type, b.total_trades,
            (SELECT count(*)::int FROM public.backtest_monthly_results m WHERE m.backtest_id=b.id) months,
            (SELECT count(*)::int FROM public.backtest_yearly_results y WHERE y.backtest_id=b.id) years
       FROM public.backtests b JOIN public.strategy_versions v ON v.id=b.strategy_version_id
       JOIN public.strategies s ON s.id=v.strategy_id
      WHERE s.name LIKE '%FINAL SELECTED%' ORDER BY s.name, b.test_type`);
  console.table(fin);
  check(fin.every((r) => r.months > 0 && r.years > 0),
    `all ${fin.length} FINAL SELECTED backtests (incl. Walk Forward) have breakdowns`);

  const csv = fs.readFileSync(CSV, "utf8").trim().split("\n");
  const head = csv[0].split(",");
  const iM = head.indexOf("month"), iT = head.indexOf("trades"),
        iN = head.indexOf("net_usd"), iP = head.indexOf("profit_factor");
  const expect = csv.slice(1).map((l) => l.split(","))
    .map((f) => ({ ym: f[iM], trades: +f[iT], net: +f[iN], pf: +f[iP] }));
  const { rows: got } = await c.query(
    `SELECT m.year, m.month, m.trades, m.net_profit_amount::float net, m.profit_factor::float pf
       FROM public.backtest_monthly_results m JOIN public.backtests b ON b.id=m.backtest_id
      WHERE b.backtest_name LIKE 'ZEC 5m FINAL SELECTED (research best) - full period%'
      ORDER BY m.year, m.month`);
  let diffs = 0;
  for (const e of expect) {
    const g = got.find((r) => `${r.year}-${String(r.month).padStart(2, "0")}` === e.ym);
    if (!g) { diffs++; console.log(`        missing ${e.ym}`); continue; }
    if (g.trades !== e.trades || Math.abs(g.net - e.net) > 0.01 || Math.abs(g.pf - e.pf) > 1e-3) {
      diffs++;
      console.log(`        ${e.ym}: db trades=${g.trades} net=${g.net} pf=${g.pf} | csv trades=${e.trades} net=${e.net} pf=${e.pf}`);
    }
  }
  check(diffs === 0 && got.length === expect.length,
    `all ${expect.length} months match monthly_performance.csv exactly (trades, net, PF)`);

  console.log("\n" + "=".repeat(76));
  const { rows: sz } = await c.query(
    `SELECT (SELECT count(*)::int FROM public.backtest_monthly_results) m,
            (SELECT count(*)::int FROM public.backtest_yearly_results) y,
            pg_size_pretty(pg_database_size(current_database())) size`);
  console.log("database totals:", JSON.stringify(sz[0]));
  console.log(`\nVERIFICATION: ${pass} passed, ${fail} failed`);
  await c.end();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("VERIFY ERROR:", e.message); process.exit(1); });
