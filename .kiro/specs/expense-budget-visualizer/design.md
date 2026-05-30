# Design Document: Expense and Budget Visualizer

## Overview

The Expense and Budget Visualizer is a fully client-side, zero-dependency web application built with plain HTML, CSS, and Vanilla JavaScript. All data is persisted in the browser's `localStorage` under namespaced keys. The application renders charts using the Canvas API (primary) and inline SVG (fallback/alternative), with no third-party charting libraries.

The architecture follows a **Model-View-Controller (MVC)** pattern adapted for a single-file or multi-file vanilla JS context:

- **Model** — pure data-access and business-logic functions that read/write `localStorage`
- **View** — DOM-manipulation functions that render HTML and Canvas/SVG output
- **Controller** — event handlers that wire user interactions to model operations and trigger view updates

All state is derived from `localStorage` on each render cycle; there is no in-memory reactive store. This keeps the design simple and ensures the UI is always consistent with persisted data.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| No framework | Requirement TC-1; keeps the app a single HTML file |
| Canvas API for charts | Widest browser support, fine-grained control, no dependencies |
| Derive state from localStorage on render | Avoids sync bugs between in-memory state and persisted state |
| Namespaced localStorage keys (`evbv_*`) | Prevents collisions with other apps (Requirement 7.5) |
| UUID v4 for record IDs | Enables deterministic deduplication during import (Requirement 9.1) |
| EARS-style validation before write | Ensures localStorage is never written with invalid data |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   HTML/CSS   │  │  Controller  │  │   Model Layer    │  │
│  │  (Structure  │  │  (app.js)    │  │  (storage.js,    │  │
│  │  & Styles)   │  │  Event       │  │   model.js)      │  │
│  │              │  │  Handlers    │  │  Pure functions  │  │
│  └──────────────┘  └──────┬───────┘  └────────┬─────────┘  │
│                           │                   │             │
│                    ┌──────▼───────┐    ┌──────▼─────────┐  │
│                    │  View Layer  │    │  localStorage  │  │
│                    │  (render.js, │    │  evbv_expenses │  │
│                    │  charts.js)  │    │  evbv_budgets  │  │
│                    │  DOM + Canvas│    │  evbv_categories│ │
│                    └──────────────┘    └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

| Module | Responsibility |
|---|---|
| `storage.js` | Raw read/write/parse of `localStorage`; error handling for unavailability and corruption |
| `model.js` | Business logic: CRUD for expenses, budgets, categories; validation; ID generation |
| `render.js` | DOM rendering: expense list, summary panel, forms, filters, modals |
| `charts.js` | Canvas/SVG chart rendering: pie chart, bar chart, tooltips |
| `app.js` | Controller: event listeners, orchestrates model → view pipeline |

For a single-file deployment, all modules are inlined as IIFE blocks within `<script>` tags.

---

## Components and Interfaces

### 1. Expense Form (`ExpenseForm`)

Renders inside a modal or side panel. Fields:

| Field | Type | Validation |
|---|---|---|
| Amount | `<input type="number">` | Positive number, required |
| Category | `<select>` | Non-empty, required |
| Date | `<input type="date">` | Valid YYYY-MM-DD, not after today, required |
| Description | `<textarea maxlength="200">` | Optional, ≤ 200 chars |

- Character counter updates on every `input` event starting from the first character typed.
- On submit: validates all fields; on error, renders inline `<span role="alert">` messages; on success, calls `model.saveExpense()` then triggers full dashboard re-render.

### 2. Budget Form (`BudgetForm`)

| Field | Type | Validation |
|---|---|---|
| Amount | `<input type="number">` | Positive number, required |
| Category | `<select>` | Non-empty, required |
| Month | `<input type="month">` | Valid YYYY-MM, required |

- On submit: validates; calls `model.saveBudget()` (upsert semantics); re-renders Summary Panel.

