import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaBalanceScale,
  FaBook,
  FaFileInvoiceDollar,
  FaPlus,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaExchangeAlt,
  FaMoneyBillWave,
  FaUniversity,
  FaReceipt,
  FaPrint,
  FaDownload,
  FaTrash,
  FaEdit,
  FaSync,
  FaArrowUp,
  FaArrowDown,
  FaInfoCircle,
  FaRegFileAlt,
  FaLink,
  FaWarehouse,
  FaBuilding,
  FaCalculator
} from 'react-icons/fa';
<<<<<<< HEAD
=======
// eslint-disable-next-line no-unused-vars
>>>>>>> origin/main
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAccountingHeads,
  createAccountingHead,
  updateAccountingHead,
  toggleAccountingHeadStatus,
<<<<<<< HEAD
  seedDefaultAccountingHeads,
  getAccountingVouchers,
  createAccountingVoucher,
  getVoucherDetail,
=======
  getAccountingVouchers,
  createAccountingVoucher,
>>>>>>> origin/main
  cancelAccountingVoucher,
  getLedgerStatement,
  getBankCashBook,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getCashFlowStatement
} from '../../api/accounts';

const VOUCHER_TYPES = ['All', 'Journal', 'Payment', 'Receipt', 'Contra', 'Sales', 'Purchase', 'Credit Note', 'Debit Note'];

const ACCOUNTING_CATEGORIES = [
  'Sales Revenue',
  'Purchase Accounts',
  'Direct Expenses',
  'Indirect Expenses',
  'Employee Expenses',
  'Warehouse Expenses',
  'Financial Expenses',
  'Tax Accounts',
  'Other Income',
  'Current Assets',
  'Fixed Assets',
  'Current Liabilities',
  'Non-Current Liabilities',
  'Equity & Capital'
];

