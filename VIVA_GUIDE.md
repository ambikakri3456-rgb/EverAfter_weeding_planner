# Everafter — Viva Guide
**Kartik Patel · Wedding Planning Website · HTML, CSS & JavaScript**

## 1. Your opening explanation
“My project is Everafter, a frontend wedding planning website. It solves the problem of wedding information being scattered across messages, notebooks and spreadsheets. It brings tasks, guests, budget, vendors and events into one responsive dashboard. I used HTML for structure, CSS for design and JavaScript for interaction and validation. Data is saved using localStorage, so this version does not need an application backend.”

Say this in your own words. Know the code you show; do not claim that this frontend provides real online authentication, vendor bookings or payments.

## 2. A five-minute demonstration
| Time | Show | Explain |
| --- | --- | --- |
| 0:00–0:35 | Overview | The problem, project name, four live summary cards and wedding countdown. |
| 0:35–1:10 | Settings | Edit the couple names, date or budget. Save and show the updated overview. |
| 1:10–2:00 | Guest list | Add a guest with a party of two, confirm the RSVP, search for it, edit it and explain deletion confirmation. |
| 2:00–2:40 | Checklist | Complete a task and show the progress change. Filter by Done. |
| 2:40–3:20 | Budget | Add an expense; deliberately enter paid greater than cost to demonstrate validation, then correct it. |
| 3:20–3:50 | Vendors and timeline | Shortlist a vendor, explain booked status and show the order of wedding events. |
| 3:50–4:25 | Reports | Explain derived statistics, CSV export and Print / Save PDF. |
| 4:25–5:00 | Refresh, backup, code | Refresh to show persistence; explain localStorage, demonstrate the JSON backup, then show the source file map. |

Before your viva, open the project once, check the browser and keep a backup. Use invented demo contacts. The demo opens without a password. Prepare a separate local account beforehand if you want to demonstrate registration and login.

## 3. Explain the files simply
- **index.html:** The document skeleton. It has metadata, CSS links, script tags, the app container, the native dialog and an accessible toast region.
- **styles.css:** Visual design, Flexbox/Grid layouts, responsive breakpoints, animations, focus states, reduced-motion support and print styling.
- **icons.js:** SVG icons stored as markup so no icon library is needed.
- **data.js:** Fictional sample objects, allowed categories and sidebar routes.
- **model.js:** Business rules. It validates records, computes totals, derives payment status and validates imported backups.
- **store.js:** Data persistence and CRUD. It also stores demonstration accounts and one plan for each account.
- **app.js:** The UI controller. It creates each screen, handles forms and clicks, changes routes, opens dialogs, searches records and prepares downloads.

The scripts use `defer`, so the HTML is parsed before they execute. They execute in document order: icons → data → model → store → app. There is no bundler or import system required.

## 4. Follow one record through the code
Use “Add guest” as your example:

1. The button contains `data-action="add"` and `data-type="guests"`.
2. The shared click listener in `app.js` sees that action and calls `openRecord()`.
3. The dialog shows labelled inputs with HTML validation attributes.
4. Submitting the form uses `preventDefault()` so the page does not reload.
5. `FormData` collects the fields into an object.
6. `Planner.record('guests', values)` validates and normalises the record.
7. `Store.put()` adds a unique ID and appends or updates the array.
8. `Store.save()` calls `JSON.stringify()` and writes to localStorage.
9. The UI re-renders the current screen and recalculates totals.
10. A toast confirms that the record was saved.

For an edit, the record already has an ID. `findIndex()` locates that ID and replaces the object instead of adding a duplicate. Deletion finds the specific ID and removes that item after confirmation.

## 5. The data model
Each local account owns a plan containing:

| Property | Data stored |
| --- | --- |
| `wedding` | Partners, wedding date, venue, city, budget, guest target, theme, note |
| `tasks` | Title, category, due date, priority, status, notes |
| `guests` | Name, email, phone, family side, party size, RSVP, meal, table |
| `expenses` | Title, category, estimated cost, paid amount, due date, notes |
| `vendors` | Name, service, city, quote, planning status, email, photo, notes |
| `events` | Title, date, start/end time, location, category, status, coordinator |
| `ideas` | Title, category, photo, notes, saved flag |
| `activity` | A bounded history of changes to that wedding plan |
| `journey` | The selected planning stage |

