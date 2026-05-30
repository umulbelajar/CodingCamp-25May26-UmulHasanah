# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, categorize spending, and visualize their budget distribution through an interactive pie chart. Built with plain HTML, CSS, and Vanilla JavaScript, it requires no backend server and persists all data in the browser's Local Storage. The app targets individuals who want a lightweight, zero-setup tool to monitor daily spending across categories such as Food, Transport, and Fun.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category. Each transaction is assigned a unique identifier at creation.
- **Transaction_List**: The scrollable UI component that displays all recorded transactions.
- **Input_Form**: The HTML form used to capture a new transaction's item name, amount, and category.
- **Category**: A classification label for a transaction. Valid values are: `Food`, `Transport`, `Fun`.
- **Total_Balance**: The running sum of all transaction amounts displayed at the top of the App.
- **Chart**: The pie chart component that visualizes spending distribution by category.
- **Storage**: The browser's Local Storage API used to persist transaction data client-side.
- **Validator**: The client-side validation logic that checks Input_Form fields before submission.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form with an item name, amount, and category, so that I can record a new expense quickly.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name (maximum 100 characters), a numeric field for amount, and a dropdown selector for category with a placeholder option and the options `Food`, `Transport`, and `Fun`.
2. WHEN the user submits the Input_Form with all fields filled and a valid amount between 0.01 and 999,999,999.99 (up to 2 decimal places), THE App SHALL add the transaction to the Transaction_List and persist it to Storage.
3. IF the user submits the Input_Form with one or more empty fields, THEN THE Validator SHALL display an inline error message adjacent to each missing field and SHALL NOT add the transaction.
4. IF the user submits the Input_Form with an amount that is zero, negative, greater than 999,999,999.99, or not a number, THEN THE Validator SHALL display an inline error message on the amount field and SHALL NOT add the transaction.
5. WHEN a transaction is successfully added, THE Input_Form SHALL reset the item name field to empty, the amount field to empty, and the category dropdown to its placeholder option.

---

### Requirement 2: View Transaction List

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each transaction's item name, amount formatted as a currency string (currency symbol followed by the value with exactly 2 decimal places), and category label.
2. WHILE the number of transactions exceeds the visible area of the Transaction_List container, THE Transaction_List SHALL be independently scrollable without causing the page header, Input_Form, Total_Balance, or Chart to scroll or shift.
3. WHEN the App loads, THE Transaction_List SHALL render all transactions previously persisted in Storage before any user interaction is possible.
4. THE Transaction_List SHALL display transactions in reverse insertion order, with the most recently added transaction appearing at the top of the list.
5. WHEN no transactions exist, THE Transaction_List SHALL display a message indicating that no transactions have been recorded yet.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to delete a transaction from the list, so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a labeled interactive delete button for each transaction entry, visible without requiring hover or additional interaction.
2. WHEN the user activates the delete button for a transaction identified by its unique identifier, THE App SHALL remove that transaction from the Transaction_List, update Storage, recalculate the Total_Balance, and refresh the Chart — all within 300ms of the user action.
3. WHEN a transaction is deleted, THE App SHALL reflect the removal in the Transaction_List, Total_Balance, and Chart without requiring a page reload.
4. IF the Storage write fails during a delete operation, THEN THE App SHALL roll back the in-memory Transaction_List to its pre-deletion state, restore the previous Total_Balance and Chart, and display an error indication to the user.

---

### Requirement 4: Display Total Balance

**User Story:** As a user, I want to see my total spending at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the Total_Balance as the sum of all transaction amounts, formatted as a currency string (currency symbol followed by the value with exactly 2 decimal places), positioned above the Transaction_List.
2. WHEN a transaction is added, THE App SHALL update the Total_Balance display within 100ms to reflect the new sum.
3. WHEN a transaction is deleted, THE App SHALL update the Total_Balance display within 100ms to reflect the new sum.
4. WHEN no transactions exist, THE App SHALL display a Total_Balance of the currency-formatted value of zero (e.g., `$0.00`).
5. WHEN the App loads, THE App SHALL compute and display the Total_Balance from all transactions restored from Storage before any user interaction is possible.

