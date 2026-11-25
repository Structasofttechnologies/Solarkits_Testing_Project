require('dotenv').config();
const { company_warehouse_db, india_solarshop_db } = require('../config/databases');
const { DeliveryOrder } = require('../modules/warehouse-panel/models/company_warehouse_db');
require('../modules/solarshop-india/models/india_solarshop_db/solarkits_service_tickets.schema');
const mongoose = require('mongoose');
const ServiceTicket = mongoose.model('solarkits_service_tickets');

async function clean() {
  try {
    const resDo = await DeliveryOrder.deleteMany({
      delivery_order_id: { $in: ['DO-2026-0003', 'DO-2026-0004', 'DO-2026-0005', 'DO-2026-0006', 'DO-2026-0007'] }
    });
    console.log('Deleted seeded Delivery Orders:', resDo.deletedCount);

    const resTck = await ServiceTicket.deleteMany({
      ticket_number: { $in: ['SKT-2026-000101', 'SKT-2026-000102', 'SKT-2026-000103', 'SKT-2026-000104'] }
    });
    console.log('Deleted seeded Tickets:', resTck.deletedCount);

    const remainingDos = await DeliveryOrder.find().select('delivery_order_id order_number customer_name').lean();
    console.log('Real Remaining Delivery Orders in DB:', remainingDos);

    const remainingTcks = await ServiceTicket.find().lean();
    console.log('Real Remaining Tickets in DB count:', remainingTcks.length);

    process.exit(0);
  } catch (err) {
    console.error('Clean error:', err);
    process.exit(1);
  }
}

clean();
