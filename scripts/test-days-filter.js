const assert = require("assert");

// Test implementation of getBacktestDurationDays identical to src/lib/utils.ts
function getBacktestDurationDays(row) {
  if (row.duration_days != null && !isNaN(Number(row.duration_days))) {
    return Number(row.duration_days);
  }
  if (row.start_date && row.end_date) {
    const start = new Date(row.start_date).getTime();
    const end = new Date(row.end_date).getTime();
    if (!isNaN(start) && !isNaN(end)) {
      const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
      return isNaN(diff) ? null : Math.max(0, diff);
    }
  }
  return null;
}

console.log("Running days filter verification tests...");

// Test 1: Explicit duration_days
assert.strictEqual(getBacktestDurationDays({ duration_days: 200 }), 200);
assert.strictEqual(getBacktestDurationDays({ duration_days: "250" }), 250);
assert.strictEqual(getBacktestDurationDays({ duration_days: 0 }), 0);

// Test 2: Calculated from start_date and end_date
const testRowDates = {
  start_date: "2024-01-01T00:00:00Z",
  end_date: "2024-07-19T00:00:00Z", // exactly 200 days
};
assert.strictEqual(getBacktestDurationDays(testRowDates), 200);

// Test 3: Null and invalid edge cases
assert.strictEqual(getBacktestDurationDays({}), null);
assert.strictEqual(getBacktestDurationDays({ duration_days: null, start_date: null, end_date: null }), null);
assert.strictEqual(getBacktestDurationDays({ start_date: "invalid-date", end_date: "2024-01-01" }), null);

// Test 4: Leaderboard filtering logic with minDays
const sampleLeaderboard = [
  { id: "bt-1", backtest_name: "Test 100d", duration_days: 100 },
  { id: "bt-2", backtest_name: "Test 200d", duration_days: 200 },
  { id: "bt-3", backtest_name: "Test 300d", duration_days: 300 },
  { id: "bt-4", backtest_name: "Test Date-Calculated 250d", start_date: "2024-01-01", end_date: "2024-09-07" },
  { id: "bt-5", backtest_name: "No duration", duration_days: null, start_date: null, end_date: null },
];

function filterLeaderboard(rows, minDays) {
  return rows.filter((b) => {
    if (minDays.trim() !== "") {
      const daysThreshold = Number(minDays);
      if (!isNaN(daysThreshold)) {
        const duration = getBacktestDurationDays(b);
        if (duration === null || duration < daysThreshold) {
          return false;
        }
      }
    }
    return true;
  });
}

// When minDays is "200", only >= 200 days should be returned
const filtered200 = filterLeaderboard(sampleLeaderboard, "200");
assert.strictEqual(filtered200.length, 3);
assert.deepStrictEqual(filtered200.map((b) => b.id), ["bt-2", "bt-3", "bt-4"]);

// When minDays is empty "", all rows pass
const unfiltered = filterLeaderboard(sampleLeaderboard, "");
assert.strictEqual(unfiltered.length, 5);

// Test 5: FilterPanel / Backtests / Starred operator filtering logic
function filterByDays(rows, daysVal, daysOp = ">=") {
  return rows.filter((b) => {
    if (daysVal.trim() !== "") {
      const val = Number(daysVal);
      if (!isNaN(val)) {
        const duration = getBacktestDurationDays(b);
        if (duration === null) return false;
        if (daysOp === ">=" && !(duration >= val)) return false;
        if (daysOp === "<=" && !(duration <= val)) return false;
        if (daysOp === "=" && !(duration === val)) return false;
        if (daysOp === ">" && !(duration > val)) return false;
        if (daysOp === "<" && !(duration < val)) return false;
      }
    }
    return true;
  });
}

const gte200 = filterByDays(sampleLeaderboard, "200", ">=");
assert.strictEqual(gte200.length, 3);

const gt200 = filterByDays(sampleLeaderboard, "200", ">");
assert.strictEqual(gt200.length, 2); // 300d and 250d

const lte200 = filterByDays(sampleLeaderboard, "200", "<=");
assert.strictEqual(lte200.length, 2); // 100d and 200d

const eq200 = filterByDays(sampleLeaderboard, "200", "=");
assert.strictEqual(eq200.length, 1);
assert.strictEqual(eq200[0].id, "bt-2");

// Test 6: Dual Min & Max Days (Range filtering)
function filterMinMaxDays(rows, minDays = "", maxDays = "") {
  return rows.filter((b) => {
    if (minDays && minDays.trim() !== "") {
      const minThreshold = Number(minDays);
      if (!isNaN(minThreshold)) {
        const duration = getBacktestDurationDays(b);
        if (duration === null || duration < minThreshold) return false;
      }
    }
    if (maxDays && maxDays.trim() !== "") {
      const maxThreshold = Number(maxDays);
      if (!isNaN(maxThreshold)) {
        const duration = getBacktestDurationDays(b);
        if (duration === null || duration > maxThreshold) return false;
      }
    }
    return true;
  });
}

// Only maxDays: <= 200 days
const lteMax200 = filterMinMaxDays(sampleLeaderboard, "", "200");
assert.strictEqual(lteMax200.length, 2);
assert.deepStrictEqual(lteMax200.map((b) => b.id), ["bt-1", "bt-2"]);

// Both minDays (150) and maxDays (250)
const between150and250 = filterMinMaxDays(sampleLeaderboard, "150", "250");
assert.strictEqual(between150and250.length, 2);
assert.deepStrictEqual(between150and250.map((b) => b.id), ["bt-2", "bt-4"]);

// Day-wise sorting
const sortedDayWise = [...between150and250].sort((a, b) => {
  return getBacktestDurationDays(b) - getBacktestDurationDays(a);
});
assert.strictEqual(getBacktestDurationDays(sortedDayWise[0]), 250);
assert.strictEqual(getBacktestDurationDays(sortedDayWise[1]), 200);

console.log("All days filter tests passed successfully!");
