/**
 * Import a TRAILING-WINDOW backtest of every optimised ZECUSDT 5m configuration.
 *
 *   node scripts/import-zec-window.js --tag 3m
 *   node scripts/import-zec-window.js --tag 6m
 *   40,002 backtests   attached to the EXISTING strategy_versions (same rules, same
 *                      parameters, different window) - no new strategies or versions
 *  280,014 monthly     month-by-month breakdown for every one of them
 *   source     AggTrades
 *   test_type  Robustness  (the search optimised over the full year, so this window
 *                           is a sub-period of the optimisation sample, not OOS)
 *
 * Yearly rows are deliberately NOT loaded (handled separately later).
 * Ids are deterministic UUID5, so re-running updates in place.
 *
 *   --dry validates without writing
 */
require("./load-env");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { Client } = require("pg");

const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const TAG = arg("--tag") || "6m";
const DIR = `E:/EC/Binance-AggTrades/Test-08-17-Sept/opt/lab_payload_${TAG}`;
const DRY = process.argv.includes("--dry");
const GENERATED = new Set(["duration_days"]);
const TABLES = [
  { name: "backtests", batch: 200, fk: "strategy_version_id", fkTable: "strategy_versions" },
  { name: "backtest_monthly_results", batch: 1000, fk: "backtest_id", fkTable: "backtests" },
];

function buildInsert(table, rows) {
  const cols = Object.keys(rows[0]);
  const vals = [];
  const tuples = rows.map((r) => {
    const ph = cols.map((c) => `$${vals.push(r[c] === undefined ? null : r[c])}`);
    return `(${ph.join(",")})`;
  });
  const set = cols.filter((c) => c !== "id").map((c) => `${c}=EXCLUDED.${c}`).join(",");
  return [`INSERT INTO public.${table} (${cols.join(",")}) VALUES ${tuples.join(",")}
           ON CONFLICT (id) DO UPDATE SET ${set}`, vals];
}

const lines = (f) => readline.createInterface({
  input: fs.createReadStream(f, { encoding: "utf8" }), crlfDelay: Infinity });

(async () => {
  const meta = JSON.parse(fs.readFileSync(path.join(DIR, "_meta.json"), "utf8"));
  console.log("payload:", JSON.stringify(meta.counts));
  console.log(`window: ${meta.window.join(" -> ")}   test_type=${meta.test_type}  source=${meta.source}`);
  console.log("yearly rows: SKIPPED by request\n");

  const c = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, statement_timeout: 0, query_timeout: 0 });
  await c.connect();

  const before = await c.query(
    `SELECT (SELECT count(*)::int FROM public.backtests) b,
            (SELECT count(*)::int FROM public.backtest_monthly_results) m,
            pg_size_pretty(pg_database_size(current_database())) size`);
  console.log("before:", JSON.stringify(before.rows[0]));

  /* enum validation against the live CHECK constraints */
  const seen = { source: new Set(), test_type: new Set(), direction: new Set() };
  for await (const l of lines(path.join(DIR, "backtests.jsonl"))) {
    if (!l.trim()) continue;
    const b = JSON.parse(l);
    seen.source.add(b.source); seen.test_type.add(b.test_type); seen.direction.add(b.direction);
  }
  for (const [col, used] of Object.entries(seen)) {
    const { rows } = await c.query(
      `SELECT pg_get_constraintdef(oid) d FROM pg_constraint
        WHERE conrelid='public.backtests'::regclass AND contype='c'
          AND pg_get_constraintdef(oid) LIKE $1`, [`%(${col} =%`]);
    if (!rows.length) continue;
    const okv = [...rows[0].d.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    const badv = [...used].filter((v) => v != null && !okv.includes(v));
    if (badv.length) throw new Error(`backtests.${col} rejects: ${badv.join(", ")}`);
    console.log(`  backtests.${col} OK -> ${[...used].join(", ")}`);
  }

  const counts = {};
  for (const spec of TABLES) {
    const file = path.join(DIR, `${spec.name}.jsonl`);
    /* every FK target must already exist, else the whole batch aborts */
    const { rows: pr } = await c.query(`SELECT id FROM public.${spec.fkTable}`);
    const parents = new Set(pr.map((r) => r.id));
    let buf = [], n = 0, skipped = 0;
    const t0 = Date.now();

    if (DRY) {
      for await (const l of lines(file)) {
        if (!l.trim()) continue;
        parents.has(JSON.parse(l)[spec.fk]) ? n++ : skipped++;
      }
      console.log(`  ${spec.name}: would write ${n}, skip ${skipped} (missing ${spec.fk})`);
      counts[spec.name] = n;
      continue;
    }

    await c.query("BEGIN");
    try {
      for await (const l of lines(file)) {
        if (!l.trim()) continue;
        const row = JSON.parse(l);
        if (!parents.has(row[spec.fk])) { skipped++; continue; }
        for (const g of GENERATED) delete row[g];
        buf.push(row);
        if (buf.length >= spec.batch) {
          await c.query(...buildInsert(spec.name, buf));
          n += buf.length; buf = [];
          if (n % 20000 === 0) console.log(`    ${spec.name}: ${n}`);
        }
        /* the monthly parents include rows we are inserting in this same run, so
           refresh the set once the backtests table is done */
      }
      if (buf.length) { await c.query(...buildInsert(spec.name, buf)); n += buf.length; }
      await c.query("COMMIT");
    } catch (e) { await c.query("ROLLBACK"); throw new Error(`${spec.name}: ${e.message}`); }
    console.log(`  ${spec.name.padEnd(26)} ${String(n).padStart(7)} written, ${skipped} skipped  ` +
                `${((Date.now() - t0) / 1000).toFixed(1)}s`);
    counts[spec.name] = n;
    const sz = await c.query(`SELECT pg_size_pretty(pg_database_size(current_database())) d`);
    console.log(`    database size now: ${sz.rows[0].d}`);
  }

  const after = await c.query(
    `SELECT (SELECT count(*)::int FROM public.backtests) b,
            (SELECT count(*)::int FROM public.backtest_monthly_results) m,
            pg_size_pretty(pg_database_size(current_database())) size`);
  console.log("\nafter: ", JSON.stringify(after.rows[0]));
  console.log("committed:", JSON.stringify(counts));
  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
