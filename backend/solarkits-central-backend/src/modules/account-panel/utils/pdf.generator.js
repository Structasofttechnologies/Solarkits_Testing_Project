const PDFDocument = require('pdfkit');
const cloudinary = require('../config/cloudinary');

/**
 * Generates a purchase order PDF and uploads it to Cloudinary.
 * @param {string} poNumber 
 * @param {string} invoiceNo 
 * @param {object} warehouse 
 * @param {object} supplier 
 * @param {array} items 
 * @returns {Promise<string>} Cloudinary secure URL of the uploaded PDF
 */
function generateAndUploadPI(poNumber, invoiceNo, warehouse, supplier, items) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        const folder = `solarkits/solarkits-account-panel/public/uploads/purchase-orders`;
        
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: poNumber,
            resource_type: "raw", // PDFs are uploaded as 'raw' resource type in Cloudinary
            format: "pdf"
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary Purchase Order PDF upload failed:", error);
              reject(error);
            } else {
              resolve(result.secure_url);
            }
          }
        );
        uploadStream.end(pdfBuffer);
      });

      // ─── Header / Brand ──────────────────────────────────────────────────
      doc.fillColor('#263880').fontSize(24).font('Helvetica-Bold').text('SOLARKITS', 50, 50);
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Renewable Procurement Solutions', 50, 75);
      
      doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text('PURCHASE ORDER', 350, 50, { align: 'right' });
      
      // Divider
      doc.moveTo(50, 95).lineTo(545, 95).strokeColor('#e5e7eb').lineWidth(1).stroke();

      // ─── Metadata ────────────────────────────────────────────────────────
      doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('DELIVER TO / SHIP TO:', 50, 115);
      doc.fillColor('#0f172a').font('Helvetica').text(`Warehouse: ${warehouse.warehouse_code || 'N/A'}`, 50, doc.y + 2, { width: 250 });
      doc.text(`Address: ${warehouse.address || 'N/A'}`, 50, doc.y + 2, { width: 250 });
      const leftY = doc.y;

      doc.fillColor('#64748b').font('Helvetica-Bold').text('SUPPLIER:', 320, 115);
      doc.fillColor('#0f172a').font('Helvetica').text(`${supplier.company_name || 'N/A'}`, 320, doc.y + 2, { width: 225 });
      doc.text(`Brand: ${supplier.brand_name || 'N/A'}`, 320, doc.y + 2, { width: 225 });
      doc.text(`GSTIN: ${supplier.gst_number || 'N/A'}`, 320, doc.y + 2, { width: 225 });
      const rightY = doc.y;

      // Select the maximum Y to start the next section
      const detailsTop = Math.max(leftY, rightY) + 20;

      // PO Details
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(`PO Number:`, 50, detailsTop);
      doc.font('Helvetica').text(poNumber, 140, detailsTop);
      doc.font('Helvetica-Bold').text(`Date:`, 320, detailsTop);
      doc.font('Helvetica').text(new Date().toLocaleDateString('en-IN'), 400, detailsTop);

      // Divider
      const dividerY = detailsTop + 30;
      doc.moveTo(50, dividerY).lineTo(545, dividerY).strokeColor('#263880').lineWidth(1.5).stroke();

      // ─── Table Headers ───────────────────────────────────────────────────
      const tableTop = dividerY + 15;
      doc.fillColor('#263880').font('Helvetica-Bold').fontSize(10);
      doc.text('SKU Code', 50, tableTop, { width: 100 });
      doc.text('Product Name', 160, tableTop, { width: 180 });
      doc.text('Qty', 350, tableTop, { width: 50, align: 'right' });
      doc.text('Unit Price', 400, tableTop, { width: 75, align: 'right' });
      doc.text('Total', 480, tableTop, { width: 65, align: 'right' });

      // Header Divider
      const headerDividerY = tableTop + 15;
      doc.moveTo(50, headerDividerY).lineTo(545, headerDividerY).strokeColor('#e5e7eb').lineWidth(1).stroke();

      // ─── Table Body ──────────────────────────────────────────────────────
      let y = headerDividerY + 10;
      let totalAmount = 0;
      doc.fillColor('#0f172a').font('Helvetica').fontSize(9);
      
      items.forEach((item) => {
        const itemTotal = item.qty * item.order_price;
        totalAmount += itemTotal;

        // Check if page overflow
        if (y > 730) {
          doc.addPage();
          y = 50; // reset y on new page
        }

        let priceStr = `₹${item.order_price.toLocaleString()}`;
        let spacing = 25;
        if (item.order_price_per_watt && item.order_price_per_watt > 0) {
          priceStr = `₹${Number(item.order_price_per_watt).toFixed(2)}/W\n(₹${Number(item.order_price).toFixed(2)}/pc)`;
          spacing = 35;
        }

        doc.text(item.sku_code || 'N/A', 50, y, { width: 100 });
        doc.text(item.product_name || 'N/A', 160, y, { width: 180 });
        doc.text(item.qty.toString(), 350, y, { width: 50, align: 'right' });
        doc.text(priceStr, 400, y, { width: 75, align: 'right' });
        doc.text(`₹${itemTotal.toLocaleString()}`, 480, y, { width: 65, align: 'right' });

        y += spacing;
        doc.moveTo(50, y - 5).lineTo(545, y - 5).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      });

      // ─── Total Block ─────────────────────────────────────────────────────
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      
      y += 15;
      doc.moveTo(300, y).lineTo(545, y).strokeColor('#263880').lineWidth(1).stroke();
      
      y += 10;
      doc.fillColor('#263880').font('Helvetica-Bold').fontSize(11).text('Grand Total:', 320, y);
      doc.fillColor('#0f172a').fontSize(12).text(`₹${totalAmount.toLocaleString()}`, 450, y, { width: 95, align: 'right' });

      y += 30;
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Oblique').text(
        'This is a system-generated Purchase Order. Please issue a Proforma Invoice matching these terms to initiate payment.',
        50,
        y,
        { align: 'center', width: 495 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateAndUploadPI };
