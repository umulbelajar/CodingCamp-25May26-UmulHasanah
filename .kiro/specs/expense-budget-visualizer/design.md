# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a fully client-side web application built with plain HTML, CSS, and Vanilla JavaScript. It has no build step, no framework, and no backend. All data is persisted in the browser's `localStorage` under a single fixed key. The application renders a pie chart using the Canvas API (or an approved CDN chart library as an alternative).

The architecture follows a **Model-View-Controller (MVC)** pattern adapted for a single-page, single-JS-file vanilla JS context:

- **Model** — pure functions that manage the in-memory transaction array, validate inputs, and read/write `localStorage`
- **View** — DOM-manipulation functions that render the transaction list, total balance, and pie chart
- **Controller** — event handlers wired in `app.js` that connect user interactions to model operations and trigger view updates

State is held in a single in-memory array (`transactions`) that is always kept in sync with `localStorage`. On every mutation (add or delete), the array is serialized and written to `localStorage` before the UI is updated.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Single `js/app.js` file | Required by TC-4; all MVC layers are organized as named function groups within one file |
| Canvas API for pie chart | Widest browser support, no dependencies; CDN chart library (e.g., Chart.js) is an approved alternative |
| In-memory array + localStorage sync | Simple, predictable; avoids re-reading localStorage on every render |
| Fixed key `expense_budget_visualizer_data` | Prevents collisions; satisfies Requirement 6 fixed-key constraint |
| Crypto-based UUID with Math.random fallback | Unique IDs for transactions without external libraries |
| Reverse-insertion-order display | Most recent transaction at top (Requirement 2.4) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         index.html                           │
│                                                              │
│  ┌─────────────┐   ┌──────────────────────────────────────┐  │
│  │  css/       │   │           js/app.js                  │  │
│  │  style.css  │   │                                      │  │
│  └─────────────┘   │  ┌──────────┐  ┌──────────────────┐ │  │
│                    │  │  Model   │  │      View        │ │  │
│                    │  │          │  │                  │ │  │
│                    │  │ validate │  │ renderList()     │ │  │
│                    │  │ addTx()  │  │ renderBalance()  │ │  │
│                    │  │ deleteTx │  │ renderChart()    │ │  │
│                    │  │ load()   │  │ renderErrors()   │ │  │
│                    │  │ save()   │  │ resetForm()      │ │  │
│                    │  └────┬─────┘  └────────┬─────────┘ │  │
│                    │       │                 │           │  │
│                    │  ┌────▼─────────────────▼─────────┐ │  │
│                    │  │         Controller              │ │  │
│                    │  │  handleFormSubmit()             │ │  │
│                    │  │  handleDeleteClick()            │ │  │
│                    │  │  init()                         │ │  │
│                    │  └─────────────────────────────────┘ │  │
│                    └──────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                   localStorage                       │    │
│  │   key: "expense_budget_visualizer_data"              │    │
│  │   value: JSON array of Transaction objects           │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **App load** → `init()` reads localStorage → deserializes → validates → populates `transactions[]` → calls `renderAll()`
2. **Add transaction** → `handleFormSubmit()` → `validateInput()` → `addTransaction()` → `saveToStorage()` → `renderAll()`
3. **Delete transaction** → `handleDeleteClick(id)` → snapshot pre-state → `deleteTransaction(id)` → `saveToStorage()` (on failure: rollback + show error) → `renderAll()`

---

## Components and Interfaces

### 1. Input Form

Rendered in `index.html` as a `<form id="transaction-form">`.

| Field | Element | Constraints |
|---|---|---|
| Item Name | `<input type="text" maxlength="100">` | Required, 1–100 characters |
| Amount | `<input type="number" step="0.01" min="0.01">` | Required, 0.01–999,999,999.99 |
| Category | `<select>` | Required; options: placeholder, `Food`, `Transport`, `Fun` |

- On submit: runs `validateInput()`; if errors exist, renders inline `<span class="field-error" role="alert">` next to each invalid field and does not add the transaction.
- On success: calls `addTransaction()`, then `resetForm()` which clears item name, clears amount, and resets category to placeholder.

### 2. Transaction List

Rendered by `renderList(transactions)` into `<ul id="transaction-list">`.

- Each `<li>` displays: item name, formatted amount (e.g., `$12.50`), category label, and a delete `<button>` with a visible label (e.g., "Delete").
- List is rendered in reverse insertion order (index `transactions.length - 1` down to `0`).
- When `transactions` is empty, renders a single `<li class="empty-state">` with the message "No transactions recorded yet."
- The container has `overflow-y: auto` and a fixed `max-height` so it scrolls independently of the rest of the page.