### 3. Category Manager (`CategoryManager`)

- Lists all categories; default categories show a lock icon and no delete button.
- Add form: text input (1–50 chars, trimmed, case-insensitive uniqueness check).
- Delete: if category has associated expenses/budgets, shows a confirmation modal with counts before proceeding.

### 4. Dashboard (`Dashboard`)

- Month navigation: `<button>` prev/next arrows + `<output>` showing current month label.
- Summary Panel: table/list of categories with budget, spent, remaining columns; over-budget rows highlighted.
- Charts section: pie chart canvas + bar chart canvas side by side (stacked on mobile).
- Empty state: replaces charts and summary with a message when no expenses exist for the month.

### 5. Expense List (`ExpenseList`)

- Sorted by date descending.
- Each row: date, category badge, amount, description (truncated), edit/delete buttons.
- Filter bar: category `<select>`, date-range inputs, search `<input type="search">`.
- "No results found" message when filters yield no matches.

### 6. Charts (`PieChart`, `BarChart`)

Both rendered on `<canvas>` elements with `role="img"` and `aria-label` describing the chart content.

**PieChart:**
- Segments proportional to category spending totals.
- Special case: if all amounts are zero, renders equal segments.
- Tooltip: `<div>` absolutely positioned, shown on `mousemove`/`touchstart`, hidden on `mouseleave`.

**BarChart:**
- X-axis: calendar days (default) or ISO weeks (toggle).
- Y-axis: auto-scaled to max spending value.
- Tooltip: same mechanism as pie chart.

### 7. Export / Import Controls

- Export CSV: `<button>` triggers `Blob` + `URL.createObjectURL` download.
- Export JSON: same mechanism, full data snapshot.
- Import JSON: `<input type="file" accept=".json">` triggers file read, parse, validate, merge.

### 8. Error / Info Banners

- Persistent error banner (localStorage unavailable or corrupted): fixed position, `role="alert"`, `aria-live="assertive"`.
- Transient info messages (import success, export blocked): `role="status"`, `aria-live="polite"`, auto-dismiss after 4 seconds.

---

## Data Models

All records are stored as JSON arrays in `localStorage`.

### Expense

```json
{
  "id": "uuid-v4-string",
  "amount": 42.50,
  "categoryId": "uuid-v4-string | default-category-key",
  "date": "2025-05-20",
  "description": "Optional free text up to 200 chars",
  "createdAt": "2025-05-20T10:30:00.000Z",
  "updatedAt": "2025-05-20T10:30:00.000Z"
}
```

### Budget

```json
{
  "id": "uuid-v4-string",
  "categoryId": "uuid-v4-string | default-category-key",
  "month": "2025-05",
  "amount": 500.00,
  "createdAt": "2025-05-01T00:00:00.000Z",
  "updatedAt": "2025-05-01T00:00:00.000Z"
}
```

### Category

```json
{
  "id": "string (e.g. 'food' for defaults, uuid-v4 for custom)",
  "name": "Food",
  "isDefault": true,
  "createdAt": "2025-05-01T00:00:00.000Z"
}
```

### localStorage Keys

| Key | Value |
|---|---|
| `evbv_expenses` | JSON array of Expense objects |
| `evbv_budgets` | JSON array of Budget objects |
| `evbv_categories` | JSON array of Category objects |

### Default Categories (seeded on first load)

`food`, `transport`, `housing`, `utilities`, `health`, `entertainment`, `other`

These are written to `evbv_categories` on first load if the key is absent. Their `isDefault: true` flag prevents deletion.

### Validation Rules (Model Layer)

| Field | Rule |
|---|---|
| `amount` | `typeof === 'number' && isFinite && > 0` |
| `date` | Matches `/^\d{4}-\d{2}-\d{2}$/`, parseable, not after `new Date()` |
| `categoryId` | Exists in current categories list |
| `month` | Matches `/^\d{4}-\d{2}$/` |
| `description` | `string.length <= 200` |
| Category `name` | Trimmed length 1–50, case-insensitive unique |

