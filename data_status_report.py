# -*- coding: utf-8 -*-
"""
Centralized Data Definitions for SolarKits v2.0 Status Report (October 2026)
Contains all verified features, resolved and active bugs, module estimates,
architecture blueprints, and technological inventories.
"""

REPORT_DATE = "October 10, 2026"
PREVIOUS_AUDIT_DATE = "August 29, 2026"
OVERALL_COMPLETION = "88.5%"
PREVIOUS_COMPLETION = "77.0%"

METRICS = {
    "apps_analyzed": 6,
    "backend_modules": 10,
    "documented_features": 98,
    "resolved_bugs": 8,
    "active_risks": 3,
    "completion_pct": "88.5%"
}

APPLICATIONS = [
    {
        "name": "Central Backend API",
        "folder": "backend/solarkits-central-backend",
        "port": "5000",
        "stack": "Node.js / Express 5, Mongoose 9, MongoDB Multi-DB, ICICI Banking Engine, Multer, Nodemailer, Twilio",
        "status": "Production Ready",
        "completion": "91%"
    },
    {
        "name": "Unified Internal Admin Portal",
        "folder": "internal-admin-portal/solarkits-unified-admin",
        "port": "5174",
        "stack": "React 19, Vite 7, Redux Toolkit, Tailwind v4, Lucide/Heroicons, Delivery Queue & Trip POD Manager",
        "status": "Production Ready",
        "completion": "85%"
    },
    {
        "name": "Franchise Partner Portal",
        "folder": "customer-apps/solarkits-reseller-portal",
        "port": "5178",
        "stack": "React 19, React Router v7, Tailwind v4, LooseOrder Procurement (1,205 LOC), PoOrder, ServiceTickets, ICICI Real-time SSE",
        "status": "Production Ready",
        "completion": "90%"
    },
    {
        "name": "Direct EPC Solar Store",
        "folder": "customer-apps/solar-store",
        "port": "5179",
        "stack": "React 19, Redux Toolkit, Tailwind v3, Know My Margin Calculator, Request Order Cart, BrowseByIndustry CMS",
        "status": "Production Ready",
        "completion": "88%"
    },
    {
        "name": "SolarShop India Marketplace",
        "folder": "customer-apps/solarkits-solarshop-india",
        "port": "5173",
        "stack": "React 19, Redux, Tailwind v4, Dynamic Website CMS Integration, Industry Brochure Solutions, Legal Policies",
        "status": "CMS Connected",
        "completion": "75%"
    },
    {
        "name": "BDE Field Agent Portal",
        "folder": "customer-apps/BDE-modules",
        "port": "Standalone",
        "stack": "React 19, Vite, Tailwind CSS, Lead Conversion Funnel, Store Inspection, Monthly Target Goals Tracker",
        "status": "Operational",
        "completion": "88%"
    }
]

TECH_STACK = [
    ("Backend Runtime", "Node.js", "v18+ / v22 LTS Enterprise Server Runtime"),
    ("Backend Framework", "Express.js", "v5.x with native asynchronous error routing"),
    ("Database ORM", "Mongoose", "v9.x supporting multi-database connection pooling"),
    ("Primary Database", "MongoDB Multi-Database", "6 isolated logical databases for enterprise multi-tenancy"),
    ("Banking & E-Collection", "ICICI Bank Corporate API", "Automated Virtual Accounts, MSG HOLD / MIS POSTING webhooks, RSA-SHA256 & AES-128 crypto"),
    ("Payment Verification", "Offline Bank Transfer Engine", "NEFT / RTGS / IMPS / Cheque slip uploads + UTR verification + manual payout accounting"),
    ("Frontend Framework", "React", "v19.x across all 6 customer and admin portals"),
    ("Build Tool", "Vite", "v7.x rapid HMR bundler with strictPort isolation"),
    ("State Management", "Redux Toolkit", "Centralized slice architecture with persistent auth tokens"),
    ("Styling & CSS", "Tailwind CSS", "v3.4 (Solar Store) / v4.1 modern engine (all other portals)"),
    ("Animations", "Framer Motion", "Micro-interactions, staggered modals, drawer transitions"),
    ("Content Management", "Dynamic Industry CMS", "Admin CMS engine for industry solutions, brochures, banners, and media"),
    ("Document Storage", "Cloudinary SDK", "v2.x SDK handling KYC proofs, delivery PODs, and bank transfer slips"),
    ("Email Services", "Nodemailer", "v9.x SMTP transactional notifications for approvals, invoices, and password resets"),
    ("SMS & WhatsApp", "Twilio Messaging", "v6.x OTP distribution and delivery dispatch alerts"),
    ("PDF Generation", "pdfkit / ReportLab", "Dynamic invoice generation, delivery challans, and executive audit documentation"),
    ("Containerization", "Docker & Nginx", "Multi-stage production build + Nginx reverse proxy with SSL & gzip"),
    ("Cloud Deployment", "Render.com Live", "Production instances live on onrender.com with automated CI/CD")
]

