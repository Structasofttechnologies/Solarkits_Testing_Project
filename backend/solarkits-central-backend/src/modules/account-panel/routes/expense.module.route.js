const express = require('express');
const router = express.Router();
const expenseHandler = require('../controller/expense.module.handler');
const check_auth = require('../middlewares/check.auth');

router.get('/', check_auth, expenseHandler.get_expenses);
router.post('/', check_auth, expenseHandler.create_expense);
router.post('/:id/approve', check_auth, expenseHandler.approve_expense);
router.post('/:id/reject', check_auth, expenseHandler.reject_expense);
router.post('/:id/pay', check_auth, expenseHandler.pay_expense);
router.get('/reports', check_auth, expenseHandler.get_expense_reports);

module.exports = router;
