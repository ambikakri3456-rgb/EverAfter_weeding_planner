// Run with Node.js: node --test tests/model.test.cjs
// No browser, server, dependencies or user records are used by these tests.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { webcrypto } = require("node:crypto");
function environment(storage = new Map()) {
  const context = {
    console,
    Date,
    TextEncoder,
    crypto: webcrypto,
    localStorage: {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, v),
    },
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ["data", "model", "store"])
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "../js/" + file + ".js"),
        "utf8",
      ),
      context,
    );
  return { ...context, storage };
}
test("seed totals include party members and reconcile planned payments", () => {
  const c = environment(),
    m = c.Planner.metrics(c.Store.plan());
  assert.equal(m.guests, 18);
  assert.equal(m.confirmed, 13);
  assert.equal(m.pending, 4);
  assert.equal(m.declined, 1);
  assert.equal(m.committed, 900000);
  assert.equal(m.paid, 390000);
  assert.equal(m.outstanding, 510000);
  assert.equal(m.remaining, 300000);
  assert.equal(m.progress, 40);
});
test("empty plans and over-budget amounts remain finite and accurate", () => {
  const c = environment(),
    p = c.makeSeed(true);
  let m = c.Planner.metrics(p);
  assert.equal(m.progress, 0);
  assert.equal(m.guests, 0);
  p.wedding.budget = 1;
  p.expenses = [{ amount: 100, paid: 25 }];
  m = c.Planner.metrics(p);
  assert.equal(m.remaining, -99);
  assert.equal(m.outstanding, 75);
});
test("CRUD persists, updates without duplicating and deletes only the selected item", () => {
  const c = environment(),
    n = c.Store.plan().tasks.length;
  const row = c.Store.put("tasks", {
    title: "QA task",
    category: "Planning",
    due: "2027-01-01",
    priority: "High",
    status: "To do",
    notes: "",
  });
  assert.ok(row.id);
  c.Store.put("tasks", { ...row, title: "Updated", status: "Done" });
  assert.equal(c.Store.plan().tasks.length, n + 1);
  const reload = environment(c.storage);
  assert.equal(
    reload.Store.plan().tasks.find((x) => x.id === row.id).title,
    "Updated",
  );
  reload.Store.remove("tasks", row.id);
  assert.equal(reload.Store.plan().tasks.length, n);
});
test("invalid money, dates, party sizes and overnight times are rejected", () => {
  const c = environment(),
    P = c.Planner,
    p = c.Store.plan();
  assert.throws(
    () => P.record("expenses", { ...p.expenses[0], paid: 400000 }),
    /cannot exceed/,
  );
  assert.throws(
    () => P.record("expenses", { ...p.expenses[0], amount: -1 }),
    /between/,
  );
  assert.throws(
    () => P.record("expenses", { ...p.expenses[0], amount: Infinity }),
    /between/,
  );
  assert.throws(
    () => P.record("guests", { ...p.guests[0], party: 1.5 }),
    /whole number/,
  );
  assert.throws(
    () => P.record("guests", { ...p.guests[0], party: 0 }),
    /between/,
  );
  assert.throws(
    () => P.record("tasks", { ...p.tasks[0], due: "2027-02-29" }),
    /valid/,
  );
  assert.equal(P.validDate("2028-02-29"), true);
  assert.throws(
    () => P.record("events", { ...p.events[0], time: "20:00", end: "19:00" }),
    /End time/,
  );
  assert.throws(
    () => P.record("events", { ...p.events[0], time: "25:00" }),
    /valid start/,
  );
});
test("payment statuses derive from amounts, rather than becoming inconsistent", () => {
  const { Planner: P } = environment();
  assert.equal(P.expenseStatus({ amount: 100, paid: 0 }), "Unpaid");
  assert.equal(P.expenseStatus({ amount: 100, paid: 20 }), "Part paid");
  assert.equal(P.expenseStatus({ amount: 100, paid: 100 }), "Paid");
});
test("backup validates records, strips unknown fields and rejects duplicate IDs and unsafe image paths", () => {
  const c = environment(),
    p = c.makeSeed();
  p.admin = true;
  let restored = c.Planner.backup({
    format: "everafter-plan",
    version: 1,
    plan: p,
  });
  assert.equal(restored.admin, undefined);
  assert.equal(restored.guests.length, 10);
  p.guests.push({ ...p.guests[0] });
  assert.throws(
    () => c.Planner.backup({ format: "everafter-plan", version: 1, plan: p }),
    /duplicate/,
  );
  p.guests.pop();
  p.ideas[0].image = "javascript:alert(1)";
  assert.throws(
    () => c.Planner.backup({ format: "everafter-plan", version: 1, plan: p }),
    /photo/,
  );
  assert.throws(() => c.Planner.backup({ version: 99 }), /version 1/);
});
test("CSV escapes commas, quotes, newlines and spreadsheet formulas", () => {
  const { Planner: P } = environment();
  const csv = P.csv([["A,B", 'a"b', "line\nnext", "=SUM(1,2)", "@bad"]]);
  assert.ok(csv.includes('"A,B"'));
  assert.ok(csv.includes('"a""b"'));
  assert.ok(csv.includes('"line\nnext"'));
  assert.ok(csv.includes('"\'=SUM(1,2)"'));
  assert.ok(csv.includes('"\'@bad"'));
});
test("local accounts reject wrong credentials, isolate plans and survive reload", async () => {
  const c = environment();
  const user = await c.Store.register({
    name: "Test Planner",
    email: "test@example.com",
    password: "TestOnly123",
    seed: false,
  });
  assert.equal(c.Store.plan().guests.length, 0);
  assert.equal(c.Store.current().id, user.id);
  c.Store.put("guests", { name: "Private guest", party: 1, rsvp: "Pending" });
  c.Store.logout();
  await assert.rejects(
    () => c.Store.login("test@example.com", "bad"),
    /incorrect/,
  );
  await c.Store.login("TEST@example.com", "TestOnly123");
  assert.equal(c.Store.plan().guests[0].name, "Private guest");
  const reload = environment(c.storage);
  assert.equal(reload.Store.current().id, user.id);
  c.Store.demo();
  assert.equal(c.Store.plan().guests.length, 10);
  await assert.rejects(
    () =>
      c.Store.register({
        name: "Duplicate",
        email: "test@example.com",
        password: "TestOnly123",
      }),
    /already exists/,
  );
  assert.ok(!JSON.stringify(c.Store.users()).includes("passwordHash"));
});
test("demo admin protects itself and enforces disabled-account state", async () => {
  const c = environment();
  const u = await c.Store.register({
    name: "Other",
    email: "other@example.com",
    password: "TestOnly123",
    seed: true,
  });
  assert.throws(() => c.Store.adminUpdate("demo", "delete"), /required/);
  c.Store.demo();
  assert.throws(
    () => c.Store.adminUpdate("demo", "delete"),
    /cannot be changed/,
  );
  c.Store.adminUpdate(u.id, "toggle");
  await assert.rejects(
    () => c.Store.login("other@example.com", "TestOnly123"),
    /disabled/,
  );
  c.Store.adminUpdate(u.id, "toggle");
  c.Store.adminUpdate(u.id, "role");
  await c.Store.login("other@example.com", "TestOnly123");
  assert.equal(c.Store.current().role, "admin");
  c.Store.demo();
  c.Store.adminUpdate(u.id, "delete");
  assert.equal(c.Store.users().length, 1);
});
test("unavailable storage gives a warning without losing the in-memory plan", () => {
  const c = environment();
  c.localStorage.setItem = () => {
    throw Error("Quota exceeded");
  };
  c.Store.put("tasks", { title: "Temporary change" });
  assert.ok(c.Store.warning().includes("storage"));
  assert.ok(c.Store.plan().tasks.some((t) => t.title === "Temporary change"));
});
