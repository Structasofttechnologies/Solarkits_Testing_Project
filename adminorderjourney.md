# 📦 SolarKits — Admin Order Delivery Journey
**Document Version:** 1.0 | **Date:** October 2026 | **For:** Manager Review

---

## 🔹 SHORT VERSION (Quick Summary)

```
Customer Places Order
        ↓
Admin Reviews Order (Account Panel → Payments)
        ↓
Admin Combines Multiple Orders → Creates Supplier PO with Payment
        ↓
Supplier Ships Material to Warehouse
        ↓
Warehouse Receives Material (Material Inward → Inventory Inward Tab)
        ↓
Warehouse Dispatches to Customer (Delivery Management)
        ↓
Delivery Completed → Stock Deducted
```

---

## 🔹 DETAILED VERSION (Full Journey Explanation)

---

### STEP 1 — Customer Places Order (Entry Point)

- EPC/Franchise partner places a solar kit order via the SolarKits platform
- Order is created with status: **confirmed**
- Each order is assigned to a specific **Warehouse** based on geography/zone
- Order contains: Customer details, Kit (BOM), Delivery address, Amount

---

### STEP 2 — Accounts Panel Reviews Pending Orders

**Location:** http://localhost:5173/account-panel/payments

**What is built:**
- "Awaiting Supplier Procurement" section shows all EPC & Franchise orders that are pending stock procurement
- Orders from EpcOrder and FpoOrder models are fetched via `getPendingEpcFranchiseOrders()` API
- Orders are displayed in an expandable table with BOM breakdown (Panels, Inverters, BOS components)
- Filters available: by EPC entity, Franchise entity, State/District, Kit type, Date range
- **Auto-calculated procurement breakdown:**
  - Panels = ~60% of total order value
  - Inverters = ~25% of total order value
  - BOS/Others = ~15% of total order value
- Each order shows: Solar panels qty, Inverter qty, total project value, delivery address

---

### STEP 3 — Combine Multiple Orders → Create Supplier PO with Payment

**Location:** http://localhost:5173/account-panel/payments → "Combine & Pay Supplier" button

**What is built:**
- Accounts team selects **multiple customer orders** using checkboxes
- Clicks **"Combine & Pay Supplier"** to open the Combined Payment Modal
- In the modal, they fill:
  - **Warehouse** (which warehouse receives the stock)
  - **Supplier** (which supplier to order from)
  - **Procurement Type** (Panel / Inverter / Mixed)
  - **Payment Details:** Amount (auto-filled based on procurement %), Reference No, Payment Mode (NEFT/RTGS/UPI), Payment Date, Payment Receipt PDF upload
  - **Proforma Invoice No** and **Delivery Timeline**
- On submit → `createCombinedSupplierPayment()` API is called
- This creates a **Purchase Order (PO)** in the system linking:
  - The supplier
  - The warehouse
  - All selected source customer orders
  - Payment proof / receipt
- PO status becomes: **paid** (Awaiting Delivery from Supplier)
- PO type can be: `epc_combined`, `franchise_combined`, or `mixed_combined`

---

### STEP 4 — Supplier Ships Material to Warehouse

**What happens externally (not in system yet):**
- Supplier receives the PO and prepares stock
- Supplier ships goods to the assigned warehouse
- Supplier generates their **Tax Invoice (GST Invoice)**
- Material arrives at warehouse physically

**PO Status during this phase:** `paid` → shows as "Awaiting Delivery" in the system

---

### STEP 5 — Warehouse Receives Material (Material Inward)

**Location:** http://localhost:5173/warehouse-management-panel/material-inward

This page has **4 tabs:**

| Tab | Label | Status |
|-----|-------|--------|
| local | **Inventory Inward** | ✅ Fully Built |
| supplier | **Order Inward** | ❌ Under Development |
| transfers | **Stock Transfers** (sub-warehouse only) | ✅ Built |
| inventory | **Stock Updates** | ✅ Built |

#### ✅ Tab 1: "Inventory Inward" (Purchase Orders from Supplier) — BUILT
- Shows all **Purchase Orders** assigned to this warehouse
- POs filtered by status: All / Pending / Invoiced / Paid / Delivered
- Warehouse staff can see PO details: Supplier, Items (SKUs), Total Value, Timeline
- When material arrives with Tax Invoice, staff clicks **"Complete Delivery"**
- Staff fills in: Supplier Tax Invoice No, Supplier GSTIN, Invoice Date, Invoice PDF upload
- PO status changes: `paid` → `delivered`
- **Inward Log (GRN)** is created: GRN No, Supplier, Invoice, Items received, QC check fields
- Staff can log: Accepted Qty, Damaged Qty, Shortage, Discrepancy Notes
- After confirmation → **Warehouse Stock is incremented** (inventory updated)
- Below the PO table: **Inward Receipts History** table with all past GRN logs

#### ❌ Tab 2: "Order Inward" — NOT BUILT YET
- This tab is meant for **customer order fulfillment tracking** — matching received stock against specific customer orders
- Currently shows: "Order Fulfillment Inward — Under Development" message
- **This is the missing link** between received supplier stock and outbound customer delivery

#### ✅ Tab 4: "Stock Updates" — BUILT
- Live stock levels per SKU in the warehouse
- Shows: SKU code, Product name, Current stock qty

---

### STEP 6 — Warehouse Dispatches to Customer (Delivery Management)

