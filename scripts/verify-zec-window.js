/**
 * Verify a trailing-window import.
 *
 *   node scripts/verify-zec-window.js --tag 3m
 *   node scripts/verify-zec-window.js --tag 6m
 */
require("./load-env");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { Client } = require("pg");

const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const TAG = arg("--tag") || "6m";
const DIR = `E:/EC/Binance-AggTrades/Test-08-17-Sept/opt/lab_payload_${TAG}`;
const WIN = JSON.parse(require("fs").readFileSync(`${DIR}/_meta.json`, "utf8")).window;
const DAYS = Math.round((new Date(WIN[1]) - new Date(WIN[0])) / 86400000);
const LO = Number(WIN[0].slice(0, 4)) * 100 + Number(WIN[0].slice(5, 7));
const HI = Number(WIN[1].slice(0, 4)) * 100 + Number(WIN[1].slice(5, 7));
const NMON = (Math.floor(HI / 100) - Math.floor(LO / 100)) * 12 + (HI % 100) - (LO % 100) + 1;

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`  PASS  ${m}`); };
const bad = (m) => { fail++; console.log(`  FAIL  ${m}`); };
const check = (c, m) => (c ? ok(m) : bad(m));
const lines = (f) => readline.createInterface({
  input: fs.createReadStream(f, { encoding: "utf8" }), crlfDelay: Infinity });