DATABASES = [
    ("user_db", "17 schemas", "cms_users, cms_roles, cms_modules, cms_panels, otps, saas_products, user_panels, cms_user_scope", "Admin, Warehouse, Accounts, Operations, Developer, BDE portals"),
    ("core_db", "56 schemas", "products, product_templates, solar_kits, combo_kits, combo_kit_variants, warehouse_kit_activations, order_settings, industry_types, project_categories, brands, warehouses, po_settings, commission_rules, moq_rules, website_content, industry_content, geolocation", "Admin, Solar Store, Franchise Portal, SolarShop India"),
    ("india_solarshop_db", "23 schemas", "epc_accounts, cart, offer_masters, request_orders, solarshop_settings, inventory_reservations, reseller_wallets, reseller_ledger, reseller_plan_subscriptions, delivery_order, delivery_route_setting, delivery_service_provider, delivery_vehicle_fleet, delivery_cost_benchmark, solarkits_service_tickets, icici_collection_logs", "Solar Store, Franchise Portal, BDE Portal, Accounts, Operations"),
    ("company_warehouse_db", "14 schemas", "company_warehouses, stock inward logs, SKU serials, DeliveryDriver, DeliveryVehicle, WarehouseStock, WarehouseInward, PoRequest, PurchaseOrder, ValidationField", "Warehouse Panel, Accounts Panel, Operations Dispatch"),
    ("geolocation_db", "5 schemas", "countries, states, districts, multi-state clusters, pincodes, territory boundaries", "All territory-aware and delivery-aware modules"),
    ("supplier_db", "4 schemas", "suppliers, brands, supplier_contracts, bid_records, supply_agreements", "Supplier Portal, Accounts Panel")
]

ROLES = [
    ("Super Admin", "Admin Portal (/admin-panel/*)", "CMS Auth OTP/Email", "Full platform governance, master catalogs, user provisioning, receipt approvals, commissions, territory rules, CMS management"),
    ("Accounts Team", "Accounts Portal (/account-panel/*)", "CMS Auth OTP/Email", "Offline receipt verification, multi-order supplier PO combination & payment, ICICI reconciliation, GST invoicing, supplier registry, Franchise Earning manual bank payouts"),
    ("Warehouse Staff", "Warehouse Portal (/warehouse/*)", "CMS Auth OTP/Email", "Material inward (PO delivery & GRN generation), FIFO stock availability check, outward dispatch, barcode/serial scanning, fleet vehicle & driver tracking, damaged stock adjustments"),
    ("Operations Team", "Operations Portal (/operations/*)", "CMS Auth", "8-stage order delivery management, Delivery Queue (Tab 7), vehicle recommendations, Trip Tracking & POD confirmation (Tab 8)"),
    ("Developer", "Developer Portal (/developer-panel/*)", "CMS Auth", "Module feature toggles, system health telemetry, environment inspection, database query inspection"),
    ("BDE Field Agent", "BDE Portal (Standalone)", "Email / Password JWT", "Field lead creation, franchisee pipeline progression, physical store inspection, monthly target goal tracking"),
    ("Franchise Partner", "Franchise Portal (Standalone)", "Mobile OTP / PIN", "KYC submission, loose kit ordering (1,205 LOC), PO creation, EPC buyer management, wallet earnings, ICICI live stream, service tickets"),
    ("EPC Contractor", "Solar Store (Standalone)", "Email / Password JWT", "Preconfigured combo kits, dynamic BOM customizer, Know My Margin estimator, bulk buy cart, 8-stage order tracking"),
    ("Supplier", "Supplier Portal (API)", "Supplier Auth", "Component catalog submissions, supply contract acceptance, raw material PO fulfillment, Tax Invoice upload")
]

MODULE_COMPLETION = [
    ("Backend API (all 10 domain modules)", "82%", "91%", "+9.0%", "ICICI E-Collection, 8-Stage Delivery, Industry CMS, Quotation & Service Tickets integrated"),
    ("Internal Admin Portal", "70%", "85%", "+15.0%", "Added Delivery Queue, Trip POD Manager, Industry Content CMS, Accounts management"),
    ("BDE Module (Admin + Field)", "78%", "88%", "+10.0%", "Resolved immediate logout bug, bearer token sync, target goal persistence verified"),
    ("Franchise Partner Portal", "75%", "90%", "+15.0%", "LooseOrder.jsx built (1,205 LOC), MyOrders, ServiceTickets, EPC Quotes, ICICI SSE listener"),
    ("Solar Store (Direct EPC)", "72%", "88%", "+16.0%", "Request Order route mapped, Know My Margin calculator, BrowseByIndustry, strictPort"),
    ("SolarShop India Marketplace", "25%", "75%", "+50.0%", "Connected to dynamic Website Content CMS, dynamic industry brochure, full legal suite"),
    ("Kit Activation & Order Settings", "75%", "92%", "+17.0%", "2-stage pipeline: Warehouse 3-gate validation + District sequential fulfillment routing (Sub-WH -> Nearest -> In-Cluster)"),
    ("Payments & Accounts Engine", "85%", "94%", "+9.0%", "Multi-Order Supplier PO combination modal, ICICI Automated E-Collection + Offline Bank Transfer & Verification"),
    ("Warehouse & Logistics Module", "70%", "88%", "+18.0%", "Material Inward GRN logging, supplier PO delivery, FIFO BOM allocation, fleet drivers/vehicles, repair ticket schema"),
    ("Operations & Delivery Module", "30%", "82%", "+52.0%", "8-Stage delivery pipeline, Delivery Queue Tab 7, Trip POD Tab 8, automated vehicle recommendation engine"),
    ("Reports & Logistics Analytics", "60%", "76%", "+16.0%", "BDE conversion funnel, monthly target tracking, delivery TAT and warehouse turnaround metrics"),
    ("Security & Infrastructure", "70%", "84%", "+14.0%", "Strict port binding, session token fallback (7d), NoSQL sanitize, rate limiting"),
    ("OVERALL PLATFORM", "77.0%", "88.5%", "+11.5%", "Production-ready stage; major commercial supply chain, 2-stage kit activation & banking integrations complete")
]

BUGS_REGISTER = [
    {
        "id": "B001",
        "module": "Security",
        "issue": "CORS allow-all override fallback in index.js:45 returns callback(null, true) unconditionally",
        "evidence": "backend/solarkits-central-backend/src/index.js:45",
        "severity": "CRITICAL",
        "status": "Active / In-Progress",
        "resolution_notes": "Origin whitelist is implemented for localhost, 127.0.0.1, 192.168.*, .onrender.com, solar-store, solarkits, and bde. Unconditional fallback should be tightened for strict production mode."
    },
    {
        "id": "B002",
        "module": "Security",
        "issue": "Payment receipts and KYC documents via Cloudinary may use public delivery instead of private signed URLs",
        "evidence": ".env.example CLOUDINARY_KYC_UPLOAD_PRESET commented out",
        "severity": "HIGH",
        "status": "Active / In-Progress",
        "resolution_notes": "Multer file MIME validation and upload pipeline are functional. Recommending enforcement of Cloudinary authenticated/private signed delivery URLs in production."
    },
    {
        "id": "B003",
        "module": "Solar Store (EPC)",
        "issue": "'Request Order' menu item previously had no route mapping in Board.jsx leading to 404",
        "evidence": "customer-apps/solar-store/src/Pages/Board.jsx:148",
        "severity": "MEDIUM",
        "status": "RESOLVED",
        "resolution_notes": "FIXED: Route /request-order is mapped to <ProtectedRoute><BulkOrderCart /></ProtectedRoute> in Board.jsx:148. EPC users can successfully manage bulk cart orders."
    },
    {
        "id": "B004",
        "module": "Franchise Portal",
        "issue": "PlansPortal route was previously commented out in App.jsx",
        "evidence": "customer-apps/solarkits-reseller-portal/src/App.jsx",
        "severity": "MEDIUM",
        "status": "RESOLVED",
        "resolution_notes": "FIXED: Replaced by dedicated /plans/my-subscription route and public /franchise-plans showcase on FranchiseLanding.jsx. Subscription checking is fully operational."
    },
    {
        "id": "B005",
        "module": "Warehouse Logistics",
        "issue": "Material Inward 'Order Inward' tab currently hardcoded with placeholder message and missing backend fulfillment matching",
        "evidence": "internal-admin-portal/src/portals/warehouse/pages/material-inward/MaterialInward.jsx:activeTab === 'supplier'",
        "severity": "HIGH",
        "status": "Active / In-Progress",
        "resolution_notes": "Tab 1 (Inventory Inward PO delivery & GRN) is fully operational. Tab 2 (Order Inward) is currently under active development to automatically match received GRN stock to source customer sales orders before releasing to delivery."
    },
    {
        "id": "B006",
        "module": "Franchise Portal",
        "issue": "LooseOrder.jsx was previously flagged as a 136-byte placeholder stub",
        "evidence": "customer-apps/solarkits-reseller-portal/src/pages/LooseOrder.jsx",
        "severity": "LOW",
        "status": "RESOLVED",
        "resolution_notes": "FIXED: LooseOrder.jsx has been completely built out into a 1,205-line enterprise module with authorized kit selection, quantity presets, EPC allocation, offline payment slip upload, and real-time ICICI payment refresh."
    },
    {
        "id": "B007",
        "module": "Delivery Logistics",
        "issue": "Delivery OTP verification and Proof of Delivery (POD) photo upload UI require mobile/field driver optimization",
        "evidence": "backend/src/modules/admin-panel/models/india_solarshop_db/delivery_order.schema.js",
        "severity": "MEDIUM",
        "status": "Active / In-Progress",
        "resolution_notes": "Backend fields for OTP confirmation and Cloudinary POD image attachment are implemented in delivery_order.schema.js. Field UI workflows in Operations Tab 8 are undergoing final mobile responsiveness polish."
    },
    {
        "id": "B008",
        "module": "Warehouse",
        "issue": "Repair Tickets UI existed but had no backend route or controller in earlier audit",
        "evidence": "backend/src/modules/admin-panel/routes/service_ticket.admin.route.js",
        "severity": "MEDIUM",
        "status": "RESOLVED",
        "resolution_notes": "FIXED: Service ticket and repair module backend routes and Mongoose schemas (solarkits_service_tickets.schema.js) are fully implemented and connected to ServiceTickets.jsx."
    },
    {
        "id": "B009",
        "module": "Operations",
        "issue": "Operations portal UI existed but backend had minimal dispatch endpoints",
        "evidence": "backend/src/modules/admin-panel/controller/delivery.management.handler.js",
        "severity": "HIGH",
        "status": "RESOLVED",
        "resolution_notes": "FIXED: Implemented comprehensive 8-Stage Delivery Management System (delivery.management.route.js, delivery_order.schema.js, Delivery Queue Tab 7, and Trip POD Tab 8)."
    },
    {
        "id": "B010",
        "module": "SolarShop India",
        "issue": "SolarShop India landing page was static with no live API connected",
        "evidence": "customer-apps/solar-store/src/Pages/browse/BrowseByIndustry.jsx",
        "severity": "MEDIUM",
        "status": "RESOLVED",
        "resolution_notes": "FIXED: Connected to dynamic Website Content Management System (industry.content.handler.js, industry_content.schema.js, and BrowseByIndustry.jsx in solar-store and solarshop-india)."
    },
    {
        "id": "B011",
        "module": "Admin Panel",
        "issue": "Admin dashboard Home.jsx displays an UnderConstruction placeholder widget",
        "evidence": "internal-admin-portal/.../admin/pages/dashboard/Home.jsx",
        "severity": "MEDIUM",
        "status": "Active / In-Progress",
        "resolution_notes": "Home.jsx renders UnderConstruction component (progress: 70%). Specialized operational dashboards (Delivery Queue, Accounts, BDE Funnel) are active; central executive KPI dashboard scheduled for next sprint."
    },
    {
        "id": "B012",
        "module": "Documentation",
        "issue": "Legacy documentation referenced old online payment gateway instead of active architecture",
        "evidence": "IT-WEEKPLAN.md, delivery_modules.md, README.md",
        "severity": "MEDIUM",
        "status": "RESOLVED",
        "resolution_notes": "FIXED: All project documentation updated to formally standardize the Hybrid Dual-Track Architecture: Automated ICICI E-Collection (Virtual Accounts) + Offline Bank Transfer & Payment Receipt Verification alongside the 2-Stage Kit Activation & Order Delivery Journey."
    }
]

print("Data definitions module loaded successfully.")
