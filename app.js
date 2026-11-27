/* EVERAFTER — UI controller.
   Hash routes, reusable form dialogs and event delegation keep the app buildless. */
(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const app = $("#app"),
    modal = $("#modal");
  const e = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const money = (v) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(v);
  const compact = (v) =>
    Math.abs(v) >= 100000
      ? "₹" + (v / 100000).toFixed(2).replace(/0$/, "") + "L"
      : money(v);
  const date = (v, short = false) =>
    v
      ? new Date(v + "T12:00:00").toLocaleDateString("en-IN", {
          day: "numeric",
          month: short ? "short" : "long",
          ...(short ? {} : { year: "numeric" }),
        })
      : "Not set";
  const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const days = () =>
    Math.ceil(
      (new Date(Store.plan().wedding.date + "T00:00:00") -
        new Date(localToday() + "T00:00:00")) /
        86400000,
    );
  const time = (v) => {
    const [h, m] = v.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };
  const initials = (v) =>
    String(v)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase();
  const progress = (n) =>
    `<div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, n))}%"></div></div>`;
  const color = (v) =>
    ["Done", "Confirmed", "Booked", "Paid", "Completed", "Active"].includes(v)
      ? "green"
      : ["High", "Declined", "Disabled", "Unpaid"].includes(v)
        ? "rose"
        : [
              "In progress",
              "Pending",
              "Contacted",
              "Part paid",
              "Planning",
              "Medium",
            ].includes(v)
          ? "gold"
          : ["Shortlisted", "Low"].includes(v)
            ? "blue"
            : "gray";
  const badge = (v) => `<span class="badge ${color(v)}">${e(v)}</span>`;
  const button = (label, action, ico = "", cls = "", extra = "") =>
    `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${ico ? icon(ico) : ""}${label}</button>`;
  const titleOf = (t) =>
    ({
      tasks: "task",
      guests: "guest",
      expenses: "expense",
      vendors: "vendor",
      events: "event",
      ideas: "idea",
    })[t] || "record";
  const actionButtons = (type, id) =>
    `<div class="row-actions"><button class="icon-btn" title="Edit ${titleOf(type)}" aria-label="Edit ${titleOf(type)}" data-action="edit" data-type="${type}" data-id="${e(id)}">${icon("edit")}</button><button class="icon-btn danger" title="Delete ${titleOf(type)}" aria-label="Delete ${titleOf(type)}" data-action="delete" data-type="${type}" data-id="${e(id)}">${icon("trash")}</button></div>`;
  let route = "dashboard",
    filter = { q: "", status: "All", category: "All", side: "All" },
    toastTimer;
  function toast(message) {
    clearTimeout(toastTimer);
    $("#toast-region").innerHTML =
      `<div class="toast">${icon("check")}<span>${e(message)}</span></div>`;
    toastTimer = setTimeout(() => {
      $("#toast-region").innerHTML = "";
    }, 4200);
  }
  function afterSave(message) {
    renderMain();
    const count = $(".nav-count");
    if (count) {
      const m = Planner.metrics(Store.plan());
      count.textContent = m.totalTasks - m.done;
    }
    toast(message);
    const warning = Store.warning();
    if (warning) {
      Store.clearWarning();
      setTimeout(() => toast(warning), 500);
    }
  }
  function navigate(to) {
    if (location.hash === "#" + to) {
      route = to;
      filter = { q: "", status: "All", category: "All", side: "All" };
      render();
    } else location.hash = to;
  }
  function openDialog(title, body, large = false) {
    modal.className = large ? "modal-large" : "";
    modal.innerHTML = `<div class="modal-header"><h2 id="modal-title">${title}</h2><button type="button" class="icon-btn" aria-label="Close dialog" data-action="close">${icon("close")}</button></div><div class="modal-body">${body}</div>`;
    if (!modal.open) modal.showModal();
    requestAnimationFrame(() =>
      (
        modal.querySelector("[autofocus]") ||
        modal.querySelector("input:not([type=hidden])") ||
        modal.querySelector("button")
      )?.focus(),
    );
  }
  function closeDialog() {
    modal.close();
  }
  const empty = (
    type,
    title = "A little room for something wonderful.",
    copy = "Add your first record to start planning.",
    action = true,
  ) =>
    `<div class="empty">${icon(APP_ROUTES.find((x) => x[0] === type)?.[1] || "heart")}<h3>${e(title)}</h3><p>${e(copy)}</p>${action ? button("Add " + titleOf(type), "add", "plus", "", `data-type="${type}"`) : ""}</div>`;
  function heading(title, subtitle, actions = "", extra = "") {
    return `<div class="page-heading ${extra}"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
  }
  function stat(label, value, note, ico = "heart", tone = "", bar = null) {
    return `<article class="stat-card"><div class="stat-top">${label}<span class="stat-icon ${tone}">${icon(ico)}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${note}</div>${bar !== null ? progress(bar) : ""}</article>`;
  }
  function render() {
    if (!Store.current() || ["login", "register"].includes(route)) {
      renderAuth(route === "register" ? "register" : "login");
      return;
    }
    if (route === "admin" && Store.current().role !== "admin") {
      route = "dashboard";
      history.replaceState(null, "", "#dashboard");
    }
    if (!APP_ROUTES.some((x) => x[0] === route)) route = "dashboard";
    const w = Store.plan().wedding,
      u = Store.current(),
      m = Planner.metrics(Store.plan());
    const nav = (items) =>
      items
        .filter((x) => x[0] !== "admin" || u.role === "admin")
        .map(
          ([r, i, l]) =>
            `<a href="#${r}" class="nav-link ${route === r ? "active" : ""}" ${route === r ? 'aria-current="page"' : ""}>${icon(i)}<span>${l}</span>${r === "tasks" ? `<span class="nav-count">${m.totalTasks - m.done}</span>` : ""}</a>`,
        )
        .join("");
    app.innerHTML = `<button class="mobile-scrim" aria-label="Close navigation" data-action="menu-close"></button><aside class="sidebar" aria-label="Main navigation"><a href="#dashboard" class="brand">${icon("flower")}<div><div class="brand-name">everafter<span style="color:#a5b28e">.</span></div><div class="brand-tagline">YOUR FOREVER, TOGETHER</div></div></a><button class="wedding-select" data-action="route" data-route="settings"><span class="monogram">${e((w.partner1[0] || "") + (w.partner2[0] || ""))}</span><span>${e(w.partner1)} & ${e(w.partner2)}<small>${e(date(w.date))}</small></span>${icon("chevron")}</button><div class="nav-caption">YOUR WEDDING</div><nav>${nav(APP_ROUTES.slice(0, 7))}<hr class="nav-divider">${nav(APP_ROUTES.slice(7))}</nav><div class="sidebar-bottom"><div class="countdown-card">${icon("leaf")}<strong>${days() > 0 ? days() : days() === 0 ? "Today" : Math.abs(days())}</strong><p>${days() > 0 ? "days until your forever" : days() === 0 ? "Your forever starts today" : "days of happily ever after"}</p></div><div class="sidebar-foot">A LITTLE LESS STRESS. A LOT MORE LOVE.</div></div></aside><div class="shell"><header class="topbar"><button class="icon-btn mobile-menu" aria-label="Open navigation" aria-expanded="false" data-action="menu">${icon("menu")}</button><div class="breadcrumb">Our wedding<span>/</span><strong>${e(APP_ROUTES.find((x) => x[0] === route)?.[2] || "Overview")}</strong></div><div class="topbar-spacer"></div><button class="top-search" data-action="search" aria-label="Search your wedding">${icon("search")}<span class="search-hint">Search anything...</span><span class="keycap">Ctrl K</span></button><button class="icon-btn" data-action="notifications" aria-label="View reminders">${icon("bell")}</button><div class="topbar-divider"></div><button class="profile-btn" data-action="profile" aria-label="Open profile menu"><span class="avatar">${e(initials(u.name))}</span><span class="profile-copy">${e(u.name.split(" ")[0])}<small>${u.id === "demo" ? "Demo wedding" : "Wedding planner"}</small></span>${icon("chevron")}</button></header><main id="main-content" class="content" tabindex="-1"></main></div>`;
    renderMain();
    syncDrawer();
  }
  function syncDrawer() {
    const drawer = $(".sidebar");
    if (drawer) {
      const closed =
        window.matchMedia("(max-width:760px)").matches &&
        !drawer.classList.contains("open");
      drawer.inert = closed;
      drawer.setAttribute("aria-hidden", String(closed));
    }
  }
  window.addEventListener("resize", syncDrawer);
  function renderMain() {
    if (!$("#main-content")) return;
    const views = {
      dashboard,
      tasks: tasksPage,
      guests: guestsPage,
      expenses: expensesPage,
      vendors: vendorsPage,
      events: eventsPage,
      ideas: ideasPage,
      reports: reportsPage,
      settings: settingsPage,
      admin: adminPage,
    };
    $("#main-content").innerHTML =
      (views[route] || dashboard)() +
      `<footer class="footer"><span>Thoughtfully planned. Beautifully yours. ${icon("heart")} Everafter</span><span>Frontend project by Kartik Patel · <button class="text-btn" data-action="about" style="font-size:inherit">About this demo</button></span></footer>`;
  }
  function dashboard() {
    const p = Store.plan(),
      w = p.wedding,
      m = Planner.metrics(p),
      cats = Planner.categories(p),
      taskList = p.tasks
        .filter((t) => t.status !== "Done")
        .sort((a, b) => a.due.localeCompare(b.due))
        .slice(0, 4);
    return (
      heading(
        "Let’s make it unforgettable.",
        `A little planning today. A lifetime of memories tomorrow.`,
        `<span class="date-chip">${icon("calendar")}${e(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }))}</span>`,
        "dashboard-heading",
      ) +
      `<section class="hero"><img class="hero-image" src="assets/wedding-hero.jpg" alt="A couple holding a wedding bouquet in warm evening light"><div class="hero-content"><div class="eyebrow">${icon("sparkles")} YOUR HAPPILY EVER AFTER STARTS HERE</div><h2>Every little detail.<br><em>One beautiful beginning.</em></h2><div class="hero-meta"><span>${icon("heart")}${e(w.partner1)} & ${e(w.partner2)}</span><span>${icon("calendar")}${e(date(w.date))}</span><span>${icon("pin")}${e(w.city.split(",")[0])}</span></div>${button("View wedding timeline", "route", "calendar", "", `data-route="events"`)}</div><span class="hero-tag">${icon("leaf")} Made for your kind of love</span></section>` +
      `<section class="stats-grid" aria-label="Wedding summary">${stat("Guest list", `${m.guests}<small>/ ${w.targetGuests} planned</small>`, `<strong>${m.confirmed} confirmed</strong> · ${m.pending} awaiting RSVP`, "users", "", (m.guests / w.targetGuests) * 100)}${stat("Wedding budget", `${compact(m.committed)}<small>/ ${compact(w.budget)}</small>`, `${m.remaining < 0 ? '<span class="overbudget">' + compact(-m.remaining) + " over budget</span>" : "<strong>" + compact(m.remaining) + " left to plan</strong>"}`, "wallet", "gold", (m.committed / w.budget) * 100)}${stat("Checklist", `${m.done}<small>of ${m.totalTasks} completed</small>`, `<strong>${m.progress}% complete</strong> · One step at a time`, "checklist", "rose", m.progress)}${stat("Your dream team", `${m.booked}<small>vendors booked</small>`, `<strong>${p.vendors.filter((v) => v.status === "Shortlisted").length} shortlisted</strong> · Coming together`, "shop", "blue", p.vendors.length ? (m.booked / p.vendors.length) * 100 : 0)}</section>` +
      `<div class="dashboard-grid"><section class="panel"><div class="panel-title"><div><h2>A little closer to “I do”</h2><p>Your next steps, one lovely detail at a time.</p></div><button class="text-btn" data-action="route" data-route="tasks">View checklist</button></div>${taskList.length ? taskList.map((t) => taskRow(t, true)).join("") : empty("tasks", "You’re all caught up.", "Add a task whenever a new detail comes to mind.", false)}<div class="panel-note">${icon("leaf")} You’ve got this. Every little step counts.</div></section><section class="panel"><div class="panel-title"><div><h2>A thoughtful budget</h2><p>A little clarity for your big day.</p></div><button class="text-btn" data-action="route" data-route="expenses">View budget</button></div>${budgetDonut(cats, m)}<div class="budget-bottom"><span>Total budget</span><strong>${money(w.budget)}</strong></div></section><section class="panel journey"><div class="journey-heading"><h2>Your planning journey</h2><p>Big dreams. Small, happy steps.</p></div><div class="journey-steps">${["Dream & plan", "Curate the details", "Invite your people", "Say “I do”"].map((x, i) => `<button class="journey-step ${i < p.journey ? "complete" : i === p.journey ? "current" : ""}" data-action="journey" data-stage="${i}" aria-label="Set planning stage: ${x}" ${i === p.journey ? 'aria-current="step"' : ""}><span class="journey-dot">${icon(i < p.journey ? "check" : ["leaf", "flower", "mail", "heart"][i])}</span>${x}</button>`).join("")}</div></section><section class="inspo-strip"><div class="inspo-heading"><div><h2>A little inspiration, a lot of you.</h2><p>Find the details that feel like your love story.</p></div><button class="text-btn" data-action="route" data-route="ideas">Explore inspiration</button></div><div class="inspo-mini-grid">${[
        ["venue.jpg", "A garden kind of forever"],
        ["flowers.jpg", "Soft blooms, big feelings"],
        ["tablescape.jpg", "Gather around love"],
      ]
        .map(
          ([img, title]) =>
            `<button class="inspo-mini" data-action="route" data-route="ideas"><img src="assets/${img}" alt="${title}" loading="lazy"><span>${title}</span></button>`,
        )
        .join("")}</div></section></div>`
    );
  }
  function budgetDonut(cats, m) {
    const colors = [
      "#426049",
      "#8d9e77",
      "#b6c4a0",
      "#dfc59d",
      "#b78d7d",
      "#9b9f98",
      "#c5bdab",
    ];
    let sum = 0;
    const gradient = cats
      .map((c, i) => {
        const start = sum;
        sum += m.committed ? (c.total / m.committed) * 100 : 0;
        return `${colors[i % colors.length]} ${start}% ${sum}%`;
      })
      .join(",");
    return `<div class="budget-visual"><div class="donut" role="img" aria-label="${e(money(m.committed))} committed across ${cats.length} categories" style="background:${cats.length ? "conic-gradient(" + gradient + ")" : "#edf1e7"}"><div class="donut-inner"><strong>${compact(m.committed)}</strong><small>PLANNED SPEND</small></div></div><div class="legend">${
      cats.length
        ? cats
            .slice(0, 5)
            .map(
              (c, i) =>
                `<div class="legend-row"><span class="legend-dot" style="background:${colors[i]}"></span><span>${e(c.name)}</span><span>${compact(c.total)}</span></div>`,
            )
            .join("") +
          (cats.length > 5
            ? `<div class="legend-row"><span>Other categories</span><span>${compact(cats.slice(5).reduce((n, c) => n + c.total, 0))}</span></div>`
            : "")
        : "<p>Add an expense to see your breakdown.</p>"
    }</div></div>`;
  }
  function taskRow(t, mini = false) {
    return `<div class="task-row ${t.status === "Done" ? "done" : ""}"><button class="task-check ${t.status === "Done" ? "checked" : ""}" data-action="toggle-task" data-id="${e(t.id)}" aria-label="${t.status === "Done" ? "Reopen" : "Complete"} ${e(t.title)}" aria-pressed="${t.status === "Done"}">${t.status === "Done" ? icon("check") : ""}</button><div class="task-info"><strong>${e(t.title)}</strong><small>${e(t.category)} · ${date(t.due, true)}${t.due < localToday() && t.status !== "Done" ? " · Overdue" : ""}${!mini ? " · " + e(t.status) : ""}</small></div>${badge(mini ? t.priority : t.status)}${mini ? "" : actionButtons("tasks", t.id)}</div>`;
  }
  function toolbar(type, statuses = [], categories = [], extra = "") {
    return `<div class="toolbar"><div class="search-field">${icon("search")}<input data-filter="q" value="${e(filter.q)}" aria-label="Search ${type}" placeholder="Search ${type === "expenses" ? "expenses" : type}..."></div><div class="filters">${statuses.length ? `<select class="select-control" data-filter="status" aria-label="Filter by status">${["All", ...statuses].map((x) => `<option ${filter.status === x ? "selected" : ""} value="${e(x)}">${x === "All" ? "All statuses" : e(x)}</option>`).join("")}</select>` : ""}${categories.length ? `<select class="select-control" data-filter="category" aria-label="Filter by category">${["All", ...categories].map((x) => `<option ${filter.category === x ? "selected" : ""} value="${e(x)}">${x === "All" ? "All categories" : e(x)}</option>`).join("")}</select>` : ""}${extra}</div></div>`;
  }
  function filtered(type) {
    return Store.plan()[type].filter((x) => {
      const q = filter.q.toLowerCase();
      const matches =
        !q || Object.values(x).some((v) => String(v).toLowerCase().includes(q));
      const status =
        type === "guests"
          ? x.rsvp
          : type === "expenses"
            ? Planner.expenseStatus(x)
            : type === "ideas"
              ? x.saved
                ? "Saved"
                : "Not saved"
              : x.status;
      return (
        matches &&
        (filter.status === "All" || status === filter.status) &&
        (filter.category === "All" || x.category === filter.category) &&
        (type !== "guests" || filter.side === "All" || x.side === filter.side)
      );
    });
  }
  function recordActions(type, label) {
    return (
      button(
        "Export CSV",
        "export",
        "download",
        "secondary",
        `data-type="${type}"`,
      ) + button(label, "add", "plus", "", `data-type="${type}"`)
    );
  }
  function tasksPage() {
    const m = Planner.metrics(Store.plan());
    return (
      heading(
        "Little steps. Big day.",
        "Keep every detail in one place, from the first idea to the final “I do”.",
        recordActions("tasks", "Add task"),
      ) +
      `<div class="record-summary">${stat("All tasks", m.totalTasks, "Every detail, accounted for", "checklist")}${stat("Completed", m.done, `${m.progress}% of your list complete`, "check", "", m.progress)}${stat("Still to do", m.totalTasks - m.done, `${Store.plan().tasks.filter((x) => x.status !== "Done" && x.due < localToday()).length} overdue tasks`, "clock", "gold")}</div>` +
      toolbar("tasks", Planner.statuses.tasks, CATEGORIES.tasks) +
      `<div id="records">${tasksList()}</div>`
    );
  }
  function tasksList() {
    const list = filtered("tasks").sort(
      (a, b) =>
        (a.status === "Done") - (b.status === "Done") ||
        a.due.localeCompare(b.due),
    );
    return list.length
      ? `<section class="panel table-panel task-list">${list.map((t) => taskRow(t)).join("")}<div class="table-bottom"><span>${list.length} tasks shown</span><span>Tap a checkbox to mark a task complete</span></div></section>`
      : empty(
          "tasks",
          Store.plan().tasks.length
            ? "No matching tasks."
            : "Start with one small step.",
          Store.plan().tasks.length
            ? "Try a different search or filter."
            : "Your checklist starts here.",
          !Store.plan().tasks.length,
        );
  }
  function guestsPage() {
    const m = Planner.metrics(Store.plan());
    return (
      heading(
        "Your favourite people.",
        "Every invitation, RSVP and place at the table, thoughtfully organised.",
        recordActions("guests", "Add guest"),
      ) +
      `<div class="record-summary">${stat("People on your list", m.guests, `${Store.plan().guests.length} guest parties · ${Store.plan().wedding.targetGuests} target`, "users")}${stat("Happily attending", m.confirmed, `${m.declined} declined · people, including party members`, "heart")}${stat("Awaiting an RSVP", m.pending, "Update responses as they come in", "mail", "gold")}</div>` +
      toolbar(
        "guests",
        Planner.statuses.guests,
        [],
        `<select data-filter="side" class="select-control" aria-label="Filter by family side">${["All", "Bride", "Groom", "Both"].map((x) => `<option ${filter.side === x ? "selected" : ""} value="${x}">${x === "All" ? "Both families" : x === "Both" ? "Mutual friends" : x + "’s side"}</option>`).join("")}</select>`,
      ) +
      `<div id="records">${guestsList()}</div><p class="subtle-note">Each row is one party. RSVP and meal preference apply to the entire party; add separate rows when preferences differ. Invitations are tracked here and are not sent automatically.</p>`
    );
  }
  function guestsList() {
    const list = filtered("guests");
    if (!list.length)
      return empty(
        "guests",
        Store.plan().guests.length
          ? "No matching guests."
          : "Make room for your people.",
        "Add a guest, or change your filters.",
        !Store.plan().guests.length,
      );
    return table(
      ["Guest / party", "Family", "People", "RSVP", "Meal", "Table", "Actions"],
      list
        .map(
          (g) =>
            `<tr><td><div class="name-cell"><span class="avatar">${e(initials(g.name))}</span><div><strong>${e(g.name)}</strong><small>${e(g.email || g.phone || "No contact added")}</small></div></div></td><td>${e(g.side)}</td><td>${g.party}</td><td><select class="status-select" data-status-type="guests" data-id="${e(g.id)}" aria-label="RSVP for ${e(g.name)}">${Planner.statuses.guests.map((s) => `<option ${g.rsvp === s ? "selected" : ""}>${s}</option>`).join("")}</select></td><td>${e(g.meal)}</td><td>${e(g.table || "Unassigned")}</td><td>${actionButtons("guests", g.id)}</td></tr>`,
        )
        .join(""),
      `${list.length} guest parties shown`,
      `${list.reduce((n, g) => n + g.party, 0)} people including party members`,
    );
  }
  function table(heads, rows, foot = "", right = "") {
    return `<div class="panel table-panel"><div class="table-scroll"><table><thead><tr>${heads.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div><div class="table-bottom"><span>${foot}</span><span>${right}</span></div></div>`;
  }
  function expensesPage() {
    const p = Store.plan(),
      m = Planner.metrics(p);
    return (
      heading(
        "More joy. Less guesswork.",
        "Give every rupee a purpose, and keep room for what matters.",
        recordActions("expenses", "Add expense"),
      ) +
      `<div class="stats-grid">${stat("Total budget", compact(p.wedding.budget), "Set your limit in wedding settings", "wallet")}${stat("Planned spend", compact(m.committed), `${Math.round((m.committed / p.wedding.budget) * 100)}% of your budget allocated`, "chart", "gold")}${stat("Already paid", compact(m.paid), `${compact(m.outstanding)} still to pay`, "check")}${stat(m.remaining < 0 ? "Over budget" : "Left to plan", `<span class="${m.remaining < 0 ? "overbudget" : ""}">${compact(Math.abs(m.remaining))}</span>`, m.remaining < 0 ? "Review your estimates or adjust your budget" : "Your budget minus planned expenses", "leaf", "rose")}</div>` +
      toolbar(
        "expenses",
        ["Unpaid", "Part paid", "Paid"],
        CATEGORIES.expenses,
      ) +
      `<div id="records">${expensesList()}</div><p class="subtle-note">Vendor quotes are separate from expenses. Add a quote to your budget only when you choose to commit to it. Amounts are shown in Indian rupees (INR).</p>`
    );
  }
  function expensesList() {
    const list = filtered("expenses");
    if (!list.length)
      return empty(
        "expenses",
        Store.plan().expenses.length
          ? "No matching expenses."
          : "Make a little space in the budget.",
        "Add an expense or adjust your filters.",
        !Store.plan().expenses.length,
      );
    return table(
      [
        "Expense",
        "Category",
        "Estimated cost",
        "Paid",
        "Remaining",
        "Status",
        "Due",
        "Actions",
      ],
      list
        .map(
          (b) =>
            `<tr><td><strong>${e(b.title)}</strong></td><td>${e(b.category)}</td><td>${money(b.amount)}</td><td>${money(b.paid)}</td><td>${money(b.amount - b.paid)}</td><td>${badge(Planner.expenseStatus(b))}</td><td>${date(b.due, true)}</td><td>${actionButtons("expenses", b.id)}</td></tr>`,
        )
        .join(""),
      `${list.length} expenses shown`,
      `${money(list.reduce((s, b) => s + b.amount, 0))} total shown`,
    );
  }
  function vendorsPage() {
    return (
      heading(
        "Find your kind of people.",
        "A dream team for your dream day. Discover, shortlist and plan together.",
        recordActions("vendors", "Add vendor"),
      ) +
      `<div class="info-box">${icon("info")}<span>This is your personal vendor planner. The sample vendors and prices are fictional; status changes track your plans and do not make real bookings.</span></div>` +
      toolbar("vendors", Planner.statuses.vendors, CATEGORIES.vendors) +
      `<div id="records">${vendorsList()}</div>`
    );
  }
  function vendorsList() {
    const list = filtered("vendors");
    return `<div class="vendor-grid">${list.length ? list.map((v) => `<article class="vendor-card"><div class="vendor-image"><img src="assets/${e(v.image)}" alt="${e(v.category)} inspiration for ${e(v.name)}" loading="lazy">${badge(v.status)}<button class="icon-btn save-btn ${v.status === "Shortlisted" ? "saved" : ""}" data-action="shortlist" data-id="${e(v.id)}" aria-label="${v.status === "Shortlisted" ? "Remove from shortlist" : "Shortlist"} ${e(v.name)}" ${v.status === "Booked" ? 'disabled title="Edit this vendor to change its booked status"' : ""}>${icon("heart")}</button></div><div class="vendor-copy"><div class="eyebrow">${e(v.category)}</div><h2>${e(v.name)}</h2><div class="location">${icon("pin")}${e(v.location)}</div><p>${e(v.notes || "Add notes to keep the details of your conversation in one place.")}</p><div class="vendor-bottom"><div><strong>${money(v.price)}</strong><small>Estimated quote</small></div>${button("View details", "vendor-detail", "", "secondary small", `data-id="${e(v.id)}"`)}</div></div></article>`).join("") : empty("vendors", "Your dream team starts here.", "Add a vendor, or try a different search.", !Store.plan().vendors.length)}</div>`;
  }
  function eventsPage() {
    return (
      heading(
        "The moments that make it yours.",
        "From the first welcome to the last dance. A beautiful flow for your celebration.",
        button("Print timeline", "print", "print", "secondary") +
          button("Add event", "add", "plus", "", `data-type="events"`),
      ) +
      toolbar("events", Planner.statuses.events, CATEGORIES.events) +
      `<div id="records">${eventsList()}</div>`
    );
  }
  function eventsList() {
    const list = filtered("events").sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time),
    );
    let prev = "";
    return list.length
      ? `<div class="timeline-wrap">${list
          .map((v) => {
            let heading = "";
            if (prev !== v.date) {
              heading = `<h2 class="timeline-date">${date(v.date)}</h2>`;
              prev = v.date;
            }
            return `${heading}<div class="timeline-item"><div class="timeline-time">${time(v.time)}<small>to ${time(v.end)}</small></div><article class="panel event-card"><div class="event-info"><h3>${e(v.title)}</h3><div class="event-meta"><span>${icon("pin")}${e(v.location)}</span><span>${icon("user")}${e(v.owner || "Coordinator to be assigned")}</span></div>${v.notes ? `<p>${e(v.notes)}</p>` : ""}</div>${badge(v.status)}${actionButtons("events", v.id)}</article></div>`;
          })
          .join("")}</div>`
      : empty(
          "events",
          "Every celebration starts with a moment.",
          "Add an event, or change your filters.",
          !Store.plan().events.length,
        );
  }
  function ideasPage() {
    const saved = Store.plan().ideas.filter((i) => i.saved).length;
    return (
      heading(
        "A moodboard for your love story.",
        "Collect the colours, textures and little things that feel like you.",
        button("Add an idea", "add", "plus", "", `data-type="ideas"`),
      ) +
      `<div class="palette">${[
        ["#839475", "Sage"],
        ["#e8d6b5", "Champagne"],
        ["#f2e9d9", "Ivory"],
        ["#c49b8b", "Dusty rose"],
        ["#33533f", "Forest"],
      ]
        .map(
          ([c, n]) =>
            `<span class="swatch" style="background:${c}" title="${n}: ${c}"></span>`,
        )
        .join("")}<small>Sage, champagne & a little romance</small></div>` +
      toolbar("ideas", ["Saved", "Not saved"], CATEGORIES.ideas) +
      `<p class="subtle-note" style="margin:0 0 18px">${saved} saved ideas · Your personal collection of inspiration.</p><div id="records">${ideasList()}</div>`
    );
  }
  function ideasList() {
    const list = filtered("ideas");
    return `<div class="inspo-grid">${list.length ? list.map((v) => `<article class="inspo-card"><div class="vendor-image"><img src="assets/${e(v.image)}" alt="${e(v.title)}" loading="lazy"><span class="badge">${e(v.category)}</span><button class="icon-btn save-btn ${v.saved ? "saved" : ""}" data-action="save-idea" data-id="${e(v.id)}" aria-label="${v.saved ? "Unsave" : "Save"} ${e(v.title)}" aria-pressed="${v.saved}">${icon("heart")}</button></div><div class="inspo-content"><h2>${e(v.title)}</h2><p>${e(v.notes)}</p>${actionButtons("ideas", v.id)}</div></article>`).join("") : empty("ideas", "A fresh canvas for your ideas.", "Add an idea or change your filters.", !Store.plan().ideas.length)}</div>`;
  }
  function reportsPage() {
    const p = Store.plan(),
      m = Planner.metrics(p),
      cats = Planner.categories(p),
      percent = (n) => (m.guests ? Math.round((n / m.guests) * 100) : 0);
    return (
      heading(
        "Your big picture, beautifully clear.",
        `${e(p.wedding.partner1)} & ${e(p.wedding.partner2)} · ${date(p.wedding.date)} · ${e(p.wedding.city)}`,
        button("Export report", "report-export", "download", "secondary") +
          button("Print / Save PDF", "print", "print"),
      ) +
      `<p class="print-only">Everafter wedding planning report · Generated ${new Date().toLocaleString("en-IN")}</p><div class="stats-grid">${stat("Checklist complete", m.progress + "%", `${m.done} of ${m.totalTasks} tasks`, "checklist")}${stat("Guests confirmed", m.confirmed, `${m.pending} awaiting a reply`, "users")}${stat("Budget allocated", Math.round((m.committed / p.wedding.budget) * 100) + "%", `${money(m.committed)} planned`, "wallet", "gold")}${stat("Vendors booked", m.booked, `${p.vendors.length} in your planner`, "shop", "rose")}</div><div class="report-grid"><section class="panel"><div class="panel-title"><h2>Where your budget goes</h2><span class="badge">INR</span></div>${cats.length ? cats.map((c) => `<div class="report-bar"><div class="report-bar-label"><span>${e(c.name)}</span><strong>${money(c.total)}</strong></div>${progress((c.total / p.wedding.budget) * 100)}</div>`).join("") : '<p class="muted">Add expenses to see your breakdown.</p>'}<div class="budget-bottom"><span>${m.remaining < 0 ? "Over budget" : "Unallocated budget"}</span><strong class="${m.remaining < 0 ? "overbudget" : ""}">${money(Math.abs(m.remaining))}</strong></div></section><section class="panel"><div class="panel-title"><h2>Your people, at a glance</h2></div>${[
        ["Confirmed", m.confirmed],
        ["Pending", m.pending],
        ["Declined", m.declined],
      ]
        .map(
          ([label, n]) =>
            `<div class="report-bar"><div class="report-bar-label"><span>${label}</span><strong>${n} people · ${percent(n)}%</strong></div>${progress(percent(n))}</div>`,
        )
        .join(
          "",
        )}<div class="budget-bottom"><span>Confirmed meal preferences</span><strong>${m.confirmed} people</strong></div>${["Vegetarian", "Non-vegetarian", "Vegan", "Other"].map((meal) => `<div class="legend-row"><span>${meal}</span><span>${p.guests.filter((g) => g.rsvp === "Confirmed" && g.meal === meal).reduce((s, g) => s + g.party, 0)}</span></div>`).join("")}</section><section class="panel"><div class="panel-title"><h2>Payments & peace of mind</h2></div><div class="legend-stat"><strong>${compact(m.paid)}</strong><span>paid so far</span></div><div class="legend-stat"><strong>${compact(m.outstanding)}</strong><span>remaining to pay on planned expenses</span></div><div class="budget-bottom"><span>Payment progress</span><strong>${m.committed ? Math.round((m.paid / m.committed) * 100) : 0}%</strong></div>${progress(m.committed ? (m.paid / m.committed) * 100 : 0)}</section><section class="panel"><div class="panel-title"><h2>Still on your list</h2></div>${
        p.tasks
          .filter((t) => t.status !== "Done")
          .sort((a, b) => a.due.localeCompare(b.due))
          .slice(0, 5)
          .map(
            (t) =>
              `<div class="report-bar-label"><span>${e(t.title)}</span><span class="muted">${date(t.due, true)}</span></div>`,
          )
          .join("") || '<p class="muted">You’re all caught up.</p>'
      }<p class="subtle-note">${p.tasks.filter((t) => t.status !== "Done").length} unfinished tasks in total. Open the checklist for the full list.</p></section></div><section class="section-space"><div class="panel-title"><h2>Expense summary</h2></div>${table(["Expense", "Category", "Estimate", "Paid", "Outstanding"], p.expenses.map((v) => `<tr><td>${e(v.title)}</td><td>${e(v.category)}</td><td>${money(v.amount)}</td><td>${money(v.paid)}</td><td>${money(v.amount - v.paid)}</td></tr>`).join(""), `${p.expenses.length} expenses`, `Total ${money(m.committed)}`)}</section>`
    );
  }
  function field(
    name,
    label,
    type = "text",
    value = "",
    options = null,
    required = true,
    extra = "",
    full = false,
  ) {
    const id = "field-" + name;
    return `<div class="field ${full ? "full" : ""}"><label for="${id}">${label}${required ? ' <span aria-hidden="true">*</span>' : ""}</label>${
      options
        ? `<select id="${id}" name="${name}" ${required ? "required" : ""}>${options
            .map((o) => {
              const val = Array.isArray(o) ? o[0] : o,
                label = Array.isArray(o) ? o[1] : o;
              return `<option value="${e(val)}" ${String(value) === String(val) ? "selected" : ""}>${e(label)}</option>`;
            })
            .join("")}</select>`
        : type === "textarea"
          ? `<textarea id="${id}" name="${name}" maxlength="1000" ${required ? "required" : ""} ${extra}>${e(value)}</textarea>`
          : `<input id="${id}" name="${name}" type="${type}" value="${e(value)}" ${required ? "required" : ""} ${["text", "email", "tel"].includes(type) ? 'maxlength="150"' : ""} ${extra}>`
    }</div>`;
  }
  function settingsPage() {
    const w = Store.plan().wedding,
      u = Store.current();
    return (
      heading(
        "Make this space yours.",
        "Your wedding details, your profile, your way of planning.",
      ) +
      `<div class="settings-layout"><div class="stack"><section class="panel"><div class="panel-title"><div><h2>Your wedding details</h2><p>The little things that make this day yours.</p></div>${icon("heart")}</div><form id="wedding-form"><div class="form-error" role="alert"></div><div class="field-grid">${field("partner1", "First partner", "text", w.partner1)}${field("partner2", "Second partner", "text", w.partner2)}${field("date", "Wedding date", "date", w.date, null, true, 'min="1900-01-01" max="2100-12-31"')}${field("venue", "Wedding venue", "text", w.venue)}${field("city", "City / location", "text", w.city)}${field("theme", "Wedding theme", "text", w.theme, null, false)}${field("budget", "Total budget (₹)", "number", w.budget, null, true, 'min="1" max="1000000000" step="0.01"')}${field("targetGuests", "Planned guest count", "number", w.targetGuests, null, true, 'min="1" max="100000" step="1"')}${field("note", "A note about your day", "textarea", w.note, null, false, "", true)}</div><div class="form-actions"><button class="btn" type="submit">${icon("check")}Save wedding details</button></div></form></section><section class="panel"><div class="panel-title"><h2>Your profile</h2></div><form id="profile-form"><div class="form-error" role="alert"></div><div class="field-grid">${field("name", "Full name", "text", u.name)}${field("email", "Email address", "email", u.email)}</div><p class="subtle-note">${u.id === "demo" ? "You are editing the demonstration profile. Create a local account from the profile menu for a separate wedding plan." : "This email is your login identifier in this browser. Changes apply the next time you sign in."}</p><div class="form-actions"><button class="btn secondary" type="submit">Save profile</button></div></form></section></div><div class="stack"><section class="panel"><div class="panel-title"><h2>Keep your plans safe</h2>${icon("download")}</div><p class="subtle-note" style="margin-top:0">Your plan is saved in this browser. Export a backup to keep a copy or move it to another browser.</p><div class="setting-action">${button("Download JSON backup", "backup", "download", "secondary")}<p>Includes wedding details and planning records. Account passwords are never included.</p></div><hr class="divider"><div class="setting-action">${button("Restore a backup", "restore", "upload", "secondary")}<p>Choose an Everafter JSON backup. You can review the record counts before replacing your current plan.</p></div><input class="backup-input" id="backup-input" type="file" accept=".json,application/json"></section><section class="panel"><div class="panel-title"><h2>A fresh start</h2></div><div class="setting-action">${button("Load sample wedding", "reset-demo", "leaf", "secondary")}<p>Replace this plan with the fictional Aanya & Aarav demonstration wedding.</p></div><div class="setting-action">${button("Clear planning records", "clear-plan", "trash", "secondary")}<p>Remove tasks, guests, expenses, vendors, events and ideas. Wedding details stay unchanged.</p></div></section><section class="info-box">${icon("info")}<span>Frontend only: no backend, real payments, emails or shared accounts. Local sign-in and admin controls demonstrate the user flow; they are not secure access controls.</span></section></div></div>`
    );
  }
  function adminPage() {
    if (Store.current().role !== "admin")
      return empty(
        "admin",
        "Administrator view only.",
        "Use the demo account to explore this project feature.",
        false,
      );
    const users = Store.users();
    return (
      heading(
        "A little order behind the scenes.",
        "Manage local demonstration accounts and review changes in this wedding plan.",
      ) +
      `<div class="info-box">${icon("shield")}<span>These controls manage accounts on this browser only. They demonstrate admin workflows; browser data can be inspected and changed, so these are not production security boundaries.</span></div><div class="record-summary">${stat("Local accounts", users.length, "Created in this browser", "users")}${stat("Active accounts", users.filter((u) => u.enabled).length, "Able to use local sign-in", "check")}${stat("Administrators", users.filter((u) => u.role === "admin").length, "Demo administration role", "shield", "gold")}</div>` +
      table(
        ["Account", "Role", "Status", "Created", "Controls"],
        users
          .map(
            (u) =>
              `<tr><td><div class="name-cell"><span class="avatar">${e(initials(u.name))}</span><div><strong>${e(u.name)}</strong><small>${e(u.email)}</small></div></div></td><td>${e(u.role)}</td><td>${badge(u.enabled ? "Active" : "Disabled")}</td><td>${new Date(u.created).toLocaleDateString("en-IN")}</td><td>${u.id === "demo" || u.id === Store.current().id ? '<span class="muted">Protected account</span>' : `<div class="row-actions">${button(u.enabled ? "Disable" : "Enable", "admin-toggle", "", "secondary small", `data-id="${e(u.id)}"`)}${button("Change role", "admin-role", "", "secondary small", `data-id="${e(u.id)}"`)}<button class="icon-btn danger" aria-label="Delete account" data-action="admin-delete" data-id="${e(u.id)}">${icon("trash")}</button></div>`}</td></tr>`,
          )
          .join(""),
        `${users.length} local accounts`,
      ) +
      `<section class="panel section-space"><div class="panel-title"><h2>Activity in this wedding plan</h2><span class="badge">Last 20 changes</span></div><ul class="activity-list">${
        Store.plan()
          .activity.slice(0, 20)
          .map(
            (a) =>
              `<li>${e(a.text)}<small>${new Date(a.at).toLocaleString("en-IN")}</small></li>`,
          )
          .join("") ||
        '<li class="muted">Changes you make to this wedding will appear here.</li>'
      }</ul></section>`
    );
  }
  function openRecord(type, id = "", prefill = {}) {
    const p = Store.plan(),
      isEdit = Boolean(id),
      found = isEdit ? p[type].find((x) => x.id === id) : null;
    if (isEdit && !found) {
      toast("That record no longer exists.");
      return;
    }
    const v = found || {
      id: "",
      title: "",
      name: "",
      category: CATEGORIES[type]?.[0],
      due: localToday(),
      date: p.wedding.date,
      priority: "Medium",
      status:
        type === "tasks"
          ? "To do"
          : type === "vendors"
            ? "Discover"
            : "Planning",
      notes: "",
      side: "Both",
      party: 1,
      rsvp: "Pending",
      meal: "Vegetarian",
      amount: "",
      paid: 0,
      location: p.wedding.city,
      price: "",
      image: "venue.jpg",
      time: "16:00",
      end: "17:00",
      saved: true,
      ...prefill,
    };
    let fields = "";
    const dateExtra = 'min="1900-01-01" max="2100-12-31"';
    if (type === "tasks")
      fields =
        field("title", "Task name", "text", v.title, null, true, "", true) +
        field("category", "Category", "", v.category, CATEGORIES.tasks) +
        field("due", "Due date", "date", v.due, null, true, dateExtra) +
        field("priority", "Priority", "", v.priority, [
          "Low",
          "Medium",
          "High",
        ]) +
        field("status", "Status", "", v.status, Planner.statuses.tasks) +
        field("notes", "Notes", "textarea", v.notes, null, false, "", true);
    if (type === "guests")
      fields =
        field(
          "name",
          "Guest / party name",
          "text",
          v.name,
          null,
          true,
          "",
          true,
        ) +
        field("email", "Email address", "email", v.email, null, false) +
        field("phone", "Phone number", "tel", v.phone, null, false) +
        field("side", "Family / side", "", v.side, ["Bride", "Groom", "Both"]) +
        field(
          "party",
          "People in this party",
          "number",
          v.party,
          null,
          true,
          'min="1" max="20" step="1"',
        ) +
        field("rsvp", "RSVP status", "", v.rsvp, Planner.statuses.guests) +
        field("meal", "Meal preference", "", v.meal, [
          "Vegetarian",
          "Non-vegetarian",
          "Vegan",
          "Other",
        ]) +
        field(
          "table",
          "Table / seating group",
          "text",
          v.table,
          null,
          false,
          "",
          true,
        );
    if (type === "expenses")
      fields =
        field("title", "Expense name", "text", v.title, null, true, "", true) +
        field("category", "Category", "", v.category, CATEGORIES.expenses) +
        field("due", "Payment due date", "date", v.due, null, true, dateExtra) +
        field(
          "amount",
          "Estimated total cost (₹)",
          "number",
          v.amount,
          null,
          true,
          'min="0.01" max="1000000000" step="0.01"',
        ) +
        field(
          "paid",
          "Already paid (₹)",
          "number",
          v.paid,
          null,
          true,
          'min="0" max="1000000000" step="0.01"',
        ) +
        field("notes", "Notes", "textarea", v.notes, null, false, "", true);
    if (type === "vendors")
      fields =
        field("name", "Vendor name", "text", v.name, null, true, "", true) +
        field("category", "Category", "", v.category, CATEGORIES.vendors) +
        field("location", "City / location", "text", v.location) +
        field(
          "price",
          "Estimated quote (₹)",
          "number",
          v.price,
          null,
          true,
          'min="0" max="1000000000" step="0.01"',
        ) +
        field(
          "status",
          "Planning status",
          "",
          v.status,
          Planner.statuses.vendors,
        ) +
        field("contact", "Contact email", "email", v.contact, null, false) +
        field("image", "Cover photo", "", v.image, photoOptions()) +
        field(
          "notes",
          "Notes / services",
          "textarea",
          v.notes,
          null,
          false,
          "",
          true,
        );
    if (type === "events")
      fields =
        field("title", "Event name", "text", v.title, null, true, "", true) +
        field("date", "Event date", "date", v.date, null, true, dateExtra) +
        field("category", "Category", "", v.category, CATEGORIES.events) +
        field("time", "Start time", "time", v.time) +
        field("end", "End time", "time", v.end) +
        field("location", "Location", "text", v.location) +
        field("owner", "Coordinator", "text", v.owner, null, false) +
        field(
          "status",
          "Planning status",
          "",
          v.status,
          Planner.statuses.events,
        ) +
        field(
          "notes",
          "Details & dress code",
          "textarea",
          v.notes,
          null,
          false,
          "",
          true,
        );
    if (type === "ideas")
      fields =
        field("title", "Idea title", "text", v.title, null, true, "", true) +
        field("category", "Category", "", v.category, CATEGORIES.ideas) +
        field("image", "Inspiration photo", "", v.image, photoOptions()) +
        field("saved", "Collection", "", String(v.saved), [
          ["true", "Saved to my moodboard"],
          ["false", "Not saved yet"],
        ]) +
        field(
          "notes",
          "What you love about it",
          "textarea",
          v.notes,
          null,
          false,
          "",
          true,
        );
    openDialog(
      `${isEdit ? "Edit" : "Add"} ${titleOf(type)}`,
      `<form id="record-form" data-type="${type}" data-id="${e(id)}"><div class="form-error" role="alert"></div><div class="field-grid">${fields}</div><div class="form-actions"><button type="button" class="btn secondary" data-action="close">Cancel</button><button type="submit" class="btn">${icon("check")}${isEdit ? "Save changes" : "Add " + titleOf(type)}</button></div></form>`,
    );
  }
  function photoOptions() {
    return [
      ["venue.jpg", "Garden venue"],
      ["flowers.jpg", "Seasonal florals"],
      ["tablescape.jpg", "Reception table"],
      ["wedding-hero.jpg", "Wedding couple"],
      ["details.jpg", "Celebration details"],
    ];
  }
  function vendorDetail(id) {
    const v = Store.plan().vendors.find((v) => v.id === id);
    if (!v) return;
    openDialog(
      e(v.name),
      `<img class="modal-image" src="assets/${e(v.image)}" alt="${e(v.category)} inspiration"><div class="panel-title"><div>${badge(v.status)} <span class="muted" style="font-size:.8125rem">${e(v.category)} · ${e(v.location)}</span></div><strong>${money(v.price)}</strong></div><p>${e(v.notes)}</p><p class="subtle-note">Contact: ${e(v.contact || "Not added")}<br>Sample vendors are fictional. “Booked” records your planning status only.</p><div class="form-actions">${button("Edit details", "edit", "edit", "secondary", `data-type="vendors" data-id="${e(id)}"`)}${button("Add quote to budget", "vendor-expense", "wallet", "secondary", `data-id="${e(id)}"`)}${v.status !== "Booked" ? button("Mark as booked", "vendor-book", "check", "", `data-id="${e(id)}"`) : ""}</div>`,
    );
  }
  let confirmation = null;
  function confirmDialog(
    title,
    text,
    callback,
    label = "Confirm",
    danger = false,
  ) {
    confirmation = callback;
    openDialog(
      title,
      `<p>${e(text)}</p><div class="form-actions"><button type="button" class="btn secondary" data-action="close">Cancel</button><button type="button" class="btn ${danger ? "danger" : ""}" data-action="confirm">${label}</button></div>`,
    );
  }
  function renderAuth(mode) {
    const registering = mode === "register";
    app.innerHTML = `<div class="auth-screen"><section class="auth-image"><div class="auth-quote"><span class="eyebrow">THE BEGINNING OF SOMETHING BEAUTIFUL</span><h1>A little planning.<br>A lifetime of love.</h1><p>A thoughtful space for your happily ever after. Every detail, every person, every unforgettable moment.</p></div></section><main class="auth-main" id="main-content"><a class="brand" href="#dashboard" data-action="demo">${icon("flower")}<div><div class="brand-name">everafter.</div><div class="brand-tagline">YOUR FOREVER, TOGETHER</div></div></a><div class="auth-box"><h2>${registering ? "Your forever starts here." : "Welcome back, love."}</h2><p>${registering ? "Create your own space for the big day." : "A beautiful day is waiting to be planned."}</p><form id="auth-form" data-mode="${mode}"><div class="form-error" role="alert"></div>${registering ? field("name", "Your full name", "text", "", null, true, 'autocomplete="name"') : ""}${field("email", "Email address", "email", "", null, true, 'autocomplete="email"')}${field("password", "Local demo password", "password", "", null, true, `minlength="8" maxlength="100" autocomplete="${registering ? "new-password" : "current-password"}"`)}${registering ? field("confirm", "Confirm password", "password", "", null, true, 'minlength="8" maxlength="100" autocomplete="new-password"') + `<label class="check-label"><input type="checkbox" name="seed" checked>Start with the sample wedding records</label>` : ""}<button class="btn" type="submit">${registering ? "Create local account" : "Sign in"}</button></form><div class="auth-divider">or explore first</div>${button("Explore the demo wedding", "demo", "leaf", "secondary")}<div class="auth-foot">${registering ? "Already have a local account?" : "New to Everafter?"} <a class="text-btn" href="#${registering ? "login" : "register"}">${registering ? "Sign in" : "Create an account"}</a></div></div><p class="auth-notice">Frontend demonstration. Accounts exist only in this browser. Use a demo password, never a password you use elsewhere. No email is sent and no real account is created on a server.</p></main></div>`;
  }
  function openSearch() {
    openDialog(
      "Find a little detail.",
      `<div class="search-modal-input">${icon("search")}<input id="global-search" aria-label="Search all wedding records" placeholder="Try a guest, task, vendor or expense…" autocomplete="off" autofocus></div><div class="search-results" id="search-results"><p class="subtle-note">Start typing to search across your wedding.</p></div>`,
    );
  }
  function globalSearch(q) {
    q = q.toLowerCase().trim();
    const results = [];
    if (q)
      for (const type of [
        "tasks",
        "guests",
        "expenses",
        "vendors",
        "events",
        "ideas",
      ])
        for (const v of Store.plan()[type])
          if (Object.values(v).some((x) => String(x).toLowerCase().includes(q)))
            results.push({ type, v });
    $("#search-results").innerHTML = q
      ? results.length
        ? results
            .slice(0, 25)
            .map(
              ({ type, v }) =>
                `<button class="search-result" data-action="search-result" data-type="${type}" data-id="${e(v.id)}">${icon(APP_ROUTES.find((x) => x[0] === type)[1])}<span>${e(v.title || v.name)}<small>${e(APP_ROUTES.find((x) => x[0] === type)[2])} · ${e(v.category || v.email || v.location || "Planning record")}</small></span>${icon("edit")}</button>`,
            )
            .join("") +
          `<p class="subtle-note">${results.length} result${results.length === 1 ? "" : "s"}${results.length > 25 ? " · first 25 shown" : ""}</p>`
        : '<div class="empty"><h3>No details found.</h3><p>Try a name, category or a different keyword.</p></div>'
      : '<p class="subtle-note">Start typing to search across your wedding.</p>';
  }
  function reminders() {
    const tasks = Store.plan()
        .tasks.filter((t) => t.status !== "Done")
        .sort((a, b) => a.due.localeCompare(b.due))
        .slice(0, 8),
      expenses = Store.plan()
        .expenses.filter((x) => x.paid < x.amount)
        .sort((a, b) => a.due.localeCompare(b.due))
        .slice(0, 5);
    openDialog(
      "A gentle reminder.",
      `<p>Upcoming tasks and unpaid expenses, ordered by due date.</p><h3 class="serif section-space">Your next steps</h3>${tasks.map((t) => `<button class="search-result" data-action="edit" data-type="tasks" data-id="${e(t.id)}">${icon("checklist")}<span>${e(t.title)}<small>${date(t.due)}${t.due < localToday() ? " · Overdue" : ""}</small></span>${badge(t.priority)}</button>`).join("") || '<p class="subtle-note">All tasks complete.</p>'}<h3 class="serif section-space">Payments to plan for</h3>${expenses.map((v) => `<button class="search-result" data-action="edit" data-type="expenses" data-id="${e(v.id)}">${icon("wallet")}<span>${e(v.title)}<small>${date(v.due)} · ${money(v.amount - v.paid)} outstanding</small></span></button>`).join("") || '<p class="subtle-note">No outstanding payments.</p>'}`,
    );
  }
  function download(name, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Download prepared. Check your browser’s downloads.");
  }
  const exportFields = {
    tasks: ["title", "category", "due", "priority", "status", "notes"],
    guests: [
      "name",
      "email",
      "phone",
      "side",
      "party",
      "rsvp",
      "meal",
      "table",
    ],
    expenses: ["title", "category", "amount", "paid", "due", "notes"],
    vendors: [
      "name",
      "category",
      "location",
      "price",
      "status",
      "contact",
      "notes",
    ],
    events: [
      "title",
      "date",
      "time",
      "end",
      "location",
      "category",
      "status",
      "owner",
      "notes",
    ],
    ideas: ["title", "category", "notes", "saved"],
  };
  function exportCSV(type) {
    const fields = exportFields[type];
    download(
      "everafter-" + type + ".csv",
      Planner.csv([
        fields,
        ...Store.plan()[type].map((v) => fields.map((f) => v[f])),
      ]),
      "text/csv;charset=utf-8",
    );
  }
  function exportReport() {
    const p = Store.plan(),
      m = Planner.metrics(p);
    const rows = [
      ["EVERAFTER WEDDING REPORT"],
      ["Couple", p.wedding.partner1 + " & " + p.wedding.partner2],
      ["Wedding date", p.wedding.date],
      ["Venue", p.wedding.venue],
      ["Location", p.wedding.city],
      [],
      ["Metric", "Value"],
      ["Budget INR", p.wedding.budget],
      ["Planned spend INR", m.committed],
      ["Paid INR", m.paid],
      ["Outstanding INR", m.outstanding],
      ["Unallocated INR", m.remaining],
      ["Guests listed", m.guests],
      ["Guests confirmed", m.confirmed],
      ["Guests pending", m.pending],
      ["Guests declined", m.declined],
      ["Tasks completed", m.done],
      ["Tasks total", m.totalTasks],
      ["Vendors booked", m.booked],
    ];
    for (const type of ["tasks", "guests", "expenses", "vendors", "events"])
      rows.push(
        [],
        [type.toUpperCase()],
        exportFields[type],
        ...p[type].map((v) => exportFields[type].map((k) => v[k])),
      );
    download(
      "everafter-wedding-report.csv",
      Planner.csv(rows),
      "text/csv;charset=utf-8",
    );
  }
  function formError(form, error) {
    const target = $(".form-error", form);
    if (target) {
      target.innerHTML = `<p class="error-text">${e(error.message || error)}</p>`;
      target.scrollIntoView({ block: "nearest" });
    } else toast(error.message || String(error));
  }
  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (
      !["record-form", "wedding-form", "profile-form", "auth-form"].includes(
        form.id,
      )
    )
      return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const submit = $("[type=submit]", form);
    submit.disabled = true;
    try {
      if (form.id === "record-form") {
        const type = form.dataset.type;
        const record = Planner.record(type, { ...values, id: form.dataset.id });
        Store.put(type, record);
        closeDialog();
        afterSave(
          `${titleOf(type)[0].toUpperCase() + titleOf(type).slice(1)} ${form.dataset.id ? "updated" : "added"}.`,
        );
      }
      if (form.id === "wedding-form") {
        Store.plan().wedding = Planner.wedding(values);
        Store.activity("Updated wedding details");
        Store.save();
        render();
        toast("Your wedding details are saved.");
      }
      if (form.id === "profile-form") {
        const name = values.name.trim(),
          email = Planner.email(values.email);
        if (!name || !email) throw Error("Name and email are required.");
        Store.setProfile(name, email);
        render();
        toast("Profile updated.");
      }
      if (form.id === "auth-form") {
        if (form.dataset.mode === "register") {
          if (values.password !== values.confirm)
            throw Error("Your passwords do not match.");
          if (values.password.length < 8)
            throw Error("Choose a demo password with at least 8 characters.");
          if (!values.name.trim()) throw Error("Please enter your name.");
          await Store.register({
            ...values,
            name: values.name.trim(),
            email: Planner.email(values.email),
            seed: values.seed === "on",
          });
        } else await Store.login(values.email, values.password);
        navigate("dashboard");
        toast(
          form.dataset.mode === "register"
            ? "Your planning space is ready."
            : "Welcome back.",
        );
      }
      if (Store.warning()) {
        toast(Store.warning());
        Store.clearWarning();
      }
    } catch (error) {
      formError(form, error);
    } finally {
      submit.disabled = false;
    }
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".skip-link")) {
      event.preventDefault();
      $("#main-content")?.focus();
      return;
    }
    const el = event.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action,
      id = el.dataset.id,
      type = el.dataset.type;
    if (el.tagName === "A") event.preventDefault();
    try {
      if (action === "close") {
        closeDialog();
        return;
      }
      if (action === "confirm") {
        const cb = confirmation;
        confirmation = null;
        closeDialog();
        if (cb) cb();
        return;
      }
      if (action === "route") {
        closeDialog();
        navigate(el.dataset.route);
        return;
      }
      if (action === "menu") {
        $(".sidebar").classList.add("open");
        $(".mobile-scrim").classList.add("open");
        $(".mobile-menu").setAttribute("aria-expanded", "true");
        syncDrawer();
        $(".sidebar a")?.focus();
        return;
      }
      if (action === "menu-close") {
        $(".sidebar").classList.remove("open");
        $(".mobile-scrim").classList.remove("open");
        $(".mobile-menu").setAttribute("aria-expanded", "false");
        syncDrawer();
        $(".mobile-menu")?.focus();
        return;
      }
      if (action === "add" || action === "edit" || action === "search-result") {
        openRecord(type, id || "");
        return;
      }
      if (action === "delete") {
        const v = Store.plan()[type].find((x) => x.id === id);
        if (!v) return;
        confirmDialog(
          "Remove this " + titleOf(type) + "?",
          `“${v.title || v.name}” will be removed from this wedding plan. You can export a backup from Settings first.`,
          () => {
            Store.remove(type, id);
            afterSave("Record removed.");
          },
          "Remove",
          true,
        );
        return;
      }
      if (action === "toggle-task") {
        const t = Store.plan().tasks.find((x) => x.id === id);
        Store.put("tasks", {
          ...t,
          status: t.status === "Done" ? "To do" : "Done",
        });
        afterSave(
          t.status === "Done" ? "Task reopened." : "One lovely detail, done.",
        );
        return;
      }
      if (action === "shortlist") {
        const v = Store.plan().vendors.find((x) => x.id === id);
        Store.put("vendors", {
          ...v,
          status: v.status === "Shortlisted" ? "Discover" : "Shortlisted",
        });
        afterSave(
          v.status === "Shortlisted"
            ? "Removed from your shortlist."
            : "Added to your shortlist.",
        );
        return;
      }
      if (action === "vendor-detail") {
        vendorDetail(id);
        return;
      }
      if (action === "vendor-book") {
        const v = Store.plan().vendors.find((x) => x.id === id);
        Store.put("vendors", { ...v, status: "Booked" });
        closeDialog();
        afterSave("Vendor marked as booked in your planner.");
        return;
      }
      if (action === "vendor-expense") {
        const v = Store.plan().vendors.find((x) => x.id === id);
        const title = v.name + " — " + v.category;
        if (Store.plan().expenses.some((x) => x.title === title)) {
          toast("This vendor quote is already in your budget.");
          return;
        }
        openRecord("expenses", "", {
          title,
          category: CATEGORIES.expenses.includes(v.category)
            ? v.category
            : "Other",
          amount: v.price || "",
          notes: "Quote from " + v.name + ". Confirm the amount before saving.",
        });
        return;
      }
      if (action === "save-idea") {
        const v = Store.plan().ideas.find((x) => x.id === id);
        Store.put("ideas", { ...v, saved: !v.saved });
        afterSave(
          v.saved
            ? "Idea removed from saved collection."
            : "Saved to your moodboard.",
        );
        return;
      }
      if (action === "journey") {
        Store.plan().journey = Number(el.dataset.stage);
        Store.activity("Updated the planning journey stage");
        Store.save();
        afterSave("Planning stage updated.");
        return;
      }
      if (action === "search") {
        openSearch();
        return;
      }
      if (action === "notifications") {
        reminders();
        return;
      }
      if (action === "export") {
        exportCSV(type);
        return;
      }
      if (action === "report-export") {
        exportReport();
        return;
      }
      if (action === "print") {
        window.print();
        return;
      }
      if (action === "backup") {
        download(
          "everafter-wedding-backup.json",
          JSON.stringify(
            {
              format: "everafter-plan",
              version: 1,
              exported: new Date().toISOString(),
              plan: Store.plan(),
            },
            null,
            2,
          ),
          "application/json",
        );
        return;
      }
      if (action === "restore") {
        $("#backup-input").click();
        return;
      }
      if (action === "reset-demo") {
        confirmDialog(
          "Load the sample wedding?",
          "This replaces all records and wedding details in your current plan. Export a backup first if you want to keep them.",
          () => {
            Store.reset(false);
            render();
            toast("The sample wedding is ready.");
          },
          "Load sample",
          true,
        );
        return;
      }
      if (action === "clear-plan") {
        confirmDialog(
          "Clear your planning records?",
          "All tasks, guests, expenses, vendors, events and ideas in this plan will be removed. Your wedding details and profile stay saved.",
          () => {
            const w = { ...Store.plan().wedding };
            Store.reset(true);
            Store.plan().wedding = w;
            Store.activity("Cleared planning records");
            Store.save();
            render();
            toast("Your plan is ready for a fresh start.");
          },
          "Clear records",
          true,
        );
        return;
      }
      if (action === "demo") {
        Store.demo();
        closeDialog();
        navigate("dashboard");
        return;
      }
      if (action === "logout") {
        Store.logout();
        closeDialog();
        navigate("login");
        return;
      }
      if (action === "profile") {
        const u = Store.current();
        openDialog(
          "Your planning space",
          `<div class="name-cell"><span class="avatar">${e(initials(u.name))}</span><div><strong>${e(u.name)}</strong><small>${e(u.email)} · ${u.id === "demo" ? "Demonstration account" : e(u.role)}</small></div></div><div class="profile-menu section-space"><button data-action="route" data-route="settings">${icon("user")}Profile & wedding settings</button>${u.id === "demo" ? '<button data-action="route" data-route="register">' + icon("plus") + 'Create a local account</button><button data-action="route" data-route="login">' + icon("user") + "Sign in to your local account</button>" : ""}${u.role === "admin" ? '<button data-action="route" data-route="admin">' + icon("shield") + "Demo admin controls</button>" : ""}<button data-action="logout">${icon("logout")}Sign out</button></div>`,
        );
        return;
      }
      if (action.startsWith("admin-")) {
        const u = Store.users().find((u) => u.id === id);
        if (!u) return;
        const operation =
          action === "admin-delete"
            ? "delete"
            : action === "admin-role"
              ? "role"
              : "toggle";
        confirmDialog(
          operation === "delete"
            ? "Delete local account?"
            : operation === "role"
              ? "Change this account’s role?"
              : "Change local account access?",
          operation === "delete"
            ? `${u.name} and all their wedding records will be removed from this browser.`
            : operation === "role"
              ? `${u.name} will become ${u.role === "admin" ? "a planner" : "a demo administrator"}.`
              : `${u.name} will be ${u.enabled ? "disabled" : "enabled"} for local sign-in.`,
          () => {
            Store.adminUpdate(id, operation);
            afterSave("Local account updated.");
          },
          operation === "delete" ? "Delete account" : "Confirm",
          operation === "delete",
        );
        return;
      }
      if (action === "about") {
        openDialog(
          "Thoughtfully built. Frontend only.",
          `<p><strong>Everafter</strong> is a wedding planning project by <strong>Kartik Patel</strong>, built with semantic HTML, responsive CSS and vanilla JavaScript.</p><div class="info-box section-space">${icon("info")}<span>Everything is stored in your browser’s localStorage. There is no backend, database server, real payment, booking or email service. Local accounts and admin roles demonstrate interface flows only.</span></div><p>Explore the sample wedding, then create a separate local account or customise the details in Settings. Export a JSON backup before clearing browser data.</p><p class="subtle-note">Photographs: Unsplash. Fonts: DM Sans and Playfair Display, bundled locally. All wedding records, vendors and quotes are fictional demo content.</p>`,
        );
        return;
      }
    } catch (error) {
      toast(error.message || String(error));
    }
  });
  document.addEventListener("input", (event) => {
    if (event.target.id === "global-search") {
      globalSearch(event.target.value);
      return;
    }
    if (event.target.dataset.filter === "q") {
      filter.q = event.target.value;
      updateRecords();
    }
  });
  document.addEventListener("change", async (event) => {
    const el = event.target;
    if (el.dataset.filter && el.dataset.filter !== "q") {
      filter[el.dataset.filter] = el.value;
      updateRecords();
      return;
    }
    if (el.dataset.statusType) {
      const type = el.dataset.statusType;
      const v = Store.plan()[type].find((x) => x.id === el.dataset.id);
      try {
        Store.put(type, Planner.record(type, { ...v, rsvp: el.value }));
        afterSave("RSVP updated.");
      } catch (error) {
        toast(error.message);
      }
      return;
    }
    if (el.id === "backup-input" && el.files[0]) {
      const file = el.files[0];
      try {
        if (file.size > 5000000)
          throw Error("Choose a JSON backup smaller than 5 MB.");
        const plan = Planner.backup(JSON.parse(await file.text()));
        const count = [
          "tasks",
          "guests",
          "expenses",
          "vendors",
          "events",
          "ideas",
        ]
          .map((k) => `${plan[k].length} ${k}`)
          .join(", ");
        confirmDialog(
          "Restore this wedding plan?",
          `${plan.wedding.partner1} & ${plan.wedding.partner2}: ${count}. This will replace the current plan; your profile is unchanged.`,
          () => {
            Store.restore(plan);
            render();
            toast("Your wedding plan is restored.");
          },
          "Restore plan",
          true,
        );
      } catch (error) {
        toast(
          error instanceof SyntaxError
            ? "This file is not valid JSON."
            : error.message,
        );
      } finally {
        el.value = "";
      }
    }
  });
  function updateRecords() {
    const views = {
      tasks: tasksList,
      guests: guestsList,
      expenses: expensesList,
      vendors: vendorsList,
      events: eventsList,
      ideas: ideasList,
    };
    if (views[route] && $("#records")) $("#records").innerHTML = views[route]();
  }
  document.addEventListener("keydown", (event) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k" &&
      Store.current()
    ) {
      event.preventDefault();
      openSearch();
    }
    if (event.key === "Escape" && $(".sidebar.open")) {
      $(".sidebar").classList.remove("open");
      $(".mobile-scrim").classList.remove("open");
      $(".mobile-menu").setAttribute("aria-expanded", "false");
      syncDrawer();
      $(".mobile-menu")?.focus();
    }
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      const rect = modal.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        closeDialog();
    }
  });
  window.addEventListener("hashchange", () => {
    route = location.hash.slice(1) || "dashboard";
    filter = { q: "", status: "All", category: "All", side: "All" };
    closeDialog();
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  route = location.hash.slice(1) || "dashboard";
  render();
  if (Store.warning()) {
    toast(Store.warning());
    Store.clearWarning();
  }
})();
