const express = require('express');
const router = express.Router();
const accounting_handler = require('../controller/accounting.module.handler');
const check_auth = require('../middlewares/check.auth');

// Chart of Accounts / Dynamic Accounting Heads
router.post('/heads/seed', check_auth, accounting_handler.seed_default_heads);
router.get('/heads', check_auth, accounting_handler.list_accounting_heads);
router.post('/heads', check_auth, accounting_handler.create_accounting_head);
router.put('/heads/:id', check_auth, accounting_handler.update_accounting_head);
router.patch('/heads/:id/status', check_auth, accounting_handler.toggle_head_status);

// Vouchers & Double-Entry Bookkeeping
router.get('/vouchers', check_auth, accounting_handler.list_vouchers);
router.post('/vouchers', check_auth, accounting_handler.create_voucher);
router.get('/vouchers/:id', check_auth, accounting_handler.get_voucher_detail);
router.post('/vouchers/:id/cancel', check_auth, accounting_handler.cancel_voucher);

// Ledger Statements & Books
router.get('/ledgers/:head_id', check_auth, accounting_handler.get_ledger_statement);
router.get('/bank-cash-book', check_auth, accounting_handler.get_bank_cash_book);

// Financial Statements & Reports
router.get('/trial-balance', check_auth, accounting_handler.get_trial_balance);
router.get('/profit-loss', check_auth, accounting_handler.get_profit_and_loss);
router.get('/balance-sheet', check_auth, accounting_handler.get_balance_sheet);
router.get('/cash-flow', check_auth, accounting_handler.get_cash_flow);

module.exports = router;