### 3. Total Balance Display

Rendered by `renderBalance(transactions)` into `<p id="total-balance">` (or equivalent element) positioned above the transaction list.

- Value = sum of all `transaction.amount` values, formatted as `$X.XX`.
- When `transactions` is empty, displays `$0.00`.

### 4. Pie Chart

Rendered by `renderChart(transactions)` onto `<canvas id="spending-chart">` (or via CDN chart library into a container `<div id="chart-container">`).

- When `transactions` is empty, hides the canvas and shows a `<p id="chart-empty">No data to display</p>`.
- When transactions exist, computes per-category totals and renders slices proportional to `categoryTotal / grandTotal`.
- Categories with a total of zero are excluded from the chart entirely.
- Each slice is labeled with the category name and percentage (e.g., "Food 45%").
- Fixed colors per category (see Data Models section).
- The canvas has `role="img"` and `aria-label` describing the chart content for accessibility.

---

## Data Models

### Transaction Object

```js
{
  id: "string",          // UUID v4, generated at creation time
  name: "string",        // Item name, 1–100 characters
  amount: 42.50,         // Positive number, 0.01–999,999,999.99, up to 2 decimal places
  category: "Food"       // One of: "Food" | "Transport" | "Fun"
}
```

No date field. No budget field. No custom categories.

### localStorage Serialization

```js
const STORAGE_KEY = "expense_budget_visualizer_data";

// Write
function saveToStorage(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (e) {
    throw new Error("STORAGE_WRITE_FAILED");
  }
}

// Read
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw === "") return [];
    return JSON.parse(raw); // throws SyntaxError on malformed JSON
  } catch (e) {
    throw new Error("STORAGE_READ_FAILED");
  }
}
```

### Transaction Validation Rules

| Field | Rule |
|---|---|
| `name` | Non-empty string after trim; length ≤ 100 |
| `amount` | Finite number; > 0; ≤ 999,999,999.99; parseable to at most 2 decimal places |
| `category` | Exactly one of `"Food"`, `"Transport"`, `"Fun"` |

### ID Generation

```js
function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
```

### Category Colors (Fixed)

```js
const CATEGORY_COLORS = {
  Food:      "#FF6384",
  Transport: "#36A2EB",
  Fun:       "#FFCE56"
};
```

These colors are fixed constants. The same category always renders with the same color. All three colors are visually distinct.

### Currency Formatting

```js
function formatCurrency(amount) {
  return "$" + amount.toFixed(2);
}
```

### Pie Chart Data Computation

