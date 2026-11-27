# Verification notes

Prepared 24 November 2026. Tests use invented records and do not require a backend.

## Automated checks — 10 passing
Run `node --test tests/model.test.cjs` from the downloaded project folder.

1. Sample totals reconcile guest parties, RSVPs, costs, deposits and progress.
2. Empty lists avoid division by zero; over-budget values stay accurate.
3. CRUD updates the matching ID, survives reload and removes only the chosen record.
4. Invalid dates, out-of-range/decimal party sizes, invalid money and incorrect event times are rejected.
5. Unpaid, Part paid and Paid statuses follow the actual amounts.
6. Backups reject malformed records, duplicate IDs and unsupported image names; unknown properties are stripped.
7. CSV escapes quotes, commas, newlines and formula-leading text.
8. Local account login rejects wrong credentials, isolates each account's plan, rejects duplicate emails and restores saved state.
9. Demo admin guards protect the active/default admin and enforce disabled-account state in the local model.
10. Storage write errors preserve the session's in-memory data and expose a warning.

JavaScript files were also checked with `node --check`.

## Browser checks completed
- Overview loads with bundled fonts and photographs.
- Add a guest party of three with Confirmed status: people total changes from 18 to 21, and confirmed from 13 to 16.
- Search narrows the guest list to the created party.
- Editing the guest persists after a full page reload.
- Deleting the test guest through the confirmation dialog removes it.
- An expense of 100 with paid amount 200 is rejected with a clear validation message.
- Completing a task changes progress from 40% to 50%; the Done filter includes it.
- Vendor details open with quote, status, notes and available actions.
- Reports render calculated budget, RSVP and payment breakdowns.
- A 390px-wide preview renders the mobile layout and navigation drawer; guest tables remain in an internal scrolling container.

Local credential logic was verified in the isolated automated tests. The browser QA did not submit real credentials, book vendors, send invitations or process payments. Physical phones and every browser engine have not been tested.

## Manual viva checklist
- Register a made-up local account, sign out, enter an incorrect password, then sign in correctly.
- Add/edit/delete each record type and try an empty search result.
- Add a guest with different meal preferences as separate parties.
- Add a vendor quote to the budget; mark the vendor booked.
- Create an event with an earlier end time and verify rejection.
- Export CSV and open it in a spreadsheet application.
- Download a JSON backup, edit a record, restore the backup and compare.
- Try a malformed JSON file and verify that the current plan stays intact.
- Save a report through the browser's Print / Save as PDF dialog.
- Check keyboard navigation, Escape to close dialogs and a narrow browser window.
- Export a backup before clearing or resetting your data.
