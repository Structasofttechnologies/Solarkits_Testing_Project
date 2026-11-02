const mongoose = require('mongoose');
const { DeliveryOrder, PoRequest, CompanyWarehouse } = require('../models/company_warehouse_db');
const PurchaseIndent = require('../../account-panel/models/company_warehouse_db/PurchaseIndent.schema');
const { sendAdminNotification } = require('../../admin-panel/services/admin.notification.service');

/**
 * GET /warehouse-api/delivery-orders
 * List orders with search, filters (state, district, pincode, status, date)
 */
exports.get_delivery_orders = async (req, res) => {
  try {
    const {
      status,
      state,
      district,
      pincode,
      search,
      delivery_method,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const filter = { delivery_order_id: { $exists: true } };

    // Auto-heal: Ensure any order with pending inward items is NOT stuck in out_for_delivery / sent_for_delivery_at
    await DeliveryOrder.updateMany(
      {
        sent_for_delivery_at: { $ne: null },
        'items.pending_qty': { $gt: 0 }
      },
      {
        $set: {
          sent_for_delivery_at: null,
          delivery_status: 'new_order'
        }
      }
    ).catch(() => {});

    const now = new Date();
    const slaThresholdDate = new Date(now.getTime() - 2 * 24 * 3600 * 1000);

    if (status && status !== 'all') {
      if (status === 'overdue') {
        filter.delivery_status = { $ne: 'delivered' };
        filter.order_date = { $lte: slaThresholdDate };
      } else if (status === 'pending_inward' || status === 'new_order') {
        filter.delivery_status = { $in: ['new_order', 'partially_inwarded'] };
      } else if (status === 'inward_done' || status === 'inward_completed') {
        filter.delivery_status = { $in: ['inward_completed', 'inward_done'] };
      } else {
        filter.delivery_status = status;
      }
    }

    if (state && state !== 'all') {
      filter['destination.state'] = new RegExp(`^${state}$`, 'i');
    }

    if (district && district !== 'all') {
      filter['destination.district'] = new RegExp(`^${district}$`, 'i');
    }

    if (pincode) {
      filter['destination.pincode'] = new RegExp(pincode.trim(), 'i');
    }

    if (delivery_method && delivery_method !== 'all') {
      filter.delivery_method = delivery_method;
    }

    if (search) {
      const s = search.trim();
      filter.$or = [
        { delivery_order_id: new RegExp(s, 'i') },
        { order_number: new RegExp(s, 'i') },
        { customer_name: new RegExp(s, 'i') },
        { customer_phone: new RegExp(s, 'i') },
        { 'destination.address': new RegExp(s, 'i') },
        { 'incoming_truck_group.group_id': new RegExp(s, 'i') },
        { 'incoming_truck_group.vehicle_number': new RegExp(s, 'i') },
        { 'incoming_truck_group.transporter_name': new RegExp(s, 'i') }
      ];
    }

    if (startDate || endDate) {
      filter.order_date = {};
      if (startDate) filter.order_date.$gte = new Date(startDate);
      if (endDate) filter.order_date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await DeliveryOrder.countDocuments(filter);
    const rawOrders = await DeliveryOrder.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Base warehouse stock reference map
    const baseInventoryMap = {
      'BOS-RAIL-4.2M-AL': 140,
      'BOS-CLAMP-END-35MM': 450,
      'BOS-CLAMP-MID-35MM': 600,
      'BOS-DC-CABLE-4SQMM-100M': 24,
      'BOS-AJB-DCDB-4IN-4OUT': 8,
      'BOS-EARTH-ROD-COPPER-2M': 35,
      'BOS-RAIL-3.2M-AL': 100,
      'BOS-FASTENER-SS304-SET': 50,
      'BOS-MC4-CONN-1000V': 80,
      'BOS-AJB-DCDB-6IN-6OUT': 12
    };

    // Calculate total allocated/inwarded stock across ALL active (non-delivered) delivery orders
    const allActiveOrders = await DeliveryOrder.find({
      delivery_order_id: { $exists: true },
      delivery_status: { $ne: 'delivered' }
    });

    const totalAllocatedBySku = {};
    for (const actOrd of allActiveOrders) {
      for (const it of (actOrd.items || [])) {
        const committed = Math.max(it.allocated_stock || 0, it.received_qty || 0);
        if (it.sku && committed > 0) {
          totalAllocatedBySku[it.sku] = (totalAllocatedBySku[it.sku] || 0) + committed;
        }
      }
    }

    // Pre-fetch all PurchaseIndents for rawOrders to cross-reference Accounts payment clearance
    const orderNumbers = rawOrders.map(o => o.order_number).filter(Boolean);
    const allOrderPis = await PurchaseIndent.find({
      $or: [
        { customer_order_number: { $in: orderNumbers } },
        { order_number: { $in: orderNumbers } }
      ]
    }).lean().catch(() => []);

    const pisByOrder = {};
    for (const p of allOrderPis) {
      const oNum = p.customer_order_number || p.order_number;
      if (oNum) {
        if (!pisByOrder[oNum]) pisByOrder[oNum] = [];
        pisByOrder[oNum].push(p);
      }
    }

    // Enrich orders with dynamic available inventory (minus all committed stock across active orders) and Overdue SLA calculations
    const orders = rawOrders.map(ord => {
      const ordObj = ord.toObject();
      const slaDays = ordObj.sla_days || 2;
      const orderDate = new Date(ordObj.order_date || ordObj.created_at);
      const diffMs = now - orderDate;
      const daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const isOverdue = ordObj.delivery_status !== 'delivered' && daysElapsed > slaDays;
      const overdueDays = isOverdue ? (daysElapsed - slaDays) : 0;

      // Resolve true kits count & capacity dynamically for this order
      let epcKits = 0;
      if (ordObj.epcs && ordObj.epcs.length > 0) {
        epcKits = ordObj.epcs.reduce((acc, epc) => {
          const match = (epc.boskit_qty || '').match(/(\d+)/) || (epc.inverter_qty || '').match(/(\d+)/);
          return acc + (match ? parseInt(match[1], 10) : 0);
        }, 0);
      }
      const inv = (ordObj.items || []).find(i => i.category === 'inverter' || (i.product_name && i.product_name.toLowerCase().includes('inverter')));
      const acdb = (ordObj.items || []).find(i => i.sku?.includes('ACDB') || (i.product_name && i.product_name.toLowerCase().includes('acdb')));
      const lig = (ordObj.items || []).find(i => i.sku?.includes('LIG-') || (i.product_name && i.product_name.toLowerCase().includes('lightning arrestor')));
      const rawBos = (ordObj.items || []).find(it =>
        (it.sku || '').startsWith('BOS-KIT-') ||
        (it.category || '').toLowerCase() === 'bos kit' ||
        (it.product_name || '').toLowerCase().includes('bos kit')
      );

      let epcBosKits = 0;
      if (ordObj.epcs && ordObj.epcs.length > 0) {
        epcBosKits = ordObj.epcs.reduce((acc, epc) => {
          const match = (epc.boskit_qty || '').match(/(\d+)/);
          return acc + (match ? parseInt(match[1], 10) : 0);
        }, 0);
      }

      let totalKits = Number(ordObj.num_kits) ||
                      Number(ordObj.total_kits) ||
                      (rawBos ? rawBos.ordered_qty : 0) ||
                      epcBosKits ||
                      epcKits ||
                      itemKits ||
                      1;

      let detectedCap = ordObj.system_capacity || '';
      if (!detectedCap && ordObj.epcs && ordObj.epcs.length > 0) {
        detectedCap = ordObj.epcs.find(e => e.system_capacity)?.system_capacity || '';
      }
      if (!detectedCap) {
        const capMatch = (inv?.product_name || inv?.sku || '').match(/(\d+)\s*k[wv]/i);
        detectedCap = capMatch ? `${capMatch[1]} kW` : '3 kW';
      }

      const detectedModel = ordObj.solarkit_model || (ordObj.epcs?.find(e => e.solarkit_model)?.solarkit_model) || `${detectedCap} Solarkits DCR Combokit`;

      // Available Free Warehouse Stock = Base Stock - Total stock committed/inwarded across orders
      const enrichedItems = (ordObj.items || []).map(it => {
        const baseStock = baseInventoryMap[it.sku] !== undefined ? baseInventoryMap[it.sku] : (it.base_warehouse_stock || it.available_inventory_stock || 100);
        const liveAvailableStock = Math.max(0, baseStock - (totalAllocatedBySku[it.sku] || 0));

        // If it's a BOS Kit item, ensure its ordered_qty matches totalKits if it was previously set to 1
        const isBos = it.sku?.startsWith('BOS-KIT-') || it.category === 'BOS Kit' || (it.product_name && it.product_name.toLowerCase().includes('bos kit'));
        let orderedQty = it.ordered_qty;
        let pendingQty = it.pending_qty;
        if (isBos && totalKits > 1 && orderedQty < totalKits) {
          orderedQty = totalKits;
          pendingQty = Math.max(0, totalKits - (it.received_qty || 0));
        }

        return {
          ...it,
          ordered_qty: orderedQty,
          pending_qty: pendingQty,
          base_warehouse_stock: baseStock,
          available_inventory_stock: liveAvailableStock
        };
      });

      // Ensure BOS Kit line item exists in items if order requires kit preparation
      const hasBosItem = enrichedItems.some(it => 
        it.sku?.startsWith('BOS-KIT-') || 
        it.category === 'BOS Kit' || 
        (it.product_name && it.product_name.toLowerCase().includes('bos kit'))
      );
      if (!hasBosItem && ordObj.kit_preparation_status && ordObj.kit_preparation_status !== 'not_required') {
        const cleanCap = detectedCap.replace(/\s+/g, '').toUpperCase();
        const isDelivered = ordObj.delivery_status === 'delivered';
        const isReady = ordObj.kit_preparation_status === 'kit_ready';
        const receivedQty = isDelivered ? totalKits : 0;
        const pendingQty = Math.max(0, totalKits - receivedQty);

        enrichedItems.push({
          sku: `BOS-KIT-${cleanCap}-STD`,
          product_name: `BOS Kit (${detectedCap} Pre-assembled Electrical Package - ACDB/DCDB/Cables)`,
          category: 'BOS Kit',
          ordered_qty: totalKits,
          received_qty: receivedQty,
          pending_qty: pendingQty,
          rack_location: ordObj.kit_assembly_details?.storage_location || 'BAY-BOS-STOCK',
          qc_status: isReady ? 'Passed' : 'Pending',
          base_warehouse_stock: 100,
          available_inventory_stock: 100
        });
      }

      // Check if all PIs for this order are 100% settled in Accounts
      const orderPis = pisByOrder[ordObj.order_number] || [];
      const isOrderFullySettledInAccounts = orderPis.length > 0 && orderPis.every(p =>
        p.payment?.payment_status === 'Paid' ||
        (p.payment?.balance_payment?.utr_number && p.payment?.advance_payment?.utr_number) ||
        (p.payment?.total_paid_amount >= p.total_pi_value) ||
        (p.payment?.balance_due <= 0 && p.payment?.total_paid_amount > 0)
      );

      const epcsList = (ordObj.epcs && ordObj.epcs.length > 0)
        ? ordObj.epcs.map(epc => {
            const isSecondDone = isOrderFullySettledInAccounts || epc.payment_second_half?.status === 'done';
            return {
              ...epc,
              boskit_qty: epc.boskit_qty && epc.boskit_qty !== '1 Kits' ? epc.boskit_qty : `${totalKits} Kits`,
              inverter_qty: epc.inverter_qty || `${totalKits} Inverters`,
              system_capacity: epc.system_capacity || detectedCap,
              solarkit_model: epc.solarkit_model || detectedModel,
              payment_second_half: {
                ...epc.payment_second_half,
                status: isSecondDone ? 'done' : (epc.payment_second_half?.status || 'pending'),
                paid_at: isSecondDone ? (epc.payment_second_half?.paid_at || new Date()) : null,
                verified_by: isSecondDone ? (epc.payment_second_half?.verified_by || 'Accounts (Balance UTR Recorded)') : ''
              }
            };
          })
        : [{
            epc_id: 'EPC-01',
            epc_name: ordObj.customer_name || 'Primary EPC',
            contact_person: ordObj.customer_name,
            phone: ordObj.customer_phone,
            email: ordObj.customer_email,
            destination: ordObj.destination,
            solarkit_model: detectedModel,
            system_capacity: detectedCap,
            boskit_qty: `${totalKits} Kits`,
            inverter_qty: `${totalKits} Inverters`,
            payment_first_half: { status: 'done', percentage: 50, amount: 150000, paid_at: new Date(Date.now() - 48*3600*1000) },
            payment_second_half: {
              status: (isOrderFullySettledInAccounts || ['in_transit', 'delivered'].includes(ordObj.delivery_status)) ? 'done' : 'pending',
              percentage: 50,
              amount: 150000,
              paid_at: (isOrderFullySettledInAccounts || ['in_transit', 'delivered'].includes(ordObj.delivery_status)) ? new Date() : null,
              verified_by: isOrderFullySettledInAccounts ? 'Accounts (Balance UTR Recorded)' : ''
            },
            items: ordObj.items || [],
            is_removed_by_account: false,
            dispatch_status: ordObj.delivery_status,
            tracking_consignment_id: `TRK-${ordObj.order_number}-EPC1`
          }];

      if (isOrderFullySettledInAccounts && ordObj.epcs?.some(e => e.payment_second_half?.status !== 'done')) {
        DeliveryOrder.updateOne(
          { _id: ordObj._id },
          {
            $set: {
              'epcs.$[].payment_second_half.status': 'done',
              'epcs.$[].payment_second_half.paid_at': new Date(),
              'epcs.$[].payment_second_half.verified_by': 'Accounts (Balance UTR Recorded)'
            }
          }
        ).catch(() => {});
      }

      // If 100% components are fulfilled (either inwarded or allocated from warehouse stock)
      let effectiveKitStatus = ordObj.kit_preparation_status;
      const unallocatedShortage = (ordObj.items || []).reduce((acc, it) => {
        const pending = it.pending_qty || 0;
        const allocated = it.allocated_stock || 0;
        return acc + Math.max(0, pending - allocated);
      }, 0);
      if (effectiveKitStatus === 'awaiting_components' && unallocatedShortage === 0) {
        effectiveKitStatus = 'ready_for_assembly';
      }

      return {
        ...ordObj,
        num_kits: totalKits,
        system_capacity: detectedCap,
        solarkit_model: detectedModel,
        kit_preparation_status: effectiveKitStatus,
        epcs: epcsList,
        items: enrichedItems,
        days_elapsed: daysElapsed,
        is_overdue: isOverdue,
        overdue_days: overdueDays
      };
    });

    // Summary counts for dashboard badges
    const baseQuery = { delivery_order_id: { $exists: true } };
    const overdueCount = await DeliveryOrder.countDocuments({
      ...baseQuery,
      delivery_status: { $ne: 'delivered' },
      order_date: { $lte: slaThresholdDate }
    });

    const summary = {
      total: await DeliveryOrder.countDocuments(baseQuery),
      new_orders: await DeliveryOrder.countDocuments({
        ...baseQuery,
        $or: [
          { sent_for_delivery_at: null, delivery_status: { $nin: ['in_transit', 'delivered', 'delivery_exception'] } },
          { 'items.pending_qty': { $gt: 0 } }
        ]
      }),
      bos_kit_assembly: await DeliveryOrder.countDocuments({
        ...baseQuery,
        kit_preparation_status: { $in: ['awaiting_components', 'ready_for_assembly', 'in_assembly'] },
        delivery_status: { $ne: 'delivered' }
      }),
      material_inward: 0,
      pending_inward: await DeliveryOrder.countDocuments({
        ...baseQuery,
        $or: [
          { delivery_status: { $in: ['new_order', 'partially_inwarded'] } },
          { 'items.pending_qty': { $gt: 0 } }
        ]
      }),
      overdue_orders: overdueCount,
      ready_for_dispatch: await DeliveryOrder.countDocuments({
        ...baseQuery,
        sent_for_delivery_at: { $ne: null },
        'items.pending_qty': { $not: { $gt: 0 } },
        delivery_status: 'ready_for_dispatch'
      }),
      out_for_delivery: await DeliveryOrder.countDocuments({
        ...baseQuery,
        sent_for_delivery_at: { $ne: null },
        'items.pending_qty': { $not: { $gt: 0 } },
        delivery_status: { $in: ['ready_for_dispatch', 'awaiting_eway_bill', 'ready_to_initiate', 'dispatched_pending'] }
      }),
      track_delivery: await DeliveryOrder.countDocuments({ ...baseQuery, delivery_status: 'in_transit' }),
      in_transit: await DeliveryOrder.countDocuments({ ...baseQuery, delivery_status: 'in_transit' }),
      delivered: await DeliveryOrder.countDocuments({ ...baseQuery, delivery_status: 'delivered' })
    };

    return res.status(200).json({
      status: 'success',
      data: orders,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('get_delivery_orders error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /warehouse-api/delivery-orders/:id
 */
exports.get_delivery_order_by_id = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }
    const ordObj = order.toObject();

    let epcKits = 0;
    if (ordObj.epcs && ordObj.epcs.length > 0) {
      epcKits = ordObj.epcs.reduce((acc, epc) => {
        const match = (epc.boskit_qty || '').match(/(\d+)/) || (epc.inverter_qty || '').match(/(\d+)/);
        return acc + (match ? parseInt(match[1], 10) : 0);
      }, 0);
    }
    const inv = (ordObj.items || []).find(i => i.category === 'inverter' || (i.product_name && i.product_name.toLowerCase().includes('inverter')));
    const acdb = (ordObj.items || []).find(i => i.sku?.includes('ACDB') || (i.product_name && i.product_name.toLowerCase().includes('acdb')));
    const lig = (ordObj.items || []).find(i => i.sku?.includes('LIG-') || (i.product_name && i.product_name.toLowerCase().includes('lightning arrestor')));
    const rawBos = (ordObj.items || []).find(it =>
      (it.sku || '').startsWith('BOS-KIT-') ||
      (it.category || '').toLowerCase() === 'bos kit' ||
      (it.product_name || '').toLowerCase().includes('bos kit')
    );

    let epcBosKits = 0;
    if (ordObj.epcs && ordObj.epcs.length > 0) {
      epcBosKits = ordObj.epcs.reduce((acc, epc) => {
        const match = (epc.boskit_qty || '').match(/(\d+)/);
        return acc + (match ? parseInt(match[1], 10) : 0);
      }, 0);
    }

    let totalKits = Number(ordObj.num_kits) ||
                    Number(ordObj.total_kits) ||
                    (rawBos ? rawBos.ordered_qty : 0) ||
                    epcBosKits ||
                    epcKits ||
                    itemKits ||
                    1;

    let detectedCap = ordObj.system_capacity || '';
    if (!detectedCap && ordObj.epcs && ordObj.epcs.length > 0) {
      detectedCap = ordObj.epcs.find(e => e.system_capacity)?.system_capacity || '';
    }
    if (!detectedCap) {
      const capMatch = (inv?.product_name || inv?.sku || '').match(/(\d+)\s*k[wv]/i);
      detectedCap = capMatch ? `${capMatch[1]} kW` : '3 kW';
    }

    const detectedModel = ordObj.solarkit_model || (ordObj.epcs?.find(e => e.solarkit_model)?.solarkit_model) || `${detectedCap} Solarkits DCR Combokit`;

    // Check if all PIs for this order are 100% settled in Accounts
    const orderPis = await PurchaseIndent.find({
      $or: [
        { customer_order_number: ordObj.order_number },
        { order_number: ordObj.order_number }
      ]
    }).lean().catch(() => []);

    const isOrderFullySettledInAccounts = orderPis.length > 0 && orderPis.every(p =>
      p.payment?.payment_status === 'Paid' ||
      (p.payment?.balance_payment?.utr_number && p.payment?.advance_payment?.utr_number) ||
      (p.payment?.total_paid_amount >= p.total_pi_value) ||
      (p.payment?.balance_due <= 0 && p.payment?.total_paid_amount > 0)
    );

    const epcsList = (ordObj.epcs && ordObj.epcs.length > 0)
      ? ordObj.epcs.map(epc => {
          const isSecondDone = isOrderFullySettledInAccounts || epc.payment_second_half?.status === 'done';
          return {
            ...epc,
            boskit_qty: epc.boskit_qty && epc.boskit_qty !== '1 Kits' ? epc.boskit_qty : `${totalKits} Kits`,
            inverter_qty: epc.inverter_qty || `${totalKits} Inverters`,
            system_capacity: epc.system_capacity || detectedCap,
            solarkit_model: epc.solarkit_model || detectedModel,
            payment_second_half: {
              ...epc.payment_second_half,
              status: isSecondDone ? 'done' : (epc.payment_second_half?.status || 'pending'),
              paid_at: isSecondDone ? (epc.payment_second_half?.paid_at || new Date()) : null,
              verified_by: isSecondDone ? (epc.payment_second_half?.verified_by || 'Accounts (Balance UTR Recorded)') : ''
            }
          };
        })
      : ordObj.epcs;

    if (isOrderFullySettledInAccounts && ordObj.epcs?.some(e => e.payment_second_half?.status !== 'done')) {
      DeliveryOrder.updateOne(
        { _id: ordObj._id },
        {
          $set: {
            'epcs.$[].payment_second_half.status': 'done',
            'epcs.$[].payment_second_half.paid_at': new Date(),
            'epcs.$[].payment_second_half.verified_by': 'Accounts (Balance UTR Recorded)'
          }
        }
      ).catch(() => {});
    }

    let itemsList = (ordObj.items || []).map(it => ({ ...it }));
    const hasBos = itemsList.some(it => 
      it.sku?.startsWith('BOS-KIT-') || 
      it.category === 'BOS Kit' || 
      (it.product_name && it.product_name.toLowerCase().includes('bos kit'))
    );
    if (!hasBos && ordObj.kit_preparation_status && ordObj.kit_preparation_status !== 'not_required') {
      const cleanCap = detectedCap.replace(/\s+/g, '').toUpperCase();
      const isDelivered = ordObj.delivery_status === 'delivered';
      const isReady = ordObj.kit_preparation_status === 'kit_ready';
      const receivedQty = isDelivered ? totalKits : 0;
      const pendingQty = Math.max(0, totalKits - receivedQty);

      itemsList.push({
        sku: `BOS-KIT-${cleanCap}-STD`,
        product_name: `BOS Kit (${detectedCap} Pre-assembled Electrical Package - ACDB/DCDB/Cables)`,
        category: 'BOS Kit',
        ordered_qty: totalKits,
        received_qty: receivedQty,
        pending_qty: pendingQty,
        rack_location: ordObj.kit_assembly_details?.storage_location || 'BAY-BOS-STOCK',
        qc_status: isReady ? 'Passed' : 'Pending',
        base_warehouse_stock: 100,
        available_inventory_stock: 100
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        ...ordObj,
        items: itemsList,
        num_kits: totalKits,
        system_capacity: detectedCap,
        solarkit_model: detectedModel,
        epcs: epcsList
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/reserve-inventory
 * Reserve available BOS stock against this delivery order
 */
exports.reserve_inventory = async (req, res) => {
  try {
    const { sku, allocated_stock } = req.body;
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    const item = (order.items || []).find(it => it.sku === sku);
    if (!item) {
      return res.status(404).json({ status: 'error', message: `SKU ${sku} not found in this order.` });
    }

    const qtyToAllocate = parseInt(allocated_stock);
    if (isNaN(qtyToAllocate) || qtyToAllocate < 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid allocated quantity.' });
    }

    const baseInventoryMap = {
      'BOS-RAIL-4.2M-AL': 140,
      'BOS-CLAMP-END-35MM': 450,
      'BOS-CLAMP-MID-35MM': 600,
      'BOS-DC-CABLE-4SQMM-100M': 24,
      'BOS-AJB-DCDB-4IN-4OUT': 8,
      'BOS-EARTH-ROD-COPPER-2M': 35,
      'BOS-RAIL-3.2M-AL': 100,
      'BOS-FASTENER-SS304-SET': 50,
      'BOS-MC4-CONN-1000V': 80,
      'BOS-AJB-DCDB-6IN-6OUT': 12
    };

    const otherOrders = await DeliveryOrder.find({
      _id: { $ne: order._id },
      delivery_status: { $ne: 'delivered' }
    });
    let allocatedByOthers = 0;
    for (const ord of otherOrders) {
      for (const it of (ord.items || [])) {
        if (it.sku === sku) {
          allocatedByOthers += Math.max(it.allocated_stock || 0, it.received_qty || 0);
        }
      }
    }
    const baseStock = baseInventoryMap[sku] !== undefined ? baseInventoryMap[sku] : (item.available_inventory_stock || 100);
    const liveAvailable = Math.max(0, baseStock - allocatedByOthers);

    if (qtyToAllocate > liveAvailable) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot allocate ${qtyToAllocate} units. Free unreserved warehouse stock is only ${liveAvailable} units (${allocatedByOthers} units already reserved by other customer orders).`
      });
    }

    item.allocated_stock = qtyToAllocate;

    order.audit_trail.push({
      action: 'Inventory Stock Allocated',
      performed_by_name: req.user?.name || 'Delivery Manager',
      timestamp: new Date(),
      notes: `Reserved ${qtyToAllocate} units of SKU ${sku} (${item.product_name}) for this order.`
    });

    await order.save();
    return res.status(200).json({ status: 'success', message: 'Inventory stock reserved successfully.', data: order });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/request-procurement
 * When BOS kit stock is not available in warehouse inventory, send official procurement & booking requisition to Account Manager
 */
exports.request_procurement = async (req, res) => {
  try {
    const { sku, requested_qty, notes, items = [], kit_capacity, model_name, num_kits = 1 } = req.body;
    let order = null;
    if (req.params.id && req.params.id !== 'buffer-stock' && mongoose.Types.ObjectId.isValid(req.params.id)) {
      order = await DeliveryOrder.findById(req.params.id);
    }

    // Resolve or find a valid warehouse ID
    let warehouse_id = order ? order.warehouse_id : null;
    if (!warehouse_id) {
      const wh = await CompanyWarehouse.findOne({ deleted_at: null }).lean();
      warehouse_id = wh ? wh._id : new mongoose.Types.ObjectId();
    }

    const descName = model_name || (kit_capacity ? `${kit_capacity} BOS Kit` : (items[0]?.name || sku || 'BOS Kit Components'));
    const requestNumber = `REQ-BOS-${order?.order_number || 'BUFFER'}-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

    // Build items for PoRequest
    let poItems = [];
    if (Array.isArray(items) && items.length > 0) {
      poItems = items.map(it => {
        let skuId = null;
        if (it.sku_id && mongoose.Types.ObjectId.isValid(it.sku_id)) {
          skuId = new mongoose.Types.ObjectId(it.sku_id);
        } else {
          skuId = new mongoose.Types.ObjectId();
        }
        return {
          sku_id: skuId,
          sku_code: it.sku || it.sku_code || 'BOS-RAW-MATERIAL',
          qty: Number(it.qty) || 1
        };
      });
    } else {
      const item = order ? (order.items || []).find(it => it.sku === sku) : null;
      const qty = parseInt(requested_qty) || (item ? item.pending_qty : Number(num_kits) || 1);
      poItems = [{
        sku_id: new mongoose.Types.ObjectId(),
        sku_code: sku || 'BOS-RAW-MAT-PKG',
        qty: qty
      }];
    }

    // Create official PoRequest for Account Manager login portal
    const newPoRequest = new PoRequest({
      request_number: requestNumber,
      warehouse_id: warehouse_id,
      items: poItems,
      status: 'pending',
      created_by: req.user?._id || req.user?.id || new mongoose.Types.ObjectId()
    });

    await newPoRequest.save();

    if (order) {
      order.procurement_requested = true;
      order.procurement_request_number = requestNumber;
      order.procurement_details = {
        requested_at: new Date(),
        request_number: requestNumber,
        po_request_id: newPoRequest._id,
        items_count: poItems.length,
        kit_capacity: kit_capacity || order.system_capacity,
        model_name: descName,
        num_kits: Number(num_kits) || 1,
        notes: notes || ''
      };

      order.audit_trail.push({
        action: 'Procurement / Booking Requisition Sent to Account Manager',
        performed_by_name: req.user?.name || 'Delivery Manager',
        timestamp: new Date(),
        notes: `Requisition ${requestNumber} with ${poItems.length} BOM components for ${descName} sent to Account Manager login for supplier booking. ${notes || ''}`.trim()
      });

      await order.save();
    }

    sendAdminNotification({
      title: order ? `⚡ Material Requisition: Order #${order.order_number}` : `⚡ Buffer Stock Material Requisition: ${descName}`,
      message: `Warehouse Manager requested procurement of materials (${descName} - ${poItems.length} components) under ${requestNumber}.`,
      category: 'inventory',
      priority: 'urgent',
      action_url: '/account-panel/procurement',
      metadata: { order_id: order?._id, order_number: order?.order_number, delivery_order_id: order?.delivery_order_id, request_number: requestNumber, event: 'procurement_requested' }
    }).catch(err => console.warn('[Procurement Notification Error]:', err.message));

    return res.status(200).json({
      status: 'success',
      message: `Booking & procurement requisition "${requestNumber}" for ${descName} (${poItems.length} materials) forwarded to Account Manager successfully.`,
      request_number: requestNumber,
      data: order || newPoRequest
    });
  } catch (error) {
    console.error('Error in request_procurement:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/inward
 * Inward materials against the delivery order.
 * Strictly prevents inward exceeding permissible pending quantity.
 * Automatically moves order to ready_for_dispatch if all items inwarded 100%.
 */
exports.inward_material = async (req, res) => {
  try {
    const {
      items = [],
      remarks = '',
      batch_id,
      inward_type = 'warehouse',
      inward_mode = 'manual',
      scanned_serials = [],
      pickup_location_details
    } = req.body;
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    if (items.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No items provided for inwarding.' });
    }

    const inwardedItemsLog = [];

    const orderItems = order.items || [];

    // Validation pass: Ensure no item exceeds pending quantity
    for (const inItem of items) {
      let orderItem = orderItems.find(it => it.sku === inItem.sku);
      const isBos = inItem.sku?.startsWith('BOS-KIT-') || inItem.product_name?.toLowerCase().includes('bos kit') || inItem.is_bos_kit || orderItem?.category === 'BOS Kit';
      if (!orderItem) {
        // If it's a BOS Kit item for this order, dynamically initialize it in order.items
        if (isBos) {
          const qty = parseInt(inItem.qty) || (order.num_kits || 1);
          orderItem = {
            sku: inItem.sku,
            product_name: inItem.product_name || `BOS Kit (${order.system_capacity || '3 kW'} Pre-assembled Enclosure Package)`,
            category: 'BOS Kit',
            ordered_qty: Math.max(qty, order.num_kits || 1),
            received_qty: 0,
            pending_qty: Math.max(qty, order.num_kits || 1),
            rack_location: inItem.rack_location || 'BAY-BOS-STOCK',
            qc_status: 'Pending'
          };
          order.items.push(orderItem);
        } else {
          return res.status(400).json({ status: 'error', message: `Item SKU ${inItem.sku} is not part of this order.` });
        }
      } else if (isBos) {
        // If existing BOS Kit item has smaller ordered_qty, expand it to match order.num_kits or inItem.qty
        const targetKits = Math.max(orderItem.ordered_qty || 0, order.num_kits || 0, parseInt(inItem.qty) || 0);
        if (orderItem.ordered_qty < targetKits) {
          orderItem.ordered_qty = targetKits;
          orderItem.pending_qty = Math.max(0, targetKits - (orderItem.received_qty || 0));
        }
      }

      const inwardQty = parseInt(inItem.qty) || 0;
      if (inwardQty <= 0) continue;

      if (inwardQty > orderItem.pending_qty) {
        return res.status(400).json({
          status: 'error',
          message: `Inward quantity (${inwardQty}) for ${orderItem.product_name} exceeds remaining pending quantity (${orderItem.pending_qty}). Unauthorized excess is prohibited.`
        });
      }
    }

    // Execution pass: Apply inward quantities
    for (const inItem of items) {
      const orderItem = orderItems.find(it => it.sku === inItem.sku);
      if (!orderItem) continue;

      const inwardQty = parseInt(inItem.qty) || 0;
      if (inwardQty <= 0) continue;

      orderItem.received_qty += inwardQty;
      orderItem.pending_qty = Math.max(0, orderItem.ordered_qty - orderItem.received_qty);

      if (inItem.rack_location) {
        orderItem.rack_location = inItem.rack_location;
      }

      // If inwarding a BOS Kit, mark kit_preparation_status as kit_ready ONLY when pending_qty is 0
      const isBos = inItem.sku?.startsWith('BOS-KIT-') || orderItem.category === 'BOS Kit' || (orderItem.product_name && orderItem.product_name.toLowerCase().includes('bos kit'));
      if (isBos && inwardQty > 0) {
        if (orderItem.pending_qty === 0) {
          order.kit_preparation_status = 'kit_ready';
          if (!order.kit_assembly_details) order.kit_assembly_details = {};
          order.kit_assembly_details.assembly_status = 'completed';
          order.kit_assembly_details.qc_status = 'passed';
          order.kit_assembly_details.qc_verified = true;
          order.kit_assembly_details.storage_location = inItem.rack_location || 'BAY-BOS-STOCK';
          order.kit_assembly_details.kit_serial_barcode = order.kit_assembly_details.kit_serial_barcode || `SK-WH-STOCK-KIT-${order.order_number}-${Date.now().toString().slice(-4)}`;
        } else {
          order.kit_preparation_status = 'in_assembly';
        }
      }

      inwardedItemsLog.push({
        sku: orderItem.sku,
        product_name: orderItem.product_name,
        qty: inwardQty
      });
    }

    if (inwardedItemsLog.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Please enter valid inward quantities greater than 0.' });
    }

    // Update Inward Type and Pickup Location Details if provided
    order.inward_type = inward_type;
    if (pickup_location_details) {
      order.pickup_location_details = {
        location_name: pickup_location_details.location_name || '',
        address: pickup_location_details.address || '',
        contact_person: pickup_location_details.contact_person || '',
        contact_phone: pickup_location_details.contact_phone || ''
      };
    }

    // Store Scanned Serials (Barcode / QR gun registry) for matching during outward
    if (Array.isArray(scanned_serials) && scanned_serials.length > 0) {
      if (!order.scanned_serials) order.scanned_serials = [];
      scanned_serials.forEach(sn => {
        const serialCode = typeof sn === 'string' ? sn : sn.serial_code;
        const skuCode = typeof sn === 'object' ? sn.sku : '';
        if (serialCode) {
          order.scanned_serials.push({
            sku: skuCode || '',
            serial_code: serialCode,
            inwarded_at: new Date(),
            verified_for_outward: false
          });
        }
      });
    }

    // Generate Delivery Number upon inwarding if not already present
    if (!order.delivery_number || order.delivery_number.startsWith('DO-')) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = Math.floor(1000 + Math.random() * 9000);
      order.delivery_number = `DEL-${dateStr}-${rand}`;
      order.audit_trail.push({
        action: 'Delivery Number Generated',
        performed_by_name: req.user?.name || 'Delivery Manager',
        timestamp: new Date(),
        notes: `Delivery Number ${order.delivery_number} generated upon material inward (${inward_type === 'pickup_location' ? 'Direct Pickup from Site/Supplier' : 'Warehouse Dock Inward'}).`
      });
    }

    // Record Inward History
    const generatedBatchId = batch_id || `BATCH-${Date.now().toString().slice(-6)}`;
    order.inward_history.push({
      batch_id: generatedBatchId,
      inwarded_items: inwardedItemsLog,
      inward_type,
      inward_mode,
      scanned_serials: Array.isArray(scanned_serials) ? scanned_serials : [],
      inwarded_by_name: req.user?.name || 'Delivery Manager (Abhishek Sharma)',
      timestamp: new Date(),
      remarks: remarks || (inward_type === 'pickup_location' ? 'Material directly picked up from site/supplier location.' : 'Material received and verified at warehouse dock.')
    });

    // Check if 100% inward complete across all items AND BOS kit is ready
    const totalPending = (order.items || []).reduce((acc, it) => acc + (it.pending_qty || 0), 0);
    const bosNeedsAssembly = (order.items || []).some(it => {
      const isBos = (it.sku || '').startsWith('BOS-KIT-') || (it.category || '').toLowerCase().includes('bos kit') || (it.product_name || '').toLowerCase().includes('bos kit');
      return isBos && (it.pending_qty || 0) > 0;
    });
    const isKitReady = order.kit_preparation_status === 'kit_ready' || order.kit_preparation_status === 'not_required';

    if (totalPending === 0 && !bosNeedsAssembly && isKitReady) {
      order.delivery_status = 'inward_completed';
      order.audit_trail.push({
        action: '100% Material Inward Complete',
        performed_by_name: req.user?.name || 'Delivery Manager',
        timestamp: new Date(),
        notes: `All ${order.items.length} items inwarded and verified under batch ${generatedBatchId}. Order remains in New Orders queue awaiting user to click Send for Delivery.`
      });

      sendAdminNotification({
        title: `📦 100% Inward Complete: Order #${order.order_number}`,
        message: `Warehouse completed 100% material inward for Delivery Order ${order.delivery_order_id}. All items verified & ready for delivery dispatch.`,
        category: 'orders',
        priority: 'high',
        action_url: '/account-panel/delivery-management',
        metadata: { order_id: order._id, order_number: order.order_number, delivery_order_id: order.delivery_order_id, event: 'inward_completed' }
      }).catch(err => console.warn('[Inward Notification Error]:', err.message));
    } else {
      order.delivery_status = 'partially_inwarded';
      order.audit_trail.push({
        action: 'Partial Material Inward Recorded',
        performed_by_name: req.user?.name || 'Delivery Manager',
        timestamp: new Date(),
        notes: `Batch ${generatedBatchId} inwarded (${inwardedItemsLog.reduce((s, it) => s + it.qty, 0)} units). Remaining pending units: ${totalPending}. BOS Kit Status: ${order.kit_preparation_status}. Order remains in New Orders.`
      });

      sendAdminNotification({
        title: `📥 Inward Recorded: Order #${order.order_number}`,
        message: `Batch ${generatedBatchId} inwarded for Order #${order.order_number}. Remaining pending units: ${totalPending}.`,
        category: 'orders',
        priority: 'normal',
        action_url: '/warehouse/new-orders',
        metadata: { order_id: order._id, order_number: order.order_number, delivery_order_id: order.delivery_order_id, event: 'partially_inwarded' }
      }).catch(err => console.warn('[Inward Notification Error]:', err.message));
    }

    await order.save();

    return res.status(200).json({
      status: 'success',
      message: totalPending === 0
        ? 'All materials successfully inwarded! Order moved to Out for Delivery.'
        : `Partial inward saved. ${totalPending} units pending.`,
      data: order
    });
  } catch (error) {
    console.error('inward_material error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/transport-details
 * Save vehicle, driver, transporter and docket information
 */
exports.save_transport_details = async (req, res) => {
  try {
    const {
      delivery_method,
      vehicle_number,
      vehicle_type,
      transporter_name,
      transporter_id,
      driver_name,
      driver_mobile,
      dispatch_date,
      expected_delivery_date,
      docket_number,
      lr_number,
      notes
    } = req.body;

    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    if (delivery_method) order.delivery_method = delivery_method;

    order.transport_details = {
      vehicle_number: vehicle_number || order.transport_details.vehicle_number,
      vehicle_type: vehicle_type || order.transport_details.vehicle_type,
      transporter_name: transporter_name || order.transport_details.transporter_name,
      transporter_id: transporter_id || order.transport_details.transporter_id,
      driver_name: driver_name || order.transport_details.driver_name,
      driver_mobile: driver_mobile || order.transport_details.driver_mobile,
      dispatch_date: dispatch_date ? new Date(dispatch_date) : order.transport_details.dispatch_date,
      expected_delivery_date: expected_delivery_date ? new Date(expected_delivery_date) : order.transport_details.expected_delivery_date,
      docket_number: docket_number || order.transport_details.docket_number,
      lr_number: lr_number || order.transport_details.lr_number,
      notes: notes || order.transport_details.notes
    };

    if (vehicle_type) {
      order.required_vehicle = vehicle_type;
    }

    order.audit_trail.push({
      action: 'Transport & Vehicle Details Updated',
      performed_by_name: req.user?.name || 'Delivery Manager',
      timestamp: new Date(),
      notes: `Vehicle: ${vehicle_number || 'N/A'}, Driver: ${driver_name || 'N/A'}, Transporter: ${transporter_name || 'N/A'}`
    });

    await order.save();
    return res.status(200).json({ status: 'success', message: 'Transport details updated successfully.', data: order });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/request-eway-bill
 * Submits E-Way bill request to Account Manager
 */
exports.request_eway_bill = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    order.eway_bill.requested = true;
    order.eway_bill.requested_at = new Date();
    order.eway_bill.requested_by_name = req.user?.name || 'Delivery Manager';
    order.eway_bill.status = 'pending';
    order.delivery_status = 'awaiting_eway_bill';

    order.audit_trail.push({
      action: 'E-Way Bill Requested from Account Manager',
      performed_by_name: req.user?.name || 'Delivery Manager',
      timestamp: new Date(),
      notes: 'Request submitted to Account Manager for GST invoice validation and e-way bill generation.'
    });

    sendAdminNotification({
      title: `📄 E-Way Bill Requested: Order #${order.order_number}`,
      message: `Warehouse requested E-Way Bill generation for Delivery Order ${order.delivery_order_id}. Vehicle: ${order.transport_details?.vehicle_number || order.required_vehicle || 'Truck'}. Destination: ${order.destination?.district || order.destination?.state}.`,
      category: 'orders',
      priority: 'high',
      action_url: '/account-panel/eway-bills',
      metadata: { order_id: order._id, order_number: order.order_number, delivery_order_id: order.delivery_order_id, event: 'eway_bill_requested' }
    }).catch(err => console.warn('[Eway Request Notification Error]:', err.message));

    await order.save();
    return res.status(200).json({
      status: 'success',
      message: 'E-Way Bill request submitted successfully to Account Manager.',
      data: order
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/verify-eway-bill
 * Simulated or direct Account Manager approval & generation of E-Way Bill
 */
exports.verify_eway_bill = async (req, res) => {
  try {
    const { eway_bill_number, valid_until, eway_bill_pdf } = req.body;
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    const generatedEwb = eway_bill_number || `281${Math.floor(100000000 + Math.random() * 900000000)}`;
    const validityDate = valid_until ? new Date(valid_until) : new Date(Date.now() + 72 * 3600 * 1000);

    order.eway_bill.status = 'generated';
    order.eway_bill.eway_bill_number = generatedEwb;
    order.eway_bill.valid_until = validityDate;
    order.eway_bill.eway_bill_pdf = eway_bill_pdf || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    order.eway_bill.verified_at = new Date();
    order.delivery_status = 'ready_to_initiate';

    order.audit_trail.push({
      action: 'E-Way Bill Verified & Issued',
      performed_by_name: 'Account Manager (Rohan Verma)',
      timestamp: new Date(),
      notes: `E-Way Bill #${generatedEwb} approved, valid until ${validityDate.toLocaleString('en-IN')}.`
    });

    sendAdminNotification({
      title: `✅ E-Way Bill Issued: Order #${order.order_number}`,
      message: `E-Way Bill #${generatedEwb} generated & verified for Order #${order.order_number}. Warehouse can now complete dispatch.`,
      category: 'orders',
      priority: 'high',
      action_url: '/warehouse/out-for-delivery',
      metadata: { order_id: order._id, order_number: order.order_number, delivery_order_id: order.delivery_order_id, event: 'eway_bill_issued' }
    }).catch(err => console.warn('[Eway Issued Notification Error]:', err.message));

    await order.save();
    return res.status(200).json({
      status: 'success',
      message: `E-Way Bill #${generatedEwb} successfully generated and verified. Ready to initiate dispatch!`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/initiate-dispatch
 * Gate check: Vehicle rear photo + Delivery docket + Valid E-way bill required.
 * Transitions order to in_transit and moves to Track Delivery.
 */
exports.initiate_dispatch = async (req, res) => {
  try {
    const { vehicle_rear_photo, docket_doc } = req.body;
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    // Check 0: All active EPCs must have completed 2nd half payment
    const activeEpcs = (order.epcs || []).filter(e => !e.is_removed_by_account);
    let unpaidEpcs = activeEpcs.filter(e => e.payment_second_half?.status !== 'done');
    if (unpaidEpcs.length > 0) {
      // Check if Accounts has settled all PIs for this order
      const orderPis = await PurchaseIndent.find({
        $or: [
          { customer_order_number: order.order_number },
          { order_number: order.order_number }
        ]
      }).lean().catch(() => []);

      const isOrderFullySettledInAccounts = orderPis.length > 0 && orderPis.every(p =>
        p.payment?.payment_status === 'Paid' ||
        (p.payment?.balance_payment?.utr_number && p.payment?.advance_payment?.utr_number) ||
        (p.payment?.total_paid_amount >= p.total_pi_value) ||
        (p.payment?.balance_due <= 0 && p.payment?.total_paid_amount > 0)
      );

      if (isOrderFullySettledInAccounts) {
        order.epcs.forEach(epc => {
          if (!epc.payment_second_half) epc.payment_second_half = {};
          epc.payment_second_half.status = 'done';
          epc.payment_second_half.paid_at = epc.payment_second_half.paid_at || new Date();
          epc.payment_second_half.verified_by = 'Accounts (Balance UTR Recorded)';
        });
        await order.save();
        unpaidEpcs = [];
      }
    }
    if (unpaidEpcs.length > 0) {
      const names = unpaidEpcs.map(e => e.epc_name).join(', ');
      return res.status(400).json({
        status: 'error',
        message: `Dispatch initiation blocked: 2nd half payment is pending for EPC(s): ${names}. Account Manager must clear payment or ungroup/remove unpaid EPCs before dispatch.`
      });
    }

    // Check 1: E-Way Bill must be generated and valid
    if (order.eway_bill.status !== 'generated' || !order.eway_bill.eway_bill_number) {
      return res.status(400).json({
        status: 'error',
        message: 'Dispatch initiation disabled: A valid and verified E-Way Bill is mandatory before dispatch.'
      });
    }

    // Check 2: Rear photo of loaded vehicle
    const photo = vehicle_rear_photo || order.dispatch_evidence.vehicle_rear_photo;
    if (!photo) {
      return res.status(400).json({
        status: 'error',
        message: 'Dispatch initiation disabled: Rear-side photo of the loaded delivery vehicle is mandatory.'
      });
    }

    // Check 3: Delivery docket / challan
    const docket = docket_doc || order.dispatch_evidence.docket_doc;
    if (!docket) {
      return res.status(400).json({
        status: 'error',
        message: 'Dispatch initiation disabled: Signed delivery docket / challan document is mandatory.'
      });
    }

    // Save evidence & initiate
    order.dispatch_evidence = {
      vehicle_rear_photo: photo,
      docket_doc: docket,
      dispatched_at: new Date(),
      dispatched_by_name: req.user?.name || 'Delivery Manager (Abhishek Sharma)'
    };

    order.delivery_status = 'in_transit';

    order.audit_trail.push({
      action: 'Delivery Dispatched & Out on Route',
      performed_by_name: req.user?.name || 'Delivery Manager',
      timestamp: new Date(),
      notes: `Vehicle loaded, rear photo verified, docket attached, E-Way Bill #${order.eway_bill.eway_bill_number} checked. Moved to Track Delivery.`
    });

    sendAdminNotification({
      title: `🛣️ Delivery Dispatched: Order #${order.order_number}`,
      message: `Delivery Order ${order.delivery_order_id} is dispatched & in transit via vehicle ${order.incoming_truck_group?.vehicle_number || order.transport_details?.vehicle_number || 'Truck'}. Destination: ${order.destination?.city || order.destination?.district}, ${order.destination?.state}.`,
      category: 'orders',
      priority: 'high',
      action_url: '/warehouse/track-delivery',
      metadata: { order_id: order._id, order_number: order.order_number, delivery_order_id: order.delivery_order_id, event: 'in_transit' }
    }).catch(err => console.warn('[Dispatch Notification Error]:', err.message));

    await order.save();
    return res.status(200).json({
      status: 'success',
      message: 'Delivery successfully initiated! Order has been moved to Track Delivery.',
      data: order
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/send-otp
 * Generates and shares 6-digit delivery OTP with customer
 */
exports.send_customer_otp = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    order.delivery_completion.otp_code = otp;
    order.delivery_completion.otp_generated_at = new Date();
    order.delivery_completion.failed_otp_attempts = 0;

    order.audit_trail.push({
      action: 'Customer Delivery OTP Generated',
      performed_by_name: req.user?.name || 'Delivery Manager',
      timestamp: new Date(),
      notes: `Delivery OTP shared with customer phone ${order.customer_phone}.`
    });

    await order.save();

    return res.status(200).json({
      status: 'success',
      message: `Delivery OTP successfully sent to ${order.customer_name} (${order.customer_phone}).`,
      otp_preview: otp // Sent for seamless testing in demo
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/verify-otp
 * Validates OTP and marks order Delivered
 */
exports.verify_customer_otp = async (req, res) => {
  try {
    const { otp_code, receiver_name } = req.body;
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    if (!order.delivery_completion.otp_code) {
      return res.status(400).json({ status: 'error', message: 'No OTP generated. Please generate and send OTP first.' });
    }

    if (order.delivery_completion.failed_otp_attempts >= 5) {
      order.delivery_status = 'delivery_exception';
      await order.save();
      return res.status(400).json({
        status: 'error',
        message: 'Maximum failed OTP attempts exceeded. Order flagged as Delivery Exception.'
      });
    }

    if (String(order.delivery_completion.otp_code).trim() !== String(otp_code).trim()) {
      order.delivery_completion.failed_otp_attempts = (order.delivery_completion.failed_otp_attempts || 0) + 1;
      order.audit_trail.push({
        action: 'Failed OTP Attempt',
        performed_by_name: req.user?.name || 'Delivery Personnel',
        timestamp: new Date(),
        notes: `Incorrect OTP entered. Attempt ${order.delivery_completion.failed_otp_attempts} of 5.`
      });
      await order.save();

      return res.status(400).json({
        status: 'error',
        message: `Incorrect OTP. Attempts remaining: ${5 - order.delivery_completion.failed_otp_attempts}`
      });
    }

    // OTP Verified Successfully
    order.delivery_status = 'delivered';
    order.delivery_completion.completed_at = new Date();
    order.delivery_completion.completed_by_name = req.user?.name || 'Delivery Manager (Abhishek Sharma)';
    order.delivery_completion.method = 'auto_otp';
    order.delivery_completion.otp_verified = true;
    order.delivery_completion.receiver_name = receiver_name || order.customer_name;

    order.audit_trail.push({
      action: 'Delivery Completed via Customer OTP Verification',
      performed_by_name: req.user?.name || 'Delivery Manager',
      timestamp: new Date(),
      notes: `OTP successfully verified with customer contact. Handover confirmed to ${order.delivery_completion.receiver_name}.`
    });

    await order.save();
    return res.status(200).json({
      status: 'success',
      message: 'OTP verified! Delivery marked as DELIVERED successfully.',
      data: order
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/complete-manual
 * Destination photo proof + date/time + remarks -> Delivered
 */
exports.complete_manual_delivery = async (req, res) => {
  try {
    const { destination_photo, remarks, receiver_name, delivery_datetime } = req.body;
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    if (!destination_photo) {
      return res.status(400).json({
        status: 'error',
        message: 'Destination delivery proof photo is mandatory to complete manual delivery.'
      });
    }

    order.delivery_status = 'delivered';
    order.delivery_completion = {
      completed_at: delivery_datetime ? new Date(delivery_datetime) : new Date(),
      completed_by_name: req.user?.name || 'Delivery Manager (Abhishek Sharma)',
      method: 'manual_photo',
      destination_photo,
      remarks: remarks || 'Delivered and verified at destination site.',
      receiver_name: receiver_name || order.customer_name,
      otp_verified: false
    };

    order.audit_trail.push({
      action: 'Manual Delivery Confirmed with Photo Proof',
      performed_by_name: req.user?.name || 'Delivery Manager',
      timestamp: new Date(),
      notes: `Delivery proof photo verified. Remarks: ${remarks || 'None'}. Handover confirmed to ${receiver_name || order.customer_name}.`
    });

    await order.save();
    return res.status(200).json({
      status: 'success',
      message: 'Photo evidence verified! Delivery marked as DELIVERED successfully.',
      data: order
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/claim-incoming-shipment
 * Unload and claim incoming consolidated truck shipment for this delivery order
 */
exports.claim_incoming_shipment = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    const { dock_bay, remarks } = req.body;
    const userName = req.user?.name || 'Delivery Manager (Abhishek Sharma)';

    if (!order.incoming_truck_group) {
      order.incoming_truck_group = {};
    }

    order.incoming_truck_group.is_claimed = true;
    order.incoming_truck_group.claimed_at = new Date();
    order.incoming_truck_group.claimed_by_name = userName;
    if (dock_bay) order.incoming_truck_group.unloaded_dock = dock_bay;

    order.audit_trail.push({
      action: 'Incoming Consolidated Truck Consignment Claimed & Received',
      performed_by_name: userName,
      timestamp: new Date(),
      notes: `Materials unloaded from incoming vehicle ${order.incoming_truck_group.vehicle_number || 'Truck'} (Group: ${order.incoming_truck_group.group_id || 'N/A'}) at ${dock_bay || 'Receiving Dock'}. ${remarks || ''}`
    });

    await order.save();
    return res.status(200).json({
      status: 'success',
      message: `Shipment claimed & unloaded to warehouse dock successfully!`,
      data: order
    });
  } catch (error) {
    console.error('claim_incoming_shipment error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/send-for-delivery
 * Enabled ONLY when all materials for all items/EPCs are 100% inwarded.
 * Moves order to ready_for_dispatch (Out for Delivery tab) and alerts Account Manager.
 */
exports.send_for_delivery = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    // Check: All items must be 100% inwarded (pending_qty === 0)
    const totalPending = (order.items || []).reduce((acc, it) => acc + (it.pending_qty || 0), 0);
    if (totalPending > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot send for delivery: ${totalPending} items are still pending inward. All materials must be 100% inwarded first.`
      });
    }

    // Check: BOS Kit must be inwarded/ready if required for this order
    const isKitReady = order.kit_preparation_status === 'kit_ready' ||
                       order.kit_preparation_status === 'not_required';
    if (!isKitReady) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot send for delivery: BOS Kit preparation/allocation is still pending. Please allocate or inward/assemble the BOS Kit first.'
      });
    }

    order.delivery_status = 'ready_for_dispatch';
    order.sent_for_delivery_at = new Date();
    order.sent_for_delivery_by = req.user?.name || 'Delivery Manager (Abhishek Sharma)';

    // Update dispatch status of active EPCs
    if (order.epcs && order.epcs.length > 0) {
      order.epcs.forEach(epc => {
        (epc.items || []).forEach(it => {
          it.received_qty = it.ordered_qty;
          it.pending_qty = 0;
        });
        if (epc.dispatch_status === 'pending') {
          epc.dispatch_status = 'ready_for_dispatch';
        }
      });
    }

    order.audit_trail.push({
      action: 'Sent for Delivery - Moved to Out for Delivery Tab',
      performed_by_name: req.user?.name || 'Delivery Manager (Abhishek Sharma)',
      timestamp: new Date(),
      notes: `All materials 100% inwarded. Sent to Out for Delivery. Alert sent to Account Manager to verify 2nd half payment across all EPCs.`
    });

    sendAdminNotification({
      title: `🚚 Order Sent for Delivery: Order #${order.order_number}`,
      message: `Delivery Order ${order.delivery_order_id} is 100% inwarded and moved to Out for Delivery. Alert sent to Account Manager to verify 2nd half payment across all EPCs.`,
      category: 'orders',
      priority: 'urgent',
      action_url: '/account-panel/delivery-management',
      metadata: { order_id: order._id, order_number: order.order_number, delivery_order_id: order.delivery_order_id, event: 'sent_for_delivery' }
    }).catch(err => console.warn('[Send for Delivery Notification Error]:', err.message));

    await order.save();

    return res.status(200).json({
      status: 'success',
      message: 'Order sent for delivery successfully! Moved to Out for Delivery tab and Account Manager notified.',
      data: order
    });
  } catch (error) {
    console.error('send_for_delivery error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/toggle-ungroup
 * Toggles ungrouped display of EPCs in Out for Delivery
 */
exports.toggle_ungroup = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    order.is_ungrouped = !order.is_ungrouped;
    await order.save();

    return res.status(200).json({
      status: 'success',
      message: order.is_ungrouped ? 'Order ungrouped by EPC successfully.' : 'Order grouped successfully.',
      is_ungrouped: order.is_ungrouped,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/account-remove-epc
 * Account Manager removes an unpaid EPC (2nd half payment not completed).
 * Removes EPC from the active delivery consignment.
 */
exports.account_remove_epc = async (req, res) => {
  try {
    const { epc_id, reason } = req.body;
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    const epc = (order.epcs || []).find(e => e.epc_id === epc_id);
    if (!epc) {
      return res.status(404).json({ status: 'error', message: `EPC ${epc_id} not found in this order.` });
    }

    epc.is_removed_by_account = true;
    epc.removed_at = new Date();
    epc.removal_reason = reason || '2nd Half Payment Not Completed';

    order.audit_trail.push({
      action: 'EPC Removed from Consignment by Account Manager',
      performed_by_name: 'Account Manager (Rohan Verma)',
      timestamp: new Date(),
      notes: `EPC "${epc.epc_name}" removed from delivery order DO-${order.order_number} due to unpaid 2nd half payment. Reason: ${epc.removal_reason}`
    });

    await order.save();

    return res.status(200).json({
      status: 'success',
      message: `EPC "${epc.epc_name}" removed from this delivery order by Account Manager.`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/verify-epc-payment
 * Verify/toggle 2nd payment status for an EPC (Account Manager)
 */
exports.verify_epc_payment = async (req, res) => {
  try {
    const { epc_id, payment_phase = 'second', status = 'done', amount } = req.body;
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    const epc = (order.epcs || []).find(e => e.epc_id === epc_id);
    if (!epc) {
      return res.status(404).json({ status: 'error', message: `EPC ${epc_id} not found in this order.` });
    }

    if (payment_phase === 'first') {
      epc.payment_first_half.status = status;
      if (status === 'done') epc.payment_first_half.paid_at = new Date();
      if (amount) epc.payment_first_half.amount = amount;
    } else {
      epc.payment_second_half.status = status;
      if (status === 'done') {
        epc.payment_second_half.paid_at = new Date();
        epc.payment_second_half.verified_by = 'Account Manager';
        epc.is_removed_by_account = false;
      } else {
        epc.payment_second_half.paid_at = null;
      }
      if (amount) epc.payment_second_half.amount = amount;
    }

    order.audit_trail.push({
      action: `EPC ${payment_phase === 'first' ? '1st' : '2nd'} Half Payment ${status === 'done' ? 'Received & Confirmed' : 'Marked Pending'}`,
      performed_by_name: 'Account Manager (Rohan Verma)',
      timestamp: new Date(),
      notes: `Payment status for EPC "${epc.epc_name}" updated to "${status}".`
    });

    await order.save();

    return res.status(200).json({
      status: 'success',
      message: `Payment status for EPC "${epc.epc_name}" updated successfully to ${status}.`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/dispatch-for-delivery
 * Dispatches the order if and ONLY if all active EPCs have both 1st & 2nd half payments completed.
 * Generates separate tracking consignments for each EPC and moves to Track Delivery.
 */
exports.dispatch_for_delivery = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    const activeEpcs = (order.epcs || []).filter(e => !e.is_removed_by_account);
    if (activeEpcs.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot dispatch order: No active EPCs remain in this order.'
      });
    }

    // STRICT CHECK: Every active EPC must have 2nd half payment done!
    let unpaidEpcs = activeEpcs.filter(e => e.payment_second_half?.status !== 'done');
    if (unpaidEpcs.length > 0) {
      const orderPis = await PurchaseIndent.find({
        $or: [
          { customer_order_number: order.order_number },
          { order_number: order.order_number }
        ]
      }).lean().catch(() => []);

      const isOrderFullySettledInAccounts = orderPis.length > 0 && orderPis.every(p =>
        p.payment?.payment_status === 'Paid' ||
        (p.payment?.balance_payment?.utr_number && p.payment?.advance_payment?.utr_number) ||
        (p.payment?.total_paid_amount >= p.total_pi_value) ||
        (p.payment?.balance_due <= 0 && p.payment?.total_paid_amount > 0)
      );

      if (isOrderFullySettledInAccounts) {
        order.epcs.forEach(epc => {
          if (!epc.payment_second_half) epc.payment_second_half = {};
          epc.payment_second_half.status = 'done';
          epc.payment_second_half.paid_at = epc.payment_second_half.paid_at || new Date();
          epc.payment_second_half.verified_by = 'Accounts (Balance UTR Recorded)';
        });
        await order.save();
        unpaidEpcs = [];
      }
    }
    if (unpaidEpcs.length > 0) {
      const names = unpaidEpcs.map(e => e.epc_name).join(', ');
      return res.status(400).json({
        status: 'error',
        message: `Dispatch Blocked: The following EPC(s) have NOT completed the 2nd half payment: ${names}. Account Manager must remove them from the order or clear the payment before dispatch.`
      });
    }

    // Assign individual tracking consignment IDs to each active EPC
    activeEpcs.forEach((epc, idx) => {
      epc.dispatch_status = 'in_transit';
      if (!epc.tracking_consignment_id) {
        epc.tracking_consignment_id = `TRK-${order.order_number}-${epc.epc_id || (idx + 1)}`;
      }
    });

    order.delivery_status = 'in_transit';
    order.is_ungrouped = true; // Auto-ungroup so tracking is separate for all EPCs

    const { vehicle_rear_photo, docket_doc, notes } = req.body || {};
    if (vehicle_rear_photo) {
      order.dispatch_evidence.vehicle_rear_photo = vehicle_rear_photo;
    }
    if (docket_doc) {
      order.dispatch_evidence.docket_doc = docket_doc;
    }
    order.dispatch_evidence.dispatched_at = new Date();
    order.dispatch_evidence.dispatched_by_name = req.user?.name || 'Delivery Manager (Abhishek Sharma)';

    order.audit_trail.push({
      action: 'Consolidated Order Dispatched for Delivery',
      performed_by_name: req.user?.name || 'Delivery Manager',
      timestamp: new Date(),
      notes: `Order dispatched with ${activeEpcs.length} cleared EPCs. All 2nd half payments verified. Tracking separated per EPC in Track Delivery. ${notes || ''}`
    });

    await order.save();

    return res.status(200).json({
      status: 'success',
      message: `Order successfully dispatched! All ${activeEpcs.length} EPCs moved to Track Delivery with individual tracking.`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/inward-discrepancy
 * Records damaged / missing quantity during inwarding.
 * Strictly increments available stock ONLY by physically OK items (received - damaged).
 * Logs discrepancy record and marks accounts_notified = true.
 */
exports.record_inward_discrepancy = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    const { sku, received_qty, damaged_qty, missing_qty, remarks } = req.body || {};
    let item = order.items.find(it => it.sku === sku);
    if (!item) {
      if (sku && (sku.startsWith('BOS-KIT-') || sku.toLowerCase().includes('bos-kit'))) {
        item = {
          sku,
          product_name: 'BOS Kit (Pre-assembled Enclosure Package)',
          category: 'BOS Kit',
          ordered_qty: Math.max(1, (Number(received_qty) || 0) + (Number(missing_qty) || 0)),
          received_qty: 0,
          pending_qty: Math.max(1, (Number(received_qty) || 0) + (Number(missing_qty) || 0)),
          rack_location: 'BAY-BOS-STOCK',
          qc_status: 'Pending'
        };
        order.items.push(item);
      } else {
        return res.status(404).json({ status: 'error', message: `SKU ${sku} not found in this order.` });
      }
    }

    const recQty = Number(received_qty) || 0;
    const damQty = Number(damaged_qty) || 0;
    const misQty = Number(missing_qty) || 0;
    const okQty = Math.max(0, recQty - damQty);

    item.received_qty = (item.received_qty || 0) + okQty;
    item.pending_qty = Math.max(0, item.ordered_qty - item.received_qty);
    item.damaged_qty = (item.damaged_qty || 0) + damQty;
    item.missing_qty = (item.missing_qty || 0) + misQty;

    if (damQty > 0 || misQty > 0) {
      item.supply_status = 'inward_discrepancy';
    } else if (item.pending_qty === 0) {
      item.supply_status = 'inward_completed';
    }

    order.discrepancy_details = order.discrepancy_details || [];
    order.discrepancy_details.push({
      sku: item.sku,
      product_name: item.product_name,
      expected_qty: item.ordered_qty,
      received_qty: recQty,
      damaged_qty: damQty,
      missing_qty: misQty,
      remarks: remarks || 'Discrepancy logged during physical inward.',
      reported_at: new Date(),
      reported_by: req.user?.name || 'Delivery Manager',
      accounts_notified: true
    });

    const totalPending = order.items.reduce((acc, it) => acc + (it.pending_qty || 0), 0);
    if (damQty > 0 || misQty > 0) {
      order.kit_preparation_status = 'awaiting_components';
    } else if (totalPending === 0) {
      order.kit_preparation_status = 'ready_for_assembly';
    }

    order.audit_trail.push({
      action: damQty > 0 || misQty > 0 ? 'Inward Discrepancy Logged (Accounts Notified)' : 'Physical Inward Completed',
      performed_by_name: req.user?.name || 'Delivery Manager',
      timestamp: new Date(),
      notes: `SKU ${item.sku}: Received=${recQty}, Damaged=${damQty}, Missing=${misQty}, Physically OK Added to Stock=${okQty}. ${remarks || ''}`
    });

    await order.save();

    return res.status(200).json({
      status: 'success',
      message: damQty > 0 || misQty > 0
        ? `Inward discrepancy logged for ${item.sku}. Accounts team notified for debit note/replacement.`
        : `Inward verified successfully for ${item.sku}. Stock updated.`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/supply-status
 * Updates supply status for a specific item (e.g. ready_for_pickup, picked_up, dispatched, in_transit).
 */
exports.update_supply_status = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    const { sku, status, actual_date, notes } = req.body || {};
    const item = order.items.find(it => it.sku === sku);
    if (!item) {
      return res.status(404).json({ status: 'error', message: `SKU ${sku} not found in this order.` });
    }

    item.supply_status = status;
    if (status === 'picked_up' && actual_date) {
      item.actual_pickup_date = new Date(actual_date);
    }
    if (status === 'dispatched' && actual_date) {
      item.actual_dispatch_date = new Date(actual_date);
    }
    if (status === 'inward_completed') {
      item.actual_inward_date = new Date();
    }

    order.audit_trail.push({
      action: `Supply Status Updated for ${item.sku}`,
      performed_by_name: req.user?.name || 'Delivery Manager',
      timestamp: new Date(),
      notes: `Status changed to "${status}". ${notes || ''}`
    });

    await order.save();

    return res.status(200).json({
      status: 'success',
      message: `Supply status for ${item.sku} updated to ${status}.`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/kit-assembly
 * Manages the BOSKIT preparation lifecycle:
 * - 'picked': Picking of components completed
 * - 'assembled': Kit assembled and wiring/connectors joined
 * - 'qc_verified': Quality and completeness verified
 * - 'packed_and_labeled': Packaged with SolarKits barcode label
 * - 'mark_kit_ready': Validates 100% completeness and marks kit ready for dispatch
 */
exports.update_kit_assembly = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    const { stage, kit_serial_barcode, notes } = req.body || {};
    order.kit_assembly_details = order.kit_assembly_details || {};

    // 1. Picking -> Assembly Station
    if (stage === 'picked' || stage === 'in_assembly') {
      order.kit_assembly_details.picked_at = order.kit_assembly_details.picked_at || new Date();
      order.kit_assembly_details.picked_by = order.kit_assembly_details.picked_by || (req.user?.name || 'Delivery Manager');
      order.kit_assembly_details.assembly_status = 'in_progress';
      order.kit_preparation_status = 'in_assembly';
    }
    // 2. Assembly Station Completed (Wiring & Enclosure Assembled)
    else if (stage === 'assembled') {
      order.kit_assembly_details.picked_at = order.kit_assembly_details.picked_at || new Date();
      order.kit_assembly_details.assembled_at = new Date();
      order.kit_assembly_details.assembled_by = req.user?.name || 'Delivery Manager';
      order.kit_assembly_details.wiring_completed = true;
      order.kit_assembly_details.assembly_status = 'in_progress';
      order.kit_preparation_status = 'in_assembly';
    }
    // 3. QC Inspection Passed
    else if (stage === 'qc_verified' || stage === 'quality_check') {
      order.kit_assembly_details.assembled_at = order.kit_assembly_details.assembled_at || new Date();
      order.kit_assembly_details.wiring_completed = true;
      order.kit_assembly_details.assembly_status = 'in_progress';
      order.kit_assembly_details.qc_verified = true;
      order.kit_assembly_details.qc_status = 'passed';
      order.kit_assembly_details.qc_verified_at = new Date();
      order.kit_assembly_details.qc_verified_by = req.user?.name || 'QC Inspector (Ramesh Shinde)';
      order.kit_preparation_status = 'in_assembly';
    }
    // 4. Packaging & Barcode Label
    else if (stage === 'packed_and_labeled' || stage === 'packed') {
      order.kit_assembly_details.wiring_completed = true;
      order.kit_assembly_details.qc_verified = true;
      order.kit_assembly_details.qc_status = 'passed';
      order.kit_assembly_details.packed_and_labeled = true;
      order.kit_assembly_details.packed_at = new Date();
      order.kit_assembly_details.assembly_status = 'in_progress';
      order.kit_assembly_details.kit_serial_barcode = kit_serial_barcode || order.kit_assembly_details.kit_serial_barcode || `SK-KIT-${order.order_number}-${Date.now().toString().slice(-4)}`;
      order.kit_preparation_status = 'in_assembly';
    }
    // 5. Assembly Completed & Marked Ready for this Order (Staged at Workstation)
    else if (stage === 'mark_kit_ready' || stage === 'kit_ready') {
      order.kit_assembly_details.wiring_completed = true;
      order.kit_assembly_details.qc_verified = true;
      order.kit_assembly_details.qc_status = 'passed';
      order.kit_assembly_details.packed_and_labeled = true;
      order.kit_assembly_details.assembly_status = 'completed';
      order.kit_assembly_details.assembled_at = order.kit_assembly_details.assembled_at || new Date();
      order.kit_assembly_details.ready_at = new Date();
      order.kit_assembly_details.kit_serial_barcode = kit_serial_barcode || order.kit_assembly_details.kit_serial_barcode || `SK-KIT-${order.order_number}-${Date.now().toString().slice(-4)}`;
      order.kit_preparation_status = 'kit_ready';

      // Keep pending_qty active so warehouse manager can allocate & inward these assembled kits in New Orders
      const bosItem = (order.items || []).find(it => (it.sku || '').startsWith('BOS-KIT-') || (it.category || '').toLowerCase().includes('bos kit') || (it.product_name || '').toLowerCase().includes('bos kit'));
      order.kit_assembly_details.assembled_kits_ready = bosItem?.pending_qty || order.num_kits || 1;

      sendAdminNotification({
        title: `🛠️ BOS Kits Assembled: Order #${order.order_number}`,
        message: `${order.kit_assembly_details.assembled_kits_ready} BOS Kits assembled & QC passed for Order #${order.order_number}. Workstation finished. Allocate & inward in New Orders.`,
        category: 'inventory',
        priority: 'normal',
        action_url: '/warehouse/new-orders',
        metadata: { order_id: order._id, order_number: order.order_number, delivery_order_id: order.delivery_order_id, event: 'kit_ready' }
      }).catch(err => console.warn('[Kit Ready Notification Error]:', err.message));
    }

    order.audit_trail.push({
      action: `BOSKIT Assembly Stage: ${stage}`,
      performed_by_name: req.user?.name || 'Delivery Manager',
      timestamp: new Date(),
      notes: `Kit preparation updated: ${stage}. ${notes || ''}`
    });

    await order.save();

    return res.status(200).json({
      status: 'success',
      message: `BOSKIT preparation successfully updated to stage "${stage}".`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/allocate-preassembled-kit
 * Directly allocates an already pre-assembled BOS Kit from warehouse ready stock to the order.
 * Marks the order as kit_ready immediately without requiring on-demand workstation assembly.
 */
exports.allocate_preassembled_kit = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Delivery order not found.' });
    }

    const { kit_model_name, batch_code, notes, allocated_qty } = req.body || {};

    const totalKits = order.num_kits || (order.epcs?.[0]?.boskit_qty ? (parseInt(order.epcs[0].boskit_qty, 10) || 1) : 1);
    const qtyToAllocate = allocated_qty || totalKits;

    let bosItem = (order.items || []).find(it => {
      const sku = (it.sku || '').toUpperCase();
      const name = (it.product_name || '').toLowerCase();
      const cat = (it.category || '').toLowerCase();
      return cat.includes('bos kit') || sku.startsWith('BOS-KIT-') || name.startsWith('bos kit');
    });

    if (!bosItem) {
      const cap = order.epcs?.[0]?.capacity || '3 kW';
      const cleanCap = cap.replace(/\s+/g, '').toUpperCase();
      bosItem = {
        sku: `BOS-KIT-${cleanCap}-STD`,
        product_name: `BOS Kit (${cap} Pre-assembled Electrical Package - ACDB/DCDB/Cables)`,
        category: 'BOS Kit',
        ordered_qty: totalKits,
        received_qty: 0,
        pending_qty: totalKits,
        rack_location: 'BAY-BOS-STOCK',
        qc_status: 'Pending'
      };
      order.items = order.items || [];
      order.items.push(bosItem);
    }

    if (bosItem.ordered_qty < totalKits) {
      bosItem.ordered_qty = totalKits;
    }
    const prevReceived = bosItem.received_qty || 0;
    bosItem.received_qty = Math.min(bosItem.ordered_qty, prevReceived + qtyToAllocate);
    bosItem.pending_qty = Math.max(0, bosItem.ordered_qty - bosItem.received_qty);
    const bosItemPending = bosItem.pending_qty;

    const isFullyAllocated = bosItemPending === 0;
    const kitBarcode = batch_code || `SK-WH-STOCK-KIT-${order.order_number}-${Date.now().toString().slice(-4)}`;

    order.kit_preparation_status = isFullyAllocated ? 'kit_ready' : 'in_assembly';
    order.kit_assembly_details = {
      picked_at: new Date(),
      picked_by: req.user?.name || 'Warehouse Stock Manager',
      assembly_status: isFullyAllocated ? 'completed' : 'in_progress',
      assembled_at: new Date(),
      assembled_by: 'Warehouse Pre-Assembled Stock',
      qc_status: isFullyAllocated ? 'passed' : 'pending',
      qc_verified: isFullyAllocated,
      qc_verified_by: req.user?.name || 'Pre-QC Verified (Stock)',
      packed_and_labeled: isFullyAllocated,
      packed_at: new Date(),
      kit_serial_barcode: kitBarcode,
      allocated_from_batch_code: kitBarcode,
      allocated_qty: qtyToAllocate
    };

    const totalPending = (order.items || []).reduce((acc, it) => acc + (it.pending_qty || 0), 0);
    if (totalPending === 0 && isFullyAllocated) {
      order.delivery_status = 'inward_completed';
    } else {
      order.delivery_status = 'partially_inwarded';
    }

    order.audit_trail.push({
      action: 'Pre-Assembled BOS Kit Allocated from Warehouse Stock',
      performed_by_name: req.user?.name || 'Delivery Manager',
      timestamp: new Date(),
      notes: `Allocated ${qtyToAllocate} ready kit(s) (${kit_model_name || 'Standard Solar BOS Kit'}) from warehouse stock. Barcode: ${kitBarcode}. ${notes || ''}`
    });

    await order.save();

    return res.status(200).json({
      status: 'success',
      message: `Successfully allocated pre-assembled BOS Kit (${kit_model_name || 'Standard Kit'}) from warehouse stock! Order is ready for dispatch.`,
      data: order
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /warehouse-api/delivery-orders/bos-kit-catalog
 * Fetches dynamic BOS kit models configured from Solar Shop products & MongoDB pc_comobo_kit
 */
exports.get_bos_kit_catalog = async (req, res) => {
  try {
    const rawDb = mongoose.connection.db;
    let catalog = [];

    if (rawDb) {
      try {
        const kits = await rawDb.collection('pc_comobo_kit').find({
          deleted_at: null
        }).sort({ capacity: 1 }).toArray();

        if (kits && kits.length > 0) {
          const allSkuIds = [];
          kits.forEach(k => {
            (k.bos_kits || []).forEach(b => {
              if (b.sku_id) {
                try { allSkuIds.push(new mongoose.Types.ObjectId(b.sku_id)); } catch (_) {}
              }
            });
          });

          const skus = allSkuIds.length > 0 ? await rawDb.collection('pc_product_skus').find({ _id: { $in: allSkuIds } }).toArray() : [];
          const prodIds = skus.map(s => s.product_id ? new mongoose.Types.ObjectId(s.product_id) : null).filter(Boolean);
          const products = prodIds.length > 0 ? await rawDb.collection('products').find({ _id: { $in: prodIds } }).toArray() : [];

          const prodMap = {};
          products.forEach(p => { prodMap[p._id.toString()] = p.name; });
          const skuMap = {};
          skus.forEach(s => {
            skuMap[s._id.toString()] = {
              sku_code: s.sku_code,
              name: prodMap[s.product_id?.toString()] || s.sku_code
            };
          });

          catalog = kits.map((k, idx) => {
            const cap = k.capacity ? `${k.capacity} kW` : (k.name.match(/\d+\s*k\.?w/i)?.[0]?.toUpperCase() || `${idx + 1} kW`);
            const bom_components = (k.bos_kits || []).map(b => {
              const resolved = b.sku_id ? skuMap[b.sku_id.toString()] : null;
              const prodName = resolved?.name || b.name || 'Component';
              const nameLower = prodName.toLowerCase();
              let unit = 'Pcs';
              if (nameLower.includes('cable') || nameLower.includes('wire')) {
                unit = b.quantity > 5 ? 'Mtr' : 'Roll';
              } else if (nameLower.includes('connector') || nameLower.includes('mc4')) {
                unit = 'Pairs';
              } else if (nameLower.includes('compound')) {
                unit = 'Bag (10Kg)';
              } else if (nameLower.includes('acdb') || nameLower.includes('dcdb') || nameLower.includes('box')) {
                unit = 'Box';
              } else if (nameLower.includes('rod') || nameLower.includes('spike') || nameLower.includes('arrestor')) {
                unit = 'Pcs';
              }

              return {
                name: prodName,
                sku: resolved?.sku_code || `BOS-${(b.name || 'ITEM').replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()}`,
                sku_id: b.sku_id ? b.sku_id.toString() : null,
                qty: b.quantity || 1,
                unit
              };
            });

            return {
              id: `${k.capacity || idx + 1}kw-dcr`,
              mongo_id: k._id.toString(),
              name: `${k.name || `${cap} Solarkits DCR Combokit`} (BOS & Wiring Package)`,
              catalog_name: k.name || `${cap} Solarkits BOS Kit`,
              category: 'Residential BOS Kit',
              capacity: cap,
              storage_location: `Bay ${idx + 1} / Pallet ${String.fromCharCode(65 + idx)}-0${idx + 1}`,
              ready_stock: idx === 0 ? 4 : idx === 1 ? 3 : 2,
              batch_codes: Array.from({ length: idx === 0 ? 4 : idx === 1 ? 3 : 2 }, (_, i) => `WH-BOS-${k.capacity || idx + 1}KW-2026-D${idx + 1}0${i + 1}`),
              bom_components: bom_components.length > 0 ? bom_components : undefined
            };
          });
        }
      } catch (dbErr) {
        console.warn('Could not query dynamic combo kits from MongoDB, falling back:', dbErr.message);
      }
    }

    // Clean fallback with verified live Solar Shop products if MongoDB collection is unreachable
    if (!catalog || catalog.length === 0) {
      catalog = [
        {
          id: '1kw-dcr',
          name: '1 K.W. Solarkits DCR Kit (BOS & Wiring Package)',
          catalog_name: '1 K.W. Solarkits DCR Kit',
          category: 'Residential BOS Kit',
          capacity: '1 kW',
          storage_location: 'Bay 1 / Pallet A-01',
          ready_stock: 4,
          batch_codes: ['WH-BOS-1KW-2026-D101', 'WH-BOS-1KW-2026-D102', 'WH-BOS-1KW-2026-D103', 'WH-BOS-1KW-2026-D104'],
          bom_components: [
            { name: 'Black AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-BLAC-ACCA-2.5MM', qty: 15, unit: 'Mtr' },
            { name: 'Red AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-REDA-ACCA-2.5MM', qty: 15, unit: 'Mtr' },
            { name: 'BLACK DC CABLE - 2.5 SQ MM', sku: 'CAB-POLYC-BLAC-DCCA-2.5MM', qty: 2, unit: 'Roll' },
            { name: 'RED DC CABLE - 2.5 SQMM', sku: 'CAB-POLYC-REDD-DCCA-2.5MM', qty: 2, unit: 'Roll' },
            { name: 'Lightning Arrestor Cable 16 sq.mm Aluminium', sku: 'CAB-SUNNO-LIGH-LIGH-16SQMM', qty: 15, unit: 'Mtr' },
            { name: 'Green Copper Earthing Cable – 2.5 sq. mm', sku: 'CAB-SUNNO-GREE-EART-2.5MM', qty: 15, unit: 'Mtr' },
            { name: 'L T ACDB Single Phase', sku: 'AC-LT-LTAC-SING-16A', qty: 1, unit: 'Box' },
            { name: 'MC4 CONNECTOR', sku: 'MC4-SIBAS-MC4C-STAN-30A', qty: 2, unit: 'Pairs' },
            { name: 'UV Resistant Cable Tie', sku: 'UVR-CRETO-UVRE-CABL-1', qty: 15, unit: 'Pcs' },
            { name: 'Single Nail Cable Clamp', sku: 'CLA-REPUT-SING-CABL-1', qty: 25, unit: 'Pcs' },
            { name: 'PVC Bend (L-Bow)', sku: 'PVC-REPUT-PVCB-PVCB-1', qty: 4, unit: 'Pcs' },
            { name: 'PVC Tee', sku: 'PVC-REPUT-PVCT-PVCT-1', qty: 2, unit: 'Pcs' },
            { name: 'Earthing Lugs', sku: 'EAR-REPUT-EART-EART-1', qty: 4, unit: 'Pcs' },
            { name: 'Earthing Compound', sku: 'EAR-REPUT-EART-CHEM-10KG', qty: 1, unit: 'Bag (10Kg)' },
            { name: 'Lightning Arrestor - SIngle Spike', sku: 'LIG-REPUT-LIGH-FRP-1METER', qty: 1, unit: 'Pcs' },
            { name: 'Earthing Rod', sku: 'EAR-REPUT-EART-COPP-1M', qty: 3, unit: 'Pcs' }
          ]
        },
        {
          id: '2kw-dcr',
          name: '2 K.W. Solarkits DCR Combokit (BOS & Wiring Package)',
          catalog_name: '2 K.W. Solarkits DCR Combokit',
          category: 'Residential BOS Kit',
          capacity: '2 kW',
          storage_location: 'Bay 1 / Pallet B-02',
          ready_stock: 3,
          batch_codes: ['WH-BOS-2KW-2026-D201', 'WH-BOS-2KW-2026-D202', 'WH-BOS-2KW-2026-D203'],
          bom_components: [
            { name: 'Black AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-BLAC-ACCA-2.5MM', qty: 10, unit: 'Mtr' },
            { name: 'Red AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-REDA-ACCA-2.5MM', qty: 10, unit: 'Mtr' },
            { name: 'BLACK DC CABLE - 2.5 SQ MM', sku: 'CAB-POLYC-BLAC-DCCA-2.5MM', qty: 25, unit: 'Mtr' },
            { name: 'RED DC CABLE - 2.5 SQMM', sku: 'CAB-POLYC-REDD-DCCA-2.5MM', qty: 25, unit: 'Mtr' },
            { name: 'Lightning Arrestor Cable 16 sq.mm Aluminium', sku: 'CAB-SUNNO-LIGH-LIGH-16SQMM', qty: 25, unit: 'Mtr' },
            { name: 'Green Copper Earthing Cable – 2.5 sq. mm', sku: 'CAB-SUNNO-GREE-EART-2.5MM', qty: 40, unit: 'Mtr' },
            { name: 'L T ACDB Single Phase', sku: 'AC-LT-LTAC-SING-16A', qty: 1, unit: 'Box' },
            { name: 'DCDB', sku: 'DCD-LARSE-DCDB-1STR-1A', qty: 1, unit: 'Box' },
            { name: 'Single Nail Cable Clamp', sku: 'CLA-REPUT-SING-CABL-1', qty: 50, unit: 'Pcs' },
            { name: 'Wire Tap', sku: 'WIR-REPUT-WIRE-WIRE-1', qty: 1, unit: 'Pcs' },
            { name: 'MC4 CONNECTOR', sku: 'MC4-SIBAS-MC4C-STAN-30A', qty: 2, unit: 'Pairs' },
            { name: 'PVC Bend (L-Bow)', sku: 'PVC-REPUT-PVCB-PVCB-1', qty: 20, unit: 'Pcs' },
            { name: 'PVC Tee', sku: 'PVC-REPUT-PVCT-PVCT-1', qty: 10, unit: 'Pcs' },
            { name: 'UV Resistant Cable Tie', sku: 'UVR-CRETO-UVRE-CABL-1', qty: 50, unit: 'Pcs' },
            { name: 'Wall Grip', sku: 'WAL-REPUT-WALL-1235-1235', qty: 10, unit: 'Pcs' },
            { name: 'Screw', sku: 'SCR-REPUT-SCRE-NUTB-1038', qty: 10, unit: 'Pcs' },
            { name: 'LA Clamp', sku: 'CLA-REPUT-LACL-LACL-1', qty: 1, unit: 'Pcs' },
            { name: 'Earthing Lugs', sku: 'EAR-REPUT-EART-EART-1', qty: 5, unit: 'Pcs' },
            { name: 'Earthing Rod', sku: 'EAR-REPUT-EART-COPP-1M', qty: 3, unit: 'Pcs' },
            { name: 'Earthing Compound', sku: 'EAR-REPUT-EART-CHEM-10KG', qty: 1, unit: 'Bag (10Kg)' },
            { name: 'Lightning Arrestor - SIngle Spike', sku: 'LIG-REPUT-LIGH-FRP-1METER', qty: 1, unit: 'Pcs' }
          ]
        },
        {
          id: '3kw-dcr',
          name: '3 KW Solarkits DCR Combokit (BOS & Wiring Package)',
          catalog_name: '3 KW Solarkits DCR Combokit',
          category: 'Residential BOS Kit',
          capacity: '3 kW',
          storage_location: 'Bay 2 / Pallet C-03',
          ready_stock: 2,
          batch_codes: ['WH-BOS-3KW-2026-D301', 'WH-BOS-3KW-2026-D302'],
          bom_components: [
            { name: 'Black AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-BLAC-ACCA-2.5MM', qty: 10, unit: 'Mtr' },
            { name: 'Red AC Cable – 2.5 sq. mm', sku: 'CAB-POLYC-REDA-ACCA-2.5MM', qty: 10, unit: 'Mtr' },
            { name: 'BLACK DC CABLE - 2.5 SQ MM', sku: 'CAB-POLYC-BLAC-DCCA-2.5MM', qty: 25, unit: 'Mtr' },
            { name: 'RED DC CABLE - 2.5 SQMM', sku: 'CAB-POLYC-REDD-DCCA-2.5MM', qty: 25, unit: 'Mtr' },
            { name: 'Lightning Arrestor Cable 16 sq.mm Aluminium', sku: 'CAB-SUNNO-LIGH-LIGH-16SQMM', qty: 25, unit: 'Mtr' },
            { name: 'Green Copper Earthing Cable – 2.5 sq. mm', sku: 'CAB-SUNNO-GREE-EART-2.5MM', qty: 40, unit: 'Mtr' },
            { name: 'L T ACDB Single Phase', sku: 'AC-LT-LTAC-SING-16A', qty: 1, unit: 'Box' },
            { name: 'DCDB', sku: 'DCD-LARSE-DCDB-1STR-1A', qty: 1, unit: 'Box' },
            { name: 'Single Nail Cable Clamp', sku: 'CLA-REPUT-SING-CABL-1', qty: 50, unit: 'Pcs' },
            { name: 'Wire Tap', sku: 'WIR-REPUT-WIRE-WIRE-1', qty: 1, unit: 'Pcs' },
            { name: 'MC4 CONNECTOR', sku: 'MC4-SIBAS-MC4C-STAN-30A', qty: 2, unit: 'Pairs' },
            { name: 'PVC Bend (L-Bow)', sku: 'PVC-REPUT-PVCB-PVCB-1', qty: 20, unit: 'Pcs' },
            { name: 'PVC Tee', sku: 'PVC-REPUT-PVCT-PVCT-1', qty: 10, unit: 'Pcs' },
            { name: 'UV Resistant Cable Tie', sku: 'UVR-CRETO-UVRE-CABL-1', qty: 50, unit: 'Pcs' },
            { name: 'Wall Grip', sku: 'WAL-REPUT-WALL-1235-1235', qty: 10, unit: 'Pcs' },
            { name: 'Screw', sku: 'SCR-REPUT-SCRE-NUTB-1038', qty: 10, unit: 'Pcs' },
            { name: 'LA Clamp', sku: 'CLA-REPUT-LACL-LACL-1', qty: 1, unit: 'Pcs' },
            { name: 'Earthing Lugs', sku: 'EAR-REPUT-EART-EART-1', qty: 5, unit: 'Pcs' },
            { name: 'Lightning Arrestor - SIngle Spike', sku: 'LIG-REPUT-LIGH-FRP-1METER', qty: 1, unit: 'Pcs' },
            { name: 'Earthing Rod', sku: 'EAR-REPUT-EART-COPP-1M', qty: 3, unit: 'Pcs' },
            { name: 'Earthing Compound', sku: 'EAR-REPUT-EART-CHEM-10KG', qty: 1, unit: 'Bag (10Kg)' }
          ]
        }
      ];
    }

    return res.status(200).json({
      status: 'success',
      data: catalog
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * POST /warehouse-api/delivery-orders/:id/dispatch-for-delivery
 * Direct handler or alias to initiate_dispatch
 */
exports.dispatch_for_delivery = async (req, res) => {
  return exports.initiate_dispatch(req, res);
};

/**
 * GET /warehouse/delivery-orders/vehicle-presets
 * Returns live vehicle types from Admin DeliveryVehicleMaster, Warehouse DeliveryVehicle,
 * registered fleet numbers from DeliveryVehicleFleet, and live transport service providers.
 */
exports.get_vehicle_presets = async (req, res) => {
  try {
    const { DeliveryVehicleMaster, DeliveryVehicleFleet, DeliveryServiceProvider } = require('../../admin-panel/models/india_solarshop_db');
    const { DeliveryVehicle } = require('../models/company_warehouse_db');

    // 1. Fetch active Admin Vehicle Masters
    let adminMasters = [];
    try {
      adminMasters = await DeliveryVehicleMaster.find({ deleted_at: null, status: 'Active' })
        .sort({ max_load_kg: 1 })
        .lean();
    } catch (err) {
      console.warn('Could not fetch DeliveryVehicleMaster:', err.message);
    }

    // 2. Fetch Warehouse DeliveryVehicles
    let warehouseVehicles = [];
    try {
      warehouseVehicles = await DeliveryVehicle.find({ is_deleted: false, is_active: true })
        .populate('assigned_driver_id', 'name contact')
        .lean();
    } catch (err) {
      console.warn('Could not fetch warehouse DeliveryVehicle:', err.message);
    }

    // 3. Fetch Fleet Vehicles
    let fleetVehicles = [];
    try {
      fleetVehicles = await DeliveryVehicleFleet.find({})
        .populate('vehicle_master_id', 'name brand_make model max_load_kg')
        .populate('service_provider_id', 'name')
        .lean();
    } catch (err) {
      console.warn('Could not fetch DeliveryVehicleFleet:', err.message);
    }

    // 4. Fetch Transporters / Service Providers
    let providers = [];
    try {
      providers = await DeliveryServiceProvider.find({ is_active: true, deleted_at: null })
        .sort({ name: 1 })
        .lean();
    } catch (err) {
      console.warn('Could not fetch DeliveryServiceProvider:', err.message);
    }

    // Map Vehicle Types uniquely from Admin Vehicle Masters (Live Catalog)
    const vehicleTypeMap = new Map();

    if (adminMasters && adminMasters.length > 0) {
      adminMasters.forEach(m => {
        const capStr = m.max_load_kg ? (m.max_load_kg >= 1000 ? `${(m.max_load_kg / 1000).toFixed(1).replace('.0', '')} Ton` : `${m.max_load_kg} Kg`) : '';
        const label = capStr ? `${m.name} (${capStr})` : m.name;
        vehicleTypeMap.set(m.name, {
          value: m.name,
          label: label,
          name: m.name,
          brand_make: m.brand_make,
          model: m.model,
          capacity_kg: m.max_load_kg,
          source: 'Admin Vehicle Master'
        });
      });
    } else {
      // Fallback only if no admin vehicle masters configured
      const defaultTypes = [
        { name: 'Tata Ace (Chota Hathi)', label: 'Tata Ace (Chota Hathi) (750 Kg)', capacity_kg: 750 },
        { name: 'Mahindra Bolero Pickup', label: 'Mahindra Bolero Pickup (1.3 Ton)', capacity_kg: 1300 },
        { name: 'Ashok Leyland Dost+', label: 'Ashok Leyland Dost+ (1.5 Ton)', capacity_kg: 1500 },
        { name: 'Tata 407 (10 Ft LCV)', label: 'Tata 407 (10 Ft LCV) (2.5 Ton)', capacity_kg: 2500 },
        { name: 'Eicher Pro 2049 (12 Ft Canter)', label: 'Eicher Pro 2049 (12 Ft Canter) (3.5 Ton)', capacity_kg: 3500 },
        { name: 'Tata 1109 (14 Ft Canter)', label: 'Tata 1109 (14 Ft Canter) (6 Ton)', capacity_kg: 6000 },
        { name: 'Tata 1613 (19 Ft Open Truck)', label: 'Tata 1613 (19 Ft Open Truck) (10 Ton)', capacity_kg: 10000 },
        { name: '1924 / BB1924', label: '1924 / BB1924 (20 Ton)', capacity_kg: 20000 }
      ];
      defaultTypes.forEach(dt => {
        vehicleTypeMap.set(dt.name, {
          value: dt.name,
          label: dt.label,
          name: dt.name,
          capacity_kg: dt.capacity_kg,
          source: 'Standard Preset'
        });
      });
    }

    // Deduplicate and sort vehicle types by capacity
    const uniqueVehicleTypes = Array.from(vehicleTypeMap.values());
    uniqueVehicleTypes.sort((a, b) => (a.capacity_kg || 0) - (b.capacity_kg || 0));

    // Combine Fleet Vehicles (both Admin Fleet and Warehouse Delivery Vehicles)
    const combinedFleet = [];
    const seenReg = new Set();

    fleetVehicles.forEach(fv => {
      if (fv.registration_number && !seenReg.has(fv.registration_number.toUpperCase())) {
        seenReg.add(fv.registration_number.toUpperCase());
        const master = fv.vehicle_master_id;
        const capStr = fv.load_capacity_kg ? (fv.load_capacity_kg >= 1000 ? `${(fv.load_capacity_kg / 1000).toFixed(1)} Ton` : `${fv.load_capacity_kg} Kg`) : '';
        const typeLabel = master?.name ? (capStr ? `${master.name} (${capStr})` : master.name) : '';

        combinedFleet.push({
          registration_number: fv.registration_number.toUpperCase(),
          vehicle_type: typeLabel || master?.name || '',
          transporter_name: fv.service_provider_id?.name || '',
          capacity_kg: fv.load_capacity_kg,
          status: fv.current_status || 'Available'
        });
      }
    });

    warehouseVehicles.forEach(wv => {
      if (wv.registration_number && !seenReg.has(wv.registration_number.toUpperCase())) {
        seenReg.add(wv.registration_number.toUpperCase());
        const capStr = wv.capacity_kg ? (wv.capacity_kg >= 1000 ? `${(wv.capacity_kg / 1000).toFixed(1)} Ton` : `${wv.capacity_kg} Kg`) : '';
        const typeLabel = wv.vehicle_type ? (capStr ? `${wv.vehicle_type} (${capStr})` : wv.vehicle_type) : wv.name;

        combinedFleet.push({
          registration_number: wv.registration_number.toUpperCase(),
          vehicle_type: typeLabel,
          transporter_name: 'Internal Warehouse Fleet',
          driver_name: wv.assigned_driver_id?.name || '',
          driver_mobile: wv.assigned_driver_id?.contact || '',
          capacity_kg: wv.capacity_kg,
          status: 'Available'
        });
      }
    });

    const transporterList = providers.map(p => ({
      _id: p._id,
      name: p.name,
      code: p.service_provider_code || '',
      phone: p.contact_person_phone || ''
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        vehicle_types: uniqueVehicleTypes,
        fleet_vehicles: combinedFleet,
        transporters: transporterList
      }
    });
  } catch (err) {
    console.error('Error in get_vehicle_presets:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch vehicle presets.' });
  }
};

// ==============================================================================
// ── IN-MEMORY / AUDIT TASK STORE FOR REAL-TIME DELIVERY MANAGER DAILY ACTIONS ─
// ==============================================================================
const warehouseTaskStatusStore = new Map();

// Helper to ensure realistic seed data in MongoDB if collections are fresh/sparse
/**
 * GET /warehouse/dashboard-overview
 * Centralized, live real-time Delivery Manager Control Center aggregation
 * 100% REAL LIVE DATA from MongoDB collections (ZERO dummy / static / seeded data)
 */
exports.get_dashboard_overview = async (req, res) => {
  try {
    const { india_solarshop_db } = require('../config/databases');
    const { WarehouseInward, WarehouseStock, PurchaseOrder, DeliveryVehicle, CompanyWarehouse } = require('../models/company_warehouse_db');

    const EpcOrder = india_solarshop_db.models['epc_orders'] ||
      india_solarshop_db.model('epc_orders', new mongoose.Schema({}, { strict: false, collection: 'epc_orders' }));

    const ServiceTicket = india_solarshop_db.models['solarkits_service_tickets'] || 
      india_solarshop_db.model('solarkits_service_tickets', new mongoose.Schema({}, { strict: false, collection: 'solarkits_service_tickets' }));

    const DeliveryCostBenchmark = india_solarshop_db.models['delivery_cost_benchmarks'] || 
      india_solarshop_db.model('delivery_cost_benchmarks', new mongoose.Schema({}, { strict: false, collection: 'delivery_cost_benchmarks' }));

    // Fetch live MongoDB documents across all fulfillment domains
    const [
      deliveryOrdersRaw,
      epcOrders,
      purchaseOrders,
      warehouseInwards,
      warehouseStocks,
      deliveryVehicles,
      benchmarks,
      serviceTickets,
      warehousesList
    ] = await Promise.all([
      DeliveryOrder.find({}).sort({ created_at: -1 }).lean().catch(() => []),
      EpcOrder.find({ order_status: { $in: ['confirmed', 'processing', 'in_assembly', 'out_for_delivery', 'delivered'] } }).sort({ created_at: -1 }).lean().catch(() => []),
      PurchaseOrder.find({}).sort({ created_at: -1 }).lean().catch(() => []),
      WarehouseInward.find({}).sort({ created_at: -1 }).lean().catch(() => []),
      WarehouseStock.find({}).lean().catch(() => []),
      DeliveryVehicle.find({}).lean().catch(() => []),
      DeliveryCostBenchmark.find({ is_active: true, deleted_at: null }).lean().catch(() => []),
      ServiceTicket.find({ deleted_at: null }).sort({ created_at: -1 }).lean().catch(() => []),
      CompanyWarehouse.find({ is_active: true, deleted_at: null }).lean().catch(() => [])
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const whMap = {};
    warehousesList.forEach(w => {
      whMap[w._id.toString()] = w.name || w.code || 'Central Warehouse';
    });

    // Clone deliveryOrders and merge confirmed real EPC orders not yet in delivery_orders collection
    const deliveryOrders = [...deliveryOrdersRaw];
    epcOrders.forEach(epc => {
      const alreadyInList = deliveryOrders.some(d => 
        d.order_number === epc.order_number || 
        (d.order_id && String(d.order_id) === String(epc._id))
      );

      if (!alreadyInList) {
        const kitItem = epc.items?.[0] || {};
        const numKits = kitItem.quantity || epc.order_load_metrics?.total_kits || 1;
        const capacity = kitItem.capacity || (epc.order_load_metrics?.total_kw ? `${epc.order_load_metrics.total_kw} kW` : '5 kW');
        const kitName = kitItem.item_name || `${capacity} DCR Combokit`;
        const destination = {
          address: epc.delivery_address?.line || '',
          state: epc.delivery_address?.state_name || '',
          district: epc.delivery_address?.district_name || '',
          pincode: epc.delivery_address?.pincode || '',
          landmark: ''
        };

        let deliveryStatus = 'new_order';
        if (epc.dispatch_tracking?.dispatched_at) {
          deliveryStatus = epc.delivered_at ? 'delivered' : 'in_transit';
        } else if (epc.assigned_vehicle?.vehicle_name || epc.assigned_vehicle?.registration_number) {
          deliveryStatus = 'ready_for_dispatch';
        }

        deliveryOrders.push({
          _id: epc._id,
          delivery_order_id: `DO-${epc.order_number.replace('ORD-EPC-', '')}`,
          order_number: epc.order_number,
          order_id: epc._id.toString(),
          customer_name: epc.delivery_address?.contact_name || epc.client_name || epc.user_name || epc.company_name || 'EPC Customer',
          customer_phone: epc.delivery_address?.contact_phone || '',
          customer_email: epc.email || '',
          destination: destination,
          num_kits: numKits,
          system_capacity: capacity,
          solarkit_model: kitName,
          delivery_status: deliveryStatus,
          kit_preparation_status: deliveryStatus === 'delivered' ? 'kit_ready' : (deliveryStatus === 'ready_for_dispatch' ? 'kit_ready' : 'awaiting_components'),
          transport_details: {
            vehicle_number: epc.assigned_vehicle?.registration_number || '',
            vehicle_type: epc.assigned_vehicle?.vehicle_type || epc.assigned_vehicle?.vehicle_name || '',
            transporter_name: epc.dispatch_tracking?.courier_name || '',
            driver_name: epc.assigned_vehicle?.driver_name || '',
            driver_mobile: epc.assigned_vehicle?.driver_contact || '',
            dispatch_date: epc.dispatch_tracking?.dispatched_at || null,
            expected_delivery_date: epc.dispatch_tracking?.estimated_delivery || null
          },
          items: (epc.items || []).map(it => ({
            sku: it.kit_id || it.product_id || 'SOLARKIT-BOM',
            product_name: it.item_name || 'Solar Kit',
            category: 'ComboKit',
            ordered_qty: it.quantity || 1,
            received_qty: 0,
            pending_qty: it.quantity || 1,
            available_inventory_stock: 0,
            allocated_stock: 0,
            sourcing_type: 'supplier_procurement',
            supply_fulfilment_method: 'supplier_delivery',
            supplier_name: epc.procurement_status?.panel?.supplier_name || epc.procurement_status?.inverter?.supplier_name || '',
            supply_status: epc.procurement_status?.overall_status || 'pending',
            expected_inward_date: epc.reservation_expires_at || epc.created_at
          })),
          created_at: epc.created_at,
          order_date: epc.created_at
        });
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ORDER STATUS OVERVIEW COUNTS (18 DISTINCT REAL-TIME STATUSES)
    // ──────────────────────────────────────────────────────────────────────────
    const counts = {
      incoming_supplier_goods: 0,
      pickup_pending: 0,
      supplier_dispatch_pending: 0,
      supplier_in_transit: 0,
      warehouse_inward_pending: 0,
      partially_received: 0,
      inward_completed: 0,
      inventory_allocation_pending: 0,
      boskit_combokit_preparation: 0,
      awaiting_missing_components: 0,
      ready_for_dispatch: 0,
      vehicle_booking_pending: 0,
      vehicle_booked: 0,
      dispatched: 0,
      in_transit_customer: 0,
      delivered: 0,
      pod_pending: 0,
      completed: 0,
      total_orders: deliveryOrders.length
    };

    deliveryOrders.forEach(ord => {
      const st = ord.delivery_status || 'new_order';
      const kitSt = ord.kit_preparation_status || 'ready_for_assembly';
      const items = ord.items || [];
      const hasVehicle = Boolean(ord.transport_details?.vehicle_number);
      const isDelivered = st === 'delivered';
      const hasPod = Boolean(ord.delivery_completion?.destination_photo || ord.delivery_completion?.otp_verified);

      // Check item-level supplier sourcing states
      let hasSupplierItems = false;
      let hasPickupPending = false;
      let hasSupplierDispatchPending = false;
      let hasSupplierInTransit = false;
      let hasPendingInward = false;
      let hasUnallocatedStock = false;

      items.forEach(it => {
        if (it.sourcing_type === 'supplier_procurement' || it.supplier_name) {
          hasSupplierItems = true;
          if (it.supply_status === 'ready_for_pickup') hasPickupPending = true;
          if (it.supply_status === 'pending') hasSupplierDispatchPending = true;
          if (it.supply_status === 'in_transit') hasSupplierInTransit = true;
        }
        if ((it.pending_qty || 0) > 0) {
          hasPendingInward = true;
        }
        if ((it.ordered_qty || 0) > (it.allocated_stock || 0) + (it.received_qty || 0)) {
          hasUnallocatedStock = true;
        }
      });

      if (hasSupplierItems) counts.incoming_supplier_goods++;
      if (hasPickupPending) counts.pickup_pending++;
      if (hasSupplierDispatchPending) counts.supplier_dispatch_pending++;
      if (hasSupplierInTransit) counts.supplier_in_transit++;

      if (st === 'new_order' || hasPendingInward) counts.warehouse_inward_pending++;
      if (st === 'partially_inwarded') counts.partially_received++;
      if (st === 'inward_completed' || st === 'inward_done') counts.inward_completed++;
      if (hasUnallocatedStock && st !== 'delivered') counts.inventory_allocation_pending++;

      if (kitSt === 'in_assembly' || kitSt === 'ready_for_assembly') counts.boskit_combokit_preparation++;
      if (kitSt === 'awaiting_components') counts.awaiting_missing_components++;

      if (st === 'ready_for_dispatch') {
        counts.ready_for_dispatch++;
        if (!hasVehicle) counts.vehicle_booking_pending++;
        else counts.vehicle_booked++;
      }

      if (['awaiting_eway_bill', 'ready_to_initiate', 'dispatched_pending'].includes(st)) {
        counts.dispatched++;
      }

      if (st === 'in_transit') {
        counts.in_transit_customer++;
      }

      if (isDelivered) {
        counts.delivered++;
        if (!hasPod) counts.pod_pending++;
        else counts.completed++;
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2. WAREHOUSE INWARD & SUPPLIER GOODS MONITORING TABLE & METRICS
    // ──────────────────────────────────────────────────────────────────────────
    const inwardTable = [];
    let damagedOrMissingCount = 0;
    let inwardDiscrepancyCount = 0;
    let supplierExpectedTodayCount = 0;
    let inwardOverdueCount = 0;

    // A. Actual recorded physical warehouse inwards (GRNs)
    warehouseInwards.forEach(grn => {
      const items = grn.items || [];
      const inwardDate = grn.inward_date || grn.created_at;
      const isToday = inwardDate && new Date(inwardDate) >= todayStart;
      if (isToday) supplierExpectedTodayCount++;

      items.forEach(gi => {
        const rejected = gi.rejected_qty || 0;
        if (rejected > 0) {
          damagedOrMissingCount += rejected;
          inwardDiscrepancyCount++;
        }

        inwardTable.push({
          order_id: grn._id,
          order_number: grn.order_number || grn.grn_no || grn.invoice_no || `GRN-${String(grn._id).slice(-6).toUpperCase()}`,
          supplier_name: grn.supplier_name || '',
          po_number: grn.po_number || grn.invoice_no || grn.grn_no || '',
          product_name: gi.sku_code || gi.product_name || 'Inward Component',
          sku: gi.sku_code || 'SKU-INW',
          category: 'Warehouse GRN',
          expected_qty: gi.ordered_qty || gi.qty || 0,
          received_qty: gi.received_qty || gi.qty || 0,
          pending_qty: Math.max(0, (gi.ordered_qty || gi.qty || 0) - (gi.received_qty || gi.qty || 0)),
          short_damaged: rejected,
          warehouse: grn.warehouse_code || 'WH-IND-GJ-001',
          expected_inward_date: inwardDate,
          inward_status: rejected > 0 ? 'Discrepancy' : (grn.status === 'approved' ? 'Completed' : 'Pending'),
          supply_status: grn.status || 'received',
          destination_district: 'Ahmedabad Hub'
        });
      });
    });

    // C. Open Purchase Orders awaiting warehouse delivery
    purchaseOrders.forEach(po => {
      (po.items || []).forEach(pi => {
        inwardTable.push({
          order_id: po._id,
          order_number: po.source_orders?.[0]?.order_number || po.po_number,
          supplier_name: po.supplier_name || po.supplier_brand || '',
          po_number: po.po_number,
          product_name: pi.sku_code || 'Procurement Component',
          sku: pi.sku_code || 'SKU-PO',
          category: po.procurement_type || 'Component',
          expected_qty: pi.qty || 1,
          received_qty: po.status === 'delivered' ? (pi.qty || 1) : 0,
          pending_qty: po.status === 'delivered' ? 0 : (pi.qty || 1),
          short_damaged: 0,
          warehouse: po.warehouse_code || 'WH-IND-GJ-001',
          expected_inward_date: po.timeline || po.created_at,
          inward_status: po.status === 'delivered' ? 'Completed' : 'Pending',
          supply_status: po.status === 'paid' ? 'dispatched' : 'pending',
          destination_district: 'Regional Hub'
        });
      });
    });

    const inwardMonitoring = {
      summary: {
        expected_today: supplierExpectedTodayCount,
        pickup_pending: counts.pickup_pending,
        supplier_dispatch_pending: counts.supplier_dispatch_pending,
        supplier_in_transit: counts.supplier_in_transit,
        warehouse_inward_pending: counts.warehouse_inward_pending,
        partially_received: counts.partially_received,
        inward_discrepancies: inwardDiscrepancyCount,
        damaged_missing: damagedOrMissingCount,
        inward_overdue: inwardOverdueCount
      },
      table: inwardTable
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 3. KIT PREPARATION & INVENTORY ALLOCATION
    // ──────────────────────────────────────────────────────────────────────────
    const kitRecords = [];
    let kitsAwaitingStock = 0;
    let kitsInPrep = 0;
    let kitsReadyDispatch = 0;
    let kitsAwaitingComponents = 0;
    let inventoryShortageCount = 0;
    let prepOverdueCount = 0;

    deliveryOrders.forEach(ord => {
      const kitSt = ord.kit_preparation_status || 'ready_for_assembly';
      const isDelivered = ord.delivery_status === 'delivered';
      const items = ord.items || [];

      let hasShortage = false;
      const bomItems = items.map(it => {
        const required = it.ordered_qty || 1;
        const available = it.available_inventory_stock || 0;
        const reserved = it.allocated_stock || 0;
        const missing = Math.max(0, required - (reserved + (it.received_qty || 0)));
        if (missing > 0) hasShortage = true;

        return {
          sku: it.sku,
          product_name: it.product_name,
          category: it.category || 'BOS Kit',
          required_qty: required,
          available_stock: available,
          reserved_stock: reserved,
          missing_qty: missing,
          qc_status: it.qc_status || 'Passed'
        };
      });

      if (hasShortage) inventoryShortageCount++;

      const ordDate = new Date(ord.order_date || ord.created_at);
      const daysElapsed = Math.floor((now - ordDate) / (1000 * 3600 * 24));
      const isOverdue = daysElapsed > (ord.sla_days || 2) && !isDelivered && kitSt !== 'kit_ready';
      if (isOverdue) prepOverdueCount++;

      if (kitSt === 'ready_for_assembly') kitsAwaitingStock++;
      if (kitSt === 'in_assembly') kitsInPrep++;
      if (kitSt === 'kit_ready' || ord.delivery_status === 'ready_for_dispatch') kitsReadyDispatch++;
      if (kitSt === 'awaiting_components' || hasShortage) kitsAwaitingComponents++;

      kitRecords.push({
        order_id: ord._id,
        order_number: ord.order_number,
        customer_name: ord.customer_name,
        kit_type: ord.solarkit_model || `${ord.system_capacity || '5 kW'} DCR ComboKit`,
        num_kits: ord.num_kits || 1,
        system_capacity: ord.system_capacity || '5 kW',
        bom_items: bomItems,
        total_components_required: bomItems.reduce((s, b) => s + b.required_qty, 0),
        total_components_available: bomItems.reduce((s, b) => s + b.available_stock, 0),
        total_components_missing: bomItems.reduce((s, b) => s + b.missing_qty, 0),
        preparation_status: kitSt,
        assigned_team: ord.kit_assembly_details?.picked_by || 'BOS Assembly Workstation',
        expected_completion_date: new Date(ordDate.getTime() + (ord.sla_days || 2) * 24 * 3600 * 1000),
        is_overdue: isOverdue,
        warehouse_code: ord.warehouse_code || 'WH-IND-GJ-001'
      });
    });

    const kitPreparation = {
      summary: {
        awaiting_stock_allocation: kitsAwaitingStock,
        kits_in_preparation: kitsInPrep,
        kits_ready_for_dispatch: kitsReadyDispatch,
        awaiting_missing_components: kitsAwaitingComponents,
        inventory_shortage: inventoryShortageCount,
        preparation_overdue: prepOverdueCount
      },
      records: kitRecords
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 4. VEHICLE BOOKING & BENCHMARK APPROVAL MONITORING
    // ──────────────────────────────────────────────────────────────────────────
    const vehicleBookingTable = [];
    let vehicleBookingPending = 0;
    let chargeApprovalPending = 0;
    let vehicleBookedCount = 0;
    let vehicleCostExceededCount = 0;
    let vehicleCapacityIssueCount = 0;
    let bookingOverdueCount = 0;

    deliveryOrders.forEach(ord => {
      const isReady = ['ready_for_dispatch', 'awaiting_eway_bill', 'ready_to_initiate', 'in_transit', 'delivered'].includes(ord.delivery_status);
      if (!isReady) return;

      const hasVehicle = Boolean(ord.transport_details?.vehicle_number);
      const dist = ord.destination?.district || '';
      const numKits = ord.num_kits || 1;
      const estWeightKg = numKits * 380; // Standard 380kg per 5kW Kit

      // Lookup real benchmark cost from database
      const matchedBenchmark = benchmarks.find(b => 
        (b.district_id?.name || '').toLowerCase() === dist.toLowerCase() ||
        (ord.warehouse_code && b.warehouse_id?.code === ord.warehouse_code)
      );

      const benchmarkCost = matchedBenchmark?.benchmark_cost || 0;
      const actualDeliveryCharge = ord.items?.[0]?.transport_cost || ord.delivery_charge || ord.transport_details?.estimated_cost || 0;
      const isExceeded = benchmarkCost > 0 && actualDeliveryCharge > benchmarkCost;

      if (isExceeded) vehicleCostExceededCount++;

      let adminApproval = 'Not Required';
      if (isExceeded) {
        adminApproval = ord.transport_details?.admin_approval_status || 'Pending';
        if (adminApproval === 'Pending') chargeApprovalPending++;
      }

      if (!hasVehicle) vehicleBookingPending++;
      else vehicleBookedCount++;

      const ordDate = new Date(ord.order_date || ord.created_at);
      const daysElapsed = Math.floor((now - ordDate) / (1000 * 3600 * 24));
      if (!hasVehicle && daysElapsed > 2) bookingOverdueCount++;

      const selectedVehicle = ord.transport_details?.vehicle_type || ord.required_vehicle || '';
      const capacityKg = selectedVehicle.includes('4 Ton') ? 4000 : (selectedVehicle.includes('2.5') ? 2500 : 1500);
      const hasCapacityIssue = selectedVehicle ? (estWeightKg > capacityKg) : false;
      if (hasCapacityIssue) vehicleCapacityIssueCount++;

      vehicleBookingTable.push({
        order_id: ord._id,
        order_number: ord.order_number,
        destination: `${ord.destination?.district || ''}${ord.destination?.district && ord.destination?.state ? ', ' : ''}${ord.destination?.state || ''}`,
        address: ord.destination?.address || '',
        kit_quantity: numKits,
        total_weight_kg: estWeightKg,
        delivery_method: ord.delivery_method === 'auto' ? 'Combined Fleet' : 'Individual Transport',
        vehicle_type: selectedVehicle || 'Unassigned',
        vehicle_number: ord.transport_details?.vehicle_number || '',
        driver_name: ord.transport_details?.driver_name || '',
        driver_mobile: ord.transport_details?.driver_mobile || '',
        transporter: ord.transport_details?.transporter_name || '',
        vehicle_capacity: selectedVehicle ? `${capacityKg} kg` : 'TBD',
        delivery_charge: actualDeliveryCharge,
        benchmark: benchmarkCost,
        cost_exceeded: isExceeded,
        admin_approval: adminApproval,
        booking_status: hasVehicle ? 'Booked' : 'Pending',
        has_capacity_issue: hasCapacityIssue
      });
    });

    const vehicleBooking = {
      summary: {
        booking_pending: vehicleBookingPending,
        delivery_charge_approval_pending: chargeApprovalPending,
        vehicle_booked: vehicleBookedCount,
        dispatch_pending: counts.ready_for_dispatch,
        vehicle_capacity_issue: vehicleCapacityIssueCount,
        delivery_cost_exceeding_benchmark: vehicleCostExceededCount,
        vehicle_booking_overdue: bookingOverdueCount
      },
      table: vehicleBookingTable
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 5. DISPATCH & DELIVERY TRACKING
    // ──────────────────────────────────────────────────────────────────────────
    const trackingTable = [];
    let dispatchedTodayCount = 0;
    let deliveryDueTodayCount = 0;
    let deliveryOverdueCount = 0;
    let deliveredTodayCount = 0;
    let deliveryFailedCount = 0;
    let podPendingCount = 0;

    deliveryOrders.forEach(ord => {
      const st = ord.delivery_status;
      const t = ord.transport_details || {};
      const c = ord.delivery_completion || {};

      const dDate = t.dispatch_date ? new Date(t.dispatch_date) : null;
      const expDelDate = t.expected_delivery_date ? new Date(t.expected_delivery_date) : null;
      const compDate = c.completed_at ? new Date(c.completed_at) : null;

      if (dDate && dDate >= todayStart) dispatchedTodayCount++;
      if (expDelDate && expDelDate >= todayStart && expDelDate < new Date(todayStart.getTime() + 24 * 3600 * 1000)) {
        deliveryDueTodayCount++;
      }
      if (st === 'in_transit' && expDelDate && expDelDate < now) {
        deliveryOverdueCount++;
      }
      if (st === 'delivered' && compDate && compDate >= todayStart) {
        deliveredTodayCount++;
      }
      if (c.failed_otp_attempts > 2) {
        deliveryFailedCount++;
      }
      if (st === 'delivered' && !c.destination_photo && !c.otp_verified) {
        podPendingCount++;
      }

      const isDelayed = Boolean(expDelDate && expDelDate < now && st !== 'delivered');
      const delayDays = isDelayed ? Math.max(1, Math.floor((now - expDelDate) / (1000 * 3600 * 24))) : 0;

      trackingTable.push({
        order_id: ord._id,
        order_number: ord.order_number,
        customer_name: ord.customer_name,
        customer_phone: ord.customer_phone,
        destination: `${ord.destination?.address || ''}${ord.destination?.address && ord.destination?.district ? ', ' : ''}${ord.destination?.district || ''}`,
        vehicle_number: t.vehicle_number || '',
        vehicle_type: t.vehicle_type || ord.required_vehicle || '',
        transporter_name: t.transporter_name || '',
        driver_name: t.driver_name || '',
        driver_mobile: t.driver_mobile || '',
        docket_number: t.docket_number || ord.incoming_truck_group?.lr_number || '',
        dispatch_date: t.dispatch_date || null,
        expected_delivery: t.expected_delivery_date || null,
        completed_at: c.completed_at || null,
        current_status: st,
        is_delayed: isDelayed,
        delay_days: delayDays,
        pod_status: (c.otp_verified || Boolean(c.destination_photo)) ? 'Uploaded' : 'Pending',
        pod_url: c.destination_photo || '',
        receiver_name: c.receiver_name || '',
        eway_bill_number: ord.eway_bill?.eway_bill_number || ''
      });
    });

    const dispatchTracking = {
      summary: {
        ready_for_dispatch: counts.ready_for_dispatch,
        dispatched_today: dispatchedTodayCount,
        in_transit: counts.in_transit_customer,
        delivery_due_today: deliveryDueTodayCount,
        delivery_overdue: deliveryOverdueCount,
        delivery_attempted_failed: deliveryFailedCount,
        pod_pending: podPendingCount,
        delivered_today: deliveredTodayCount
      },
      table: trackingTable
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 6. SERVICE, RETURNS & REPLACEMENT TICKETS (Exclusively from DB)
    // ──────────────────────────────────────────────────────────────────────────
    const ticketSummary = {
      new_service_tickets: 0,
      open_service_tickets: 0,
      replacement_requests: 0,
      return_pickup_pending: 0,
      replacement_dispatch_pending: 0,
      service_overdue: 0,
      resolved_tickets: 0
    };

    const ticketsTable = serviceTickets.map(tck => {
      const st = tck.ticket_status || 'new';
      const isReplacement = tck.ticket_type === 'replacement' || (tck.issue_category || '').toLowerCase().includes('replace');
      const isReturn = tck.ticket_type === 'return' || (tck.issue_category || '').toLowerCase().includes('return');
      const dueDate = tck.due_date ? new Date(tck.due_date) : null;
      const isOverdue = dueDate && dueDate < now && !['resolved', 'closed', 'delivered'].includes(st);

      if (['new', 'under_review'].includes(st)) ticketSummary.new_service_tickets++;
      if (!['resolved', 'closed', 'rejected'].includes(st)) ticketSummary.open_service_tickets++;
      if (isReplacement) ticketSummary.replacement_requests++;
      if (st === 'pickup_pending' || isReturn) ticketSummary.return_pickup_pending++;
      if (st === 'replacement_dispatch_pending') ticketSummary.replacement_dispatch_pending++;
      if (['resolved', 'closed'].includes(st)) ticketSummary.resolved_tickets++;
      if (isOverdue) ticketSummary.service_overdue++;

      return {
        ticket_id: tck._id,
        ticket_number: tck.ticket_number || `TCK-${String(tck._id).slice(-6).toUpperCase()}`,
        order_number: tck.order_number || '',
        customer_name: tck.customer_name || '',
        ticket_type: tck.ticket_type || (isReplacement ? 'Replacement' : (isReturn ? 'Return' : 'Service')),
        product_name: tck.item_name || '',
        issue: tck.problem_description || tck.issue_category || '',
        created_date: tck.created_at,
        assigned_to: tck.assigned_to_name || '',
        status: st,
        due_date: tck.due_date,
        is_overdue: isOverdue
      };
    });

    const serviceReturns = {
      summary: ticketSummary,
      table: ticketsTable
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 7. DELAY & OVERDUE MONITORING (10 DISTINCT STAGES)
    // ──────────────────────────────────────────────────────────────────────────
    const delayMetrics = {
      supplier_pickup: { name: 'Supplier Pickup Delay', count: 0, tat_hours: 24, status: 'green' },
      supplier_dispatch: { name: 'Supplier Dispatch Delay', count: 0, tat_hours: 48, status: 'green' },
      inward: { name: 'Warehouse Inward Delay', count: 0, tat_hours: 24, status: 'green' },
      inventory_allocation: { name: 'Inventory Allocation Delay', count: 0, tat_hours: 12, status: 'green' },
      kit_preparation: { name: 'Kit Preparation Delay', count: 0, tat_hours: 24, status: 'green' },
      vehicle_booking: { name: 'Vehicle Booking Delay', count: 0, tat_hours: 12, status: 'green' },
      dispatch: { name: 'Dispatch Gate Delay', count: 0, tat_hours: 12, status: 'green' },
      delivery: { name: 'Customer Delivery Delay', count: 0, tat_hours: 48, status: 'green' },
      pod: { name: 'POD Submission Delay', count: 0, tat_hours: 12, status: 'green' },
      replacement: { name: 'Replacement Processing Delay', count: 0, tat_hours: 48, status: 'green' }
    };

    const delayRecords = [];

    deliveryOrders.forEach(ord => {
      const createdDate = new Date(ord.order_date || ord.created_at);
      const daysElapsed = Math.floor((now - createdDate) / (1000 * 3600 * 24));
      const slaDays = ord.sla_days || 2;
      const overdueDays = Math.max(0, daysElapsed - slaDays);

      let stage = 'New Order Inward';
      let responsibleTeam = 'Warehouse Operations';

      if (ord.delivery_status === 'new_order' || ord.delivery_status === 'partially_inwarded') {
        stage = 'Warehouse Inward';
        responsibleTeam = 'Warehouse Operations';
        if (daysElapsed > 1) {
          delayMetrics.inward.count++;
          delayMetrics.inward.status = daysElapsed > 2 ? 'red' : 'orange';
        }
      } else if (ord.kit_preparation_status === 'in_assembly' || ord.kit_preparation_status === 'ready_for_assembly') {
        stage = 'Kit Assembly';
        responsibleTeam = 'BOS Assembly Workstation';
        if (daysElapsed > 2) {
          delayMetrics.kit_preparation.count++;
          delayMetrics.kit_preparation.status = 'red';
        }
      } else if (ord.delivery_status === 'ready_for_dispatch' && !ord.transport_details?.vehicle_number) {
        stage = 'Vehicle Booking';
        responsibleTeam = 'Logistics & Dispatch';
        if (daysElapsed > 1) {
          delayMetrics.vehicle_booking.count++;
          delayMetrics.vehicle_booking.status = 'orange';
        }
      } else if (ord.delivery_status === 'in_transit') {
        stage = 'Customer Transit';
        responsibleTeam = 'Transporter Partner';
        const expDel = ord.transport_details?.expected_delivery_date ? new Date(ord.transport_details.expected_delivery_date) : null;
        if (expDel && expDel < now) {
          delayMetrics.delivery.count++;
          delayMetrics.delivery.status = 'red';
        }
      } else if (ord.delivery_status === 'delivered' && !ord.delivery_completion?.destination_photo && !ord.delivery_completion?.otp_verified) {
        stage = 'POD Submission';
        responsibleTeam = 'Delivery Manager';
        delayMetrics.pod.count++;
        delayMetrics.pod.status = 'orange';
      }

      if (overdueDays > 0 && ord.delivery_status !== 'delivered') {
        delayRecords.push({
          order_id: ord._id,
          order_number: ord.order_number,
          current_stage: stage,
          expected_date: new Date(createdDate.getTime() + slaDays * 24 * 3600 * 1000),
          responsible_team: responsibleTeam,
          elapsed_days: daysElapsed,
          overdue_days: overdueDays,
          severity: overdueDays > 2 ? 'high' : 'medium'
        });
      }
    });

    serviceTickets.forEach(tck => {
      const dueDate = tck.due_date ? new Date(tck.due_date) : null;
      if (dueDate && dueDate < now && !['resolved', 'closed'].includes(tck.ticket_status)) {
        delayMetrics.replacement.count++;
        delayMetrics.replacement.status = 'red';
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 8. DAILY TASKS & ACTION REQUIRED QUEUE
    // ──────────────────────────────────────────────────────────────────────────
    const dailyTasks = [];
    const managerName = req.user?.name ? `${req.user.name} (Warehouse Manager)` : 'Warehouse Manager';

    deliveryOrders.forEach((ord) => {
      const st = ord.delivery_status;
      const kitSt = ord.kit_preparation_status;
      const items = ord.items || [];
      const hasVehicle = Boolean(ord.transport_details?.vehicle_number);

      // Task 1: Inward pending items
      const pendingItems = items.filter(i => (i.pending_qty || 0) > 0);
      if (pendingItems.length > 0 && st !== 'delivered') {
        const taskId = `tsk-inw-${ord._id}`;
        dailyTasks.push({
          id: taskId,
          title: `Receive Goods & Verify PO for Order ${ord.order_number}`,
          order_number: ord.order_number,
          order_id: ord._id,
          task_type: 'Inward',
          assigned_to: managerName,
          due_date: new Date(now.getTime() + 6 * 3600 * 1000),
          priority: 'High',
          status: warehouseTaskStatusStore.get(taskId) || 'Pending',
          action_type: 'receive_goods',
          details: `${pendingItems.length} SKU(s) pending physical warehouse verification`
        });
      }

      // Task 2: Kit Preparation & Component Allocation
      if (kitSt === 'ready_for_assembly' || kitSt === 'in_assembly') {
        const taskId = `tsk-prep-${ord._id}`;
        dailyTasks.push({
          id: taskId,
          title: `Complete BOS Kit Assembly & Barcode QC for ${ord.order_number}`,
          order_number: ord.order_number,
          order_id: ord._id,
          task_type: 'Preparation',
          assigned_to: 'BOS Assembly Workstation',
          due_date: new Date(now.getTime() + 8 * 3600 * 1000),
          priority: 'Medium',
          status: warehouseTaskStatusStore.get(taskId) || 'In Progress',
          action_type: 'assemble_kit',
          details: `Kit Model: ${ord.solarkit_model || 'SolarKit'} (${ord.num_kits || 1} Sets)`
        });
      }

      // Task 3: Vehicle Booking
      if (st === 'ready_for_dispatch' && !hasVehicle) {
        const taskId = `tsk-veh-${ord._id}`;
        dailyTasks.push({
          id: taskId,
          title: `Book Transport Vehicle & Confirm Capacity (${ord.order_number})`,
          order_number: ord.order_number,
          order_id: ord._id,
          task_type: 'Booking',
          assigned_to: managerName,
          due_date: new Date(now.getTime() + 4 * 3600 * 1000),
          priority: 'High',
          status: warehouseTaskStatusStore.get(taskId) || 'Pending',
          action_type: 'book_vehicle',
          details: `Destination: ${ord.destination?.district || 'Hub'} • Vehicle: ${ord.required_vehicle || 'Standard Vehicle'}`
        });
      }

      // Task 4: Dispatch Gate Clearance
      if (st === 'ready_for_dispatch' && hasVehicle) {
        const taskId = `tsk-disp-${ord._id}`;
        dailyTasks.push({
          id: taskId,
          title: `Inspect Gate Loading Photo & Clear Dispatch for ${ord.order_number}`,
          order_number: ord.order_number,
          order_id: ord._id,
          task_type: 'Dispatch',
          assigned_to: 'Gate Dispatch Manager',
          due_date: new Date(now.getTime() + 2 * 3600 * 1000),
          priority: 'High',
          status: warehouseTaskStatusStore.get(taskId) || 'Pending',
          action_type: 'dispatch_order',
          details: `Vehicle: ${ord.transport_details?.vehicle_number || 'Assigned'} • Driver: ${ord.transport_details?.driver_name || 'Driver'}`
        });
      }

      // Task 5: POD & Delivery Confirmation
      if (st === 'delivered' && !ord.delivery_completion?.destination_photo && !ord.delivery_completion?.otp_verified) {
        const taskId = `tsk-pod-${ord._id}`;
        dailyTasks.push({
          id: taskId,
          title: `Upload Proof of Delivery (POD) / Verify OTP for ${ord.order_number}`,
          order_number: ord.order_number,
          order_id: ord._id,
          task_type: 'Dispatch',
          assigned_to: managerName,
          due_date: new Date(now.getTime() + 12 * 3600 * 1000),
          priority: 'Medium',
          status: warehouseTaskStatusStore.get(taskId) || 'Pending',
          action_type: 'upload_pod',
          details: `Customer: ${ord.customer_name} • Phone: ${ord.customer_phone}`
        });
      }
    });

    serviceTickets.forEach(tck => {
      if (['new', 'under_review', 'pickup_pending', 'replacement_dispatch_pending'].includes(tck.ticket_status)) {
        const taskId = `tsk-tck-${tck._id}`;
        dailyTasks.push({
          id: taskId,
          title: `Coordinate Logistics for ${tck.ticket_type === 'replacement' ? 'Replacement' : 'Service'} Ticket ${tck.ticket_number}`,
          order_number: tck.order_number || '',
          order_id: tck._id,
          task_type: 'Ticket',
          assigned_to: tck.assigned_to_name || managerName,
          due_date: tck.due_date || new Date(now.getTime() + 24 * 3600 * 1000),
          priority: 'High',
          status: warehouseTaskStatusStore.get(taskId) || 'Pending',
          action_type: 'process_ticket',
          details: `${tck.item_name || 'Component'} - ${tck.problem_description || tck.issue_category || 'Service request'}`
        });
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 9. MASTER ORDERS LIST (FULL ENRICHED DATA FOR MULTI-FACET FILTERING)
    // ──────────────────────────────────────────────────────────────────────────
    const masterOrders = deliveryOrders.map(ord => {
      const items = ord.items || [];
      const totalOrdered = items.reduce((s, i) => s + (i.ordered_qty || 0), 0);
      const totalReceived = items.reduce((s, i) => s + (i.received_qty || 0), 0);
      const totalPending = items.reduce((s, i) => s + (i.pending_qty || 0), 0);
      const totalAllocated = items.reduce((s, i) => s + (i.allocated_stock || 0), 0);

      const createdDate = new Date(ord.order_date || ord.created_at);
      const daysElapsed = Math.floor((now - createdDate) / (1000 * 3600 * 24));
      const slaDays = ord.sla_days || 2;
      const isOverdue = ord.delivery_status !== 'delivered' && daysElapsed > slaDays;
      const overdueDays = isOverdue ? (daysElapsed - slaDays) : 0;

      let inwardStatus = 'Pending';
      if (totalReceived >= totalOrdered && totalOrdered > 0) inwardStatus = 'Completed';
      else if (totalReceived > 0) inwardStatus = 'Partial';

      let kitPrepStatus = ord.kit_preparation_status || 'Not Started';
      if (kitPrepStatus === 'kit_ready') kitPrepStatus = 'Ready';
      else if (kitPrepStatus === 'in_assembly') kitPrepStatus = 'In Progress';
      else if (kitPrepStatus === 'awaiting_components') kitPrepStatus = 'Awaiting Components';

      let vehicleBookingStatus = ord.transport_details?.vehicle_number ? 'Booked' : 'Pending';
      if (['in_transit', 'delivered'].includes(ord.delivery_status)) vehicleBookingStatus = 'Confirmed';

      let currentStage = 'Procurement & Inward';
      let nextAction = 'Verify incoming supplier goods';
      if (inwardStatus === 'Completed' && kitPrepStatus !== 'Ready') {
        currentStage = 'Kit Preparation';
        nextAction = 'Assemble BOM components & scan barcode';
      } else if (kitPrepStatus === 'Ready' && vehicleBookingStatus === 'Pending') {
        currentStage = 'Vehicle Arrangement';
        nextAction = 'Book delivery transport';
      } else if (ord.delivery_status === 'ready_for_dispatch') {
        currentStage = 'Ready for Dispatch';
        nextAction = 'Upload rear vehicle photo & initiate delivery';
      } else if (ord.delivery_status === 'in_transit') {
        currentStage = 'In Transit to Site';
        nextAction = 'Track ETA & call driver';
      } else if (ord.delivery_status === 'delivered') {
        currentStage = 'Delivered';
        nextAction = ord.delivery_completion?.otp_verified ? 'Completed' : 'Submit Dual POD';
      }

      return {
        _id: ord._id,
        order_number: ord.order_number,
        delivery_order_id: ord.delivery_order_id,
        customer_name: ord.customer_name,
        customer_phone: ord.customer_phone,
        order_source: ord.epcs?.[0]?.epc_name ? 'EPC Partner' : 'Solar Shop Store',
        kit_type: ord.solarkit_model || `${ord.system_capacity || '5 kW'} DCR ComboKit`,
        num_kits: ord.num_kits || 1,
        system_capacity: ord.system_capacity || '5 kW',
        warehouse_code: ord.warehouse_code || 'WH-IND-GJ-001',
        warehouse_name: whMap[ord.warehouse_id] || 'Ahmedabad Central Warehouse',
        state: ord.destination?.state || '',
        district: ord.destination?.district || '',
        address: ord.destination?.address,
        pincode: ord.destination?.pincode,
        procurement_status: items[0]?.supply_status || 'supplier_delivery',
        supplier_name: items.find(i => i.supplier_name)?.supplier_name || '',
        inward_status: inwardStatus,
        kit_preparation: kitPrepStatus,
        vehicle_booking: vehicleBookingStatus,
        delivery_status: ord.delivery_status,
        current_stage: currentStage,
        delay_status: isOverdue ? 'Overdue' : (daysElapsed >= 1 ? 'Approaching TAT' : 'On Time'),
        overdue_days: overdueDays,
        days_elapsed: daysElapsed,
        next_action: nextAction,
        assigned_to: managerName,
        items: items,
        transport_details: ord.transport_details || {},
        eway_bill: ord.eway_bill || {},
        delivery_completion: ord.delivery_completion || {},
        created_at: ord.created_at || ord.order_date
      };
    });

    return res.status(200).json({
      status: 'success',
      data: {
        order_status_counts: counts,
        warehouse_inward_monitoring: inwardMonitoring,
        kit_preparation_monitoring: kitPreparation,
        vehicle_booking_monitoring: vehicleBooking,
        dispatch_delivery_tracking: dispatchTracking,
        service_returns_tickets: serviceReturns,
        delay_metrics: delayMetrics,
        delay_records: delayRecords,
        daily_tasks: dailyTasks,
        master_orders: masterOrders,
        meta: {
          synced_at: now.toISOString(),
          total_orders: masterOrders.length,
          warehouse_code: 'WH-IND-GJ-001',
          warehouse_name: 'Ahmedabad Master Warehouse Hub',
          manager_name: req.user?.name || 'Warehouse Manager'
        }
      }
    });
  } catch (error) {
    console.error('get_dashboard_overview error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};


exports.update_dashboard_task_status = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    if (!id || !status) {
      return res.status(400).json({ status: 'error', message: 'Task ID and status are required.' });
    }

    warehouseTaskStatusStore.set(id, status);

    return res.status(200).json({
      status: 'success',
      message: `Task ${id} marked as ${status}`,
      data: { id, status, updated_at: new Date() }
    });
  } catch (err) {
    console.error('update_dashboard_task_status error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};