```js
function buildPieData(transactions) {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  for (const tx of transactions) {
    totals[tx.category] += tx.amount;
  }
  const grandTotal = totals.Food + totals.Transport + totals.Fun;
  if (grandTotal === 0) return [];

  return Object.entries(totals)
    .filter(([, sum]) => sum > 0)
    .map(([category, sum]) => ({
      category,
      amount: sum,
      proportion: sum / grandTotal,
      color: CATEGORY_COLORS[category]
    }));
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid Transaction Add Round-Trip

*For any* valid transaction (any non-empty item name up to 100 characters, any amount in [0.01, 999,999,999.99], any category from `{Food, Transport, Fun}`), adding it to the transaction list SHALL result in the list length increasing by exactly 1, and the transaction SHALL be retrievable from `localStorage` with all field values preserved.

**Validates: Requirements 1.2, 6.1**

---

### Property 2: Empty Field Validation Rejection

*For any* form submission where one or more fields (item name, amount, or category) are empty or contain only whitespace, the `validateInput` function SHALL return a non-empty errors object with at least one entry for each missing field, and the transaction list SHALL remain unchanged.

**Validates: Requirements 1.3**

---

### Property 3: Invalid Amount Validation Rejection

*For any* amount value that is zero, negative, greater than 999,999,999.99, non-numeric (NaN, Infinity), or a non-number type, the `validateInput` function SHALL return an error on the amount field and the transaction list SHALL remain unchanged.

**Validates: Requirements 1.4**

---

### Property 4: Form Reset After Successful Add

*For any* valid transaction that is successfully added, the item name field SHALL be empty, the amount field SHALL be empty, and the category dropdown SHALL be reset to its placeholder option.

**Validates: Requirements 1.5**

---

### Property 5: Transaction Rendering Format

*For any* transaction in the list, the rendered HTML for that transaction SHALL contain the transaction's item name as a string, the amount formatted as a currency string matching `$\d+\.\d{2}`, and the category label as one of `Food`, `Transport`, or `Fun`.

**Validates: Requirements 2.1**

---

### Property 6: Delete Button Presence

*For any* non-empty transaction list, every rendered transaction item SHALL contain a visible, labeled interactive delete button without requiring hover or additional interaction.

**Validates: Requirements 3.1**

---

### Property 7: Delete Correctness

*For any* transaction list containing at least one transaction, deleting a transaction by its unique ID SHALL remove exactly that transaction from the list (list length decreases by 1), update `localStorage` to reflect the removal, and cause the Total Balance to equal the sum of the remaining transactions' amounts.

**Validates: Requirements 3.2, 3.3**

---

### Property 8: Delete Rollback on Storage Failure

*For any* transaction list and any simulated `localStorage.setItem` failure during a delete operation, the in-memory transaction list SHALL be restored to its pre-deletion state, the Total Balance and Chart SHALL reflect the pre-deletion state, and an error indication SHALL be displayed to the user.

**Validates: Requirements 3.4**

---

### Property 9: Total Balance Calculation

*For any* set of transactions, the displayed Total Balance SHALL equal the arithmetic sum of all transaction amounts, formatted as a currency string with exactly 2 decimal places and a leading currency symbol.

**Validates: Requirements 4.1, 4.2, 4.3**

---

### Property 10: Pie Chart Proportion Correctness

*For any* non-empty set of transactions, the pie chart data produced by `buildPieData` SHALL have slice proportions where each slice's proportion equals `categoryTotal / grandTotal`, and the sum of all slice proportions SHALL equal 1.0 within floating-point tolerance (±1e-9).

**Validates: Requirements 5.1**

---

### Property 11: Category Color Determinism and Uniqueness

*For any* number of render calls with any transaction data, the color assigned to `Food` SHALL always be the same fixed value, the color assigned to `Transport` SHALL always be the same fixed value, the color assigned to `Fun` SHALL always be the same fixed value, and all three colors SHALL be distinct from each other.

**Validates: Requirements 5.5**

---

### Property 12: Zero-Total Category Exclusion from Chart

*For any* transaction set where at least one category has a total spending amount of zero, `buildPieData` SHALL exclude that category's entry from the returned array, and the remaining entries SHALL still have proportions summing to 1.0.

**Validates: Requirements 5.6**

---

### Property 13: localStorage Round-Trip Fidelity

*For any* valid array of transactions, serializing it to `localStorage` via `saveToStorage` and then deserializing it via `loadFromStorage` SHALL produce an array with the same length, the same transaction IDs, and the same field values (`name`, `amount`, `category`) for every transaction.

**Validates: Requirements 6.1, 6.2, 6.3**

---

### Property 14: Corrupt Storage Graceful Recovery

*For any* value stored in `localStorage` that is not valid JSON, or is valid JSON but contains transaction objects missing required fields (`id`, `name`, `amount`, `category`) or with out-of-range/wrong-type field values, the app initialization SHALL discard the corrupt data, initialize with an empty transaction list, and display an error indication to the user.

**Validates: Requirements 6.5**

---

## Error Handling

### Storage Write Failure (Add)

- Scenario: `localStorage.setItem` throws (quota exceeded, private browsing restrictions).
- Behavior: The transaction is NOT added to the in-memory array. An inline error message is shown to the user. The form is not reset.

### Storage Write Failure (Delete)

- Scenario: `localStorage.setItem` throws during a delete operation.
- Behavior: The in-memory array is rolled back to its pre-deletion snapshot. The UI (list, balance, chart) is re-rendered from the rolled-back state. A persistent error banner with `role="alert"` is shown.

### Corrupt localStorage on Load

- Scenario: The stored value is not valid JSON, or parsed data contains invalid transaction objects.
- Behavior: The app discards all stored data, initializes with an empty transaction list, and displays a persistent error banner (e.g., "Saved data was corrupted and has been cleared.").

### Missing localStorage Key

- Scenario: The key `expense_budget_visualizer_data` is absent or its value is an empty string.
- Behavior: The app initializes with an empty transaction list. No error is shown (this is the normal first-run state).

### Validation Errors

- Inline `<span class="field-error" role="alert">` elements are rendered adjacent to each invalid field.
- Errors are cleared on the next successful submission or when the user corrects the field.
- The form submission is blocked until all validation passes.

### Chart Edge Cases

| Scenario | Behavior |
|---|---|
| No transactions | Canvas is hidden; `<p id="chart-empty">No data to display</p>` is shown |
| One category has zero total | That category's slice is excluded; remaining slices fill 100% |
| All transactions in one category | One full-circle slice is rendered |

---

## Testing Strategy

### Overview

Two complementary testing approaches are used:

1. **Unit / Example-Based Tests** — verify specific behaviors with concrete inputs (edge cases, empty states, specific formatting)
2. **Property-Based Tests** — verify universal invariants across randomly generated inputs using **[fast-check](https://github.com/dubzzz/fast-check)**

Since the app has no build step, tests run in a Node.js environment. The model functions (`validateInput`, `addTransaction`, `deleteTransaction`, `buildPieData`, `formatCurrency`, `saveToStorage`, `loadFromStorage`) are exported or extracted into a testable module. `localStorage` is stubbed with a simple in-memory mock.

### Unit Tests

Focus areas:

- **Validation**: each invalid input type explicitly (null, empty string, whitespace-only name, zero amount, negative amount, amount > 999,999,999.99, NaN, invalid category string)
- **Empty state rendering**: transaction list shows empty-state message, balance shows `$0.00`, chart shows no-data message
- **Currency formatting**: `formatCurrency(0)` → `"$0.00"`, `formatCurrency(1234.5)` → `"$1234.50"`, `formatCurrency(999999999.99)` → `"$999999999.99"`
- **Pie chart empty state**: `buildPieData([])` returns `[]`
- **Missing/empty localStorage key**: `loadFromStorage()` returns `[]` when key is absent or value is `""`
- **Corrupt JSON**: `loadFromStorage()` throws when value is malformed JSON

### Property-Based Tests

Each property test runs a minimum of **100 iterations**. Each test is tagged with a comment:

> `// Feature: expense-budget-visualizer, Property N: <property text>`

