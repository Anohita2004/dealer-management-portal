const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const accountsController = require("../controllers/accountsController");

// 📊 Summary
router.get(
  "/summary",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.getSummary
);

// 🧾 Invoices
router.get(
  "/invoices",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.getInvoices
);
router.post(
  "/invoices",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.createInvoice
);
router.put(
  "/invoices/:id",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.updateInvoice
);
router.delete(
  "/invoices/:id",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.deleteInvoice
);

// 💼 Notes
router.get(
  "/notes",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.getNotes
);
router.post(
  "/notes",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.createNote
);
router.put(
  "/notes/:id",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.updateNote
);
router.delete(
  "/notes/:id",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.deleteNote
);

// 📚 Statements
router.get(
  "/statements",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.getStatements
);
router.post(
  "/statements",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.createStatement
);
router.put(
  "/statements/:id",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.updateStatement
);

// 🔁 Reconciliation
router.get(
  "/reconciliation",
  authenticate,
  authorize("accounts", "super_admin"),
  accountsController.getReconciliation
);

module.exports = router;
