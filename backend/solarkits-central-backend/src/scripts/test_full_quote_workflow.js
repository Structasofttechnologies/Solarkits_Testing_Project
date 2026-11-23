require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('../config/databases');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { EpcAccount, WarehouseComboKit, BDEProfile } = require('../modules/admin-panel/models/india_solarshop_db');
const epcQuotesHandler = require('../modules/solarshop-india/controller/epc.quotes.handler');

async function testWorkflow() {
  await new Promise(resolve => {
    if (mongoose.connection.readyState === 1) return resolve();
    mongoose.connection.on('connected', resolve);
  });

  console.log('--- 1. Fetching BDE & EPC ---');
  const bde = await BDEProfile.findOne({ email: 'rahul.bde@solarkits.com' }).lean();
  console.log('BDE:', bde?.full_name, bde?.bde_id_code, bde?._id);

  const epc = await EpcAccount.findOne({ email: 'contact@sungridtech.in' }).lean();
  console.log('EPC:', epc?.name, epc?.gstin, epc?._id);

  const kit = await WarehouseComboKit.findById('6ad89edc9a85e44669e76b1a').lean();
  console.log('Kit:', kit?.name, kit?._id, 'selling_price_cached:', kit?.selling_price_cached);

  // 1. Create Draft
  console.log('\n--- 2. Calling create_draft ---');
  let draftDoc = null;
  const reqDraft = {
    user: { id: bde._id.toString(), role: 'bde', name: bde.full_name },
    bde: { _id: bde._id.toString(), full_name: bde.full_name, bde_id_code: bde.bde_id_code, mobile: bde.mobile, email: bde.email },
    body: {
      epc_id: epc._id.toString(),
      quote_source: 'bde_direct',
      is_trial_kit: true,
      quote_type: 'trial_kit',
      trial_kit_quantity: 1,
      delivery_type: 'epc_location',
      delivery_address_snapshot: {
        shipping_address_line1: '402, Millennium Textile Market 2, Ring Road, Surat, Gujarat - 395002',
        state_name: 'Gujarat',
        district_name: 'Surat',
        pincode: '395002',
        contact_person: epc.name || 'Chirag Desai',
        mobile: epc.whatsapp || '9825122332'
      },
      combo_kit_id: kit._id.toString(),
      quantity: 1,
      price_per_kit_paise: 3351700,
      delivery_charges_paise: 250000,
      taxable_amount_paise: 3601700,
      gst_rate: 5,
      gst_amount_paise: 180085,
      total_amount_paise: 3781785
    }
  };

  const resDraft = {
    status(code) { this.statusCode = code; return this; },
    json(data) {
      if (data.status === 'success') {
        draftDoc = data.data;
        console.log('Draft created successfully! ID:', draftDoc._id);
        console.log({
          price_per_kit_paise: draftDoc.price_per_kit_paise,
          delivery_charges_paise: draftDoc.delivery_charges_paise,
          taxable_amount_paise: draftDoc.taxable_amount_paise,
          gst_rate: draftDoc.gst_rate,
          gst_amount_paise: draftDoc.gst_amount_paise,
          total_amount_paise: draftDoc.total_amount_paise
        });
      } else {
        console.error('Draft creation failed:', data);
      }
      return this;
    }
  };

  await epcQuotesHandler.create_draft(reqDraft, resDraft);
  if (!draftDoc) {
    console.error('Cannot proceed to generate without draft');
    process.exit(1);
  }

  // 2. Generate Quote
  console.log('\n--- 3. Calling generate_quote ---');
  let genDoc = null;
  const reqGen = {
    params: { id: draftDoc._id.toString() },
    user: reqDraft.user,
    bde: reqDraft.bde
  };

  const resGen = {
    status(code) { this.statusCode = code; return this; },
    json(data) {
      if (data.status === 'success') {
        genDoc = data.data;
        console.log('Quote generated successfully! Quote Number:', genDoc.quote_number);
        console.log('Final Commercial Financial Breakdown:');
        console.log({
          quote_number: genDoc.quote_number,
          kit_name: genDoc.combo_kit_snapshot?.name,
          quantity: genDoc.quantity,
          unit_price_inr: (genDoc.price_per_kit_paise / 100).toFixed(2),
          product_subtotal_inr: (genDoc.product_subtotal_paise / 100).toFixed(2),
          freight_inr: (genDoc.delivery_charges_paise / 100).toFixed(2),
          taxable_amount_inr: (genDoc.taxable_amount_paise / 100).toFixed(2),
          gst_rate: `${genDoc.gst_rate}%`,
          gst_amount_inr: (genDoc.gst_amount_paise / 100).toFixed(2),
          total_amount_inr: (genDoc.total_amount_paise / 100).toFixed(2)
        });
      } else {
        console.error('Quote generation failed:', data);
      }
      return this;
    }
  };

  await epcQuotesHandler.generate_quote(reqGen, resGen);
  if (!genDoc) {
    console.error('Cannot proceed to PDF without generated quote');
    process.exit(1);
  }

  // 3. Generate PDF
  console.log('\n--- 4. Calling get_pdf ---');
  const pdfOutPath = path.resolve(__dirname, `generated_test_${genDoc.quote_number}.pdf`);
  const writeStream = fs.createWriteStream(pdfOutPath);

  const reqPdf = {
    params: { id: genDoc._id.toString() },
    user: reqDraft.user,
    bde: reqDraft.bde
  };

  const resPdf = {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) { console.error('PDF error JSON:', data); return this; },
    on(event, cb) { writeStream.on(event, cb); return this; },
    once(event, cb) { writeStream.once(event, cb); return this; },
    emit(event, ...args) { writeStream.emit(event, ...args); return this; },
    write(chunk) { return writeStream.write(chunk); },
    end() {
      writeStream.end();
      console.log('✅ Clean PDF successfully generated at:', pdfOutPath);
      setTimeout(() => process.exit(0), 500);
    }
  };

  await epcQuotesHandler.get_pdf(reqPdf, resPdf);
}

testWorkflow().catch(e => {
  console.error('Test workflow exception:', e);
  process.exit(1);
});
