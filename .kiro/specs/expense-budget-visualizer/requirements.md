# Requirements Document

## Introduction

The Expense and Budget Visualizer is a client-side web application that allows users to track their personal expenses, set budgets per category, and visualize spending patterns through charts and summaries. Built with plain HTML, CSS, and Vanilla JavaScript, it stores all data in the browser's Local Storage — no server, no sign-up, no dependencies required. The app targets individuals who want a lightweight, private, and instantly usable tool for managing their finances.

---

## Glossary

- **App**: The Expense and Budget Visualizer web application.
- **Expense**: A single spending record consisting of an amount, category, date, and optional description.
- **Budget**: A user-defined spending limit assigned to a specific category for a given month.
- **Category**: A user-defined or predefined label used to group expenses (e.g., Food, Transport, Utilities).
- **Dashboard**: The main view of the App that displays a summary of expenses and budget status.
- **Chart**: A visual representation (bar chart or pie chart) rendered using the Canvas API or SVG, without third-party charting libraries.
- **Local_Storage**: The browser's `localStorage` API used to persist all user data client-side.
- **Expense_Form**: The UI form used to add or edit an Expense.
- **Budget_Form**: The UI form used to set or update a Budget for a Category.
- **Summary_Panel**: A UI section that displays totals, remaining budgets, and over-budget alerts.
- **Filter**: A control that narrows the displayed Expenses by date range, category, or both.
- **Export**: The action of downloading stored data as a file (CSV or JSON).

---

## Requirements

### Requirement 1: Add and Manage Expenses

**User Story:** As a user, I want to add, edit, and delete expense records, so that I can maintain an accurate log of my spending.

#### Acceptance Criteria

1. WHEN the user submits the Expense_Form with a valid amount, category, and date, THE App SHALL save the Expense to Local_Storage and display it in the expense list within 1 second, ordered by most recent date first.
2. WHEN the user submits the Expense_Form with a missing or invalid amount (non-positive number or non-numeric value), THE App SHALL display an inline validation error and SHALL NOT save the Expense.
3. WHEN the user submits the Expense_Form with a missing category or a date that is not a parseable YYYY-MM-DD date or is after the current date, THE App SHALL display an inline validation error and SHALL NOT save the Expense.
4. WHEN the user selects an existing Expense and chooses to edit it, THE App SHALL populate the Expense_Form with the existing values and SHALL update Local_Storage upon valid resubmission.
5. WHEN the user confirms deletion of an Expense, THE App SHALL remove the Expense from Local_Storage and remove it from the expense list without requiring a page reload.
6. THE App SHALL support an optional free-text description field of up to 200 characters on each Expense.
7. WHEN the user types in the description field and the character count reaches 200, THE App SHALL prevent any further input beyond 200 characters.
8. WHILE the user is typing in the description field, THE App SHALL display a character-count indicator showing the number of characters entered from the first character typed.

---

### Requirement 2: Manage Categories

**User Story:** As a user, I want to create and manage expense categories, so that I can organize my spending in a way that reflects my lifestyle.

#### Acceptance Criteria

1. THE App SHALL provide a default set of categories: Food, Transport, Housing, Utilities, Health, Entertainment, and Other; these default categories SHALL NOT be deletable.
2. WHEN the user creates a new category with a unique name (after trimming leading and trailing whitespace) of 1 to 50 characters, THE App SHALL save the category to Local_Storage and make it available in the Expense_Form and Budget_Form.
3. IF the user attempts to create a category whose trimmed name matches an existing category name (case-insensitive), THEN THE App SHALL display an error message and SHALL NOT save the category to Local_Storage.
4. WHEN the user deletes a custom category that has no associated Expenses or Budgets, THE App SHALL remove it from Local_Storage.
5. IF the user attempts to delete a custom category that has associated Expenses or Budgets, THEN THE App SHALL display a warning message listing the count of affected Expenses and the count of affected Budgets separately, and SHALL require the user to click a confirm button before deletion proceeds.
6. WHEN the user confirms deletion of a custom category that has associated Expenses or Budgets, THE App SHALL reassign all Expenses and Budgets linked to that category to the "Other" category before removing the deleted category from Local_Storage.

---

### Requirement 3: Set and Track Budgets

**User Story:** As a user, I want to set monthly budget limits per category, so that I can monitor whether my spending stays within my financial goals.

#### Acceptance Criteria

1. WHEN the user submits the Budget_Form with a valid positive numeric amount, a category, and a target month (YYYY-MM), THE App SHALL save the Budget to Local_Storage and reflect it in the Summary_Panel.
2. WHEN the user submits the Budget_Form with a missing, zero, negative, or non-numeric amount, THE App SHALL display an inline validation error and SHALL NOT save the Budget.
3. THE App SHALL allow at most one Budget per category per calendar month; WHEN the user sets a Budget for a category and month that already has a Budget, THE App SHALL overwrite the existing Budget value in Local_Storage.
4. WHILE a Budget exists for a category in the selected month, THE App SHALL display the remaining budget amount — calculated as Budget minus the sum of all Expenses in that category for that month — in the Summary_Panel; IF the result is negative, THE App SHALL display 0 as the remaining amount.
5. WHEN the sum of Expenses in a category for a given month exceeds the Budget for that category and month, THE App SHALL display a visual over-budget indicator (distinct color or icon) next to that category in the Summary_Panel.

