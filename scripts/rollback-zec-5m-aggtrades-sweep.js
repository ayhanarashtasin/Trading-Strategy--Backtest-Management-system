/**
 * Remove everything the ZEC 5m AggTrades sweep import inserted, and nothing else.
 * Ids are deterministic UUID5 recorded in the payload files, so the removal is exact
 * and cannot touch the 64 older ZECUSDT tick-replay backtests already in the lab.
 *
 *   node scripts/rollback-zec-5m-aggtrades-sweep.js --confirm
 */
require("./load-env");
const fs = require("fs"), path = require("path"), readline = require("readline");
const { Client } = require("pg");
const DIR = "E:/EC/Binance-AggTrades/Test-08-17-Sept/opt/lab_payload";
const MARKER = "<!-- escanor:zec5m-aggtrades-sweep-2026-09-17 -->";
const PREFIX = "backtest/zecusdt_5m_aggtrades_sweep";

async function ids(file) {
  const out = [];
  for await (const l of readline.createInterface({
    input: fs.createReadStream(path.join(DIR, file), { encoding: "utf8" }), crlfDelay: Infinity }))
    if (l.trim()) out.push(JSON.parse(l).id);
  return out;
}

(async () => {
  if (!process.argv.includes("--confirm")) { console.log("refusing to delete without --confirm"); process.exit(1); }
  const c = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, statement_timeout: 0, query_timeout: 0 });
  await c.connect();
  await c.query("BEGIN");
  try {
    const s = await ids("strategies.jsonl");
    const v = await ids("strategy_versions.jsonl");
    const b = await ids("backtests.jsonl");
    for (const [sql, p, label] of [
      [`DELETE FROM public.backtest_monthly_results WHERE backtest_id=ANY($1::uuid[])`, [b], "monthly"],
      [`DELETE FROM public.backtest_yearly_results  WHERE backtest_id=ANY($1::uuid[])`, [b], "yearly"],
      [`DELETE FROM public.attachments WHERE storage_path LIKE $1`, [`${PREFIX}/%`], "attachments"],
      [`DELETE FROM public.research_notes WHERE content LIKE $1`, [`${MARKER}%`], "notes"],
      [`DELETE FROM public.backtests WHERE id=ANY($1::uuid[])`, [b], "backtests"],
      [`DELETE FROM public.strategy_tags WHERE strategy_id=ANY($1::uuid[])`, [s], "strategy_tags"],
      [`DELETE FROM public.strategy_versions WHERE id=ANY($1::uuid[])`, [v], "versions"],
      [`DELETE FROM public.strategies WHERE id=ANY($1::uuid[])`, [s], "strategies"],
    ]) {
      const r = await c.query(sql, p);
      console.log(`  deleted ${String(r.rowCount).padStart(7)}  ${label}`);
    }
    await c.query("COMMIT");
    const { rows } = await c.query(`SELECT pg_size_pretty(pg_database_size(current_database())) d`);
    console.log("rolled back. database size now:", rows[0].d);
  } catch (e) { await c.query("ROLLBACK"); throw e; }
  finally { await c.end(); }
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
