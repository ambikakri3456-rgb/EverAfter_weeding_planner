/* Pure business rules: shared by forms, reports, backups and tests. */
window.Planner = (() => {
  const statuses = {
    tasks: ["To do", "In progress", "Done"],
    guests: ["Pending", "Confirmed", "Declined"],
    vendors: ["Discover", "Shortlisted", "Contacted", "Booked"],
    events: ["Planning", "Confirmed", "Completed"],
  };
  const validDate = (v) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    v >= "1900-01-01" &&
    v <= "2100-12-31" &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v;
  const text = (v, max = 300) =>
    String(v ?? "")
      .trim()
      .slice(0, max);
  const requireText = (v, label, max = 100) => {
    const s = text(v, max);
    if (!s) throw Error(`${label} is required.`);
    return s;
  };
  const number = (v, label, min = 0, max = 1000000000, integer = false) => {
    const n = Number(v);
    if (
      v === "" ||
      v === null ||
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      (integer && !Number.isInteger(n))
    )
      throw Error(
        `${label} must be ${integer ? "a whole number" : "a number"} between ${min} and ${max}.`,
      );
    return Math.round(n * 100) / 100;
  };
  const option = (v, options, label) => {
    if (!options.includes(v)) throw Error(`Choose a valid ${label}.`);
    return v;
  };
  const date = (v, label) => {
    if (!validDate(v)) throw Error(`Enter a valid ${label} (1900–2100).`);
    return v;
  };
  const email = (v) => {
    v = text(v, 150).toLowerCase();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      throw Error("Enter a valid email address.");
    return v;
  };
  function record(type, v) {
    if (!v || typeof v !== "object") throw Error("Invalid record.");
    const id = text(v.id, 100);
    const notes = text(v.notes, 1000);
    switch (type) {
      case "tasks":
        return {
          id,
          title: requireText(v.title, "Task title"),
          category: option(v.category, CATEGORIES.tasks, "category"),
          due: date(v.due, "due date"),
          priority: option(v.priority, ["Low", "Medium", "High"], "priority"),
          status: option(v.status, statuses.tasks, "status"),
          notes,
        };
      case "guests":
        return {
          id,
          name: requireText(v.name, "Guest name"),
          email: email(v.email),
          phone: text(v.phone, 30),
          side: option(v.side, ["Bride", "Groom", "Both"], "side"),
          party: number(v.party, "Party size", 1, 20, true),
          rsvp: option(v.rsvp, statuses.guests, "RSVP"),
          meal: option(
            v.meal,
            ["Vegetarian", "Non-vegetarian", "Vegan", "Other"],
            "meal",
          ),
          table: text(v.table, 30),
        };
      case "expenses": {
        const amount = number(v.amount, "Estimated cost", 0.01);
        const paid = number(v.paid, "Amount paid");
        if (paid > amount)
          throw Error("Amount paid cannot exceed the total cost.");
        return {
          id,
          title: requireText(v.title, "Expense name"),
          category: option(v.category, CATEGORIES.expenses, "category"),
          amount,
          paid,
          due: date(v.due, "payment date"),
          notes,
        };
      }
      case "vendors":
        return {
          id,
          name: requireText(v.name, "Vendor name"),
          category: option(v.category, CATEGORIES.vendors, "category"),
          location: requireText(v.location, "Location"),
          price: number(v.price, "Quoted price"),
          status: option(v.status, statuses.vendors, "status"),
          contact: email(v.contact),
          image: option(
            v.image,
            [
              "venue.jpg",
              "flowers.jpg",
              "tablescape.jpg",
              "wedding-hero.jpg",
              "details.jpg",
            ],
            "photo",
          ),
          notes,
        };
      case "events": {
        const time = optionTime(v.time),
          end = optionTime(v.end);
        if (end <= time)
          throw Error(
            "End time must be after start time. Split overnight events into two entries.",
          );
        return {
          id,
          title: requireText(v.title, "Event name"),
          date: date(v.date, "event date"),
          time,
          end,
          location: requireText(v.location, "Location"),
          category: option(v.category, CATEGORIES.events, "category"),
          status: option(v.status, statuses.events, "status"),
          owner: text(v.owner, 100),
          notes,
        };
      }
      case "ideas":
        return {
          id,
          title: requireText(v.title, "Idea title"),
          category: option(v.category, CATEGORIES.ideas, "category"),
          image: option(
            v.image,
            [
              "venue.jpg",
              "flowers.jpg",
              "tablescape.jpg",
              "wedding-hero.jpg",
              "details.jpg",
            ],
            "photo",
          ),
          notes,
          saved: v.saved === true || v.saved === "true" || v.saved === "on",
        };
      default:
        throw Error("Unknown record type.");
    }
  }
  function optionTime(v) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))
      throw Error("Enter a valid start and end time.");
    return v;
  }
  function wedding(v) {
    return {
      partner1: requireText(v.partner1, "First partner", 60),
      partner2: requireText(v.partner2, "Second partner", 60),
      date: date(v.date, "wedding date"),
      venue: requireText(v.venue, "Venue"),
      city: requireText(v.city, "City"),
      budget: number(v.budget, "Budget", 1),
      targetGuests: number(v.targetGuests, "Guest target", 1, 100000, true),
      note: text(v.note, 1000),
      theme: text(v.theme, 100),
    };
  }
  function metrics(p) {
    const sum = (arr, key) => arr.reduce((n, x) => n + Number(x[key] || 0), 0);
    const guests = sum(p.guests, "party"),
      confirmed = sum(
        p.guests.filter((x) => x.rsvp === "Confirmed"),
        "party",
      ),
      pending = sum(
        p.guests.filter((x) => x.rsvp === "Pending"),
        "party",
      ),
      declined = sum(
        p.guests.filter((x) => x.rsvp === "Declined"),
        "party",
      );
    const committed = sum(p.expenses, "amount"),
      paid = sum(p.expenses, "paid");
    return {
      guests,
      confirmed,
      pending,
      declined,
      committed,
      paid,
      outstanding: committed - paid,
      remaining: p.wedding.budget - committed,
      done: p.tasks.filter((x) => x.status === "Done").length,
      totalTasks: p.tasks.length,
      booked: p.vendors.filter((x) => x.status === "Booked").length,
      progress: p.tasks.length
        ? Math.round(
            (p.tasks.filter((x) => x.status === "Done").length /
              p.tasks.length) *
              100,
          )
        : 0,
    };
  }
  function expenseStatus(e) {
    return e.paid >= e.amount ? "Paid" : e.paid > 0 ? "Part paid" : "Unpaid";
  }
  function categories(p) {
    return CATEGORIES.expenses
      .map((name) => ({
        name,
        total: p.expenses
          .filter((e) => e.category === name)
          .reduce((s, e) => s + e.amount, 0),
      }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);
  }
  function backup(input) {
    if (
      !input ||
      input.format !== "everafter-plan" ||
      input.version !== 1 ||
      !input.plan
    )
      throw Error("Choose an Everafter JSON backup (version 1).");
    const src = input.plan,
      out = { wedding: wedding(src.wedding || {}), activity: [], journey: 0 };
    for (const type of [
      "tasks",
      "guests",
      "expenses",
      "vendors",
      "events",
      "ideas",
    ]) {
      if (!Array.isArray(src[type]) || src[type].length > 5000)
        throw Error(`Backup contains invalid ${type} data.`);
      const ids = new Set();
      out[type] = src[type].map((v) => {
        const r = record(type, v);
        if (!r.id || ids.has(r.id))
          throw Error(`Backup contains missing or duplicate ${type} IDs.`);
        ids.add(r.id);
        return r;
      });
    }
    out.journey = number(src.journey ?? 0, "Planning stage", 0, 3, true);
    return out;
  }
  function csv(rows) {
    return (
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map((v) => {
              let value = String(v ?? "");
              if (/^[=+\-@\t\r]/.test(value)) value = "'" + value;
              return '"' + value.replace(/"/g, '""') + '"';
            })
            .join(","),
        )
        .join("\r\n")
    );
  }
  return {
    record,
    wedding,
    metrics,
    expenseStatus,
    categories,
    backup,
    csv,
    statuses,
    validDate,
    email,
  };
})();