---

### Requirement 5: Visualize Spending by Category (Pie Chart)

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going at a glance.

#### Acceptance Criteria

1. WHEN the App loads or the transaction data changes, THE Chart SHALL render a pie chart where each slice represents a category's proportion, calculated as (sum of amounts for that category) / (sum of all transaction amounts), and each slice is labeled with the category name and percentage.
2. WHEN a transaction is added, THE Chart SHALL update automatically within 300ms to reflect the new category distribution.
3. WHEN a transaction is deleted, THE Chart SHALL update automatically within 300ms to reflect the revised category distribution.
4. WHEN no transactions exist, THE Chart SHALL display a text message (e.g., "No data to display") with no pie slices rendered.
5. THE Chart SHALL assign a fixed, distinct color to each category such that no two categories share the same color, and the same category always renders with the same color across all renders.
6. WHEN a category has a total spending amount of zero, THE Chart SHALL exclude that category's slice and legend entry from the rendered chart.

---

### Requirement 6: Persist Data Across Sessions

**User Story:** As a user, I want my transactions to be saved between browser sessions, so that I do not lose my data when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a transaction is added, THE Storage SHALL serialize the complete Transaction_List as a JSON string and save it to Local Storage under a fixed key before the UI update completes.
2. WHEN a transaction is deleted, THE Storage SHALL serialize the updated Transaction_List as a JSON string and save it to Local Storage under the same fixed key before the UI update completes.
3. WHEN the App loads, THE App SHALL read the Local Storage key, deserialize the JSON string, and restore all transactions before rendering the Transaction_List, Total_Balance, and Chart.
4. IF the Local Storage key is absent or its value is an empty string, THEN THE App SHALL initialize with an empty Transaction_List and a Total_Balance of zero.
5. IF the Local Storage value fails JSON parsing or any transaction object is missing a required field (item name string, numeric amount between 0.01 and 999,999,999.99, valid category of `Food`, `Transport`, or `Fun`), THEN THE App SHALL discard the corrupt data, initialize with an empty Transaction_List, and display an error indication to the user.

---

### Requirement 7: Responsive and Accessible UI

**User Story:** As a user, I want the app to be readable and usable on different screen sizes and in modern browsers, so that I can access it from any device.

#### Acceptance Criteria

1. THE App SHALL render all UI components and remain fully functional in the current and previous major versions of Chrome, Firefox, Edge, and Safari (e.g., if current Chrome is v125, the App must work in v124 and v125).
2. THE App SHALL use a single CSS file located at `css/style.css` and a single JavaScript file located at `js/app.js`; no other CSS or JS files shall be loaded except approved third-party chart libraries via CDN.
3. THE App SHALL render all body text at a minimum font size of 14px, with at least a 4px size difference between heading-level text and body-level text, so that item names, amounts, categories, and the chart legend are visually distinguishable.
4. WHEN the viewport width is set to 320px, THE App SHALL display all content (Input_Form, Total_Balance, Transaction_List, and Chart) without a horizontal scrollbar and without any content being clipped or hidden outside the viewport.
5. THE App SHALL maintain a minimum contrast ratio of 4.5:1 between all text elements and their backgrounds, as measured by the WCAG 2.1 relative luminance formula.

---

## Technical Constraints

- **TC-1 (Technology Stack):** THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript. No JavaScript frameworks (React, Vue, Angular, etc.) are permitted.
- **TC-2 (Data Storage):** THE App SHALL store all data exclusively in the browser's Local Storage. No backend server or external database is used.
- **TC-3 (Browser Compatibility):** THE App SHALL function as a standalone web application in modern browsers (Chrome, Firefox, Edge, Safari).
- **TC-4 (File Structure):** THE App SHALL contain exactly one CSS file inside the `css/` directory and exactly one JavaScript file inside the `js/` directory.
