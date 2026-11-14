const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

async function testFlattened() {
  await mongoose.connect(process.env.MONGODB_URI);
  const bdeId = '6a97bf54d2556e9061501caa'; // Vivek gohel
  const stateName = 'Gujarat';

  const fpoOr = [
    { created_by: new mongoose.Types.ObjectId(bdeId) },
    { 'status_history.changed_by': new mongoose.Types.ObjectId(bdeId) },
    { 'customer_details.state': new RegExp('^' + stateName + '$', 'i') }
  ];

  const epcOr = [
    { 'delivery_address.state_name': new RegExp('^' + stateName + '$', 'i') }
  ];

  const [fpos, epcs] = await Promise.all([
    mongoose.connection.collection('fpo_orders').find({ $or: fpoOr }).toArray(),
    mongoose.connection.collection('epc_orders').find({ $or: epcOr }).toArray()
  ]);

  console.log('FPO Count:', fpos.length);
  console.log('EPC Count:', epcs.length);

  const isDirectOrder = (o) => {
    return o.epc_source === 'Direct EPC (HO/BDE)' ||
      o.franchisee_code === 'DIRECT-EPC' ||
      String(o.po_number || '').startsWith('SKO-') ||
      String(o.po_number || '').startsWith('ORD-EPC') ||
      String(o.franchisee_name || '').toLowerCase().includes('direct epc');
  };

  const flattened = [];
  fpos.forEach(o => {
    (o.items || []).forEach(item => {
      flattened.push({
        po_number: o.po_number,
        franchisee_name: o.customer_details?.company_name || o.customer_details?.name || 'Franchise Partner',
        franchisee_code: o.franchisee_id ? 'FP-' + o.franchisee_id.toString().slice(-4).toUpperCase() : 'BDE-PO',
        item_name: item.item_name,
        quantity: item.quantity,
        order_value: (item.total_price_paise || 0) / 100,
        order_status: o.status,
        epc_source: o.is_token_booking ? 'Franchisee Token PO' : 'Franchisee PO'
      });
    });
  });

  epcs.forEach(o => {
    (o.items || []).forEach(item => {
      flattened.push({
        po_number: o.order_number,
        franchisee_name: 'Direct EPC (' + (o.delivery_address?.contact_name || 'EPC') + ')',
        franchisee_code: 'DIRECT-EPC',
        item_name: item.item_name,
        quantity: item.quantity,
        order_value: (item.total_price_paise || 0) / 100,
        order_status: o.order_status,
        epc_source: 'Direct EPC (HO/BDE)'
      });
    });
  });

  const fOrders = flattened.filter(o => !isDirectOrder(o));
  const dOrders = flattened.filter(o => isDirectOrder(o));

  console.log('Franchisee Orders tab count:', fOrders.length, 'Total kits:', fOrders.reduce((s, o) => s + o.quantity, 0));
  console.log('Direct EPC Orders tab count:', dOrders.length, 'Total kits:', dOrders.reduce((s, o) => s + o.quantity, 0));
  console.log('Grand Total kits:', flattened.reduce((s, o) => s + o.quantity, 0));

  await mongoose.disconnect();
}
testFlattened().catch(console.error);