export default function AccountingModule() {
  const location = useLocation();
  const navigate = useNavigate();

  // Helper to determine active tab from route sub-path
  const getTabFromPath = (pathname = '') => {
    if (pathname.includes('/vouchers')) return 'vouchers';
    if (pathname.includes('/ledgers')) return 'ledgers';
    if (pathname.includes('/financial-statements') || pathname.includes('/reports')) return 'reports';
    return 'heads'; // default /chart-of-accounts or /accounting
  };

  const [activeTab, setActiveTabState] = useState(() => getTabFromPath(location.pathname));

  // Sync activeTab when user navigates using the sidebar subtabs
  useEffect(() => {
    const tabFromUrl = getTabFromPath(location.pathname);
    if (tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    }
  }, [location.pathname]);

  // Tab switch handler that also updates browser route
  const setActiveTab = (tabId) => {
    setActiveTabState(tabId);
    const subRouteMap = {
      heads: 'chart-of-accounts',
      vouchers: 'vouchers',
      ledgers: 'ledgers',
      reports: 'financial-statements'
    };
    const basePath = location.pathname.split('/accounting')[0] + '/accounting';
    const targetUrl = `${basePath}/${subRouteMap[tabId] || ''}`;
    if (location.pathname !== targetUrl) {
      navigate(targetUrl, { replace: true });
    }
  };

  // Global state
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

  // 1. Accounting Heads State
  const [heads, setHeads] = useState([]);
  const [headStats, setHeadStats] = useState({});
  const [headCategoryFilter, setHeadCategoryFilter] = useState('All');
  const [headLedgerTypeFilter, setHeadLedgerTypeFilter] = useState('All');
  const [headSearch, setHeadSearch] = useState('');
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState(null);

  const initialHeadForm = {
    name: '',
    category: 'Sales Revenue',
    parent_group: 'Operating Revenue',
    ledger_type: 'Income',
    gst_applicable: false,
    gst_rate: 18,
    tax_treatment: 'Standard Taxable',
    tds_applicable: false,
    tds_section: '',
    state_name: 'All India',
    cluster_name: 'All Clusters',
    cost_centre: 'Headquarters',
    department: 'Accounts & Finance',
    opening_balance_amount: 0,
    opening_balance_type: 'Cr',
    financial_year: '2026-2027',
    notes: ''
  };
  const [headFormData, setHeadFormData] = useState(initialHeadForm);

  // 2. Vouchers State
  const [vouchers, setVouchers] = useState([]);
  const [voucherTotal, setVoucherTotal] = useState(0);
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('All');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [voucherFromDate, setVoucherFromDate] = useState('');
  const [voucherToDate, setVoucherToDate] = useState('');
  const [isCreateVoucherOpen, setIsCreateVoucherOpen] = useState(false);
  const [selectedVoucherDetail, setSelectedVoucherDetail] = useState(null);

  const initialVoucherForm = {
    voucher_type: 'Journal',
    voucher_date: new Date().toISOString().split('T')[0],
    narration: '',
    payment_mode: 'None',
    bank_reference: '',
    order_number: '',
    invoice_number: '',
    supplier_name: '',
    warehouse_name: '',
    state_name: 'All India',
    cluster_name: 'All Clusters',
    cost_centre: 'Headquarters',
    department: 'Accounts & Finance',
    entries: [
      { head_id: '', entry_type: 'Debit', amount: '', narration: '' },
      { head_id: '', entry_type: 'Credit', amount: '', narration: '' }
    ]
  };
  const [voucherFormData, setVoucherFormData] = useState(initialVoucherForm);

  // 3. General Ledger & Cash/Bank Book State
  const [ledgerSubTab, setLedgerSubTab] = useState('ledger'); // 'ledger' | 'bank_cash'
  const [selectedLedgerHeadId, setSelectedLedgerHeadId] = useState('');
  const [ledgerData, setLedgerData] = useState(null);
  const [bankCashData, setBankCashData] = useState(null);
  const [ledgerDateRange, setLedgerDateRange] = useState({ from: '', to: '' });

  // 4. Financial Statements State
  const [reportSubTab, setReportSubTab] = useState('trial_balance'); // 'trial_balance' | 'pnl' | 'balance_sheet' | 'cash_flow'
  const [trialBalanceData, setTrialBalanceData] = useState(null);
  const [pnlData, setPnlData] = useState(null);
  const [balanceSheetData, setBalanceSheetData] = useState(null);
  const [cashFlowData, setCashFlowData] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: 'success', message: '' }), 4500);
  };

  // Load Heads
  const loadHeads = async () => {
    try {
      setLoading(true);
      const params = {};
      if (headCategoryFilter !== 'All') params.category = headCategoryFilter;
      if (headLedgerTypeFilter !== 'All') params.ledger_type = headLedgerTypeFilter;
      if (headSearch.trim()) params.search = headSearch.trim();

      const res = await getAccountingHeads(params);
      if (res.status === 'success') {
        setHeads(res.data || []);
        setHeadStats(res.stats || {});
        if (!selectedLedgerHeadId && res.data?.length > 0) {
          setSelectedLedgerHeadId(res.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load heads:', err);
      showAlert(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Vouchers
  const loadVouchers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (voucherTypeFilter !== 'All') params.voucher_type = voucherTypeFilter;
      if (voucherSearch.trim()) params.search = voucherSearch.trim();
      if (voucherFromDate) params.from_date = voucherFromDate;
      if (voucherToDate) params.to_date = voucherToDate;

      const res = await getAccountingVouchers(params);
      if (res.status === 'success') {
        setVouchers(res.data || []);
        setVoucherTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to load vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Ledger
  const loadLedgerStatement = async (headId) => {
    if (!headId) return;
    try {
      setLoading(true);
      const params = {};
      if (ledgerDateRange.from) params.from_date = ledgerDateRange.from;
      if (ledgerDateRange.to) params.to_date = ledgerDateRange.to;

      const res = await getLedgerStatement(headId, params);
      if (res.status === 'success') {
        setLedgerData(res);
      }
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Bank & Cash Book
  const loadBankCashBook = async () => {
    try {
      setLoading(true);
      const params = {};
      if (ledgerDateRange.from) params.from_date = ledgerDateRange.from;
      if (ledgerDateRange.to) params.to_date = ledgerDateRange.to;

      const res = await getBankCashBook(params);
      if (res.status === 'success') {
        setBankCashData(res);
      }
    } catch (err) {
      console.error('Failed to load bank cash book:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Financial Reports
  const loadReports = async () => {
    try {
      setLoading(true);
      if (reportSubTab === 'trial_balance') {
        const res = await getTrialBalance();
        if (res.status === 'success') setTrialBalanceData(res);
      } else if (reportSubTab === 'pnl') {
        const res = await getProfitAndLoss();
        if (res.status === 'success') setPnlData(res);
      } else if (reportSubTab === 'balance_sheet') {
        const res = await getBalanceSheet();
        if (res.status === 'success') setBalanceSheetData(res);
      } else if (reportSubTab === 'cash_flow') {
        const res = await getCashFlowStatement();
        if (res.status === 'success') setCashFlowData(res);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeads();
  }, [headCategoryFilter, headLedgerTypeFilter, headSearch]);

  useEffect(() => {
    if (activeTab === 'vouchers') {
      loadVouchers();
    } else if (activeTab === 'ledgers') {
      if (ledgerSubTab === 'ledger' && selectedLedgerHeadId) {
        loadLedgerStatement(selectedLedgerHeadId);
      } else if (ledgerSubTab === 'bank_cash') {
        loadBankCashBook();
      }
    } else if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, voucherTypeFilter, voucherSearch, voucherFromDate, voucherToDate, ledgerSubTab, selectedLedgerHeadId, reportSubTab]);

<<<<<<< HEAD
  // Seed Default Heads
  const handleSeedDefaults = async () => {
    try {
      setLoading(true);
      const res = await seedDefaultAccountingHeads();
      showAlert(res.message || 'Seeded standard accounting heads successfully!');
      loadHeads();
=======
  // Refresh Live Module Data
  const handleRefreshData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'heads') {
        await loadHeads();
      } else if (activeTab === 'vouchers') {
        await loadVouchers();
      } else if (activeTab === 'reports') {
        await loadReports();
      }
      showAlert('Accounting data refreshed.');
>>>>>>> origin/main
    } catch (err) {
      showAlert(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Head Status
  const handleToggleHeadStatus = async (head) => {
    try {
      const res = await toggleAccountingHeadStatus(head._id);
      showAlert(`Accounting head ${head.name} ${res.is_active ? 'activated' : 'deactivated'}.`);
      loadHeads();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message, 'error');
    }
  };

  // Handle Head Submit (Create or Edit)
  const handleSaveHead = async (e) => {
    e.preventDefault();
    if (!headFormData.name.trim()) {
      showAlert('Please enter an Accounting Head name.', 'error');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        name: headFormData.name.trim(),
        category: headFormData.category,
        parent_group: headFormData.parent_group.trim(),
        ledger_type: headFormData.ledger_type,
        gst_applicable: headFormData.gst_applicable,
        gst_rate: Number(headFormData.gst_rate || 0),
        tax_treatment: headFormData.tax_treatment,
        tds_applicable: headFormData.tds_applicable,
        tds_section: headFormData.tds_applicable ? headFormData.tds_section : null,
        state_name: headFormData.state_name,
        cluster_name: headFormData.cluster_name,
        cost_centre: headFormData.cost_centre,
        department: headFormData.department,
        opening_balance: {
          amount: Number(headFormData.opening_balance_amount || 0),
          type: headFormData.opening_balance_type
        },
        financial_year: headFormData.financial_year,
        notes: headFormData.notes
      };

      if (editingHead) {
        await updateAccountingHead(editingHead._id, payload);
        showAlert(`Accounting head "${payload.name}" updated successfully.`);
      } else {
        await createAccountingHead(payload);
        showAlert(`Accounting head "${payload.name}" created successfully.`);
      }

      setIsAddHeadModalOpen(false);
      setEditingHead(null);
      setHeadFormData(initialHeadForm);
      loadHeads();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Head
  const handleOpenEditHead = (head) => {
    setEditingHead(head);
    setHeadFormData({
      name: head.name,
      category: head.category,
      parent_group: head.parent_group || '',
      ledger_type: head.ledger_type,
      gst_applicable: head.gst_applicable || false,
      gst_rate: head.gst_rate || 0,
      tax_treatment: head.tax_treatment || 'Standard Taxable',
      tds_applicable: head.tds_applicable || false,
      tds_section: head.tds_section || '',
      state_name: head.state_name || 'All India',
      cluster_name: head.cluster_name || 'All Clusters',
      cost_centre: head.cost_centre || 'Headquarters',
      department: head.department || 'Accounts & Finance',
      opening_balance_amount: head.opening_balance?.amount || 0,
      opening_balance_type: head.opening_balance?.type || 'Dr',
      financial_year: head.financial_year || '2026-2027',
      notes: head.notes || ''
    });
    setIsAddHeadModalOpen(true);
  };

  // Voucher Entry Lines Management
  const handleAddEntryRow = () => {
    setVoucherFormData((prev) => ({
      ...prev,
      entries: [...prev.entries, { head_id: '', entry_type: 'Credit', amount: '', narration: '' }]
    }));
  };

  const handleRemoveEntryRow = (idx) => {
    if (voucherFormData.entries.length <= 2) {
      showAlert('A voucher must have at least 2 entries (Debit and Credit).', 'error');
      return;
    }
    setVoucherFormData((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== idx)
    }));
  };

  const handleEntryChange = (idx, field, value) => {
    const updated = [...voucherFormData.entries];
    updated[idx] = { ...updated[idx], [field]: value };
    setVoucherFormData((prev) => ({ ...prev, entries: updated }));
  };

  // Calculate Voucher Balance (Debit vs Credit)
  const voucherBalanceCalculation = useMemo(() => {
    let debits = 0;
    let credits = 0;
    (voucherFormData.entries || []).forEach((e) => {
      const amt = Number(e.amount) || 0;
      if (e.entry_type === 'Debit') debits += amt;
      else if (e.entry_type === 'Credit') credits += amt;
    });
    const diff = Math.abs(Math.round(debits * 100) - Math.round(credits * 100)) / 100;
    return {
      debits: Math.round(debits * 100) / 100,
      credits: Math.round(credits * 100) / 100,
      diff,
      isBalanced: diff <= 0.01 && debits > 0
    };
  }, [voucherFormData.entries]);

  // Handle Save Voucher
  const handleSaveVoucher = async (e) => {
    e.preventDefault();
    if (!voucherFormData.narration.trim()) {
      showAlert('Please enter a narration/description for this voucher.', 'error');
      return;
    }
    if (!voucherBalanceCalculation.isBalanced) {
      showAlert(`Debit total (₹${voucherBalanceCalculation.debits}) must equal Credit total (₹${voucherBalanceCalculation.credits}). Difference is ₹${voucherBalanceCalculation.diff}.`, 'error');
      return;
    }
    for (const [i, entry] of voucherFormData.entries.entries()) {
      if (!entry.head_id) {
        showAlert(`Please select an accounting head for line #${i + 1}.`, 'error');
        return;
      }
      if (!entry.amount || Number(entry.amount) <= 0) {
        showAlert(`Please enter a valid amount for line #${i + 1}.`, 'error');
        return;
      }
    }

    try {
      setLoading(true);
      const res = await createAccountingVoucher(voucherFormData);
      showAlert(res.message || 'Voucher posted successfully and ledgers updated.');
      setIsCreateVoucherOpen(false);
      setVoucherFormData(initialVoucherForm);
      loadVouchers();
      loadHeads(); // Refresh balances
    } catch (err) {
      showAlert(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel Voucher
  const handleCancelVoucher = async (voucherId) => {
    const reason = prompt('Please enter the reason for voiding/cancelling this voucher:');
    if (!reason) return;
    try {
      setLoading(true);
      await cancelAccountingVoucher(voucherId, reason);
      showAlert('Voucher cancelled successfully and ledger balances reversed.');
      loadVouchers();
      loadHeads();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Alert Notification */}
      <AnimatePresence>
        {alert.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold text-white border ${
              alert.type === 'error'
                ? 'bg-rose-600 border-rose-500 shadow-rose-600/30'
                : 'bg-emerald-600 border-emerald-500 shadow-emerald-600/30'
            }`}
          >
            {alert.type === 'error' ? <FaTimesCircle className="text-xl" /> : <FaCheckCircle className="text-xl" />}
            <span>{alert.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Module Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F1E36] via-[#1A2C4C] to-[#253880] p-6 sm:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
        <div className="absolute right-10 bottom-0 text-white/5 text-9xl font-black select-none pointer-events-none">
          ₹
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-black uppercase tracking-wider mb-2">
              <FaBalanceScale />
              <span>Section 1: Complete Accounting Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Dynamic Accounting Heads & Double-Entry Ledger System
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-3xl leading-relaxed">
              Centrally configure dynamic accounting heads, record debit/credit journal vouchers, track full ledger statements, cash/bank books, and generate real-time Trial Balance, Profit & Loss, Balance Sheet, and Cash Flow statements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
<<<<<<< HEAD
              onClick={handleSeedDefaults}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-sm active:scale-95"
              title="Seed all standard accounting categories and suggested heads"
            >
              <FaSync className={loading ? 'animate-spin' : ''} />
              <span>Seed Standard Heads</span>
=======
              onClick={handleRefreshData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-sm active:scale-95"
              title="Refresh live accounting data"
            >
              <FaSync className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
>>>>>>> origin/main
            </button>
            <button
              onClick={() => {
                setEditingHead(null);
                setHeadFormData(initialHeadForm);
                setIsAddHeadModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-500 text-white text-xs font-bold shadow-lg shadow-accent/30 transition-all cursor-pointer active:scale-95"
            >
              <FaPlus />
              <span>New Accounting Head</span>
            </button>
            <button
              onClick={() => {
                setVoucherFormData(initialVoucherForm);
                setIsCreateVoucherOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            >
              <FaExchangeAlt />
              <span>Create Voucher</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {[
            { id: 'heads', label: '1. Chart of Accounts (Dynamic Heads)', icon: FaBook, count: heads.length },
            { id: 'vouchers', label: '2. Vouchers & Double-Entry Journal', icon: FaExchangeAlt, count: voucherTotal },
            { id: 'ledgers', label: '3. General Ledgers & Cash/Bank Book', icon: FaReceipt },
            { id: 'reports', label: '4. Financial Statements (TB, P&L, BS, CF)', icon: FaFileInvoiceDollar }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#0F1E36] shadow-md font-extrabold scale-102'
                    : 'bg-white/5 hover:bg-white/15 text-white/80'
                }`}
              >
                <Icon className={isActive ? 'text-accent' : 'text-white/60'} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-[#0F1E36] text-white' : 'bg-white/20 text-white'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: CHART OF ACCOUNTS / DYNAMIC ACCOUNTING HEADS
         ========================================================================= */}
      {activeTab === 'heads' && (
        <div className="space-y-6">
          {/* Category Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              { label: 'Total Heads', val: headStats.total_heads || heads.length, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900' },
              { label: 'Income Heads', val: headStats.income_heads || 0, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900' },
              { label: 'Expense Heads', val: headStats.expense_heads || 0, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900' },
              { label: 'Asset Heads', val: headStats.asset_heads || 0, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900' },
              { label: 'Liability Heads', val: headStats.liability_heads || 0, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900' },
              { label: 'Equity Heads', val: headStats.equity_heads || 0, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900' }
            ].map((kpi, idx) => (
              <div key={idx} className={`p-4 rounded-2xl border ${kpi.bg} shadow-2xs`}>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</div>
                <div className={`mt-1.5 text-2xl font-black ${kpi.color}`}>{kpi.val}</div>
              </div>
            ))}
          </div>

          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full">
              {/* Search */}
              <div className="relative min-w-[240px] flex-1">
                <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
                <input
                  type="text"
                  value={headSearch}
                  onChange={(e) => setHeadSearch(e.target.value)}
                  placeholder="Search head name, code (AH-1001), or parent group..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Category Filter */}
              <select
                value={headCategoryFilter}
                onChange={(e) => setHeadCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
              >
                <option value="All">All Categories</option>
                {ACCOUNTING_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Ledger Type Filter */}
              <select
                value={headLedgerTypeFilter}
                onChange={(e) => setHeadLedgerTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
              >
                <option value="All">All Types (Dr / Cr)</option>
                <option value="Income">Income (Cr)</option>
                <option value="Expense">Expense (Dr)</option>
                <option value="Asset">Asset (Dr)</option>
                <option value="Liability">Liability (Cr)</option>
                <option value="Equity">Equity (Cr)</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-semibold whitespace-nowrap">
              Showing {heads.length} accounting heads
            </div>
          </div>

          {/* Heads Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Accounting Head</th>
                    <th className="py-3.5 px-4">Category & Group</th>
                    <th className="py-3.5 px-4">Ledger Type</th>
                    <th className="py-3.5 px-4">GST / TDS</th>
                    <th className="py-3.5 px-4">Region / Cost Centre</th>
                    <th className="py-3.5 px-4 text-right">Opening Balance</th>
                    <th className="py-3.5 px-4 text-right">Current Balance</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {heads.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-12 text-center text-slate-400">
                        <FaBook className="mx-auto text-4xl mb-3 text-slate-300" />
                        <p className="font-bold text-sm">No accounting heads found.</p>
<<<<<<< HEAD
                        <p className="text-xs mt-1">Click "Seed Standard Heads" or "New Accounting Head" to add heads.</p>
=======
                        <p className="text-xs mt-1">Click "+ New Accounting Head" to configure dynamic Chart of Accounts heads for your organization.</p>
>>>>>>> origin/main
                      </td>
                    </tr>
                  ) : (
                    heads.map((head) => {
                      const typeBadgeStyles = {
                        Income: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
                        Expense: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300',
                        Asset: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
                        Liability: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300',
                        Equity: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300'
                      };

                      return (
                        <tr key={head._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {head.head_code}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {head.name}
                            </div>
                            {head.notes && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{head.notes}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{head.category}</div>
                            <div className="text-[11px] text-slate-400">{head.parent_group}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeBadgeStyles[head.ledger_type] || 'bg-slate-100 text-slate-800'}`}>
                              {head.ledger_type} ({head.opening_balance?.type || 'Dr'})
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {head.gst_applicable ? (
                                <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 rounded text-[10px] font-bold mr-1">
                                  GST {head.gst_rate}%
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded text-[10px]">
                                  No GST
                                </span>
                              )}
                              {head.tds_applicable && (
                                <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 rounded text-[10px] font-bold">
                                  TDS {head.tds_section?.split(' ')[0]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-700 dark:text-slate-300">{head.state_name}</div>
                            <div className="text-[11px] text-slate-400">{head.cost_centre}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-600 dark:text-slate-400">
                            ₹{Number(head.opening_balance?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {head.opening_balance?.type}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                            ₹{Number(head.current_balance?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {head.current_balance?.type}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleHeadStatus(head)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                                head.is_active
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                              title="Click to toggle active/inactive"
                            >
                              {head.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedLedgerHeadId(head._id);
                                  setActiveTab('ledgers');
                                  setLedgerSubTab('ledger');
                                }}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 transition"
                                title="View Ledger Account"
                              >
                                <FaReceipt size={13} />
                              </button>
                              <button
                                onClick={() => handleOpenEditHead(head)}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                                title="Edit Head"
                              >
                                <FaEdit size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: VOUCHERS & DOUBLE-ENTRY BOOKKEEPING
         ========================================================================= */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6">
          {/* Voucher Filters & Type Tabs */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {VOUCHER_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setVoucherTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      voucherTypeFilter === type
                        ? 'bg-accent text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setVoucherFormData(initialVoucherForm);
                  setIsCreateVoucherOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer active:scale-95 transition"
              >
                <FaPlus />
                <span>New Voucher Entry</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="relative">
                <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
                <input
                  type="text"
                  value={voucherSearch}
                  onChange={(e) => setVoucherSearch(e.target.value)}
                  placeholder="Search voucher #, narration, order, invoice, supplier..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">From:</span>
                <input
                  type="date"
                  value={voucherFromDate}
                  onChange={(e) => setVoucherFromDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">To:</span>
                <input
                  type="date"
                  value={voucherToDate}
                  onChange={(e) => setVoucherToDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Vouchers Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Voucher No</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Narration / Particulars</th>
                    <th className="py-3.5 px-4">Linked Reference</th>
                    <th className="py-3.5 px-4 text-right">Debit / Credit Amount</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {vouchers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <FaExchangeAlt className="mx-auto text-4xl mb-3 text-slate-300" />
                        <p className="font-bold text-sm">No vouchers recorded yet.</p>
                        <p className="text-xs mt-1">Click "New Voucher Entry" to post a journal, payment, receipt, or invoice entry.</p>
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v) => (
                      <tr key={v._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-white">
                          {v.voucher_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                            v.voucher_type === 'Payment' ? 'bg-rose-100 text-rose-800' :
                            v.voucher_type === 'Receipt' ? 'bg-emerald-100 text-emerald-800' :
                            v.voucher_type === 'Contra' ? 'bg-blue-100 text-blue-800' :
                            v.voucher_type === 'Sales' ? 'bg-purple-100 text-purple-800' :
                            v.voucher_type === 'Purchase' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {v.voucher_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {new Date(v.voucher_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">{v.narration}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {v.entries?.length || 0} ledger lines ({v.payment_mode !== 'None' ? v.payment_mode : 'Double-Entry'})
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 text-[11px]">
                            {v.order_number && (
                              <div className="font-mono text-blue-600 dark:text-blue-400">Order: {v.order_number}</div>
                            )}
                            {v.invoice_number && (
                              <div className="font-mono text-purple-600 dark:text-purple-400">Inv: {v.invoice_number}</div>
                            )}
                            {v.supplier_name && (
                              <div className="text-slate-600 dark:text-slate-300">Supplier: {v.supplier_name}</div>
                            )}
                            {v.warehouse_name && (
                              <div className="text-slate-500">WH: {v.warehouse_name}</div>
                            )}
                            {!v.order_number && !v.invoice_number && !v.supplier_name && (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                          ₹{Number(v.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.status === 'Posted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedVoucherDetail(v)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold"
                            >
                              View
                            </button>
                            {v.status === 'Posted' && (
                              <button
                                onClick={() => handleCancelVoucher(v._id)}
                                className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold"
                                title="Void/Reverse voucher"
                              >
                                Void
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: GENERAL LEDGER & CASH/BANK BOOK
         ========================================================================= */}
      {activeTab === 'ledgers' && (
        <div className="space-y-6">
          {/* Sub-Tabs: General Ledger vs Cash & Bank Book */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLedgerSubTab('ledger')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  ledgerSubTab === 'ledger'
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                General Ledger Account Statement
              </button>
              <button
                onClick={() => setLedgerSubTab('bank_cash')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  ledgerSubTab === 'bank_cash'
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Cash & Bank Book
              </button>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={ledgerDateRange.from}
                onChange={(e) => setLedgerDateRange((p) => ({ ...p, from: e.target.value }))}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={ledgerDateRange.to}
                onChange={(e) => setLedgerDateRange((p) => ({ ...p, to: e.target.value }))}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Sub-View 1: General Ledger Statement */}
          {ledgerSubTab === 'ledger' && (
            <div className="space-y-4">
              {/* Head Selector & Balance Summary */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="w-full md:w-96">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Accounting Head Ledger:
                  </label>
                  <select
                    value={selectedLedgerHeadId}
                    onChange={(e) => setSelectedLedgerHeadId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                  >
                    {heads.map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.head_code} — {h.name} ({h.category} | {h.ledger_type})
                      </option>
                    ))}
                  </select>
                </div>

                {ledgerData && (
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Opening Balance</div>
                      <div className="text-base font-black font-mono text-slate-700 dark:text-slate-300">
                        ₹{Number(ledgerData.opening_balance?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledgerData.opening_balance?.type}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Closing Balance</div>
                      <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                        ₹{Number(ledgerData.closing_balance?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledgerData.closing_balance?.type}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transactions Ledger Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Voucher No</th>
                        <th className="py-3 px-4">Particulars</th>
                        <th className="py-3 px-4">Narration / Ref</th>
                        <th className="py-3 px-4 text-right">Debit (₹)</th>
                        <th className="py-3 px-4 text-right">Credit (₹)</th>
                        <th className="py-3 px-4 text-right">Cumulative Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {/* Opening Balance Row */}
                      <tr className="bg-slate-50/50 dark:bg-slate-800/20 font-bold">
                        <td className="py-3 px-4 text-slate-500">—</td>
                        <td className="py-3 px-4 font-mono text-slate-500">OB</td>
                        <td className="py-3 px-4 text-slate-800 dark:text-slate-200">Opening Balance B/F</td>
                        <td className="py-3 px-4 text-slate-400">Balance brought forward</td>
                        <td className="py-3 px-4 text-right font-mono">
                          {ledgerData?.opening_balance?.type === 'Dr'
                            ? `₹${Number(ledgerData.opening_balance.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {ledgerData?.opening_balance?.type === 'Cr'
                            ? `₹${Number(ledgerData.opening_balance.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                          ₹{Number(ledgerData?.opening_balance?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledgerData?.opening_balance?.type}
                        </td>
                      </tr>

                      {(!ledgerData?.transactions || ledgerData.transactions.length === 0) ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">
                            No transactions posted to this ledger yet.
                          </td>
                        </tr>
                      ) : (
                        ledgerData.transactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {new Date(tx.voucher_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {tx.voucher_number}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                              {tx.particulars}
                            </td>
                            <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                              {tx.narration}
                              {tx.order_number && <span className="ml-1 text-blue-500 font-mono">({tx.order_number})</span>}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {tx.debit > 0 ? `₹${Number(tx.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {tx.credit > 0 ? `₹${Number(tx.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                              ₹{Number(tx.running_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {tx.balance_type}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-View 2: Bank & Cash Book */}
          {ledgerSubTab === 'bank_cash' && (
            <div className="space-y-4">
              {bankCashData && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Total Cash/Bank Inflow</div>
                    <div className="mt-1 text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                      ₹{Number(bankCashData.total_inflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                    <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase">Total Cash/Bank Outflow</div>
                    <div className="mt-1 text-2xl font-black font-mono text-rose-700 dark:text-rose-400">
                      ₹{Number(bankCashData.total_outflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                    <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase">Net Liquidity Position</div>
                    <div className="mt-1 text-2xl font-black font-mono text-blue-700 dark:text-blue-400">
                      ₹{Number(bankCashData.net_liquidity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Cash & Bank Register Book (All Receipts & Disbursements)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Voucher No</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Narration</th>
                        <th className="py-3 px-4">Mode / UTR</th>
                        <th className="py-3 px-4 text-right">Inflow (₹)</th>
                        <th className="py-3 px-4 text-right">Outflow (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(!bankCashData?.entries || bankCashData.entries.length === 0) ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">
                            No cash/bank entries found for the selected period.
                          </td>
                        </tr>
                      ) : (
                        bankCashData.entries.map((e) => (
                          <tr key={e._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {new Date(e.voucher_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {e.voucher_number}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                e.voucher_type === 'Receipt' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {e.voucher_type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                              {e.narration}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                              {e.payment_mode} {e.bank_reference ? `(${e.bank_reference})` : ''}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                              {e.voucher_type === 'Receipt' ? `₹${Number(e.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                              {e.voucher_type === 'Payment' ? `₹${Number(e.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: FINANCIAL STATEMENTS (Trial Balance, P&L, Balance Sheet, Cash Flow)
         ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Sub-Tabs for Reports */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            {[
              { id: 'trial_balance', label: 'Trial Balance' },
              { id: 'pnl', label: 'Profit & Loss Statement' },
              { id: 'balance_sheet', label: 'Balance Sheet' },
              { id: 'cash_flow', label: 'Cash Flow Statement' }
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setReportSubTab(sub.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  reportSubTab === sub.id
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* 1. Trial Balance */}
          {reportSubTab === 'trial_balance' && trialBalanceData && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Trial Balance Sheet (Double-Entry Verification)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Financial Year 2026-2027 • All Active Accounting Heads</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-xl text-xs font-black border ${
                    trialBalanceData.is_balanced
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}>
                    {trialBalanceData.is_balanced ? '✓ Trial Balance Matches (Balanced)' : `⚠️ Difference: ₹${trialBalanceData.difference}`}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Accounting Head</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Ledger Type</th>
                        <th className="py-3 px-4 text-right">Debit (Dr) ₹</th>
                        <th className="py-3 px-4 text-right">Credit (Cr) ₹</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {trialBalanceData.rows?.map((r) => (
                        <tr key={r._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">{r.head_code}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{r.name}</td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{r.category}</td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {r.ledger_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {r.net_debit > 0 ? `₹${Number(r.net_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {r.net_credit > 0 ? `₹${Number(r.net_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-slate-100 dark:bg-slate-800 font-black text-sm">
                        <td colSpan="4" className="py-3.5 px-4 text-right uppercase tracking-wider text-slate-900 dark:text-white">
                          Total (Trial Balance)
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          ₹{Number(trialBalanceData.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          ₹{Number(trialBalanceData.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. Profit & Loss Statement */}
          {reportSubTab === 'pnl' && pnlData && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">SOLARKITS INDIA PRIVATE LIMITED</h2>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Statement of Profit & Loss</p>
                  <p className="text-xs text-slate-400">For the Financial Year 2026-2027</p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Revenue */}
                  <div>
                    <div className="font-extrabold uppercase text-slate-500 mb-2 border-b pb-1">I. Revenue From Operations</div>
                    <div className="space-y-1.5 pl-3">
                      <div className="flex justify-between">
                        <span>Kit Sales & Product Sales Revenue</span>
                        <span className="font-mono font-bold">₹{Number(pnlData.breakdown?.sales_revenue?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Income (Interest / Misc)</span>
                        <span className="font-mono font-bold">₹{Number(pnlData.breakdown?.other_income?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-black text-sm pt-2 border-t text-slate-900 dark:text-white">
                        <span>Total Revenue (A)</span>
                        <span className="font-mono text-emerald-600">₹{Number(pnlData.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* COGS */}
                  <div>
                    <div className="font-extrabold uppercase text-slate-500 mb-2 border-b pb-1">II. Cost of Goods Sold & Direct Expenses</div>
                    <div className="space-y-1.5 pl-3">
                      <div className="flex justify-between">
                        <span>Product, Supplier & OEM Purchases</span>
                        <span className="font-mono font-bold">₹{Number(pnlData.breakdown?.purchases?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Direct Logistics & Packaging</span>
                        <span className="font-mono font-bold">₹{Number(pnlData.breakdown?.direct_expenses?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-black text-sm pt-2 border-t text-slate-900 dark:text-white">
                        <span>Gross Profit / (Loss) (B = A - COGS)</span>
                        <span className="font-mono text-blue-600">₹{Number(pnlData.gross_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operating Overheads */}
                  <div>
                    <div className="font-extrabold uppercase text-slate-500 mb-2 border-b pb-1">III. Operating & Administrative Expenses</div>
                    <div className="space-y-1.5 pl-3">
                      <div className="flex justify-between">
                        <span>Administrative & Office Expenses</span>
                        <span className="font-mono">₹{Number(pnlData.breakdown?.indirect_expenses?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Employee Payroll, Incentives & BDE Commission</span>
                        <span className="font-mono">₹{Number(pnlData.breakdown?.employee_expenses?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Warehouse Rent, Labour & Maintenance</span>
                        <span className="font-mono">₹{Number(pnlData.breakdown?.warehouse_expenses?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Finance Costs, Loan Interest & Bank Charges</span>
                        <span className="font-mono">₹{Number(pnlData.breakdown?.financial_expenses?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t text-slate-700 dark:text-slate-300">
                        <span>Total Operating Expenses (C)</span>
                        <span className="font-mono">₹{Number(pnlData.operating_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-base font-black">
                    <span className="uppercase text-slate-900 dark:text-white">Net Profit / (Loss) for the Year</span>
                    <span className={`font-mono text-xl ${pnlData.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ₹{Number(pnlData.net_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Balance Sheet */}
          {reportSubTab === 'balance_sheet' && balanceSheetData && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">SOLARKITS INDIA PRIVATE LIMITED</h2>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Balance Sheet</p>
                  <p className="text-xs text-slate-400">As at 31st March 2027</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Left: Assets */}
                  <div className="space-y-3">
                    <div className="font-black text-sm uppercase text-slate-900 dark:text-white pb-2 border-b">
                      ASSETS
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold text-slate-500 uppercase text-[11px]">Current & Liquid Assets</div>
                      {balanceSheetData.breakdown?.assets?.map((a) => (
                        <div key={a._id} className="flex justify-between pl-2">
                          <span>{a.name}</span>
                          <span className="font-mono font-bold">₹{Number(a.current_balance?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t flex justify-between font-black text-sm text-slate-900 dark:text-white">
                      <span>TOTAL ASSETS</span>
                      <span className="font-mono text-emerald-600">₹{Number(balanceSheetData.total_assets || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Right: Liabilities & Equity */}
                  <div className="space-y-3">
                    <div className="font-black text-sm uppercase text-slate-900 dark:text-white pb-2 border-b">
                      LIABILITIES & EQUITY
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold text-slate-500 uppercase text-[11px]">Liabilities</div>
                      {balanceSheetData.breakdown?.liabilities?.map((l) => (
                        <div key={l._id} className="flex justify-between pl-2">
                          <span>{l.name}</span>
                          <span className="font-mono font-bold">₹{Number(l.current_balance?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}

                      <div className="font-bold text-slate-500 uppercase text-[11px] pt-3">Shareholders' Equity</div>
                      {balanceSheetData.breakdown?.equity?.map((eq) => (
                        <div key={eq._id} className="flex justify-between pl-2">
                          <span>{eq.name}</span>
                          <span className="font-mono font-bold">₹{Number(eq.current_balance?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pl-2 text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>Current Year Net Retained Earnings</span>
                        <span className="font-mono">₹{Number(balanceSheetData.breakdown?.retained_earnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="pt-4 border-t flex justify-between font-black text-sm text-slate-900 dark:text-white">
                      <span>TOTAL LIABILITIES & EQUITY</span>
                      <span className="font-mono text-emerald-600">₹{Number(balanceSheetData.total_liabilities_and_equity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Cash Flow Statement */}
          {reportSubTab === 'cash_flow' && cashFlowData && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs space-y-4">
                <div className="text-center border-b pb-3">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Cash Flow Statement</h2>
                  <p className="text-slate-400">Summary of Cash Inflows & Outflows</p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] mb-2">1. Operating Activities</div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Cash Inflow from Sales & Receipts</span>
                      <span className="font-mono text-emerald-600">+₹{Number(cashFlowData.operating_activities?.inflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 mt-1">
                      <span>Cash Outflow for Purchases & Expenses</span>
                      <span className="font-mono text-rose-600">-₹{Number(cashFlowData.operating_activities?.outflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t mt-2 text-slate-900 dark:text-white">
                      <span>Net Cash From Operating Activities</span>
                      <span className="font-mono">₹{Number(cashFlowData.operating_activities?.net || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] mb-1">2. Investing Activities</div>
                    <div className="text-slate-400">No capital expenditure in current period.</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border">
                    <div className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] mb-1">3. Financing Activities</div>
                    <div className="text-slate-400">Equity & long-term borrowings neutral.</div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex justify-between font-black text-sm">
                    <span className="text-emerald-900 dark:text-emerald-300">Net Increase / (Decrease) in Cash Position</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      ₹{Number(cashFlowData.net_cash_flow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT ACCOUNTING HEAD
         ========================================================================= */}
      {isAddHeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {editingHead ? 'Edit Accounting Head' : 'Configure Dynamic Accounting Head'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Admin dynamic ledger configuration without code changes</p>
              </div>
              <button
                onClick={() => setIsAddHeadModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHead} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Accounting Head Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={headFormData.name}
                    onChange={(e) => setHeadFormData({ ...headFormData, name: e.target.value })}
                    placeholder="e.g. Kit Sales, Office Rent, Transportation"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Accounting Category *
                  </label>
                  <select
                    value={headFormData.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      let type = 'Expense';
                      let group = 'Operating Expenses';
                      if (cat.includes('Revenue') || cat.includes('Income')) {
                        type = 'Income';
                        group = 'Operating Revenue';
                      } else if (cat.includes('Assets')) {
                        type = 'Asset';
                        group = 'Current Assets';
                      } else if (cat.includes('Liabilities')) {
                        type = 'Liability';
                        group = 'Current Liabilities';
                      } else if (cat.includes('Equity')) {
                        type = 'Equity';
                        group = 'Capital Account';
                      }
                      setHeadFormData({ ...headFormData, category: cat, ledger_type: type, parent_group: group });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {ACCOUNTING_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Parent Group */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Parent Accounting Group
                  </label>
                  <input
                    type="text"
                    value={headFormData.parent_group}
                    onChange={(e) => setHeadFormData({ ...headFormData, parent_group: e.target.value })}
                    placeholder="e.g. Operating Revenue, Direct Logistics"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                {/* Ledger Type */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ledger Type (Normal Balance) *
                  </label>
                  <select
                    value={headFormData.ledger_type}
                    onChange={(e) => setHeadFormData({ ...headFormData, ledger_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="Income">Income (Credit Balance)</option>
                    <option value="Expense">Expense (Debit Balance)</option>
                    <option value="Asset">Asset (Debit Balance)</option>
                    <option value="Liability">Liability (Credit Balance)</option>
                    <option value="Equity">Equity (Credit Balance)</option>
                  </select>
                </div>

                {/* Opening Balance */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Opening Balance
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={headFormData.opening_balance_amount}
                      onChange={(e) => setHeadFormData({ ...headFormData, opening_balance_amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                    />
                    <select
                      value={headFormData.opening_balance_type}
                      onChange={(e) => setHeadFormData({ ...headFormData, opening_balance_type: e.target.value })}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                    >
                      <option value="Dr">Dr</option>
                      <option value="Cr">Cr</option>
                    </select>
                  </div>
                </div>

                {/* GST Settings */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">GST Applicability</span>
                    <input
                      type="checkbox"
                      checked={headFormData.gst_applicable}
                      onChange={(e) => setHeadFormData({ ...headFormData, gst_applicable: e.target.checked })}
                      className="w-4 h-4 rounded text-accent cursor-pointer"
                    />
                  </div>
                  {headFormData.gst_applicable && (
                    <div className="flex items-center gap-2 pt-1">
                      <select
                        value={headFormData.gst_rate}
                        onChange={(e) => setHeadFormData({ ...headFormData, gst_rate: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-xs"
                      >
                        <option value={0}>0% GST</option>
                        <option value={5}>5% GST</option>
                        <option value={12}>12% GST (Solar Kits / Inverters)</option>
                        <option value={18}>18% GST (Services / Loose)</option>
                        <option value={28}>28% GST</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* TDS Settings */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">TDS Applicability</span>
                    <input
                      type="checkbox"
                      checked={headFormData.tds_applicable}
                      onChange={(e) => setHeadFormData({ ...headFormData, tds_applicable: e.target.checked })}
                      className="w-4 h-4 rounded text-accent cursor-pointer"
                    />
                  </div>
                  {headFormData.tds_applicable && (
                    <div className="pt-1">
                      <select
                        value={headFormData.tds_section}
                        onChange={(e) => setHeadFormData({ ...headFormData, tds_section: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-xs"
                      >
                        <option value="">-- Choose TDS Section --</option>
                        <option value="194C - Contractor">194C - Contractor (1% / 2%)</option>
                        <option value="194J - Professional">194J - Technical / Professional (10%)</option>
                        <option value="194I - Rent">194I - Commercial Rent (10%)</option>
                        <option value="194H - Commission">194H - Commission / Brokerage (5%)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Region Mapping */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    State / Cluster Mapping
                  </label>
                  <input
                    type="text"
                    value={headFormData.state_name}
                    onChange={(e) => setHeadFormData({ ...headFormData, state_name: e.target.value })}
                    placeholder="e.g. All India, Gujarat, Maharashtra"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                {/* Cost Centre & Department */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cost Centre / Department
                  </label>
                  <input
                    type="text"
                    value={headFormData.cost_centre}
                    onChange={(e) => setHeadFormData({ ...headFormData, cost_centre: e.target.value })}
                    placeholder="e.g. Headquarters, Warehouse, Logistics"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddHeadModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-500 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {editingHead ? 'Update Accounting Head' : 'Save Accounting Head'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE VOUCHER (Double-Entry Builder)
         ========================================================================= */}
      {isCreateVoucherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Post New Double-Entry Voucher
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Journal, Payment, Receipt, Contra, Sales & Purchase vouchers with automatic ledger updates
                </p>
              </div>
              <button
                onClick={() => setIsCreateVoucherOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVoucher} className="space-y-4 text-xs">
              {/* Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Voucher Type *</label>
                  <select
                    value={voucherFormData.voucher_type}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, voucher_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    <option value="Journal">Journal Voucher (JV)</option>
                    <option value="Payment">Payment Voucher (PV)</option>
                    <option value="Receipt">Receipt Voucher (RV)</option>
                    <option value="Contra">Contra Voucher (CV - Bank/Cash)</option>
                    <option value="Sales">Sales Voucher (SINV)</option>
                    <option value="Purchase">Purchase Voucher (PINV)</option>
                    <option value="Credit Note">Credit Note (CN)</option>
                    <option value="Debit Note">Debit Note (DN)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Voucher Date *</label>
                  <input
                    type="date"
                    required
                    value={voucherFormData.voucher_date}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, voucher_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Mode</label>
                  <select
                    value={voucherFormData.payment_mode}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="None">None (Book Entry)</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="ICICI E-Collection">ICICI E-Collection</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="Cash">Cash in Hand</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Ref / UTR No</label>
                  <input
                    type="text"
                    value={voucherFormData.bank_reference}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, bank_reference: e.target.value })}
                    placeholder="e.g. UTR12345678"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Reference Linking (Prompt requirement: Orders, Invoices, Suppliers, Warehouses) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Link Order No</label>
                  <input
                    type="text"
                    value={voucherFormData.order_number}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, order_number: e.target.value })}
                    placeholder="e.g. ORD-2026-1044"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-lg font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Link Invoice No</label>
                  <input
                    type="text"
                    value={voucherFormData.invoice_number}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, invoice_number: e.target.value })}
                    placeholder="e.g. INV-SK-091"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-lg font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Supplier / Party</label>
                  <input
                    type="text"
                    value={voucherFormData.supplier_name}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, supplier_name: e.target.value })}
                    placeholder="e.g. Tata Power Solar / Sungrow"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Warehouse</label>
                  <input
                    type="text"
                    value={voucherFormData.warehouse_name}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, warehouse_name: e.target.value })}
                    placeholder="e.g. Ahmedabad Central Warehouse"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-[11px]"
                  />
                </div>
              </div>

              {/* Multi-Row Entry Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Ledger Line Entries (Double-Entry Debit & Credit)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddEntryRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    <FaPlus size={10} /> Add Entry Row
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                        <th className="py-2.5 px-3 w-10">#</th>
                        <th className="py-2.5 px-3">Accounting Head</th>
                        <th className="py-2.5 px-3 w-28">Entry Type</th>
                        <th className="py-2.5 px-3 w-36 text-right">Amount (₹)</th>
                        <th className="py-2.5 px-3">Line Remarks / Item</th>
                        <th className="py-2.5 px-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {voucherFormData.entries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <select
                              required
                              value={entry.head_id}
                              onChange={(e) => handleEntryChange(idx, 'head_id', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border rounded-lg font-bold"
                            >
                              <option value="">-- Choose Head --</option>
                              {heads.map((h) => (
                                <option key={h._id} value={h._id}>
                                  {h.head_code} : {h.name} ({h.ledger_type})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={entry.entry_type}
                              onChange={(e) => handleEntryChange(idx, 'entry_type', e.target.value)}
                              className={`w-full px-2.5 py-1.5 border rounded-lg font-black ${
                                entry.entry_type === 'Debit' ? 'text-rose-600 bg-rose-50/50' : 'text-emerald-600 bg-emerald-50/50'
                              }`}
                            >
                              <option value="Debit">Debit (Dr)</option>
                              <option value="Credit">Credit (Cr)</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              required
                              step="0.01"
                              min="0.01"
                              value={entry.amount}
                              onChange={(e) => handleEntryChange(idx, 'amount', e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-right font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={entry.narration}
                              onChange={(e) => handleEntryChange(idx, 'narration', e.target.value)}
                              placeholder="Line narration..."
                              className="w-full px-2.5 py-1.5 border rounded-lg"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {voucherFormData.entries.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEntryRow(idx)}
                                className="text-slate-400 hover:text-rose-600 transition"
                              >
                                <FaTrash size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Real-time Balancing Box */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                voucherBalanceCalculation.isBalanced
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-300'
              }`}>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Total Debits:</span>
                    <div className="text-base font-black font-mono">₹{voucherBalanceCalculation.debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Total Credits:</span>
                    <div className="text-base font-black font-mono">₹{voucherBalanceCalculation.credits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <div className="text-right">
                  {voucherBalanceCalculation.isBalanced ? (
                    <div className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-700">
                      <FaCheckCircle /> Perfectly Balanced
                    </div>
                  ) : (
                    <div>
                      <div className="text-rose-600 font-black">
                        Difference: ₹{voucherBalanceCalculation.diff.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-rose-500 font-normal">Debits must equal Credits to post.</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Narration */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  General Narration / Remarks *
                </label>
                <textarea
                  required
                  rows="2"
                  value={voucherFormData.narration}
                  onChange={(e) => setVoucherFormData({ ...voucherFormData, narration: e.target.value })}
                  placeholder="Being payment made towards solar kit shipment / kit sales invoice..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateVoucherOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !voucherBalanceCalculation.isBalanced}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  Post Voucher to Ledgers
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VIEW VOUCHER DETAIL
         ========================================================================= */}
      {selectedVoucherDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-slate-400">VOUCHER DETAILS</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedVoucherDetail.voucher_number} ({selectedVoucherDetail.voucher_type})
                </h3>
              </div>
              <button
                onClick={() => setSelectedVoucherDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Date:</span>
                  <div className="font-bold">{new Date(selectedVoucherDetail.voucher_date).toLocaleDateString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Payment Mode:</span>
                  <div className="font-bold">{selectedVoucherDetail.payment_mode || 'None'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Linked Order:</span>
                  <div className="font-mono">{selectedVoucherDetail.order_number || '—'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Linked Invoice:</span>
                  <div className="font-mono">{selectedVoucherDetail.invoice_number || '—'}</div>
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[11px] mb-2">Ledger Entries</div>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <th className="py-2 px-3">Head</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3 text-right">Debit (₹)</th>
                        <th className="py-2 px-3 text-right">Credit (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedVoucherDetail.entries?.map((e, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold">{e.head_name}</td>
                          <td className="py-2 px-3">{e.entry_type}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            {e.entry_type === 'Debit' ? `₹${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            {e.entry_type === 'Credit' ? `₹${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Narration:</span>
                <p className="text-slate-800 dark:text-slate-200">{selectedVoucherDetail.narration}</p>
              </div>

              <div className="text-right pt-2">
                <button
                  onClick={() => setSelectedVoucherDetail(null)}
                  className="px-5 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