**Location:** http://localhost:5173/warehouse-management-panel/delivery-management

**What is built:**
- Fetches all **confirmed customer orders** assigned to this warehouse via `getSalesOrders()` API
- Orders shown with: Partner name, Kit details, Delivery address, Pincode, Zone, Weight, Panel count
- **Stock Availability Check:** For each order, checks if all required SKUs (from the kit BOM) are available in warehouse stock using FIFO allocation
  - Each component shows: Required Qty, Allocated Qty, Pending Qty, In-Stock / Shortage
- Step 1: Select Orders for dispatch — Filter by Zone, EPC, Pincode
- Step 2: Vehicle and Route Optimization — Compare vehicles for load capacity
- Step 3: Dispatch — Assign vehicle, driver, generate dispatch details
- Staff can update **tracking status**: In-Transit, Out for Delivery, Delivered
- On "Delivered" status → order status changes: `confirmed` → `completed`
- **Stock is automatically deducted** from warehouse when order is marked delivered (FIFO per kit BOM)
- Supports: E-way Bill, Toll/Fuel cost logging, Delivery photo proof, OTP verification

---

## 🔴 WHAT IS PENDING / MISSING

| # | Feature | Status | Where |
|---|---------|--------|-------|
| 1 | **Order Inward Tab** — Match received stock to customer orders | ❌ Not Built | Material Inward → "Order Inward" tab |
| 2 | **Automatic Stock ↔ Order Matching** — Link inward GRN to specific customer orders | ❌ Not Built | Missing logic entirely |
| 3 | **Supplier Portal** — Supplier accepts PO, sends Proforma Invoice | ⚠️ Partial | Exists but PI flow unclear |
| 4 | **Customer Notification** — WhatsApp/SMS on dispatch | ⚠️ Partial | WhatsApp button exists, not automated |
| 5 | **Delivery OTP Verification UI** | ⚠️ Partial | Backend field exists, UI not complete |
| 6 | **Delivery Photo Proof Upload** | ⚠️ Partial | Backend field exists, upload UI partial |

---

## 🟢 WHAT IS WORKING END-TO-END

| # | Feature | Status |
|---|---------|--------|
| 1 | Customer order creation and assignment to warehouse | ✅ Working |
| 2 | Accounts team viewing pending EPC/Franchise orders | ✅ Working |
| 3 | Combine multiple orders and create supplier PO with payment | ✅ Working |
| 4 | Warehouse viewing POs assigned to them | ✅ Working |
| 5 | Marking PO as delivered with Tax Invoice upload | ✅ Working |
| 6 | GRN log creation after PO delivery | ✅ Working |
| 7 | Stock increment on PO delivery | ✅ Working |
| 8 | Delivery Management — viewing orders with stock check | ✅ Working |
| 9 | Dispatch tracking update (In-Transit / Delivered) | ✅ Working |
| 10 | Stock deduction on delivery completion | ✅ Working |

---

## 📊 COMPLETE FLOW DIAGRAM

```
[EPC / Franchise Customer]
         |
         | Places Solar Kit Order
         ↓
[CustomerOrder DB] — status: confirmed — assigned to Warehouse
         |
         ↓
[Account Panel – Payments Page]
  Views all pending EPC/Franchise orders
  Selects multiple orders to combine
  Clicks "Combine & Pay Supplier"
         |
         | Fills: Warehouse + Supplier + Payment details
         ↓
[PurchaseOrder DB created]
  po_type: epc_combined / franchise_combined
  status: paid
  Links to: supplier, warehouse, source orders
  Payment receipt uploaded
         |
         ↓
[EXTERNAL: Supplier ships material to Warehouse]
  Supplier generates Tax Invoice (GST Invoice)
         |
         ↓
[Warehouse Panel – Material Inward → "Inventory Inward" Tab]
  Views PO assigned to their warehouse
  Clicks "Complete Delivery"
  Enters: Invoice No, Supplier GSTIN, Invoice Date, PDF
  Logs: Accepted Qty, Damaged Qty, Discrepancy notes
         |
         | PO status: paid → delivered
         ↓
[InwardLog (GRN) created]
  GRN number auto-generated
  Stock incremented in WarehouseStock DB
         |
         ↓
[❌ MISSING: Order Inward Tab]
  Should match received GRN stock to specific customer orders
  Currently shows "Under Development"
         |
         ↓
[Warehouse Panel – Delivery Management]
  Shows confirmed orders with FIFO stock check
  Staff selects orders, assigns vehicle and driver
  Dispatches with tracking
         |
         | Order delivered → tracking_status: Delivered
         ↓
[CustomerOrder] — status: completed
[WarehouseStock] — qty decremented per BOM
```

---

## ⚠️ KEY ISSUE — Why "Order Inward" Tab is Empty

**The screenshot shows:** Material Inward → Order Inward tab → "Order Fulfillment Inward — Under Development"

**Reason:** The "Order Inward" tab (code: `activeTab === "supplier"`) is intentionally hardcoded to show an "Under Development" message. There is **no API call, no data fetching, no table** connected to this tab in the current code.

**What it should do when built:**
- After stock arrives via supplier PO and GRN is created
- This tab should show all customer orders that now have sufficient stock allocated against them
- Staff would then "release" those orders to Delivery Management for dispatch
- This creates the missing **bridge between supplier material inward and customer order fulfillment**

---

*Document created for SolarKits project internal review — October 2026*
