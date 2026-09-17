/**
 * Import the ZECUSDT 5m LONG-ONLY AggTrades optimisation sweep into the lab.
 *
 *     297 strategies   - distinct rule structures (entry trigger set x filter set)
 *                        + 2 curated FINAL SELECTED records
 *  40,002 versions     - one per parameter configuration
 *  40,006 backtests    - the measured result for each, plus Out of Sample /
 *                        Walk Forward rows for the two final picks
 * 513,249 monthly      - month-by-month breakdown for EVERY backtest
 *  80,008 yearly
 *
 * Source data: 396,201,272 Binance USD-M futures aggTrades, 5m candles reconstructed
 * locally. Every backtest row is net of 0.05% per-side fees. source = 'AggTrades'.
 *
 * Ids are deterministic UUID5, so re-running updates in place instead of duplicating.
 * Each table is written in its own transaction, in FK order, so a dropped connection
 * mid-import is fixed by simply running it again.
 *
 *   node scripts/import-zec-5m-aggtrades-sweep.js [--dry] [--limit N]
 *   node scripts/import-zec-5m-aggtrades-sweep.js --only backtest_monthly_results
 */
require("./load-env");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const PAYLOAD_DIR = "E:/EC/Binance-AggTrades/Test-08-17-Sept/opt/lab_payload";
const SRC_DIR = "E:/EC/Binance-AggTrades/Test-08-17-Sept";
const STORAGE_PREFIX = "backtest/zecusdt_5m_aggtrades_sweep";
const MARKER = "<!-- escanor:zec5m-aggtrades-sweep-2026-09-17 -->";
const ATTACHMENTS = [
  ["FINAL_REPORT.md", "text/markdown"],
  ["best_strategy.json", "application/json"],
  ["ZECUSDT_5m_LongOnly.pine", "text/plain"],
  ["best_strategy_trades.csv", "text/csv"],
  ["monthly_performance.csv", "text/csv"],
  ["optimization_summary.json", "application/json"],
  ["top_strategies.json", "application/json"],
];
const GENERATED = new Set(["duration_days"]);            /* generated column */
const JSON_COLS = new Set(["parameters_json"]);

const DRY = process.argv.includes("--dry");
const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const LIMIT = arg("--limit") ? parseInt(arg("--limit"), 10) : Infinity;
const ONLY = arg("--only") ? new Set(arg("--only").split(",").map((s) => s.trim())) : null;

/* Postgres caps a statement at 65535 bound parameters; batches stay well under. */
const TABLES = [
  { name: "strategies", batch: 200 },
  { name: "strategy_versions", batch: 300 },
  { name: "backtests", batch: 200 },
  { name: "backtest_monthly_results", batch: 1000 },
  { name: "backtest_yearly_results", batch: 1000 },
];

async function* readJsonl(file, limit = Infinity) {
  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (n++ >= limit) break;
    yield JSON.parse(line);
  }
  rl.close();
}

function buildInsert(table, rows) {
  const cols = Object.keys(rows[0]);
  const vals = [];
  const tuples = rows.map((r) => {
    const ph = cols.map((c) => {
      const raw = r[c];
      const v = JSON_COLS.has(c) && raw !== null && typeof raw === "object"
        ? JSON.stringify(raw) : raw === undefined ? null : raw;
      return `$${vals.push(v)}`;
    });
    return `(${ph.join(",")})`;
  });
  const set = cols.filter((c) => c !== "id").map((c) => `${c}=EXCLUDED.${c}`).join(",");
  return [
    `INSERT INTO public.${table} (${cols.join(",")}) VALUES ${tuples.join(",")}
     ON CONFLICT (id) DO UPDATE SET ${set}`,
    vals,
  ];
}

