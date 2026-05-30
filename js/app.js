// =============================================================================
// Expense & Budget Visualizer — js/app.js
// =============================================================================

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "expense_budget_visualizer_data";

const CATEGORY_COLORS = {
  Food:      "#FF6384",
  Transport: "#36A2EB",
  Fun:       "#FFCE56"
};

// Valid category values (derived from CATEGORY_COLORS so there is a single
// source of truth).
const VALID_CATEGORIES = Object.keys(CATEGORY_COLORS); // ["Food","Transport","Fun"]

// ---------------------------------------------------------------------------
// Model — ID generation (2.1)
// ---------------------------------------------------------------------------

/**
 * Generates a UUID v4 string.
 * Uses `crypto.randomUUID()` when available; falls back to a Math.random-based
 * implementation for environments that do not expose the Web Crypto API.
 *
 * @returns {string} A UUID v4 string, e.g. "550e8400-e29b-41d4-a716-446655440000"
 */
function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Math.random fallback — UUID v4 format
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------------------------------------------------------------------------
// Model — Input validation (2.2)
// ---------------------------------------------------------------------------

/**
 * Validates the three transaction input fields.
 *
 * Rules:
 *   name     — non-empty after trim; length ≤ 100
 *   amount   — finite number; > 0; ≤ 999,999,999.99; at most 2 decimal places
 *   category — exactly one of "Food", "Transport", "Fun"
 *
 * @param {string} name
 * @param {*}      amount   — may be a string (from an <input>) or a number
 * @param {string} category
 * @returns {Object} An object whose keys are the names of failing fields and
 *                   whose values are human-readable error messages.  An empty
 *                   object means all fields are valid.
 *
 * Example: { name: "Name is required.", amount: "Amount must be greater than 0." }
 */
function validateInput(name, amount, category) {
  const errors = {};

  // --- name ---
  if (typeof name !== "string" || name.trim().length === 0) {
    errors.name = "Name is required.";
  } else if (name.trim().length > 100) {
    errors.name = "Name must be 100 characters or fewer.";
  }

  // --- amount ---
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
    // Check that the value has at most 2 decimal places.
    // Multiply by 100, round, and compare to the original * 100.
    const rounded = Math.round(parsed * 100) / 100;
    if (Math.abs(rounded - parsed) > Number.EPSILON * 1000) {
      errors.amount = "Amount may have at most 2 decimal places.";
    }
  }

  // --- category ---
  if (!VALID_CATEGORIES.includes(category)) {
    errors.category = "Category must be one of: Food, Transport, Fun.";
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Model — Transaction mutations (2.5, 2.6)
// ---------------------------------------------------------------------------

/**
 * Creates a new transaction and appends it to a copy of the given array.
 *
 * @param {Array}  transactions — existing transaction array (not mutated)
 * @param {string} name
 * @param {*}      amount       — will be stored as parseFloat(amount)
 * @param {string} category
 * @returns {Array} A new array containing all previous transactions plus the
 *                  newly created one.
 */
function addTransaction(transactions, name, amount, category) {
  const newTransaction = {
    id:       generateId(),
    name:     name,
    amount:   parseFloat(amount),
    category: category
  };
  return transactions.concat([newTransaction]);
}

/**
 * Returns a new array with the transaction identified by `id` removed.
 * If no transaction with that id exists the original array is returned
 * unchanged (no error is thrown).
 *
 * @param {Array}  transactions — existing transaction array (not mutated)
 * @param {string} id           — the id of the transaction to remove
 * @returns {Array} A new array without the matching transaction.
 */
function deleteTransaction(transactions, id) {
  return transactions.filter(function (tx) {
    return tx.id !== id;
  });
}

// ---------------------------------------------------------------------------
// Node.js / test environment exports
// ---------------------------------------------------------------------------

if (typeof module !== "undefined") {
  module.exports = {
    STORAGE_KEY,
    CATEGORY_COLORS,
    VALID_CATEGORIES,
    generateId,
    validateInput,
    addTransaction,
    deleteTransaction
  };
}
