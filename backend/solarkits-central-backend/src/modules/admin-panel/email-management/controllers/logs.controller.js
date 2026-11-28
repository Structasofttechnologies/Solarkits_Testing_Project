const { EmailLog, EmailAttempt } = require('../models');

class LogsController {
  static async getLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 15,
        search = '',
        provider = '',
        status = '',
        purpose = '',
        startDate = '',
        endDate = ''
      } = req.query;

      const filter = {};

      if (search) {
        filter.$or = [
          { recipient: { $regex: search.trim(), $options: 'i' } },
          { subject: { $regex: search.trim(), $options: 'i' } },
          { message_id: { $regex: search.trim(), $options: 'i' } }
        ];
      }

      if (provider && provider !== 'all') {
        filter.provider = provider;
      }

      if (status && status !== 'all') {
        filter.status = status;
      }

      if (purpose && purpose !== 'all') {
        filter.purpose = purpose;
      }

      if (startDate || endDate) {
        filter.created_at = {};
        if (startDate) filter.created_at.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filter.created_at.$lte = end;
        }
      }

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const skip = (pageNum - 1) * limitNum;

      const [logs, total] = await Promise.all([
        EmailLog.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum).lean(),
        EmailLog.countDocuments(filter)
      ]);

      return res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum) || 1
          }
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getLogDetail(req, res) {
    try {
      const { id } = req.params;
      const log = await EmailLog.findById(id).lean();
      if (!log) {
        return res.status(404).json({ success: false, message: 'Email log entry not found.' });
      }

      const attempts = await EmailAttempt.find({ email_log_id: id }).sort({ attempt_number: 1 }).lean();

      return res.status(200).json({
        success: true,
        data: {
          log,
          attempts
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async exportCsv(req, res) {
    try {
      const { provider, status } = req.query;
      const filter = {};
      if (provider && provider !== 'all') filter.provider = provider;
      if (status && status !== 'all') filter.status = status;

      const logs = await EmailLog.find(filter).sort({ created_at: -1 }).limit(1000).lean();

      let csv = 'ID,Date,Recipient,Subject,Provider,Purpose,Status,Attempts,MessageID,Error\n';
      logs.forEach(l => {
        const safeSubject = (l.subject || '').replace(/"/g, '""');
        const safeError = (l.error_message || '').replace(/"/g, '""');
        csv += `"${l._id}","${l.created_at?.toISOString()}","${l.recipient}","${safeSubject}","${l.provider}","${l.purpose}","${l.status}",${l.attempts_count},"${l.message_id || ''}","${safeError}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=email_logs_${Date.now()}.csv`);
      return res.status(200).send(csv);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = LogsController;