---

### Requirement 4: Dashboard and Summary View

**User Story:** As a user, I want a dashboard that shows my spending overview at a glance, so that I can quickly understand my financial situation without navigating multiple screens.

#### Acceptance Criteria

1. WHEN the App is opened, THE App SHALL display the Dashboard as the default view.
2. THE Dashboard SHALL show the total amount spent in the current calendar month across all categories.
3. THE Dashboard SHALL show a per-category breakdown in the Summary_Panel listing each category name and its total amount spent for the current month.
4. WHILE at least one Budget is set for the current month, THE Dashboard SHALL display each budgeted category's budget limit, total spent, and remaining amount; IF total spent exceeds the budget limit, THE App SHALL display the remaining amount as 0 and flag the category as over budget.
5. WHEN the user navigates to a previous month using month-navigation controls, THE Dashboard SHALL update all totals, charts, and budget indicators to reflect data for the selected month; THE App SHALL not allow navigation to a month earlier than the month of the earliest recorded Expense.
6. WHEN the selected month has no Expenses, THE Dashboard SHALL display an empty-state message indicating no spending data is available for that month.

---

### Requirement 5: Expense Visualization with Charts

**User Story:** As a user, I want to see charts of my spending, so that I can identify patterns and categories where I overspend.

#### Acceptance Criteria

1. THE App SHALL render a pie chart showing the percentage share of total spending per category for the selected month using only the Canvas API or inline SVG — no third-party charting libraries; WHEN all Expenses in the selected month have a zero amount, THE App SHALL render the pie chart with one equal-sized segment per category that has at least one Expense in the selected month.
2. THE App SHALL render a bar chart showing spending totals for the selected month, with one bar per calendar day by default.
3. WHEN the user selects weekly grouping on the bar chart, THE App SHALL re-render the bar chart with one bar per ISO calendar week that overlaps with the selected month.
4. WHEN the selected month has no Expenses, THE App SHALL display a placeholder message in place of each Chart and SHALL NOT render an empty chart frame.
5. WHEN the user hovers over a chart segment or bar, THE App SHALL display a tooltip showing the category name, amount, and the percentage that amount represents of the total spending for the selected month.
6. WHEN an Expense is added, edited, or deleted, THE App SHALL update all Charts within 1 second without requiring a page reload.

---

### Requirement 6: Filter and Search Expenses

**User Story:** As a user, I want to filter and search my expense list, so that I can quickly find specific transactions.

#### Acceptance Criteria

1. WHEN the user applies a Filter by category, THE App SHALL display only Expenses matching the selected category.
2. WHEN the user applies a Filter by category, THE App SHALL update the expense list within 100ms of the filter selection.
3. WHEN the user applies a Filter by date range with a valid start date and end date where start date is not after end date, THE App SHALL display only Expenses whose date falls within the inclusive range.
4. IF the user applies a Filter by date range where the start date is after the end date, THEN THE App SHALL display an inline validation error and SHALL NOT apply the filter.
5. WHEN the user applies both a category Filter and a date range Filter simultaneously, THE App SHALL display only Expenses that satisfy both conditions.
6. WHEN the user applies both a category Filter and a search term simultaneously, THE App SHALL display only Expenses that satisfy both conditions.
7. WHEN the user clears all active Filters, THE App SHALL restore the full unfiltered expense list.
8. WHEN the user types in the search field, THE App SHALL filter the expense list to show only Expenses whose description contains the search string (case-insensitive) and SHALL update results within 100ms of each keystroke.
9. WHEN the user clears the search field, THE App SHALL restore the expense list to the state determined by any remaining active Filters.
10. IF no Expenses match the active Filter or search criteria, THEN THE App SHALL display a "No results found" message in the expense list area.

---

### Requirement 7: Data Persistence with Local Storage

**User Story:** As a user, I want my data to be saved automatically in my browser, so that my expenses and budgets are still available when I reopen the app.

#### Acceptance Criteria

1. THE App SHALL write every Expense, Budget, and Category change to Local_Storage synchronously before the UI reflects the change to the user.
2. WHEN the App is loaded, THE App SHALL read all Expenses, Budgets, and Categories from Local_Storage and restore the full application state before rendering the Dashboard.
3. IF Local_Storage is unavailable or throws an error during a read or write operation, THEN THE App SHALL display a persistent error banner informing the user that data cannot be saved, and THE App SHALL continue to function in-memory for the current session; THE banner SHALL remain visible until Local_Storage becomes available again.
4. IF Local_Storage contains data under the App's namespaced keys that is malformed or cannot be parsed as valid JSON, THEN THE App SHALL display a persistent error banner describing the corruption, SHALL NOT overwrite the corrupted data automatically, and SHALL continue to function in-memory for the current session.
5. THE App SHALL store all data as serialized JSON in Local_Storage under namespaced keys (e.g., `evbv_expenses`, `evbv_budgets`, `evbv_categories`) to avoid collisions with other apps.
6. FOR ALL valid application states, serializing the state to Local_Storage and then deserializing it SHALL produce an application state with the same number of records, the same record IDs, and the same field values for every Expense, Budget, and Category (round-trip property).

