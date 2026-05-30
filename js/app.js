// =============================================================================
// Expense & Budget Visualizer — js/app.js
// =============================================================================

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY         = "expense_budget_visualizer_data";
const CATEGORIES_KEY      = "expense_budget_visualizer_categories";
const LIMIT_KEY           = "expense_budget_visualizer_limit";
const THEME_KEY           = "expense_budget_visualizer_theme";

/** Built-in categories that cannot be removed. */
const BUILTIN_CATEGORIES = ["Food", "Transport", "Fun"];

/** Default colors for built-in categories. */
const BUILTIN_COLORS = {
  Food:      "#FF6384",
  Transport: "#36A2EB",
  Fun:       "#FFCE56"
};

/**
 * CATEGORY_COLORS is the live map of category → hex color.
 * It starts with the built-ins and is extended by custom categories.
 */
let CATEGORY_COLORS = Object.assign({}, BUILTIN_COLORS);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {Array<{id:string, name:string, amount:number, category:string}>} */
let transactions = [];

/** @type {number|null} Per-transaction spending limit; null = no limit. */
let spendingLimit = null;

/** @type {"default"|"amount-asc"|"amount-desc"|"category-asc"|"category-desc"} */
let currentSort = "default";

// ---------------------------------------------------------------------------
// Model — ID generation
// ---------------------------------------------------------------------------

/**
 * Generates a UUID v4 string.
 * Uses crypto.randomUUID() when available; falls back to Math.random.
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------------------------------------------------------------------------
// Model — Input validation
// ---------------------------------------------------------------------------

/**
 * Validates the three transaction input fields.
 * @param {string} name
 * @param {*}      amount
 * @param {string} category
 * @returns {Object} Map of field name → error message for each failing field.
 */
function validateInput(name, amount, category) {
  const errors = {};
  const validCategories = Object.keys(CATEGORY_COLORS);

  // name
  if (typeof name !== "string" || name.trim().length === 0) {
    errors.name = "Name is required.";
  } else if (name.trim().length > 100) {
    errors.name = "Name must be 100 characters or fewer.";
  }

  // amount
  const parsed = parseFloat(amount);
  if (amount === "" || amount === null || amount === undefined) {
    errors.amount = "Amount is required.";
  } else if (isNaN(parsed) || !isFinite(parsed)) {
    errors.amount = "Amount must be a valid number.";
  } else if (parsed <= 0) {
    errors.amount = "Amount must be greater than 0.";
  } else if (parsed > 999999999.99) {
    errors.amount = "Amount must not exceed 999,999,999.99.";
  } else {
    const rounded = Math.round(parsed * 100) / 100;
    if (Math.abs(rounded - parsed) > Number.EPSILON * 1000) {
      errors.amount = "Amount may have at most 2 decimal places.";
    }
  }

  // category
  if (!validCategories.includes(category)) {
    errors.category = "Please select a valid category.";
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Model — Transaction mutations
// ---------------------------------------------------------------------------

/**
 * Appends a new transaction to a copy of the array and returns it.
 * @param {Array}  transactions
 * @param {string} name
 * @param {*}      amount
 * @param {string} category
 * @returns {Array}
 */
function addTransaction(transactions, name, amount, category) {
  const newTx = {
    id:        generateId(),
    name:      name.trim(),
    amount:    parseFloat(amount),
    category:  category,
    createdAt: new Date().toISOString()
  };
  return transactions.concat([newTx]);
}

/**
 * Returns a new array with the transaction matching `id` removed.
 * @param {Array}  transactions
 * @param {string} id
 * @returns {Array}
 */
function deleteTransaction(transactions, id) {
  return transactions.filter(function (tx) { return tx.id !== id; });
}

// ---------------------------------------------------------------------------
// Model — localStorage persistence
// ---------------------------------------------------------------------------

/**
 * Serializes transactions to JSON and writes to localStorage.
 * @param {Array} transactions
 * @throws {Error} "STORAGE_WRITE_FAILED"
 */
function saveToStorage(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (e) {
    throw new Error("STORAGE_WRITE_FAILED");
  }
}

/**
 * Reads and validates the transaction array from localStorage.
 * @returns {Array}
 * @throws {Error} "STORAGE_READ_FAILED"
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw === "") return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("STORAGE_READ_FAILED");

    const validCategories = Object.keys(CATEGORY_COLORS);
    for (const tx of parsed) {
      if (typeof tx.id !== "string") throw new Error("STORAGE_READ_FAILED");
      if (typeof tx.name !== "string" || tx.name.trim().length < 1 || tx.name.trim().length > 100)
        throw new Error("STORAGE_READ_FAILED");
      if (typeof tx.amount !== "number" || !isFinite(tx.amount) || tx.amount < 0.01 || tx.amount > 999999999.99)
        throw new Error("STORAGE_READ_FAILED");
      if (!validCategories.includes(tx.category)) throw new Error("STORAGE_READ_FAILED");
    }
    return parsed;
  } catch (e) {
    if (e.message === "STORAGE_READ_FAILED") throw e;
    throw new Error("STORAGE_READ_FAILED");
  }
}

// ---------------------------------------------------------------------------
// Model — Custom categories persistence
// ---------------------------------------------------------------------------

/**
 * Saves the current CATEGORY_COLORS map (custom entries only) to localStorage.
 */
function saveCategoriesToStorage() {
  try {
    // Only persist non-builtin entries
    const custom = {};
    for (const [cat, color] of Object.entries(CATEGORY_COLORS)) {
      if (!BUILTIN_CATEGORIES.includes(cat)) {
        custom[cat] = color;
      }
    }
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(custom));
  } catch (e) {
    // Non-critical — silently ignore
  }
}

/**
 * Loads custom categories from localStorage and merges them into CATEGORY_COLORS.
 */
function loadCategoriesFromStorage() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || Array.isArray(parsed)) return;
    for (const [cat, color] of Object.entries(parsed)) {
      if (typeof cat === "string" && cat.trim().length > 0 && typeof color === "string") {
        CATEGORY_COLORS[cat] = color;
      }
    }
  } catch (e) {
    // Corrupt custom categories — ignore, keep built-ins
  }
}