The persisted object has `version`, `active`, `users` and `plans`. The localStorage key is `everafter.project.v1`. Account plans are indexed by their account IDs. This is structured JSON in the browser, not a relational database.

## 6. Calculations you should know
- **Guests listed:** add the `party` value from every guest row.
- **Confirmed guests:** filter rows with RSVP `Confirmed`, then sum party sizes.
- **Planned cost:** sum `amount` across expenses.
- **Paid:** sum `paid` across expenses.
- **Outstanding:** planned cost minus paid amount.
- **Unallocated budget:** wedding budget minus planned cost. A negative result is over budget.
- **Task progress:** completed tasks divided by all tasks, multiplied by 100. Return 0 if there are no tasks to avoid division by zero.
- **Booked vendors:** count vendor records with status `Booked`.
- **Payment status:** paid amount 0 → Unpaid; paid less than cost → Part paid; paid equal to cost → Paid.

Example: an expense costs ₹10,000 and ₹3,000 has been paid. Its outstanding amount is ₹7,000, and its status is Part paid. A party of three marked Confirmed adds three people to the confirmed total.

## 7. Common viva questions and short answers

### Q1. What is the objective of this project?
To give users one convenient place to manage wedding details, reduce scattered information and track planning progress through a clear workflow.

### Q2. Why did you use HTML, CSS and JavaScript separately?
Separation of concerns: HTML defines structure, CSS defines presentation, and JavaScript defines behaviour. Separate files are easier to understand and maintain.

### Q3. What is semantic HTML?
Using elements according to their meaning, such as `header`, `nav`, `main`, `section`, `article`, `form`, `label` and `table`. It improves structure and helps assistive technologies.

### Q4. Is this a single-page application?
Yes. JavaScript changes the content in the main container. Hash URLs such as `#guests` select screens without a full page request. It is a small SPA written without a framework.

### Q5. What is the DOM?
The Document Object Model is the browser's tree representation of the page. JavaScript queries elements, reads form values and updates what the user sees.

### Q6. What is CRUD?
Create, Read, Update and Delete. Adding a guest is Create, listing guests is Read, changing their RSVP is Update and removing a guest is Delete.

### Q7. How do you know which record to edit?
Every record has a unique ID. The edit control carries the ID in a `data-id` attribute, and the store finds the matching object.

### Q8. What is localStorage?
A browser API that stores string key/value pairs for a site. It normally persists across refreshes and browser restarts until the data is cleared. Storage policies, private browsing and quotas can affect it.

### Q9. Why use JSON.stringify and JSON.parse?
localStorage stores strings. `JSON.stringify()` converts the JavaScript object into a string; `JSON.parse()` converts that string back into structured data.

### Q10. What is the difference between localStorage and sessionStorage?
localStorage usually persists between browsing sessions. sessionStorage is tied to the current tab session. This project uses localStorage so wedding plans survive refreshes and restarts.

### Q11. Does it have a backend?
No. It has no application server, server database or API. An optional static server simply serves the HTML, CSS, JS and image files to the browser.

### Q12. Is login secure in this project?
It is only a local demonstration. Passwords are salted and hashed with SHA-256, but all data and role checks remain in the browser and can be modified. Production login needs server-enforced authentication and authorisation, secure sessions and stronger password storage practices.

### Q13. What is the difference between authentication and authorisation?
Authentication checks who the user is. Authorisation checks what that user may do. The project demonstrates both flows locally, but it cannot securely enforce either without a backend.

### Q14. What can the demo administrator do?
View local accounts, enable or disable accounts, change demonstration roles and delete accounts. The default demo account and the currently active admin are protected from these controls. Activity shown belongs to the current wedding plan.

### Q15. How is form validation implemented?
HTML checks required fields, email input, number limits and date input. JavaScript adds business rules such as paid amount not exceeding cost, valid statuses and event end time after start time.

### Q16. Why is JavaScript validation still needed?
HTML checks basic input format. It cannot express every rule involving several fields. The same JavaScript validators also check imported JSON backups.

### Q17. What does preventDefault do here?
It stops the form's normal navigation/reload, allowing JavaScript to validate, save and update the current screen.

### Q18. What is event delegation?
A parent element handles events from its children. The app listens at document level and uses `closest('[data-action]')` to identify the action. Newly rendered buttons work without attaching a separate listener to every button.