| Property | Arbitraries Used |
|---|---|
| P1: Valid transaction add round-trip | `fc.record({ name: fc.string({minLength:1, maxLength:100}).filter(s => s.trim().length > 0), amount: fc.float({min:0.01, max:999999999.99}), category: fc.constantFrom("Food","Transport","Fun") })` |
| P2: Empty field validation rejection | `fc.record` with one or more fields set to `""` or whitespace-only strings via `fc.constantFrom("", "  ", "\t")` |
| P3: Invalid amount validation rejection | `fc.oneof(fc.constant(0), fc.float({max:-0.001}), fc.constant(1000000000), fc.constant(NaN), fc.constant(Infinity), fc.string())` |
| P4: Form reset after successful add | Same arbitraries as P1; verify DOM state after add |
| P5: Transaction rendering format | `fc.array(validTransactionArb, {minLength:1})` |
| P6: Delete button presence | `fc.array(validTransactionArb, {minLength:1})` |
| P7: Delete correctness | `fc.array(validTransactionArb, {minLength:1})` + `fc.nat` to pick index to delete |
| P8: Delete rollback on storage failure | `fc.array(validTransactionArb, {minLength:1})` + mocked `localStorage.setItem` that throws |
| P9: Total balance calculation | `fc.array(validTransactionArb)` |
| P10: Pie chart proportion correctness | `fc.array(validTransactionArb, {minLength:1})` |
| P11: Category color determinism and uniqueness | `fc.constantFrom("Food","Transport","Fun")` called multiple times |
| P12: Zero-total category exclusion | `fc.array` of transactions where at least one category has no entries |
| P13: localStorage round-trip fidelity | `fc.array(validTransactionArb)` |
| P14: Corrupt storage graceful recovery | `fc.oneof(fc.string(), fc.record({...}).map(r => JSON.stringify({...r, amount: "not-a-number"})))` |

### Accessibility Testing

- Run [axe-core](https://github.com/dequelabs/axe-core) in a headless browser against the rendered HTML to catch WCAG violations automatically.
- Manually verify keyboard-only navigation: tab through form fields, submit with Enter, activate delete buttons with Space/Enter.
- Verify all text/background color pairs in `css/style.css` meet WCAG 2.1 AA contrast ratio (≥ 4.5:1) using the relative luminance formula.

### Responsive Layout Testing

- Test at 320px, 375px, 768px, and 1280px viewport widths.
- At 320px: verify no horizontal scrollbar, no clipped content, all four components (form, balance, list, chart) are visible and usable.

### File Structure Verification

```
project-root/
├── index.html
├── css/
│   └── style.css        ← single CSS file (TC-4)
└── js/
    └── app.js           ← single JS file (TC-4)
```

No other CSS or JS files are loaded except an approved CDN chart library (e.g., Chart.js via `<script src="https://cdn.jsdelivr.net/...">` in `index.html`).