async function loadTable(c, spec, tagState) {
  const file = path.join(PAYLOAD_DIR, `${spec.name}.jsonl`);
  if (!fs.existsSync(file)) throw new Error(`missing payload file ${file}`);
  let buf = [], n = 0;
  const t0 = Date.now();
  await c.query("BEGIN");
  try {
    for await (const raw of readJsonl(file, LIMIT)) {
      const row = { ...raw };
      if (spec.name === "strategies") { tagState.push([row.id, row.tags || []]); delete row.tags; }
      for (const g of GENERATED) delete row[g];
      buf.push(row);
      if (buf.length >= spec.batch) {
        await c.query(...buildInsert(spec.name, buf));
        n += buf.length; buf = [];
        if (n % 50000 === 0) console.log(`    ${spec.name}: ${n}`);
      }
    }
    if (buf.length) { await c.query(...buildInsert(spec.name, buf)); n += buf.length; }
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw new Error(`${spec.name}: ${e.message}`); }
  console.log(`  ${spec.name.padEnd(26)} ${String(n).padStart(7)} rows  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return n;
}

async function uploadAttachments() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } });
  const out = [];
  for (const [name, mime] of ATTACHMENTS) {
    const p = path.join(SRC_DIR, name);
    if (!fs.existsSync(p)) { console.log(`    skip (missing) ${name}`); continue; }
    const body = fs.readFileSync(p);
    const storagePath = `${STORAGE_PREFIX}/${name}`;
    const { error } = await sb.storage.from("attachments")
      .upload(storagePath, body, { contentType: mime, upsert: true });
    if (error) throw new Error(`storage ${name}: ${error.message}`);
    out.push({ file_name: name, storage_path: storagePath, mime_type: mime, file_size: body.length });
    console.log(`    uploaded ${name} (${body.length.toLocaleString()} bytes)`);
  }
  return out;
}

(async () => {
  const meta = JSON.parse(fs.readFileSync(path.join(PAYLOAD_DIR, "_meta.json"), "utf8"));
  console.log("payload:", JSON.stringify(meta.counts));
  console.log("namespace:", meta.namespace, "| author:", meta.author);

  const c = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, statement_timeout: 0, query_timeout: 0 });
  await c.connect();

  /* Validate enum-constrained values against the live CHECK constraints first. */
  const allowed = async (table, column) => {
    const { rows } = await c.query(
      `SELECT pg_get_constraintdef(oid) d FROM pg_constraint
        WHERE conrelid=$1::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE $2`,
      [`public.${table}`, `%(${column} =%`]);
    return rows.length ? [...rows[0].d.matchAll(/'([^']+)'/g)].map((m) => m[1]) : null;
  };
  const seen = { source: new Set(), test_type: new Set(), direction: new Set(), status: new Set() };
  for await (const b of readJsonl(path.join(PAYLOAD_DIR, "backtests.jsonl"))) {
    seen.source.add(b.source); seen.test_type.add(b.test_type); seen.direction.add(b.direction);
  }
  for await (const s of readJsonl(path.join(PAYLOAD_DIR, "strategies.jsonl"))) seen.status.add(s.status);
  for (const [tbl, col, used] of [
    ["backtests", "source", seen.source], ["backtests", "test_type", seen.test_type],
    ["backtests", "direction", seen.direction], ["strategies", "status", seen.status]]) {
    const okv = await allowed(tbl, col);
    if (!okv) continue;
    const badv = [...used].filter((v) => v != null && !okv.includes(v));
    if (badv.length) throw new Error(`${tbl}.${col} rejects: ${badv.join(", ")}`);
    console.log(`  ${tbl}.${col} OK -> ${[...used].join(", ")}`);
  }

  if (DRY) { await c.end(); console.log("--dry: nothing written"); return; }

  const attach = ONLY ? [] : (console.log("\nuploading attachments..."), await uploadAttachments());

  console.log("\nloading tables (FK order, one transaction each)...");
  const tagState = [];
  const counts = {};
  for (const spec of TABLES) {
    if (ONLY && !ONLY.has(spec.name)) continue;
    counts[spec.name] = await loadTable(c, spec, tagState);
  }

  if (!ONLY) {
    /* tags + strategy_tags */
    const names = [...new Set(tagState.flatMap(([, t]) => t))];
    await c.query("BEGIN");
    try {
      const idOf = {};
      for (const n of names) {
        const { rows } = await c.query(
          `INSERT INTO public.tags (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [n]);
        idOf[n] = rows[0].id;
      }
      let pairs = [], nt = 0;
      const flush = async () => {
        if (!pairs.length) return;
        const vals = [];
        const tup = pairs.map((p) => `($${vals.push(p[0])},$${vals.push(p[1])})`);
        await c.query(`INSERT INTO public.strategy_tags (strategy_id, tag_id) VALUES ${tup.join(",")}
                       ON CONFLICT DO NOTHING`, vals);
        nt += pairs.length; pairs = [];
      };
      for (const [sid, tags] of tagState)
        for (const t of tags) { pairs.push([sid, idOf[t]]); if (pairs.length >= 500) await flush(); }
      await flush();
      await c.query("COMMIT");
      console.log(`  tags                       ${String(names.length).padStart(7)} distinct, ${nt} links`);
      counts.strategy_tags = nt;
    } catch (e) { await c.query("ROLLBACK"); throw e; }

    /* one methodology research note per strategy */
    const note =
      `${MARKER}\n# ZECUSDT 5m Long-Only - AggTrades Optimisation Sweep (2026-09-17)\n\n` +
      `**Data.** 396,201,272 Binance USD-M futures aggTrades rebuilt into 5m OHLCV plus order-flow ` +
      `features. Integrity: 0 duplicate aggregate ids, 0 non-monotonic timestamps, 422 empty minutes ` +
      `of 679,680 carried forward flat. Cross-checked against Binance's own 5m klines over 135,936 ` +
      `bars: close matches on 100.00%, high/low on 99.96%.\n\n` +
      `**Window.** 2025-09-15 -> 2026-09-15 (105,408 bars). Indicators primed from 2025-06-01.\n\n` +
      `**Search.** 687,365 backtests across six phases, from a broad screen of 63 entry primitives ` +
      `through order-flow entries, filter stacking, a slot-aware search, exit refinement and ` +
      `indicator exits / limit fills.\n\n` +
      `**Execution.** Conditions on the CLOSED 5m bar; entry fills at the NEXT bar's open. When a bar ` +
      `contains both the stop and the target the STOP is taken (conservative); gaps fill at the open. ` +
      `No sub-5m sequencing, so intrabar_simulation is false.\n\n` +
      `**Sizing.** Up to K positions at once, each 1/K of equity - gross exposure never above 100%, ` +
      `no leverage. With ONE position at a time the best profit factor at >=1,000 trades was 1.29; ` +
      `concurrency decouples trade count from holding time.\n\n` +
      `**Costs.** 0.05% per side on every trade; every figure stored here is net. Funding not modelled.\n\n` +
      `**Look-ahead.** Every primitive recomputed on data prefixes and compared at bar t-1: 104/104 clean.\n\n` +
      `**Caveat.** One instrument over one exceptional year - ZEC went $50.56 -> $1,110 (21.9x).`;

    const { rows: sids } = await c.query(
      `SELECT id FROM public.strategies WHERE name LIKE 'ZEC 5m AggTrades - %'`);
    await c.query("BEGIN");
    try {
      await c.query(`DELETE FROM public.research_notes WHERE content LIKE $1`, [`${MARKER}%`]);
      let vals = [], tup = [], nn = 0;
      const flushN = async () => {
        if (!tup.length) return;
        await c.query(`INSERT INTO public.research_notes (entity_type,entity_id,content,created_by)
                       VALUES ${tup.join(",")}`, vals);
        nn += tup.length; vals = []; tup = [];
      };
      for (const { id } of sids) {
        tup.push(`('strategy',$${vals.push(id)},$${vals.push(note)},$${vals.push(meta.author)})`);
        if (tup.length >= 100) await flushN();
      }
      await flushN();
      await c.query("COMMIT");
      console.log(`  research_notes             ${String(nn).padStart(7)} rows`);
      counts.research_notes = nn;
    } catch (e) { await c.query("ROLLBACK"); throw e; }

    /* attachments on the FINAL SELECTED full-period backtest */
    const { rows: anchor } = await c.query(
      `SELECT id FROM public.backtests
        WHERE backtest_name LIKE 'ZEC 5m FINAL SELECTED (research best) - full period%' LIMIT 1`);
    if (anchor.length && attach.length) {
      await c.query("BEGIN");
      try {
        for (const a of attach) {
          await c.query(`DELETE FROM public.attachments WHERE storage_path=$1`, [a.storage_path]);
          await c.query(
            `INSERT INTO public.attachments (entity_type,entity_id,file_name,storage_path,mime_type,file_size,uploaded_by)
             VALUES ('backtest',$1,$2,$3,$4,$5,$6)`,
            [anchor[0].id, a.file_name, a.storage_path, a.mime_type, a.file_size, meta.author]);
        }
        await c.query("COMMIT");
        console.log(`  attachments                ${String(attach.length).padStart(7)} rows -> backtest ${anchor[0].id}`);
        counts.attachments = attach.length;
      } catch (e) { await c.query("ROLLBACK"); throw e; }
    }
  }

  const { rows: sz } = await c.query(`SELECT pg_size_pretty(pg_database_size(current_database())) d`);
  console.log(`\ncommitted: ${JSON.stringify(counts)}`);
  console.log(`database size now: ${sz[0].d}`);
  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
