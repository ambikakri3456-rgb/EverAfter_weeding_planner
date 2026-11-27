# Everafter — Wedding Planning Website
**HTML project by Kartik Patel | Frontend only**

A complete wedding planning dashboard built with HTML5, CSS3 and vanilla JavaScript. No backend, database server, framework, package installation or build step is needed to use the website.

## Start here — Windows / VS Code
1. Extract the ZIP completely. Do not open the website from inside the ZIP.
2. Open the extracted `Everafter-Wedding-Planner` folder.
3. Double-click `index.html` to explore the demonstration wedding.
4. For your viva and the most reliable local account/storage behaviour, open the folder in VS Code, then open `index.html` using **Live Server**. Keep using the same browser and URL so your saved data stays available.
5. Use **Explore the demo wedding** if the sign-in screen appears. There is no demo password to remember.
6. Open **Settings** to change the couple, wedding date, location, budget and guest target.
7. Read `docs/VIVA_GUIDE.html` before your presentation. You can print it or use your browser's Print → Save as PDF.

The fonts, photographs and icons are included. The extracted site makes no external requests and works offline. Opening local files is supported for the demo, but browser policies for `file://` storage and Web Crypto vary; use a local static server if account creation is unavailable. Live Server serves static files only — it is not an application backend.

## Optional alternative preview
If Python is already installed, open a terminal in the extracted project folder and run:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`. On Windows, `py -m http.server 5500` is another option. Stop with Ctrl+C. Node.js is not needed to use the website.

## Included features
- Responsive overview with live guest, task, vendor and budget totals.
- Local demo registration, sign-in, sign-out and profile editing.
- Separate wedding plans for each local account.
- Full create, read, update and delete flows for tasks, guests, expenses, vendors, events and inspiration ideas.
- Search across the wedding and section-specific search/status/category filters.
- RSVP, meal, party size, seating group and family-side tracking.
- Budget, committed cost, paid amount, remaining payment and over-budget reporting.
- Vendor shortlist → contacted → booked workflow, with an explicit “Add quote to budget” step.
- Task priorities, due dates, completion, reminders and planning stages.
- Multi-day wedding timeline with start/end times, location, coordinator and status.
- Saved inspiration moodboard.
- CSV exports, consolidated CSV report and printable reports/timeline.
- Validated JSON backup and restore, with confirmation before replacement.
- Local demo admin: enable/disable accounts, change roles, delete accounts and view activity in the current wedding plan.
- Accessible labels, keyboard focus styles, native modal dialogs and reduced-motion support.

## Source file map
| File | Responsibility |
| --- | --- |
| `index.html` | Semantic document, CSS links, ordered scripts, application mount, accessible dialog and toast region |
| `css/styles.css` | Palette, typography, responsive layout, components, animation, mobile navigation and print styles |
| `js/icons.js` | Self-contained SVG icons |
| `js/data.js` | Fictional demo wedding, category definitions and route list |
| `js/model.js` | Validation, totals, expense status, backup schema and CSV escaping |
| `js/store.js` | localStorage persistence, CRUD, local accounts, plan isolation and demo admin state |
| `js/app.js` | Screen templates, routing, forms, event delegation, search, exports and interaction logic |
| `assets/` | Bundled photographs, fonts, font CSS and favicon |
| `docs/VIVA_GUIDE.html` | Readable viva notes and demonstration script |
| `docs/VIVA_GUIDE.md` | Editable Markdown version of the viva guide |
| `docs/REQUIREMENTS.md` | Screenshot requirements mapped to implemented screens |
| `docs/TESTING.md` | Verification completed and manual test checklist |
| `docs/CREDITS.md` | Asset attribution and source links |
| `tests/model.test.cjs` | Optional automated business-rule tests |
| `licenses/` | Font licence files |

## Important viva explanation
This is **frontend-only**. `localStorage` is browser storage, not a server database. Browser data does not sync between devices or browsers. Clearing site data removes saved plans and accounts. Download a JSON backup before doing that.

Local account passwords use a random salt and a SHA-256 digest for the demonstration. This does **not** make the system production authentication. Client-side data and roles are editable by the browser's owner. Use made-up demo credentials, never a real password. There is no password recovery service.

Vendor names, email addresses and quotes are fictional. Booking and RSVP actions record a status; they do not contact anyone, reserve a real venue, take money or send invitations.

## Data and calculations
- A guest row represents a party. Total people = sum of all party sizes.
- RSVP and meal preference apply to every person in that row. Use separate rows for different preferences.
- Planned spend = sum of all expense amounts.
- Outstanding payments = planned spend − amount paid.
- Unallocated budget = budget limit − planned spend (negative means over budget).
- Checklist completion = completed tasks ÷ total tasks × 100, or 0 for an empty list.
- Vendor quotes do not affect the budget until an expense is added.
- Events must end after they start on the same date. Split overnight events into two entries.
- The countdown follows the browser's local calendar date; it shows today's wedding or days since the wedding when appropriate.

## Backups and reports
**Settings → Download JSON backup** exports the current wedding plan without account credentials. **Restore a backup** validates the file and shows a summary before replacing the plan. A backup can be restored into any local account. Treat backups and CSV files as personal documents if you add real guest details.

CSV buttons export all records in that section, independent of the current search filter. Reports → Export report includes summary metrics and all tasks, guests, expenses, vendors and events. Reports → Print / Save PDF uses the browser print dialog with a clean print stylesheet.

## Optional tests
If Node.js is already installed:

```bash
node --test tests/model.test.cjs
```

These tests use isolated in-memory browser storage and do not touch your wedding records. See `docs/TESTING.md` for results and a manual walkthrough.

## Customise it
Change colours in `:root` at the top of `css/styles.css`. Edit sample records in `js/data.js`. Existing saved records are not overwritten by editing seeds; use Settings → Load sample wedding to load the revised samples. Keep bundled asset filenames or update every reference. To add a screen, extend `APP_ROUTES`, the screen renderer, the form configuration and any applicable model rules.

No API keys, Firebase configuration, server code, npm packages or database setup are required.
