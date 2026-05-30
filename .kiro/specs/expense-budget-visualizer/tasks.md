# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side Expense & Budget Visualizer using plain HTML, CSS, and Vanilla JavaScript following the MVC pattern defined in the design. All state lives in a single in-memory `transactions` array kept in sync with `localStorage`. The implementation is split into five incremental phases: project scaffold → model layer → view layer → controller wiring → testing.

## Tasks

- [ ] 1. Scaffold project structure and HTML skeleton
  - Create `index.html` with the full page structure: `<form id="transaction-form">` (item name text input, amount number input, category `<select>` with placeholder + Food/Transport/Fun options), `<p id="total-balance">`, `<ul id="transaction-list">`, `<canvas id="spending-chart">`, and `<p id="chart-empty">` elements
  - Add `<link>` to `css/style.css` and `<script>` to `js/app.js` in `index.html`; optionally add Chart.js CDN `<script>` tag if using CDN chart library
  - Create `css/style.css` with base layout: flexbox/grid page structure, `#transaction-list` with `overflow-y: auto` and a fixed `max-height`, minimum 14px body font size, heading size at least 4px larger than body, and all text/background pairs meeting WCAG 2.1 AA 4.5:1 contrast ratio
  - Create `js/app.js` with top-level constants: `STORAGE_KEY = "expense_budget_visualizer_data"` and `CATEGORY_COLORS = { Food: "#FF6384", Transport: "#36A2EB", Fun: "#FFCE56" }`
  - _Requirements: 7.2, 7.3, 7.4, TC-1, TC-4_

- [x] 2. Implement Model — ID generation, validation, and transaction mutations
  - [x] 2.1 Implement `generateId()` using `crypto.randomUUID()` with `Math.random` UUID v4 fallback
    - _Requirements: 1.2_

  - [x] 2.2 Implement `validateInput(name, amount, category)` returning an errors object with keys `name`, `amount`, `category` for each failing field
    - Name rule: non-empty after trim, length ≤ 100
    - Amount rule: finite number, > 0, ≤ 999,999,999.99, parseable to at most 2 decimal places
    - Category rule: exactly one of `"Food"`, `"Transport"`, `"Fun"`
    - _Requirements: 1.3, 1.4_

  - [x] 2.5 Implement `addTransaction(transactions, name, amount, category)` — creates a new transaction object with `generateId()`, appends to a copy of the array, and returns the new array
    - _Requirements: 1.2_

  - [x] 2.6 Implement `deleteTransaction(transactions, id)` — returns a new array with the matching transaction removed
    - _Requirements: 3.2, 3.3_

- [ ] 3. Implement Model — localStorage persistence
  - [ ] 3.1 Implement `saveToStorage(transactions)` — serializes array to JSON and writes to `localStorage` under `STORAGE_KEY`; throws `Error("STORAGE_WRITE_FAILED")` on failure
    - _Requirements: 6.1, 6.2_

  - [ ] 3.2 Implement `loadFromStorage()` — reads `STORAGE_KEY`, returns `[]` if absent or empty string, parses JSON, validates each transaction object (id string, name string 1–100 chars, numeric amount 0.01–999,999,999.99, valid category); throws `Error("STORAGE_READ_FAILED")` on corrupt data
    - _Requirements: 6.3, 6.4, 6.5_

- [ ] 4. Checkpoint — Ensure all model tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement View — transaction list and total balance rendering
  - [ ] 5.1 Implement `renderList(transactions)` — clears `<ul id="transaction-list">` and re-renders; each `<li>` shows item name, `formatCurrency(amount)`, category label, and a visible `<button>` labeled "Delete" with a `data-id` attribute; when array is empty renders `<li class="empty-state">No transactions recorded yet.</li>`; list is rendered in reverse insertion order
    - Implement `formatCurrency(amount)` returning `"$" + amount.toFixed(2)`
    - _Requirements: 2.1, 2.4, 2.5, 3.1_

  - [ ] 5.4 Implement `renderBalance(transactions)` — computes sum of all amounts and sets `#total-balance` text to `formatCurrency(sum)`; displays `$0.00` when array is empty
    - _Requirements: 4.1, 4.4_

