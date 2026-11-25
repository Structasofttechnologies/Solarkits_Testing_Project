/**
 * Real-Time Payment Broadcaster (Server-Sent Events)
 *
 * Dispatches instant payment alerts when ICICI E-Collection credits funds.
 * Smart Routing:
 * - Admin & Accounts: Always receive alerts for all payments.
 * - Franchise / Reseller: Receives alerts if they onboarded the EPC buyer or if it's their PO/Loose order.
 * - EPC Buyer: Receives instant confirmation on checkout screen without page refresh.
 */

const clients = new Map(); // clientId -> { res, metadata: { role, resellerId, epcId, orderId } }
let clientCounter = 0;

/**
 * Registers an active SSE client connection
 */
function registerClient(req, res, metadata = {}) {
  const clientId = `client_${Date.now()}_${++clientCounter}`;

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true'
  });

  res.flushHeaders();

  // Send initial connection packet
  res.write(`data: ${JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    clientId,
    connectedAt: new Date().toISOString()
  })}\n\n`);

  clients.set(clientId, { res, metadata });

  // Heartbeat every 15 seconds to prevent gateway/proxy timeouts
  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (_e) {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(clientId);
  });

  return clientId;
}

/**
 * Dispatches an ICICI payment alert according to the routing matrix
 *
 * @param {Object} payload
 * @param {string} payload.eventType - 'DIRECT_EPC_PAYMENT' | 'ONBOARDED_EPC_PAYMENT' | 'PO_ORDER_PAYMENT' | 'LOOSE_ORDER_PAYMENT'
 * @param {Object} payload.transactionData - UTR, Amount, BuyerName, Mode, OrderId, etc.
 * @param {string} [payload.targetResellerId] - Reseller ObjectId string if applicable
 * @param {string} [payload.targetEpcId] - EPC Buyer ObjectId string
 * @param {string} [payload.targetOrderId] - Order ObjectId or Order Number
 */
function dispatchPaymentAlert(payload) {
  const { eventType, transactionData, targetResellerId, targetEpcId, targetOrderId } = payload;

  const eventPacket = {
    type: 'ICICI_PAYMENT_CREDITED',
    eventType,
    timestamp: new Date().toISOString(),
    ...transactionData
  };

  const jsonString = `data: ${JSON.stringify(eventPacket)}\n\n`;

  for (const [_clientId, client] of clients.entries()) {
    try {
      const { role, resellerId, epcId, orderId } = client.metadata || {};

      let shouldSend = false;

      // 1. Admin and Accounts ALWAYS receive all payment alerts
      if (role === 'admin' || role === 'accounts' || !role) {
        shouldSend = true;
      }

      // 2. Franchise / Reseller receives alert if they are the target reseller
      if (role === 'reseller' && targetResellerId && String(resellerId) === String(targetResellerId)) {
        shouldSend = true;
      }

      // 3. EPC Buyer receives alert if target EPC or target Order matches
      if (role === 'epc') {
        if (targetEpcId && String(epcId) === String(targetEpcId)) shouldSend = true;
        if (targetOrderId && String(orderId) === String(targetOrderId)) shouldSend = true;
      }

      if (shouldSend) {
        client.res.write(jsonString);
      }
    } catch (err) {
      console.error('Failed to send SSE packet to client:', err.message);
    }
  }
}

/**
 * Returns count of active connected SSE clients
 */
function getActiveClientCount() {
  return clients.size;
}

module.exports = {
  registerClient,
  dispatchPaymentAlert,
  getActiveClientCount
};