### ID Generation

```js
// UUID v4 without crypto dependency (fallback for older browsers)
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
```

If `crypto.randomUUID` is available, it is preferred.

### Serialization / Deserialization

```js
// storage.js
const KEYS = {
  expenses:   'evbv_expenses',
  budgets:    'evbv_budgets',
  categories: 'evbv_categories',
};

function readCollection(key) {
  try {
    const raw = localStorage.getItem(KEYS[key]);
    if (raw === null) return [];
    return JSON.parse(raw); // throws on malformed JSON
  } catch (e) {
    throw new StorageError('CORRUPT', key, e);
  }
}

function writeCollection(key, data) {
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(data));
  } catch (e) {
    throw new StorageError('UNAVAILABLE', key, e);
  }
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Expense Validation Rejects All Invalid Inputs

*For any* input object where the amount is non-positive, non-numeric, or absent; or the date is after today, not a valid YYYY-MM-DD string, or absent; or the category is absent or does not exist in the categories collection — the `validateExpense` function SHALL return a non-empty errors object containing at least one entry for each invalid field, and SHALL NOT produce a valid expense record.

**Validates: Requirements 1.2, 1.3**

---

### Property 2: Description Length Enforcement

*For any* string of length greater than 200 characters, the `validateExpense` function SHALL reject it with a validation error, and the character-count indicator function SHALL return a value clamped to at most 200.

**Validates: Requirements 1.6, 1.7, 1.8**

---

### Property 3: Category Name Uniqueness (Case-Insensitive, Trim-Normalized)

*For any* existing set of categories and any candidate name whose trimmed, lowercased form matches the trimmed, lowercased name of any existing category, the `addCategory` function SHALL return an error and the categories collection SHALL remain unchanged.

**Validates: Requirements 2.3**

---

### Property 4: Budget Upsert Invariant

*For any* category and month, after calling `saveBudget` one or more times with any sequence of amounts, the budgets collection SHALL contain exactly one Budget record for that (categoryId, month) pair, and its amount SHALL equal the value passed in the most recent call.

**Validates: Requirements 3.3**

---

### Property 5: Remaining Budget Calculation and Over-Budget Flag

*For any* category, month, budget amount, and set of expenses, the remaining budget SHALL equal `max(0, budget.amount − sum(expenses where categoryId matches and date falls within month))`, and the over-budget flag SHALL be `true` if and only if the sum of those expenses exceeds `budget.amount`.

**Validates: Requirements 3.4, 3.5, 4.4**

---

### Property 6: Spending Aggregation Correctness

*For any* set of expenses and any selected month, the total-spent value for the month SHALL equal the arithmetic sum of all expense amounts whose date falls within that month, and the per-category totals SHALL each equal the sum of expense amounts for that category within that month.

**Validates: Requirements 4.2, 4.3**

---

### Property 7: Dashboard Navigation Boundary

*For any* non-empty set of expenses, the earliest month the user can navigate to SHALL equal the calendar month of the expense with the smallest date value, and attempting to navigate to any earlier month SHALL be rejected.

**Validates: Requirements 4.5**

---

### Property 8: Filter Conjunction Correctness

*For any* set of expenses and any combination of simultaneously active filters (category, date range, search term), every expense in the filtered result SHALL satisfy ALL active filter conditions, and every expense absent from the result SHALL fail at least one active filter condition.

**Validates: Requirements 6.1, 6.3, 6.5, 6.6**

---

### Property 9: Search Case-Insensitivity

*For any* search string `s` and expense list, the filtered result SHALL contain exactly those expenses whose `description.toLowerCase()` contains `s.toLowerCase()` as a substring, and no others.

**Validates: Requirements 6.8**

---

### Property 10: Filter Clear Restores Full List

*For any* expense list and any active filter state, clearing all filters SHALL produce a result set equal to the complete unfiltered expense list.

**Validates: Requirements 6.7**

---

### Property 11: Pie Chart Data Integrity

*For any* set of expenses for a selected month, the data produced by `buildPieData` SHALL have segment percentages that sum to 100 (within floating-point tolerance); when all expense amounts are zero, each category with at least one expense SHALL receive an equal segment.

**Validates: Requirements 5.1**

---

### Property 12: Bar Chart Day-Grouping Completeness

*For any* selected month, the data produced by `buildBarData('daily')` SHALL contain exactly one entry per calendar day in that month (28, 29, 30, or 31 entries depending on the month), with each entry's total equal to the sum of expense amounts on that day.

**Validates: Requirements 5.2**

---

### Property 13: LocalStorage Round-Trip Fidelity

*For any* valid application state (any set of Expenses, Budgets, and Categories), serializing the state to `localStorage` and then deserializing it SHALL produce a state with the same number of records, the same record IDs, and the same field values for every Expense, Budget, and Category.

**Validates: Requirements 7.6, 7.2**

---

### Property 14: Export-Import Round-Trip Fidelity

*For any* valid application state, exporting to JSON and then importing that JSON file into a fresh app instance SHALL produce a state with the same number of Expenses, Budgets, and Categories and the same field values for each record as existed at the time of export.

**Validates: Requirements 8.5, 9.5**

---

### Property 15: Import Deduplication by ID

*For any* existing application state and any valid imported JSON file, after a successful import, for every record ID that appeared in both the existing state and the imported file, the resulting state SHALL contain exactly one record with that ID whose field values match the imported record (imported overwrites existing on ID collision).

**Validates: Requirements 9.1**

---

### Property 16: CSV Export Contains Exactly the Visible Expenses

*For any* active filter state, the CSV export SHALL contain exactly the expenses currently visible in the filtered list — no more, no fewer — with the correct Date, Category, Amount, and Description column values for each row.

**Validates: Requirements 8.1, 8.3**

---

### Property 17: Import Schema Validation Reports Missing Fields

*For any* JSON object that is missing one or more required fields (id, amount, categoryId, date for expenses; id, categoryId, month, amount for budgets; id, name for categories), the `validateImportSchema` function SHALL return an error that identifies each missing or invalid field by name.

**Validates: Requirements 9.3**

---

### Property 18: Category Deletion Reassigns All Linked Records to "Other"

*For any* custom category that is confirmed for deletion, all Expenses and Budgets that referenced that category SHALL be reassigned to the "Other" category, the deleted category SHALL no longer appear in the categories collection, and the count of affected records reported in the confirmation warning SHALL equal the actual number of Expenses and Budgets that were linked to that category.

**Validates: Requirements 2.5, 2.6**

---

## Error Handling

### Storage Errors

| Scenario | Behavior |
|---|---|
| `localStorage` unavailable (quota exceeded, private mode) | Catch `DOMException` in `writeCollection`; show persistent `role="alert"` banner; continue in-memory |
| Malformed JSON in a namespaced key | Catch `SyntaxError` in `readCollection`; show persistent banner describing which key is corrupt; do NOT overwrite; continue in-memory |
| `localStorage` becomes available again | Banner is dismissed on next successful write |

### Validation Errors

- All validation runs synchronously in the model layer before any write.
- Errors are returned as a plain object `{ fieldName: 'error message' }`.
- The view layer renders each error as an inline `<span role="alert" class="field-error">` adjacent to the relevant input.
- The form is not submitted until all errors are resolved.

### Import Errors

| Scenario | Behavior |
|---|---|
| File is not valid JSON | Display error: "File is not valid JSON." No data modified. |
| File is valid JSON but wrong schema | Display error listing missing/invalid fields. No data modified. |
| File read error (browser API) | Display error: "Could not read file." No data modified. |

### Chart Edge Cases

| Scenario | Behavior |
|---|---|
| No expenses for selected month | Show placeholder text; do not render empty canvas |
| All expense amounts are zero | Pie chart renders equal segments per category with at least one expense |
| Single expense | Pie chart renders one full segment; bar chart renders one bar |

---

## Testing Strategy

### Overview

The testing strategy uses two complementary approaches:

1. **Unit / Example-Based Tests** — verify specific behaviors with concrete inputs
2. **Property-Based Tests** — verify universal invariants across randomly generated inputs

The property-based testing library for this project is **[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript). Since the app is vanilla JS with no build step, tests are run in a Node.js environment using the model and storage modules loaded via `require` / `import` (or a thin test harness that stubs `localStorage`).

### Unit Tests

Focus areas:

- **Validation functions**: test each invalid input type explicitly (null, empty string, negative number, future date, etc.)
- **Model CRUD**: add/edit/delete for each entity type with concrete examples
- **Filter logic**: specific filter combinations with known datasets
- **Chart data preparation**: `buildPieData()` and `buildBarData()` with known expense sets
- **Export formatting**: CSV column order, JSON structure
- **Import schema validation**: missing fields, wrong types

### Property-Based Tests

Each property test runs a minimum of **100 iterations**. Tests are tagged with:

> `// Feature: expense-budget-visualizer, Property N: <property text>`