// ---------------------------------------------------------------------------
// Model — Spending limit persistence
// ---------------------------------------------------------------------------

function saveLimit(limit) {
  try {
    if (limit === null) {
      localStorage.removeItem(LIMIT_KEY);
    } else {
      localStorage.setItem(LIMIT_KEY, String(limit));
    }
  } catch (e) { /* ignore */ }
}

function loadLimit() {
  try {
    const raw = localStorage.getItem(LIMIT_KEY);
    if (raw === null) return null;
    const n = parseFloat(raw);
    return isFinite(n) && n > 0 ? n : null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Model — Theme persistence
// ---------------------------------------------------------------------------

function saveTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
}

function loadTheme() {
  try { return localStorage.getItem(THEME_KEY) || "light"; } catch (e) { return "light"; }
}

// ---------------------------------------------------------------------------
// Model — Pie chart data
// ---------------------------------------------------------------------------

/**
 * Computes per-category totals for the pie chart.
 * @param {Array} transactions
 * @returns {Array<{category:string, amount:number, proportion:number, color:string}>}
 */
function buildPieData(transactions) {
  const totals = {};
  for (const tx of transactions) {
    totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
  }
  const grand = Object.values(totals).reduce(function (s, v) { return s + v; }, 0);
  if (grand === 0) return [];

  return Object.entries(totals)
    .filter(function ([, amt]) { return amt > 0; })
    .map(function ([cat, amt]) {
      return {
        category:   cat,
        amount:     amt,
        proportion: amt / grand,
        color:      CATEGORY_COLORS[cat] || "#aaaaaa"
      };
    });
}

// ---------------------------------------------------------------------------
// Model — Monthly summary
// ---------------------------------------------------------------------------

/**
 * Groups transactions by YYYY-MM and returns sorted summary rows.
 * @param {Array} transactions
 * @returns {Array<{month:string, label:string, total:number, count:number}>}
 */
function buildMonthlySummary(transactions) {
  const map = {};
  for (const tx of transactions) {
    // Use createdAt if present, otherwise fall back to current month
    const date = tx.createdAt ? new Date(tx.createdAt) : new Date();
    const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    if (!map[key]) map[key] = { total: 0, count: 0 };
    map[key].total += tx.amount;
    map[key].count += 1;
  }

  return Object.entries(map)
    .sort(function (a, b) { return b[0].localeCompare(a[0]); }) // newest first
    .map(function ([key, data]) {
      const [year, month] = key.split("-");
      const label = new Date(Number(year), Number(month) - 1, 1)
        .toLocaleDateString("en-US", { year: "numeric", month: "long" });
      return { month: key, label: label, total: data.total, count: data.count };
    });
}

// ---------------------------------------------------------------------------
// Model — Sorting
// ---------------------------------------------------------------------------

/**
 * Returns a sorted copy of the transactions array.
 * @param {Array}  transactions
 * @param {string} sortKey
 * @returns {Array}
 */
function sortTransactions(transactions, sortKey) {
  const copy = transactions.slice();
  switch (sortKey) {
    case "amount-asc":
      return copy.sort(function (a, b) { return a.amount - b.amount; });
    case "amount-desc":
      return copy.sort(function (a, b) { return b.amount - a.amount; });
    case "category-asc":
      return copy.sort(function (a, b) { return a.category.localeCompare(b.category); });
    case "category-desc":
      return copy.sort(function (a, b) { return b.category.localeCompare(a.category); });
    default:
      return copy; // insertion order (already reversed in renderList)
  }
}

// ---------------------------------------------------------------------------
// View — Utilities
// ---------------------------------------------------------------------------

/**
 * Formats a number as a USD currency string.
 * @param {number} amount
 * @returns {string} e.g. "$12.50"
 */
function formatCurrency(amount) {
  return "$" + amount.toFixed(2);
}

// ---------------------------------------------------------------------------
// View — Transaction list
// ---------------------------------------------------------------------------

/** Reference to the Chart.js instance so we can destroy/recreate it. */
let chartInstance = null;

/**
 * Clears and re-renders the transaction list.
 * Applies current sort order and spending-limit highlights.
 * @param {Array} txList
 */
function renderList(txList) {
  const ul = document.getElementById("transaction-list");
  ul.innerHTML = "";

  if (txList.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "No transactions recorded yet.";
    ul.appendChild(li);
    return;
  }

  // Apply sort; default sort shows newest first (reverse insertion order)
  let sorted = sortTransactions(txList, currentSort);
  if (currentSort === "default") sorted = sorted.reverse();

  for (const tx of sorted) {
    const li = document.createElement("li");

    // Over-limit highlight
    if (spendingLimit !== null && tx.amount > spendingLimit) {
      li.classList.add("over-limit");
      li.setAttribute("title", "Exceeds spending limit of " + formatCurrency(spendingLimit));
    }

    // Name
    const nameSpan = document.createElement("span");
    nameSpan.className = "tx-name";
    nameSpan.textContent = tx.name;

    // Amount
    const amtSpan = document.createElement("span");
    amtSpan.className = "tx-amount";
    amtSpan.textContent = formatCurrency(tx.amount);

    // Category badge
    const catSpan = document.createElement("span");
    catSpan.className = "tx-category";
    catSpan.textContent = tx.category;
    catSpan.style.backgroundColor = CATEGORY_COLORS[tx.category] || "#aaaaaa";

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.className = "btn-delete";
    delBtn.textContent = "Delete";
    delBtn.setAttribute("data-id", tx.id);
    delBtn.setAttribute("aria-label", "Delete transaction: " + tx.name);

    li.appendChild(nameSpan);
    li.appendChild(amtSpan);
    li.appendChild(catSpan);
    li.appendChild(delBtn);
    ul.appendChild(li);
  }
}

// ---------------------------------------------------------------------------
// View — Total balance
// ---------------------------------------------------------------------------

/**
 * Computes and displays the total balance.
 * @param {Array} txList
 */
function renderBalance(txList) {
  const sum = txList.reduce(function (acc, tx) { return acc + tx.amount; }, 0);
  document.getElementById("total-balance").textContent = formatCurrency(sum);
}

// ---------------------------------------------------------------------------
// View — Pie chart
// ---------------------------------------------------------------------------

/**
 * Renders (or clears) the spending pie chart.
 * @param {Array} txList
 */
function renderChart(txList) {
  const canvas  = document.getElementById("spending-chart");
  const emptyEl = document.getElementById("chart-empty");
  const pieData = buildPieData(txList);

  if (pieData.length === 0) {
    canvas.hidden = true;
    emptyEl.hidden = false;
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  canvas.hidden = false;
  emptyEl.hidden = true;

  // Update aria-label with a text summary
  const summary = pieData
    .map(function (d) {
      return d.category + " " + (d.proportion * 100).toFixed(1) + "%";
    })
    .join(", ");
  canvas.setAttribute("aria-label", "Pie chart: " + summary);

  const labels = pieData.map(function (d) { return d.category; });
  const data   = pieData.map(function (d) { return d.amount; });
  const colors = pieData.map(function (d) { return d.color; });

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data   = data;
    chartInstance.data.datasets[0].backgroundColor = colors;
    chartInstance.update();
  } else {
    chartInstance = new Chart(canvas, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [{
          data:            data,
          backgroundColor: colors,
          borderWidth:     2,
          borderColor:     "#ffffff"
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: { size: 13 },
              color: getComputedStyle(document.documentElement)
                       .getPropertyValue("--color-text").trim() || "#1a1a1a"
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const d = pieData[ctx.dataIndex];
                return " " + formatCurrency(d.amount) +
                       " (" + (d.proportion * 100).toFixed(1) + "%)";
              }
            }
          }
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------
// View — Monthly summary
// ---------------------------------------------------------------------------

/**
 * Renders the monthly summary panel.
 * @param {Array} txList
 */
function renderMonthlySummary(txList) {
  const container = document.getElementById("monthly-summary-body");
  container.innerHTML = "";

  const rows = buildMonthlySummary(txList);

  if (rows.length === 0) {
    const p = document.createElement("p");
    p.className = "monthly-empty";
    p.textContent = "No transactions yet.";
    container.appendChild(p);
    return;
  }

  for (const row of rows) {
    const div = document.createElement("div");
    div.className = "monthly-row";

    const monthSpan = document.createElement("span");
    monthSpan.className = "monthly-month";
    monthSpan.textContent = row.label;

    const countSpan = document.createElement("span");
    countSpan.className = "monthly-count";
    countSpan.textContent = row.count + (row.count === 1 ? " transaction" : " transactions");

    const totalSpan = document.createElement("span");
    totalSpan.className = "monthly-total";
    totalSpan.textContent = formatCurrency(row.total);

    div.appendChild(monthSpan);
    div.appendChild(countSpan);
    div.appendChild(totalSpan);
    container.appendChild(div);
  }
}

// ---------------------------------------------------------------------------
// View — Custom category chips
// ---------------------------------------------------------------------------

/**
 * Re-renders the category chip list and rebuilds the <select> options.
 */
function renderCategories() {
  const ul = document.getElementById("custom-category-list");
  ul.innerHTML = "";

  for (const [cat, color] of Object.entries(CATEGORY_COLORS)) {
    const li = document.createElement("li");

    const chip = document.createElement("span");
    chip.className = "category-chip" + (BUILTIN_CATEGORIES.includes(cat) ? " builtin" : "");
    chip.style.backgroundColor = color;

    const label = document.createElement("span");
    label.textContent = cat;
    chip.appendChild(label);

    if (!BUILTIN_CATEGORIES.includes(cat)) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "chip-remove";
      removeBtn.setAttribute("aria-label", "Remove category " + cat);
      removeBtn.setAttribute("title", "Remove " + cat);
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", function () {
        handleRemoveCategory(cat);
      });
      chip.appendChild(removeBtn);
    }

    li.appendChild(chip);
    ul.appendChild(li);
  }

  // Rebuild the category <select>
  const select = document.getElementById("category");
  const current = select.value;
  select.innerHTML = '<option value="" disabled>Select a category</option>';
  for (const cat of Object.keys(CATEGORY_COLORS)) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  }
  // Restore selection if still valid
  if (current && CATEGORY_COLORS[current]) select.value = current;
}