- [ ] 6. Implement View — pie chart rendering
  - [ ] 6.1 Implement `buildPieData(transactions)` — computes per-category totals, returns `[]` when grand total is 0, otherwise returns array of `{ category, amount, proportion, color }` objects excluding zero-total categories; proportions sum to 1.0
    - _Requirements: 5.1, 5.5, 5.6_

  - [ ] 6.5 Implement `renderChart(transactions)` — calls `buildPieData`; when result is empty, hides `<canvas id="spending-chart">` and shows `<p id="chart-empty">No data to display</p>`; when result is non-empty, hides `#chart-empty`, shows canvas, and draws pie slices with Canvas 2D API (or Chart.js); each slice labeled with category name and percentage; canvas has `role="img"` and descriptive `aria-label`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 7. Implement Controller — form submission and delete handling
  - [ ] 7.1 Implement `handleFormSubmit(event)` — prevents default, reads form field values, calls `validateInput`; if errors exist, renders inline `<span class="field-error" role="alert">` adjacent to each invalid field and returns; if valid, calls `addTransaction`, then `saveToStorage` (on storage failure: show error, do not add, do not reset form), then `renderAll()`, then `resetForm()`
    - Implement `resetForm()` — clears item name field, clears amount field, resets category to placeholder
    - Implement `renderAll(transactions)` — calls `renderList`, `renderBalance`, and `renderChart` in sequence
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1_

  - [ ] 7.3 Implement `handleDeleteClick(id)` — snapshots current `transactions` array, calls `deleteTransaction(transactions, id)`, calls `saveToStorage`; on storage failure: rolls back to snapshot, calls `renderAll(snapshot)`, shows persistent error banner with `role="alert"`; on success: updates `transactions`, calls `renderAll`
    - _Requirements: 3.2, 3.3, 3.4, 6.2_

  - [ ] 7.5 Implement `init()` — calls `loadFromStorage()`; on success: sets `transactions` array and calls `renderAll`; on `STORAGE_READ_FAILED` error: sets `transactions = []`, calls `renderAll([])`, and shows persistent error banner "Saved data was corrupted and has been cleared."; wires `handleFormSubmit` to `#transaction-form` submit event and `handleDeleteClick` via event delegation on `#transaction-list`
    - Call `init()` at the bottom of `js/app.js` (or on `DOMContentLoaded`)
    - _Requirements: 2.3, 4.5, 5.1, 6.3, 6.4, 6.5_

- [ ] 8. Checkpoint — Ensure all tests pass and app loads correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Apply responsive and accessibility styles
  - [ ] 9.1 Add responsive CSS to `css/style.css`: at 320px viewport all four components (form, balance, list, chart) are visible without horizontal scrollbar or clipped content; use `max-width: 100%`, `box-sizing: border-box`, and fluid widths
    - _Requirements: 7.4_

- [ ] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property-based tests use **fast-check** (`npm install --save-dev fast-check`) and run in Node.js; model functions must be exported or extracted into a testable module with a `localStorage` in-memory stub
- Each property test is tagged with a comment: `// Feature: expense-budget-visualizer, Property N: <property text>`
- Each property test runs a minimum of 100 iterations
- Unit tests and property tests are complementary — unit tests cover specific edge cases, property tests verify universal invariants
- Checkpoints ensure incremental validation at logical breaks
- The Canvas 2D API is the primary chart renderer; Chart.js via CDN is an approved alternative (add CDN `<script>` to `index.html` if used)
- `renderAll()` is always called after any state mutation to keep list, balance, and chart in sync

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2"] },
    { "id": 1, "tasks": ["2.3", "2.4", "2.5", "2.6"] },
    { "id": 2, "tasks": ["2.7", "2.8", "3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "5.1", "5.4", "6.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.5", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 5, "tasks": ["7.1", "7.3"] },
    { "id": 6, "tasks": ["7.2", "7.4", "7.5"] },
    { "id": 7, "tasks": ["9.1", "9.2"] }
  ]
}
```