---

### Requirement 8: Export Data

**User Story:** As a user, I want to export my expense data, so that I can back it up or analyze it in another tool like a spreadsheet.

#### Acceptance Criteria

1. WHEN the user triggers a CSV export, THE App SHALL generate a downloadable `.csv` file containing all Expenses with columns: Date, Category, Amount, Description.
2. WHEN the user triggers a JSON export, THE App SHALL generate a downloadable `.json` file that is valid JSON and contains all Expenses, Budgets, and Categories present in the App at the time of export.
3. WHEN the user applies active Filters before triggering a CSV export, THE App SHALL export only the Expenses currently visible in the filtered list.
4. IF there are no Expenses to export (either globally or due to active Filters), THEN THE App SHALL display an informational message and SHALL NOT initiate a file download.
5. WHEN the user exports all data to JSON and then imports that file into the App, THE App SHALL produce a dataset with the same number of Expenses, Budgets, and Categories and the same field values (Date, Category, Amount, Description) for each record as existed at the time of export.

---

### Requirement 9: Import Data

**User Story:** As a user, I want to import previously exported data, so that I can restore my records or transfer them between browsers.

#### Acceptance Criteria

1. WHEN the user selects a valid JSON file produced by the App's export function, THE App SHALL parse the file, merge the imported records with existing Local_Storage data by deduplicating on record ID (imported record overwrites existing record on ID collision), and update the Dashboard.
2. IF the selected file is not valid JSON, THEN THE App SHALL display an error message stating the file is not valid JSON and SHALL NOT modify existing Local_Storage data.
3. IF the selected file is valid JSON but does not conform to the App's expected schema, THEN THE App SHALL display an error message identifying which required fields or structure are missing and SHALL NOT modify existing Local_Storage data.
4. WHEN an import completes successfully, THE App SHALL display a confirmation message stating the number of Expenses, Budgets, and Categories added or updated.
5. WHEN the user imports a valid JSON file into a fresh App instance that contains no existing data, THE App SHALL produce an application state with the same number of Expenses, Budgets, and Categories and the same field values for each record as were present in the exported file.

---

### Requirement 10: Responsive Layout and Accessibility

**User Story:** As a user, I want the app to work well on different screen sizes and be accessible, so that I can use it on desktop or mobile and with assistive technologies.

#### Acceptance Criteria

1. THE App SHALL render a layout on viewport widths from 320px to 2560px with no content clipping, no overlapping elements, and no horizontal scrollbar.
2. WHEN the viewport width is below 768px, THE App SHALL display the Summary_Panel and Chart sections in a single column and SHALL replace the navigation with a single toggle control that reveals navigation items when activated.
3. THE App SHALL assign a non-empty `aria-label` or `aria-labelledby` attribute that uniquely identifies the control's purpose to all interactive controls (buttons, inputs, selects).
4. THE App SHALL maintain a color contrast ratio of at least 4.5:1 between all rendered text and its background for text below 18pt (or 14pt bold), and at least 3:1 for text at or above 18pt (or 14pt bold), in compliance with WCAG 2.1 AA.
5. WHEN the user navigates the App using only the keyboard (Tab, Shift+Tab, Enter, Escape), THE App SHALL display a visible focus indicator of at least 2px with a contrast ratio of at least 3:1 on all interactive elements and SHALL allow all actions available via pointer interaction to be completed.

---

## Technical Constraints

- **TC-1 — Technology Stack**: THE App SHALL be implemented using HTML, CSS, and Vanilla JavaScript only, with no JavaScript frameworks or UI component libraries.
- **TC-2 — Data Storage**: THE App SHALL use the browser `localStorage` API as the sole persistence mechanism; no server-side storage or external APIs shall be used.
- **TC-3 — Browser Compatibility**: THE App SHALL function correctly in the latest stable releases of Chrome, Firefox, Edge, and Safari, and SHALL be usable as a standalone HTML file or as a browser extension.

## Non-Functional Requirements

- **NFR-1 — Simplicity**: THE App SHALL require no installation, build step, or configuration to run; opening the HTML file in a browser SHALL be sufficient to use the full application.
- **NFR-2 — Performance**: WHEN the App renders or updates the Dashboard with up to 1,000 Expense records, THE App SHALL complete the render within 300ms on a mid-range desktop device.
- **NFR-3 — Visual Design**: THE App SHALL apply a consistent visual hierarchy using defined font sizes, spacing, and a cohesive color palette across all views.