// ---------------------------------------------------------------------------
// View — Spending limit display
// ---------------------------------------------------------------------------

function renderLimitDisplay() {
  const el = document.getElementById("current-limit-display");
  const input = document.getElementById("spending-limit");
  if (spendingLimit !== null) {
    el.textContent = "Active limit: " + formatCurrency(spendingLimit) + " per transaction";
    input.value = spendingLimit;
  } else {
    el.textContent = "No limit set.";
    input.value = "";
  }
}

// ---------------------------------------------------------------------------
// View — Error banner
// ---------------------------------------------------------------------------

/**
 * Shows a persistent error banner.
 * @param {string} message
 */
function showErrorBanner(message) {
  const banner = document.getElementById("error-banner");
  banner.textContent = message;
  banner.hidden = false;
}

function hideErrorBanner() {
  const banner = document.getElementById("error-banner");
  banner.hidden = true;
}

// ---------------------------------------------------------------------------
// View — Form helpers
// ---------------------------------------------------------------------------

function resetForm() {
  document.getElementById("item-name").value = "";
  document.getElementById("amount").value = "";
  const sel = document.getElementById("category");
  sel.value = "";
  sel.selectedIndex = 0;
  clearFieldErrors();
}

function clearFieldErrors() {
  ["error-name", "error-amount", "error-category"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
}

// ---------------------------------------------------------------------------
// View — renderAll
// ---------------------------------------------------------------------------

/**
 * Calls all render functions in sequence to keep the UI in sync.
 * @param {Array} txList
 */
function renderAll(txList) {
  renderList(txList);
  renderBalance(txList);
  renderChart(txList);
  renderMonthlySummary(txList);
}

// ---------------------------------------------------------------------------
// Controller — Theme toggle
// ---------------------------------------------------------------------------

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn  = document.getElementById("theme-toggle");
  const icon = document.getElementById("theme-icon");
  if (theme === "dark") {
    icon.textContent = "☀️";
    btn.setAttribute("aria-label", "Switch to light mode");
  } else {
    icon.textContent = "🌙";
    btn.setAttribute("aria-label", "Switch to dark mode");
  }
  // Update chart legend color if chart exists
  if (chartInstance) {
    const textColor = getComputedStyle(document.documentElement)
                        .getPropertyValue("--color-text").trim() || "#1a1a1a";
    chartInstance.options.plugins.legend.labels.color = textColor;
    chartInstance.update();
  }
}