| Property | Test Description | Arbitraries |
|---|---|---|
| P1 | Expense validation rejects all invalid inputs | `fc.record` with invalid amount/date/category combinations |
| P2 | Description length enforcement | `fc.string({ minLength: 201, maxLength: 500 })` |
| P3 | Category name uniqueness (case-insensitive, trim-normalized) | `fc.array(fc.string)` for existing names + duplicate candidate |
| P4 | Budget upsert invariant | `fc.array` of budget saves for same (category, month) |
| P5 | Remaining budget calculation and over-budget flag | `fc.array` of expenses + budget amount |
| P6 | Spending aggregation correctness | `fc.array` of expenses across multiple months/categories |
| P7 | Dashboard navigation boundary | `fc.array` of expenses with varying dates |
| P8 | Filter conjunction correctness | `fc.array` of expenses + random filter combinations |
| P9 | Search case-insensitivity | `fc.string` search terms + `fc.array` of expense descriptions |
| P10 | Filter clear restores full list | `fc.array` of expenses + random filter state |
| P11 | Pie chart data integrity | `fc.array` of expenses for a month |
| P12 | Bar chart day-grouping completeness | `fc.date` for month selection + `fc.array` of expenses |
| P13 | localStorage round-trip fidelity | `fc.record` for full app state |
| P14 | Export-import round-trip fidelity | `fc.record` for full app state |
| P15 | Import deduplication by ID | `fc.array` of records with overlapping IDs |
| P16 | CSV export contains exactly the visible expenses | `fc.array` of expenses + random filter state |
| P17 | Import schema validation reports missing fields | `fc.record` with randomly omitted required fields |
| P18 | Category deletion reassigns all linked records to "Other" | `fc.array` of expenses/budgets linked to a custom category |

### Accessibility Testing

- Automated: run [axe-core](https://github.com/dequelabs/axe-core) in a headless browser against the rendered HTML.
- Manual: keyboard-only navigation walkthrough; screen reader smoke test with NVDA/VoiceOver.
- Color contrast: verify all text/background pairs meet WCAG 2.1 AA ratios (4.5:1 for normal text, 3:1 for large text).

### Responsive Layout Testing

- Test at 320px, 768px, 1024px, 1440px, and 2560px viewport widths.
- Verify no horizontal scrollbar, no clipped content, single-column layout below 768px.

### Performance Testing

- Load the app with 1,000 pre-seeded expense records.
- Measure dashboard render time using `performance.now()` — must be ≤ 300ms (NFR-2).