(async () => {
  const c = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, statement_timeout: 0, query_timeout: 0 });
  await c.connect();

  const payload = [];
  for await (const l of lines(path.join(DIR, "backtests.jsonl")))
    if (l.trim()) payload.push(JSON.parse(l));
  const IDS = payload.map((r) => r.id);
  const byId = Object.fromEntries(payload.map((r) => [r.id, r]));
  let pmonthly = 0;
  for await (const l of lines(path.join(DIR, "backtest_monthly_results.jsonl")))
    if (l.trim()) pmonthly++;
  console.log(`scope: ${IDS.length} backtest ids, ${pmonthly} monthly rows in payload\n`);
  /* A 40k-element uuid array per statement is what killed the connection; stage the
     ids once in a temp table and join against it instead. */
  await c.query(`CREATE TEMP TABLE _scope (id uuid PRIMARY KEY) ON COMMIT PRESERVE ROWS`);
  for (let i = 0; i < IDS.length; i += 2000) {
    const chunk = IDS.slice(i, i + 2000);
    await c.query(
      `INSERT INTO _scope (id) SELECT unnest($1::uuid[]) ON CONFLICT DO NOTHING`, [chunk]);
  }
  const { rows: sc } = await c.query(`SELECT count(*)::int n FROM _scope`);
  console.log(`staged ${sc[0].n} ids in _scope
`);
  const Q = (sql, extra = []) =>
    c.query(sql.replace(/= ?ANY\(\$ids\)/g, " IN (SELECT id FROM _scope)")
               .replace(/\$ids/g, "(SELECT id FROM _scope)")
               .replace(/\$2/g, "$1").replace(/\$3/g, "$2").replace(/\$4/g, "$3"), extra);

  console.log("=".repeat(76));
  console.log("1. ROWS PRESENT");
  console.log("=".repeat(76));
  const { rows: n1 } = await Q(`SELECT count(*)::int n FROM public.backtests WHERE id=ANY($ids)`);
  check(n1[0].n === IDS.length, `backtests: ${n1[0].n}/${IDS.length} present`);
  const { rows: n2 } = await Q(
    `SELECT count(*)::int n FROM public.backtest_monthly_results WHERE backtest_id=ANY($ids)`);
  check(n2[0].n === pmonthly, `monthly rows: ${n2[0].n} == payload ${pmonthly}`);
  const { rows: n3 } = await Q(
    `SELECT count(*)::int n FROM public.backtest_yearly_results WHERE backtest_id=ANY($ids)`);
  check(n3[0].n === 0, `yearly rows deliberately NOT loaded: ${n3[0].n}`);

  console.log("\n" + "=".repeat(76));
  console.log("2. SCHEMA FIELDS - source, test_type, window, sizing, fees");
  console.log("=".repeat(76));
  const { rows: f } = await Q(
    `SELECT count(*)::int total,
            count(*) FILTER (WHERE source='AggTrades')::int src,
            count(*) FILTER (WHERE test_type='Robustness')::int tt,
            count(*) FILTER (WHERE direction='Long')::int dir,
            count(*) FILTER (WHERE symbol='ZECUSDT' AND timeframe='5m')::int sym,
            count(*) FILTER (WHERE exchange='Binance' AND market_type='USD-M Futures')::int mkt,
            count(*) FILTER (WHERE start_date=$2::date AND end_date=$3::date)::int win,
            count(*) FILTER (WHERE duration_days=$4::int)::int dur,
            count(*) FILTER (WHERE fee_per_side_percent=0.05 AND fees_included)::int fee,
            count(*) FILTER (WHERE leverage=1 AND compounding=false)::int lev
       FROM public.backtests WHERE id=ANY($ids)`, [WIN[0], WIN[1], DAYS]);
  console.table(f);
  const t = f[0].total;
  check(f[0].src === t, `source='AggTrades' on all ${t}`);
  check(f[0].tt === t, `test_type='Robustness' on all ${t}`);
  check(f[0].dir === t && f[0].sym === t && f[0].mkt === t, `market/direction/timeframe correct on all ${t}`);
  check(f[0].win === t, `window ${WIN[0]}..${WIN[1]} on all ${t}`);
  check(f[0].dur === t, `generated duration_days = ${DAYS} on all ${t}`);
  check(f[0].fee === t, `0.05%/side fee recorded with fees_included on all ${t}`);
  check(f[0].lev === t, `leverage=1, compounding=false on all ${t}`);

  const { rows: nn } = await Q(
    `SELECT count(*) FILTER (WHERE total_trades IS NULL)::int a,
            count(*) FILTER (WHERE profit_factor IS NULL)::int b,
            count(*) FILTER (WHERE max_drawdown_percent IS NULL)::int cc,
            count(*) FILTER (WHERE sharpe_ratio IS NULL)::int d,
            count(*) FILTER (WHERE average_win_percent IS NULL)::int e,
            count(*) FILTER (WHERE median_trade_percent IS NULL)::int g,
            count(*) FILTER (WHERE average_trade_duration IS NULL)::int h,
            count(*) FILTER (WHERE details IS NULL OR length(details)<200)::int i
       FROM public.backtests WHERE id=ANY($ids)`);
  check(Object.values(nn[0]).every((v) => v === 0),
    `no NULLs in the core metric columns (${JSON.stringify(nn[0])})`);

  console.log("\n" + "=".repeat(76));
  console.log("3. LINKAGE - attached to the existing strategies/versions, nothing duplicated");
  console.log("=".repeat(76));
  const { rows: l1 } = await Q(
    `SELECT count(*)::int n FROM public.backtests b WHERE b.id=ANY($ids)
       AND NOT EXISTS (SELECT 1 FROM public.strategy_versions v WHERE v.id=b.strategy_version_id)`);
  check(l1[0].n === 0, `every backtest resolves to an existing strategy_version: ${l1[0].n} orphans`);
  const { rows: l2 } = await Q(
    `SELECT count(DISTINCT v.strategy_id)::int strategies, count(DISTINCT v.id)::int versions
       FROM public.backtests b JOIN public.strategy_versions v ON v.id=b.strategy_version_id
      WHERE b.id=ANY($ids)`);
  console.table(l2);
  check(l2[0].versions === IDS.length,
    `${l2[0].versions} distinct versions for ${IDS.length} backtests (1:1, no duplicates)`);
  check(l2[0].strategies === 297, `spread across all ${l2[0].strategies} existing strategies`);
  const { rows: l3 } = await c.query(
    `SELECT count(*)::int n FROM public.strategies WHERE name LIKE 'ZEC 5m AggTrades%'`);
  check(l3[0].n === 297, `strategy count unchanged at ${l3[0].n} (no new strategies created)`);
  const { rows: l4 } = await c.query(
    `SELECT count(*)::int n FROM public.backtests
      WHERE source='AggTrades' AND symbol='ZECUSDT' AND timeframe='5m'
        AND start_date=DATE '2025-09-15' AND end_date=DATE '2026-09-15'`);
  check(l4[0].n === 40002, `the 40,002 full-year rows are untouched (${l4[0].n})`);

  console.log("\n" + "=".repeat(76));
  console.log("4. MONTHLY - coverage, reconciliation, window");
  console.log("=".repeat(76));
  const { rows: mc } = await Q(
    `SELECT count(*)::int backtests,
            count(*) FILTER (WHERE m.n>0)::int with_monthly, min(m.n) lo, max(m.n) hi,
            round(avg(m.n),2) avg
       FROM public.backtests b
       LEFT JOIN LATERAL (SELECT count(*)::int n FROM public.backtest_monthly_results r
                           WHERE r.backtest_id=b.id) m ON true
      WHERE b.id=ANY($ids)`);
  console.table(mc);
  check(mc[0].with_monthly === mc[0].backtests,
    `${mc[0].with_monthly}/${mc[0].backtests} have a monthly breakdown`);
  const { rows: mr } = await Q(
    `WITH s AS (SELECT b.id, b.total_trades, b.winning_trades, b.net_profit_amount,
                       sum(m.trades)::int mt, sum(m.winning_trades)::int mw,
                       round(sum(m.net_profit_amount),2) mn
                  FROM public.backtests b JOIN public.backtest_monthly_results m ON m.backtest_id=b.id
                 WHERE b.id=ANY($ids) GROUP BY 1,2,3,4)
     SELECT count(*)::int n, count(*) FILTER (WHERE mt<>total_trades)::int bt,
            count(*) FILTER (WHERE mw<>winning_trades)::int bw,
            count(*) FILTER (WHERE abs(mn-net_profit_amount)>0.05)::int bn FROM s`);
  check(mr[0].bt === 0 && mr[0].bw === 0 && mr[0].bn === 0,
    `monthly sums reconcile to the parent on all ${mr[0].n} (trades ${mr[0].bt}, wins ${mr[0].bw}, net ${mr[0].bn} off)`);
  const { rows: mw } = await Q(
    `SELECT min(m.year*100+m.month) lo, max(m.year*100+m.month) hi,
            count(*) FILTER (WHERE m.trades<=0)::int empty
       FROM public.backtest_monthly_results m WHERE m.backtest_id=ANY($ids)`);
  check(mw[0].lo === LO && mw[0].hi === HI && mw[0].empty === 0,
    `months confined to ${WIN[0].slice(0,7)}..${WIN[1].slice(0,7)} (lo=${mw[0].lo} hi=${mw[0].hi}, ${mw[0].empty} empty)`);

  console.log("\n" + "=".repeat(76));
  console.log("5. VALUES - db vs payload, and db vs the delivered CSV");
  console.log("=".repeat(76));
  const NUM = ["profit_factor", "net_profit_percent", "net_profit_amount", "max_drawdown_percent",
    "win_rate_percent", "average_trade_percent", "payoff_ratio", "sharpe_ratio", "sortino_ratio",
    "calmar_ratio", "recovery_factor", "exposure_percent", "average_win_percent",
    "average_loss_percent", "median_trade_percent"];
  const sample = Array.from({ length: 12 }, () => payload[Math.floor(Math.random() * payload.length)]);
  let mism = 0, cmp = 0;
  for (const s of sample) {
    const { rows } = await c.query(`SELECT * FROM public.backtests WHERE id=$1`, [s.id]);
    const db = rows[0];
    for (const k of [...NUM, "total_trades", "winning_trades", "source", "test_type"]) {
      cmp++;
      const same = NUM.includes(k)
        ? Math.abs(Number(s[k]) - Number(db[k])) <= 1e-4 + 1e-9
        : String(s[k]) === String(db[k]);
      if (!same) { mism++; console.log(`        ${s.id} ${k}: payload=${s[k]} db=${db[k]}`); }
    }
  }
  check(mism === 0, `${cmp} values compared over 12 random rows vs payload, ${mism} mismatches`);

  /* the CSV has quoted fields containing commas (parameters, filters, config_json),
     so it needs a quote-aware split, not a naive one */
  const splitCsv = (line) => {
    const out = []; let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === "," && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur); return out;
  };
  /* the standalone CSV names its metric columns by window tag (m6_*, m3_*) */
  const CSVFILE = `E:/EC/Binance-AggTrades/Test-08-17-Sept/all_optimized_results_${
    { "6m": "6month", "3m": "3month", "1m": "1month" }[TAG] || TAG}.csv`;
  const P = "m" + TAG.replace(/m$/, "");
  const csv = fs.existsSync(CSVFILE)
    ? fs.readFileSync(CSVFILE, "utf8").split("\n") : ["id"];
  if (!fs.existsSync(CSVFILE)) ok(`no standalone CSV for tag ${TAG}; CSV cross-check skipped`);
  const head = splitCsv(csv[0]);
  const ix = (n) => head.indexOf(n);
  let cdiff = 0, ccmp = 0;
  for (let i = 1; i <= 8 && i < csv.length; i++) {
    if (!csv[i].trim()) continue;
    const fcols = splitCsv(csv[i]);
    const rid = fcols[ix("id")];
    const { rows } = await c.query(
      `SELECT total_trades, profit_factor::float pf, max_drawdown_percent::float dd,
              net_profit_percent::float ret FROM public.backtests
        WHERE backtest_name LIKE $2
          AND details LIKE $1 LIMIT 1`, [`%Search id ${rid},%`, `ZEC 5m AggTrades Last-${TAG.toUpperCase()}%`]);
    if (!rows.length) { cdiff++; console.log(`        csv row ${rid} not found in db`); continue; }
    const d = rows[0];
    ccmp++;
    if (d.total_trades !== +fcols[ix(P+"_trades")]
      || Math.abs(d.pf - +fcols[ix(P+"_profit_factor")]) > 1e-3
      || Math.abs(d.dd - +fcols[ix(P+"_max_dd_pct")]) > 1e-2) {
      cdiff++;
      console.log(`        ${rid}: db ${d.total_trades}/${d.pf}/${d.dd} vs csv ${fcols[ix(P+"_trades")]}/${fcols[ix(P+"_profit_factor")]}/${fcols[ix(P+"_max_dd_pct")]}`);
    }
  }
  if (ccmp) check(cdiff === 0, `${ccmp} top CSV rows located in the db with matching trades/PF/DD`);

  console.log("\n" + "=".repeat(76));
  console.log(`6. FINAL SELECTED over the ${TAG} window (${WIN[0]}..${WIN[1]})`);
  console.log("=".repeat(76));
  const { rows: fin } = await c.query(
    `SELECT s.name, b.test_type, b.start_date, b.total_trades, b.profit_factor,
            b.max_drawdown_percent, b.net_profit_percent, b.sharpe_ratio,
            (SELECT count(*)::int FROM public.backtest_monthly_results m WHERE m.backtest_id=b.id) months
       FROM public.backtests b JOIN public.strategy_versions v ON v.id=b.strategy_version_id
       JOIN public.strategies s ON s.id=v.strategy_id
      WHERE s.name LIKE '%FINAL SELECTED%' AND b.test_type='Robustness'
        AND b.start_date=$1::date ORDER BY s.name`, [WIN[0]]);
  console.table(fin.map((r) => ({
    strategy: r.name.replace("ZEC 5m AggTrades - FINAL SELECTED ", ""),
    trades: r.total_trades, PF: Number(r.profit_factor), DD: Number(r.max_drawdown_percent),
    ret: Number(r.net_profit_percent), sharpe: Number(r.sharpe_ratio), months: r.months })));
  check(fin.length === 2 && fin.every((r) => r.months === NMON),
    `both FINAL SELECTED strategies have a ${TAG} row with ${NMON} monthly buckets`);

  console.log("\n" + "=".repeat(76));
  const { rows: sz } = await c.query(
    `SELECT (SELECT count(*)::int FROM public.backtests) b,
            (SELECT count(*)::int FROM public.backtest_monthly_results) m,
            pg_size_pretty(pg_database_size(current_database())) size`);
  console.log("database totals:", JSON.stringify(sz[0]));
  console.log(`\nVERIFICATION: ${pass} passed, ${fail} failed`);
  await c.end();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("VERIFY ERROR:", e.message); process.exit(1); });
