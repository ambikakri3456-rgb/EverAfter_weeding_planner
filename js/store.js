/* Storage is deliberately browser-only: this is a frontend college project.
   Local demo accounts are NOT secure authentication or server authorization. */
window.Store = (() => {
  const KEY = "everafter.project.v1";
  let warning = "";
  let db;
  const initial = () => ({
    version: 1,
    active: "demo",
    users: [
      {
        id: "demo",
        name: "Aanya Sharma",
        email: "demo@everafter.local",
        role: "admin",
        enabled: true,
        passwordHash: null,
        salt: null,
        created: new Date().toISOString(),
      },
    ],
    plans: { demo: makeSeed() },
  });
  try {
    const raw = localStorage.getItem(KEY);
    db = raw ? JSON.parse(raw) : initial();
    if (
      !db ||
      db.version !== 1 ||
      !Array.isArray(db.users) ||
      !db.plans ||
      !db.plans.demo
    )
      throw new Error("Invalid data");
    if (db.active && !db.users.find((u) => u.id === db.active && u.enabled))
      db.active = null;
  } catch (error) {
    db = initial();
    warning =
      "Saved data could not be loaded. A fresh demo is open; your old storage has not been overwritten.";
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      return true;
    } catch (error) {
      warning =
        "Browser storage is unavailable or full. Your changes work for this session; export a backup before closing.";
      return false;
    }
  }
  function uid() {
    return (
      "id_" +
      (crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + "_" + Math.random().toString(36).slice(2))
    );
  }
  function current() {
    return db.users.find((u) => u.id === db.active && u.enabled) || null;
  }
  function plan() {
    return db.plans[current()?.id || "demo"];
  }
  function activity(text) {
    plan().activity.unshift({ id: uid(), text, at: new Date().toISOString() });
    plan().activity = plan().activity.slice(0, 100);
  }
  function save() {
    persist();
  }
  function put(type, item) {
    const list = plan()[type];
    if (!Array.isArray(list)) throw Error("Unknown record type");
    const index = list.findIndex((x) => x.id === item.id);
    if (index < 0) {
      item.id = uid();
      list.push(item);
    } else list[index] = item;
    activity(`${index < 0 ? "Added" : "Updated"} ${item.title || item.name}`);
    save();
    return item;
  }
  function remove(type, id) {
    const list = plan()[type];
    const index = list.findIndex((x) => x.id === id);
    if (index < 0) return;
    activity(`Removed ${list[index].title || list[index].name}`);
    list.splice(index, 1);
    save();
  }
  async function hash(password, salt) {
    if (!crypto.subtle)
      throw Error(
        "This browser requires HTTPS or localhost for local account passwords. Use the demo, or open with VS Code Live Server.",
      );
    const input = new TextEncoder().encode(salt + password);
    const buffer = await crypto.subtle.digest("SHA-256", input);
    return Array.from(new Uint8Array(buffer), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  }
  async function register({ name, email, password, seed }) {
    email = email.toLowerCase().trim();
    if (db.users.some((u) => u.email === email))
      throw Error("An account with this email already exists in this browser.");
    const salt = uid();
    const passwordHash = await hash(password, salt);
    const user = {
      id: uid(),
      name,
      email,
      role: "planner",
      enabled: true,
      passwordHash,
      salt,
      created: new Date().toISOString(),
    };
    db.users.push(user);
    db.plans[user.id] = makeSeed(!seed);
    if (!seed) {
      db.plans[user.id].wedding.partner1 = name.split(" ")[0];
      db.plans[user.id].wedding.partner2 = "Your partner";
      db.plans[user.id].wedding.venue = "Your wedding venue";
      db.plans[user.id].wedding.city = "Your city";
    }
    db.active = user.id;
    save();
    return user;
  }
  async function login(email, password) {
    const user = db.users.find(
      (u) => u.email === email.toLowerCase().trim() && u.id !== "demo",
    );
    if (
      !user ||
      !user.enabled ||
      (await hash(password, user.salt)) !== user.passwordHash
    )
      throw Error(
        "Email or password is incorrect, or this local account is disabled.",
      );
    db.active = user.id;
    save();
    return user;
  }
  function demo() {
    db.active = "demo";
    save();
  }
  function logout() {
    db.active = null;
    save();
  }
  function setProfile(name, email) {
    email = email.toLowerCase().trim();
    if (db.users.some((u) => u.email === email && u.id !== db.active))
      throw Error("This email is already used by another local account.");
    Object.assign(current(), { name, email });
    activity("Updated profile");
    save();
  }
  function adminUpdate(id, action) {
    if (current()?.role !== "admin")
      throw Error("Demo admin access is required.");
    if (id === "demo" || id === db.active)
      throw Error("The active demo administrator cannot be changed.");
    const u = db.users.find((u) => u.id === id);
    if (!u) throw Error("Account not found.");
    if (action === "delete") {
      db.users = db.users.filter((x) => x.id !== id);
      delete db.plans[id];
    } else if (action === "role")
      u.role = u.role === "admin" ? "planner" : "admin";
    else u.enabled = !u.enabled;
    activity(
      `${action === "delete" ? "Deleted" : action === "role" ? "Changed role for" : "Changed access for"} local account ${u.name}`,
    );
    save();
  }
  function reset(empty) {
    db.plans[current()?.id || "demo"] = makeSeed(empty);
    save();
  }
  function restore(data) {
    db.plans[current()?.id || "demo"] = data;
    activity("Restored a wedding plan from a backup");
    save();
  }
  return {
    uid,
    current,
    plan,
    put,
    remove,
    save,
    activity,
    register,
    login,
    demo,
    logout,
    setProfile,
    adminUpdate,
    reset,
    restore,
    users: () => db.users.map(({ passwordHash, salt, ...u }) => ({ ...u })),
    warning: () => warning,
    clearWarning: () => {
      warning = "";
    },
  };
})();