function handleThemeToggle() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  applyTheme(next);
  saveTheme(next);
}

// ---------------------------------------------------------------------------
// Controller — Custom categories
// ---------------------------------------------------------------------------

function handleAddCategory() {
  const nameInput  = document.getElementById("new-category-name");
  const colorInput = document.getElementById("new-category-color");
  const errorEl    = document.getElementById("error-new-category");

  const name  = nameInput.value.trim();
  const color = colorInput.value;

  errorEl.textContent = "";

  if (name.length === 0) {
    errorEl.textContent = "Category name is required.";
    nameInput.focus();
    return;
  }
  if (name.length > 30) {
    errorEl.textContent = "Category name must be 30 characters or fewer.";
    nameInput.focus();
    return;
  }
  if (CATEGORY_COLORS[name]) {
    errorEl.textContent = "A category with that name already exists.";
    nameInput.focus();
    return;
  }

  CATEGORY_COLORS[name] = color;
  saveCategoriesToStorage();
  renderCategories();
  nameInput.value = "";
  colorInput.value = "#a78bfa";
}

function handleRemoveCategory(cat) {
  if (BUILTIN_CATEGORIES.includes(cat)) return; // guard

  // Check if any transaction uses this category
  const inUse = transactions.some(function (tx) { return tx.category === cat; });
  if (inUse) {
    showErrorBanner(
      'Cannot remove "' + cat + '" — it is used by existing transactions. ' +
      'Delete those transactions first.'
    );
    return;
  }

  delete CATEGORY_COLORS[cat];
  saveCategoriesToStorage();
  renderCategories();
  hideErrorBanner();
}

