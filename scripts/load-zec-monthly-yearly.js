/**
 * Load the month-by-month and year-by-year breakdowns for the ZECUSDT 5m AggTrades
 * sweep - every backtest, not just the leading configurations.
 *
 *   513,249 monthly rows + 80,008 yearly rows covering all 40,006 backtests.
 *
 * Self-contained on purpose: ids are deterministic UUID5 generated upstream, so this
 * upserts in place and is safe to re-run.
 *
 *   node scripts/load-zec-monthly-yearly.js [--dry]
 */
require("./load-env");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { Client } = require("pg");

const DIR = "E:/EC/Binance-AggTrades/Test-08-17-Sept/opt/lab_payload";
const DRY = process.argv.includes("--dry");
const TABLES = [
  { name: "backtest_monthly_results", batch: 1000 },
  { name: "backtest_yearly_results", batch: 1000 },
];

function buildInsert(table, rows) {
  const cols = Object.keys(rows[0]);
  const vals = [];
  const tuples = rows.map((r) => {
    const ph = cols.map((c) => `$${vals.push(r[c] === undefined ? null : r[c])}`);
    return `(${ph.join(",")})`;
  });
  const set = cols.filter((c) => c !== "id").map((c) => `${c}=EXCLUDED.${c}`).join(",");
  return [
    `INSERT INTO public.${table} (${cols.join(",")}) VALUES ${tuples.join(",")}
     ON CONFLICT (id) DO UPDATE SET ${set}`,
    vals,
  ];
}

(async () => {
  const c = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, statement_timeout: 0, query_timeout: 0,
  });
  await c.connect();

  const before = await c.query(
    `SELECT (SELECT count(*)::int FROM public.backtest_monthly_results) m,
            (SELECT count(*)::int FROM public.backtest_yearly_results) y,
            pg_size_pretty(pg_database_size(current_database())) size`);
  console.log("before:", JSON.stringify(before.rows[0]));

  for (const spec of TABLES) {
    const file = path.join(DIR, `${spec.name}.jsonl`);
    if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
    const t0 = Date.now();
    let buf = [], n = 0, skipped = 0;

    /* Only rows whose parent backtest exists can be written; anything else would
       violate the FK. Load the valid parent ids once and filter as we stream. */
    const { rows: pr } = await c.query(
      `SELECT id FROM public.backtests WHERE source='AggTrades' AND symbol='ZECUSDT' AND timeframe='5m'`);
    const parents = new Set(pr.map((r) => r.id));
    console.log(`  ${spec.name}: ${parents.size} candidate parent backtests`);

    if (DRY) {
      for await (const line of readline.createInterface({
        input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity })) {
        if (!line.trim()) continue;
        const r = JSON.parse(line);
        parents.has(r.backtest_id) ? n++ : skipped++;
      }
      console.log(`  ${spec.name}: would write ${n}, skip ${skipped} (no parent)`);
      continue;
    }

    await c.query("BEGIN");
    try {
      for await (const line of readline.createInterface({
        input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity })) {
        if (!line.trim()) continue;
        const r = JSON.parse(line);
        if (!parents.has(r.backtest_id)) { skipped++; continue; }
        buf.push(r);
        if (buf.length >= spec.batch) {
          await c.query(...buildInsert(spec.name, buf));
          n += buf.length; buf = [];
          if (n % 50000 === 0) process.stdout.write(`    ${spec.name}: ${n}\n`);
        }
      }
      if (buf.length) { await c.query(...buildInsert(spec.name, buf)); n += buf.length; }
      await c.query("COMMIT");
    } catch (e) { await c.query("ROLLBACK"); throw new Error(`${spec.name}: ${e.message}`); }
    console.log(`  ${spec.name.padEnd(26)} ${String(n).padStart(7)} rows written, ` +
                `${skipped} skipped (no parent)  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  const after = await c.query(
    `SELECT (SELECT count(*)::int FROM public.backtest_monthly_results) m,
            (SELECT count(*)::int FROM public.backtest_yearly_results) y,
            pg_size_pretty(pg_database_size(current_database())) size`);
  console.log("after: ", JSON.stringify(after.rows[0]));
  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