### Q19. How does search work?
The app normalises the search term to lowercase and uses array filtering to compare it with record values. Section filters combine text search with status/category/family selection. Header search searches all six record types.

### Q20. Which array methods do you use?
`filter()` selects records, `map()` creates output, `reduce()` calculates totals, `find()` locates a record, `findIndex()` locates an update position and `sort()` orders tasks/events by date.

### Q21. How is the website responsive?
CSS Grid and Flexbox create adaptable layouts. Media queries change columns and spacing. The desktop sidebar becomes a mobile drawer, and wide tables scroll horizontally inside their own containers.

### Q22. What is a CSS custom property?
A reusable CSS value such as `--green`. Using `var(--green)` across components makes the colour theme easy to change consistently.

### Q23. How do you create the charts without a chart library?
The budget donut uses a CSS conic gradient based on category proportions. Progress bars use calculated widths. The data is also shown in text so users do not depend on colour alone.

### Q24. How do exports work?
JavaScript turns records into CSV or JSON text, creates a Blob and a temporary object URL, then triggers a download with an anchor. The temporary URL is revoked afterward.

### Q25. How do you prevent invalid backup imports?
The importer checks file size, format/version, required arrays, record limits, IDs, dates, allowed categories, image names and business rules. It builds a fresh allowed object, then asks for confirmation before replacing the current plan.

### Q26. How do you handle user-entered HTML?
Dynamic text is escaped before being inserted into HTML templates. Characters such as `<`, `>`, `&` and quotes are converted into entities. Input is treated as text, not executable markup.

### Q27. Why protect CSV output from formulas?
Some spreadsheet programs interpret values beginning with characters such as `=` as formulas. The CSV exporter prefixes these values so user-entered text remains text. It also quotes fields and doubles embedded quotes.

### Q28. What accessibility features did you add?
Associated labels, semantic controls, visible focus outlines, alternative text, a skip link, native dialogs, accessible button names, a live toast region and reduced-motion CSS. The closed mobile drawer is removed from keyboard interaction.

### Q29. Does marking a vendor Booked make a real booking?
No. It changes a planning record only. There is no vendor service integration. Quotes enter the budget only through an explicit added expense.

### Q30. What are the main limitations and future improvements?
The current version has local data only. Future work could add a backend, secure accounts and roles, a database, shared collaboration, real invitation delivery, verified vendors, live availability and controlled payment integration. Those are future features, not present capabilities.

### Q31. What happens if localStorage is unavailable or full?
The app catches the storage error, keeps the current changes in memory and shows a warning. The user can export a backup before closing the page.

### Q32. Why use a native dialog?
The HTML `dialog` element provides modal behaviour and browser-managed focus containment. It supports Escape to close and provides a structured place for accessible form content.

### Q33. How do you test this project?
I check real interface workflows in the browser and use separate model tests for calculations, validation, persistence, account isolation, admin guards and backup handling. Automated tests use temporary in-memory data rather than the user's records.

### Q34. Why store estimated cost and paid amount separately?
A booked service may require only a deposit initially. Keeping both values makes the remaining payment visible and prevents falsely treating every planned expense as fully paid.

### Q35. Why are vendor quotes separate from budget expenses?
Users can compare several vendors without counting all those quotes as commitments. They deliberately add the chosen quote to the budget when ready.

## 8. Code you should be ready to explain
```js
const confirmedPeople = guests
  .filter(guest => guest.rsvp === 'Confirmed')
  .reduce((total, guest) => total + guest.party, 0);
```
`filter` keeps confirmed guest parties. `reduce` adds each party size to a running total starting from zero.

```js
localStorage.setItem('everafter.project.v1', JSON.stringify(data));
```
This stores a JSON string under a stable key. On load, the app reads the key and parses the JSON inside a try/catch block.

```js
if (paid > amount) {
  throw new Error('Amount paid cannot exceed the total cost.');
}
```
This is a business validation rule involving two fields. The form handler catches the error and shows it inside the dialog.

## 9. Before presenting
- Extract and run the project before the viva; keep all asset folders together.
- Use the demo wedding so the dashboard has realistic records.
- Know the distinction between frontend storage and a server database.
- Practise adding, editing and deleting a guest and an expense.
- Practise explaining how a changed record updates the reports.
- Keep a JSON backup before resetting your plan.
- Use the actual code and your own explanation; avoid memorising claims you cannot demonstrate.