// ---------------------------------------------------------------------------
// Controller — Spending limit
// ---------------------------------------------------------------------------

function handleSetLimit() {
  const input = document.getElementById("spending-limit");
  const val   = parseFloat(input.value);

  if (isNaN(val) || val <= 0) {
    showErrorBanner("Please enter a valid positive number for the spending limit.");
    return;
  }

  spendingLimit = Math.round(val * 100) / 100;
  saveLimit(spendingLimit);
  renderLimitDisplay();
  renderAll(transactions); // re-render list to apply/remove highlights
  hideErrorBanner();
}

function handleClearLimit() {
  spendingLimit = null;
  saveLimit(null);
  renderLimitDisplay();
  renderAll(transactions);
}

// ---------------------------------------------------------------------------
// Controller — Sort
// ---------------------------------------------------------------------------

function handleSortChange() {
  currentSort = document.getElementById("sort-select").value;
  renderList(transactions);
}

// ---------------------------------------------------------------------------
// Controller — Form submission
// ---------------------------------------------------------------------------

function handleFormSubmit(event) {
  event.preventDefault();
  clearFieldErrors();
  hideErrorBanner();

  const name     = document.getElementById("item-name").value;
  const amount   = document.getElementById("amount").value;
  const category = document.getElementById("category").value;

  const errors = validateInput(name, amount, category);

  if (Object.keys(errors).length > 0) {
    if (errors.name)     document.getElementById("error-name").textContent     = errors.name;
    if (errors.amount)   document.getElementById("error-amount").textContent   = errors.amount;
    if (errors.category) document.getElementById("error-category").textContent = errors.category;
    return;
  }

  const updated = addTransaction(transactions, name, amount, category);

  try {
    saveToStorage(updated);
  } catch (e) {
    showErrorBanner("Could not save: storage is full or unavailable. Transaction not added.");
    return;
  }

  transactions = updated;
  renderAll(transactions);
  resetForm();
}

