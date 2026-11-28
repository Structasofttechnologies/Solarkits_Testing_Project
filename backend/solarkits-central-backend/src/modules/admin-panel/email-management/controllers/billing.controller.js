const { EmailPayment } = require('../models');

class BillingController {
  static async getSummary(req, res) {
    try {
      const payments = await EmailPayment.find().sort({ created_at: -1 }).lean();
      let totalInvoiced = 0;
      let totalPaid = 0;
      let totalPending = 0;

      const providerBreakdown = {
        sender: { invoiced: 0, paid: 0, pending: 0 },
        aws_ses: { invoiced: 0, paid: 0, pending: 0 },
        smtp: { invoiced: 0, paid: 0, pending: 0 }
      };

      payments.forEach(p => {
        totalInvoiced += p.amount_invoiced || 0;
        totalPaid += p.amount_paid || 0;
        totalPending += p.amount_pending || 0;

        if (providerBreakdown[p.provider]) {
          providerBreakdown[p.provider].invoiced += p.amount_invoiced || 0;
          providerBreakdown[p.provider].paid += p.amount_paid || 0;
          providerBreakdown[p.provider].pending += p.amount_pending || 0;
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            total_invoiced: totalInvoiced,
            total_paid: totalPaid,
            total_pending: totalPending,
            currency: 'INR'
          },
          provider_breakdown: providerBreakdown,
          invoices: payments
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createInvoice(req, res) {
    try {
      const { provider, invoice_number, billing_period, amount_invoiced, amount_paid, payment_status, plan_tier, notes } = req.body;

      if (!provider || !invoice_number || !billing_period || amount_invoiced === undefined) {
        return res.status(400).json({ success: false, message: 'Provider, invoice_number, billing_period, and amount are required.' });
      }

      const paid = Number(amount_paid) || 0;
      const invoiced = Number(amount_invoiced);
      const pending = Math.max(0, invoiced - paid);

      const invoice = await EmailPayment.create({
        provider,
        invoice_number,
        billing_period,
        amount_invoiced: invoiced,
        amount_paid: paid,
        amount_pending: pending,
        payment_status: payment_status || (pending === 0 ? 'paid' : 'pending'),
        plan_tier: plan_tier || 'Pro Tier',
        payment_date: paid > 0 ? new Date() : null,
        notes: notes || ''
      });

      return res.status(201).json({ success: true, message: 'Invoice recorded successfully.', data: invoice });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async markInvoicePaid(req, res) {
    try {
      const { id } = req.params;
      const invoice = await EmailPayment.findById(id);
      if (!invoice) {
        return res.status(404).json({ success: false, message: 'Invoice not found.' });
      }

      invoice.amount_paid = invoice.amount_invoiced;
      invoice.amount_pending = 0;
      invoice.payment_status = 'paid';
      invoice.payment_date = new Date();
      await invoice.save();

      return res.status(200).json({ success: true, message: 'Invoice marked as paid.', data: invoice });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = BillingController;