// ---------------------------------------------------------------------------
// Controller — Delete
// ---------------------------------------------------------------------------

function handleDeleteClick(id) {
  const snapshot = transactions.slice();
  const updated  = deleteTransaction(transactions, id);

  try {
    saveToStorage(updated);
  } catch (e) {
    transactions = snapshot;
    renderAll(snapshot);
    showErrorBanner("Could not save after delete: storage is full or unavailable.");
    return;
  }

  transactions = updated;
  renderAll(transactions);
}

// ---------------------------------------------------------------------------
// Controller — Init
// ---------------------------------------------------------------------------

function init() {
  // 1. Load persisted theme
  const savedTheme = loadTheme();
  applyTheme(savedTheme);

  // 2. Load custom categories (must happen before loadFromStorage validates categories)
  loadCategoriesFromStorage();
  renderCategories();

  // 3. Load spending limit
  spendingLimit = loadLimit();
  renderLimitDisplay();

  // 4. Load transactions
  try {
    transactions = loadFromStorage();
  } catch (e) {
    transactions = [];
    renderAll([]);
    showErrorBanner("Saved data was corrupted and has been cleared.");
    return;
  }

  renderAll(transactions);

  // 5. Wire events — form submit
  document.getElementById("transaction-form")
    .addEventListener("submit", handleFormSubmit);

  // 6. Wire events — delete (event delegation on the list)
  document.getElementById("transaction-list")
    .addEventListener("click", function (e) {
      const btn = e.target.closest("[data-id]");
      if (btn) handleDeleteClick(btn.getAttribute("data-id"));
    });

  // 7. Theme toggle
  document.getElementById("theme-toggle")
    .addEventListener("click", handleThemeToggle);

  // 8. Custom category controls
  document.getElementById("btn-add-category")
    .addEventListener("click", handleAddCategory);

  document.getElementById("new-category-name")
    .addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); }
    });

  // 9. Spending limit controls
  document.getElementById("btn-set-limit")
    .addEventListener("click", handleSetLimit);

  document.getElementById("btn-clear-limit")
    .addEventListener("click", handleClearLimit);

  document.getElementById("spending-limit")
    .addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); handleSetLimit(); }
    });

  // 10. Sort control
  document.getElementById("sort-select")
    .addEventListener("change", handleSortChange);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}

// ---------------------------------------------------------------------------
// Node.js / test environment exports
// ---------------------------------------------------------------------------

if (typeof module !== "undefined") {
  module.exports = {
    STORAGE_KEY,
    CATEGORIES_KEY,
    BUILTIN_CATEGORIES,
    BUILTIN_COLORS,
    CATEGORY_COLORS,
    generateId,
    validateInput,
    addTransaction,
    deleteTransaction,
    saveToStorage,
    loadFromStorage,
    buildPieData,
    buildMonthlySummary,
    sortTransactions,
    formatCurrency
  };
}
