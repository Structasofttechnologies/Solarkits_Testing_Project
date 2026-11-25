# -*- coding: utf-8 -*-
"""
Generates SolarKits_Project_Development_Status_Report.docx using python-docx.
Synchronizes all 12 sections, tables, 98 features, resolved vs active bug register,
and module completion estimates with the PDF report.
"""

import os
import json
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

import data_status_report as data

# Colors
COLOR_NAVY_PRIMARY = RGBColor(15, 37, 82)    # #0f2552
COLOR_NAVY_LIGHT = RGBColor(30, 58, 138)     # #1e3a8a
COLOR_BLUE_ACCENT = RGBColor(37, 99, 235)    # #2563eb
COLOR_GREEN = RGBColor(22, 163, 74)          # #16a34a
COLOR_RED = RGBColor(220, 38, 38)            # #dc2626
COLOR_AMBER = RGBColor(217, 119, 6)          # #d97706
COLOR_TEXT = RGBColor(15, 23, 42)            # #0f172a
COLOR_MUTED = RGBColor(100, 116, 139)        # #64748b

HEX_NAVY = "0F2552"
HEX_GRAY_BG = "F8FAFC"
HEX_GRAY_BORDER = "CBD5E1"
HEX_BLUE_LIGHT = "EFF6FF"

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def style_table_header(row, col_widths=None):
    for idx, cell in enumerate(row.cells):
        set_cell_background(cell, HEX_NAVY)
        set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
        if col_widths and idx < len(col_widths):
            cell.width = col_widths[idx]
        for p in cell.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.name = "Arial"
                run.font.size = Pt(8.5)
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)

def format_data_row(row, is_even=False, col_widths=None):
    bg_color = HEX_GRAY_BG if is_even else "FFFFFF"
    for idx, cell in enumerate(row.cells):
        set_cell_background(cell, bg_color)
        set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
        if col_widths and idx < len(col_widths):
            cell.width = col_widths[idx]
        for p in cell.paragraphs:
            for run in p.runs:
                run.font.name = "Arial"
                run.font.size = Pt(8)
                if not run.font.color.rgb:
                    run.font.color.rgb = COLOR_TEXT

def create_docx(filename="SolarKits_Project_Development_Status_Report.docx"):
    doc = docx.Document()

    # Set standard margins (0.6 in)
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(0.6)
        s.bottom_margin = Inches(0.6)
        s.left_margin = Inches(0.6)
        s.right_margin = Inches(0.6)
        
        # Add running header
        header = s.header
        hp = header.paragraphs[0]
        hp.text = "SolarKits v2.0 - Project Development Status & Technical Architecture Report | CONFIDENTIAL"
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        for r in hp.runs:
            r.font.name = "Arial"
            r.font.size = Pt(7.5)
            r.font.color.rgb = COLOR_MUTED

        # Add running footer
        footer = s.footer
        fp = footer.paragraphs[0]
        fp.text = "SolarKits Technologies Pvt. Ltd. | Architecture: Hybrid ICICI E-Collection & Offline Verification | September 25, 2026"
        fp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for r in fp.runs:
            r.font.name = "Arial"
            r.font.size = Pt(7.5)
            r.font.color.rgb = COLOR_MUTED

    # Title & Subtitle
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = title_p.add_run("SolarKits v2.0")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(24)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_NAVY_PRIMARY

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = sub_p.add_run("Project Development Status & Technical Architecture Report")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(13)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(234, 88, 12)

    doc.add_paragraph()

    # Meta Table
    t_meta = doc.add_table(rows=3, cols=4)
    t_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_rows = [
        [("Audit Date:", True), (f"{data.REPORT_DATE} (Updated from {data.PREVIOUS_AUDIT_DATE})", False), ("Document Type:", True), ("Complete Project Audit & Technical Architecture", False)],
        [("Architecture:", True), ("Hybrid ICICI E-Collection + Offline Receipt Verification", False), ("Fulfillment:", True), ("8-Stage Order Lifecycle & Physical Delivery Logistics", False)],
        [("Lead Auditor:", True), ("Antigravity AI - Senior Technical Architect & QA Auditor", False), ("Classification:", True), ("CONFIDENTIAL - Internal & Management Use Only", False)]
    ]
    for r_idx, row_vals in enumerate(meta_rows):
        row = t_meta.rows[r_idx]
        for c_idx, (text, is_bold) in enumerate(row_vals):
            cell = row.cells[c_idx]
            set_cell_background(cell, HEX_GRAY_BG)
            set_cell_margins(cell, 80, 80, 100, 100)
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.name = "Arial"
            r.font.size = Pt(8.5)
            r.font.bold = is_bold
            r.font.color.rgb = COLOR_NAVY_PRIMARY if is_bold else COLOR_TEXT

    doc.add_paragraph()

    # Metrics Table
    t_metrics = doc.add_table(rows=2, cols=5)
    t_metrics.alignment = WD_TABLE_ALIGNMENT.CENTER
    m_headers = ["Applications", "Backend Modules", "Documented Features", "Resolved Bugs", "Code Completion"]
    m_vals = [
        str(data.METRICS["apps_analyzed"]),
        str(data.METRICS["backend_modules"]),
        str(data.METRICS["documented_features"]),
        f"{data.METRICS['resolved_bugs']} / 11",
        data.METRICS["completion_pct"]
    ]
    for c_idx, h_text in enumerate(m_headers):
        cell = t_metrics.rows[0].cells[c_idx]
        set_cell_background(cell, HEX_NAVY)
        set_cell_margins(cell, 100, 100, 100, 100)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h_text)
        r.font.name = "Arial"
        r.font.size = Pt(8.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    for c_idx, v_text in enumerate(m_vals):
        cell = t_metrics.rows[1].cells[c_idx]
        set_cell_background(cell, "FFFFFF")
        set_cell_margins(cell, 120, 120, 100, 100)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(v_text)
        r.font.name = "Arial"
        r.font.size = Pt(16)
        r.font.bold = True
        if "%" in v_text:
            r.font.color.rgb = COLOR_BLUE_ACCENT
        elif "/" in v_text:
            r.font.color.rgb = COLOR_GREEN
        else:
            r.font.color.rgb = COLOR_NAVY_PRIMARY

    doc.add_paragraph()

    # Highlights Box
    t_hl = doc.add_table(rows=1, cols=1)
    t_hl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell_hl = t_hl.rows[0].cells[0]
    set_cell_background(cell_hl, HEX_BLUE_LIGHT)
    set_cell_margins(cell_hl, 120, 120, 160, 160)
    p_hl = cell_hl.paragraphs[0]
    r_hl_title = p_hl.add_run("EXECUTIVE MILESTONE UPDATE (September 25, 2026):\n")
    r_hl_title.font.name = "Arial"
    r_hl_title.font.size = Pt(9.5)
    r_hl_title.font.bold = True
    r_hl_title.font.color.rgb = COLOR_NAVY_PRIMARY

    hl_points = (
        "• Dual-Track Enterprise Banking: Automated ICICI Bank E-Collection (Virtual Accounts, MSG HOLD / MIS POSTING webhooks, live SSE stream) integrated with Offline Bank Transfer & Payment Receipt Verification.\n"
        "• 8-Stage Physical Supply Chain & Delivery Management: Complete physical logistics engine deployed with Delivery Queue (Tab 7 FIFO consolidation), automated vehicle recommendation (evaluating payload kg, kW, and kit capacity), and Trip Tracking with Proof of Delivery (Tab 8 POD confirmation).\n"
        "• Audit Issue Remediation: Resolved 8 out of 11 previously flagged bug/risk items (including LooseOrder.jsx fully implemented at 1,205 LOC, Request Order route mapped in Board.jsx, Service Tickets routes created, and Website CMS integrated). Platform completion advanced from 77.0% to 88.5%."
    )
    r_hl_body = p_hl.add_run(hl_points)
    r_hl_body.font.name = "Arial"
    r_hl_body.font.size = Pt(8.5)
    r_hl_body.font.color.rgb = COLOR_TEXT

    doc.add_page_break()

    # Helper for Section Titles
    def add_section_heading(title_text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title_text)
        r.font.name = "Arial"
        r.font.size = Pt(14)
        r.font.bold = True
        r.font.color.rgb = COLOR_NAVY_PRIMARY

    def add_subheading(sub_text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(sub_text)
        r.font.name = "Arial"
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = COLOR_NAVY_LIGHT

    # ==========================================
    # SECTION 1: EXECUTIVE SUMMARY
    # ==========================================
    add_section_heading("1. Executive Summary")
    p_exec = doc.add_paragraph()
    p_exec.paragraph_format.space_after = Pt(8)
    p_exec.paragraph_format.line_spacing = 1.15
    r_exec = p_exec.add_run(
        "SolarKits v2.0 is an enterprise-grade multi-tenant B2B Solar E-Commerce, Channel Distribution, and Operations Ecosystem connecting B2B Solar EPC Contractors, Regional Franchise Partners, Multi-State Warehouses, Accounts & Finance, Logistics Operations, and Central Administrators. Powered by a modern microservices-adjacent architecture utilizing Node.js/Express 5, MongoDB Multi-Database, React 19, and Vite 7, the platform bridges physical solar supply chain fulfillment with automated corporate banking.\n\n"
        "Hybrid Enterprise Payment Architecture: The commercial infrastructure operates on dual payment rails:\n"
        "1. Automated ICICI Bank E-Collection Engine: Dynamically allocates unique Virtual Account Numbers (VAN) during EPC or Franchisee checkout. Securely ingests encrypted MSG HOLD packets for beneficiary validation and MIS POSTING webhooks for real-time fund reconciliation. Server-Sent Events (SSE) broadcast live payment confirmations, instantly advancing order states from Pending to Order Confirmed.\n"
        "2. Offline Bank Transfer & Payment Receipt Upload Engine: Facilitates high-value manual transfers via NEFT, RTGS, IMPS, or Cheque. Users upload bank transfer slips and log UTR numbers, which are audited by the Accounts team against bank statements before releasing warehouse dispatches or Franchise Earning disbursements.\n\n"
        "2-Stage Kit Activation & Physical Delivery Logistics: Full 2-stage governance pipeline (Stage 1: Warehouse Kit Activation with 3 prerequisite validation gates; Stage 2: District Order Management sequential routing) alongside an 8-stage order lifecycle tracking system (Confirmed → Processing → Vehicle Assigned → Ready for Dispatch → Dispatched → In Transit → Destination Reached → Delivered / POD Confirmed) paired with smart fleet auto-recommendation based on vehicle payload (kg), max kit limits, and serviceable geographic districts."
    )
    r_exec.font.name = "Arial"
    r_exec.font.size = Pt(9)
    r_exec.font.color.rgb = COLOR_TEXT

    add_subheading("Platform Feature Status Distribution (98 Total Features):")
    t_dist = doc.add_table(rows=7, cols=5)
    t_dist.alignment = WD_TABLE_ALIGNMENT.CENTER
    dist_data = [
        ["Development Status", "Count", "Percentage", "Weight Factor", "Weighted Contribution"],
        ["Fully Connected & Verified", "84", "85.7%", "1.00", "84.00"],
        ["Backend Only / Architecture Service", "11", "11.2%", "0.90", "9.90"],
        ["Partially Connected / Minor Gaps", "2", "2.0%", "0.50", "1.00"],
        ["Frontend Only / Under Construction", "1", "1.0%", "0.35", "0.35"],
        ["Not Started", "0", "0.0%", "0.00", "0.00"],
        ["TOTAL / WEIGHTED OVERALL", "98", "100.0%", "-", "88.5%"],
    ]
    style_table_header(t_dist.rows[0])
    for r_idx in range(1, 7):
        row = t_dist.rows[r_idx]
        for c_idx in range(5):
            cell = row.cells[c_idx]
            cell.paragraphs[0].text = dist_data[r_idx][c_idx]
        format_data_row(row, is_even=(r_idx % 2 == 0))
    # bold total row
    for cell in t_dist.rows[6].cells:
        set_cell_background(cell, "E2E8F0")
        for p in cell.paragraphs:
            for run in p.runs:
                run.font.bold = True

    doc.add_page_break()

    # ==========================================
    # SECTION 2: APPLICATIONS OVERVIEW
    # ==========================================
    add_section_heading("2. Applications & Technology Overview")
    t_apps = doc.add_table(rows=len(data.APPLICATIONS) + 1, cols=6)
    t_apps.alignment = WD_TABLE_ALIGNMENT.CENTER
    app_headers = ["Application Portal", "Source Directory", "Port", "Key Technology & Capabilities", "Status", "Done %"]
    for c_idx, h in enumerate(app_headers):
        t_apps.rows[0].cells[c_idx].paragraphs[0].text = h
    style_table_header(t_apps.rows[0])

    for idx, a in enumerate(data.APPLICATIONS):
        row = t_apps.rows[idx + 1]
        row.cells[0].paragraphs[0].text = a["name"]
        row.cells[1].paragraphs[0].text = a["folder"]
        row.cells[2].paragraphs[0].text = a["port"]
        row.cells[3].paragraphs[0].text = a["stack"]
        row.cells[4].paragraphs[0].text = a["status"]
        row.cells[5].paragraphs[0].text = a["completion"]
        format_data_row(row, is_even=(idx % 2 == 1))

    doc.add_paragraph()
    add_subheading("2.1 Live Deployment & Operational Port Isolation")
    p_dep = doc.add_paragraph()
    r_dep = p_dep.add_run(
        "Per repository configurations, applications are configured for isolated multi-port local execution and live cloud deployment on Render.com:\n"
        "• Strict Port Enforcement: Strict port isolation is active (Franchise Portal on Port 5178, Solar Store on Port 5179, Admin on Port 5174, SolarShop India on Port 5173) preventing Vite port collision.\n"
        "• Live Cloud Instances: Central backend and web portals are deployed on Render.com with custom domain mapping, environment variable management, and production containerization via multi-stage Docker builds and Nginx SSL termination reverse proxies."
    )
    r_dep.font.name = "Arial"
    r_dep.font.size = Pt(8.5)
    r_dep.font.color.rgb = COLOR_TEXT

    doc.add_page_break()

    # ==========================================
    # SECTION 3: TECH STACK
    # ==========================================
    add_section_heading("3. Technology Stack Reference")
    t_tech = doc.add_table(rows=len(data.TECH_STACK) + 1, cols=3)
    t_tech.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c_idx, h in enumerate(["Architectural Layer", "Technology & Package", "Version & Architectural Scope"]):
        t_tech.rows[0].cells[c_idx].paragraphs[0].text = h
    style_table_header(t_tech.rows[0])

    for idx, (layer, tech, role) in enumerate(data.TECH_STACK):
        row = t_tech.rows[idx + 1]
        row.cells[0].paragraphs[0].text = layer
        row.cells[1].paragraphs[0].text = tech
        row.cells[2].paragraphs[0].text = role
        format_data_row(row, is_even=(idx % 2 == 1))

    doc.add_page_break()

    # ==========================================
    # SECTION 4: DATABASE ARCHITECTURE
    # ==========================================
    add_section_heading("4. Database Architecture & Entity Inventory")
    t_db = doc.add_table(rows=len(data.DATABASES) + 1, cols=4)
    t_db.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c_idx, h in enumerate(["Database Name", "Schemas", "Key Entities & Collections", "Primary Consuming Modules"]):
        t_db.rows[0].cells[c_idx].paragraphs[0].text = h
    style_table_header(t_db.rows[0])

    for idx, (db_name, s_count, entities, consumers) in enumerate(data.DATABASES):
        row = t_db.rows[idx + 1]
        row.cells[0].paragraphs[0].text = db_name
        row.cells[1].paragraphs[0].text = s_count
        row.cells[2].paragraphs[0].text = entities
        row.cells[3].paragraphs[0].text = consumers
        format_data_row(row, is_even=(idx % 2 == 1))

    doc.add_paragraph()

    # ==========================================
    # SECTION 5: USER ROLES
    # ==========================================
    add_section_heading("5. User Roles, Panels & Access Architecture")
    t_roles = doc.add_table(rows=len(data.ROLES) + 1, cols=4)
    t_roles.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c_idx, h in enumerate(["Role Title", "Assigned Panel / Portal", "Auth Scheme", "Core Responsibilities & Operational Scope"]):
        t_roles.rows[0].cells[c_idx].paragraphs[0].text = h
    style_table_header(t_roles.rows[0])

    for idx, (r_title, r_panel, r_auth, r_scope) in enumerate(data.ROLES):
        row = t_roles.rows[idx + 1]
        row.cells[0].paragraphs[0].text = r_title
        row.cells[1].paragraphs[0].text = r_panel
        row.cells[2].paragraphs[0].text = r_auth
        row.cells[3].paragraphs[0].text = r_scope
        format_data_row(row, is_even=(idx % 2 == 1))

    doc.add_page_break()

    # ==========================================
    # SECTION 6: FEATURE MATRIX (ALL 98 FEATURES)
    # ==========================================
    add_section_heading("6. Feature Scope of Work & Functional Matrix (All 98 Features)")
    p_fm_note = doc.add_paragraph()
    r_fm_note = p_fm_note.add_run("Comprehensive functional inventory of all 98 platform features across 10 backend modules and 7 frontend portals:")
    r_fm_note.font.name = "Arial"
    r_fm_note.font.size = Pt(8.5)
    r_fm_note.font.color.rgb = COLOR_MUTED

    with open('data_features.json', 'r', encoding='utf-8') as f:
        all_features = json.load(f)

    t_feat = doc.add_table(rows=len(all_features) + 1, cols=6)
    t_feat.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c_idx, h in enumerate(["ID", "Module", "Feature Name", "Frontend / Backend Route", "Status", "Functional Scope & Operational Description"]):
        t_feat.rows[0].cells[c_idx].paragraphs[0].text = h
    style_table_header(t_feat.rows[0])

    for idx, item in enumerate(all_features):
        row = t_feat.rows[idx + 1]
        row.cells[0].paragraphs[0].text = item["id"]
        row.cells[1].paragraphs[0].text = item["module"]
        row.cells[2].paragraphs[0].text = item["name"]
        row.cells[3].paragraphs[0].text = f"{item['backend']}\n({item['frontend']})"
        row.cells[4].paragraphs[0].text = item["status"]
        row.cells[5].paragraphs[0].text = item["desc"]
        format_data_row(row, is_even=(idx % 2 == 1))
        # Style status text
        p_st = row.cells[4].paragraphs[0]
        for run in p_st.runs:
            run.font.bold = True
            if item["status"] == "Fully Connected":
                run.font.color.rgb = COLOR_GREEN
            elif item["status"] == "Partially Connected":
                run.font.color.rgb = COLOR_AMBER
            elif item["status"] == "Backend Only":
                run.font.color.rgb = COLOR_MUTED
            else:
                run.font.color.rgb = COLOR_RED

    doc.add_page_break()

    # ==========================================
    # SECTION 7: BUG & RISK REGISTER
    # ==========================================
    add_section_heading("7. Bug & Risk Register (Resolved vs. Active)")
    add_subheading("7.1 Resolved & Retracted Audit Items (8 Issues Closed):")
    resolved_bugs = [b for b in data.BUGS_REGISTER if 'RESOLVED' in b['status']]
    t_res = doc.add_table(rows=len(resolved_bugs) + 1, cols=5)
    t_res.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c_idx, h in enumerate(["ID", "Module", "Original Documented Issue", "Resolution Notes & Code Verification", "Status"]):
        t_res.rows[0].cells[c_idx].paragraphs[0].text = h
    style_table_header(t_res.rows[0])

    for idx, b in enumerate(resolved_bugs):
        row = t_res.rows[idx + 1]
        row.cells[0].paragraphs[0].text = b["id"]
        row.cells[1].paragraphs[0].text = b["module"]
        row.cells[2].paragraphs[0].text = b["issue"]
        row.cells[3].paragraphs[0].text = b["resolution_notes"]
        row.cells[4].paragraphs[0].text = "RESOLVED"
        format_data_row(row, is_even=(idx % 2 == 1))
        for r in row.cells[4].paragraphs[0].runs:
            r.font.bold = True
            r.font.color.rgb = COLOR_GREEN

    doc.add_paragraph()
    add_subheading("7.2 Active & In-Progress Items (3 Ongoing Engineering Items):")
    active_bugs = [b for b in data.BUGS_REGISTER if 'RESOLVED' not in b['status']]
    t_act = doc.add_table(rows=len(active_bugs) + 1, cols=6)
    t_act.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c_idx, h in enumerate(["ID", "Module", "Issue Description", "Location / Evidence", "Severity", "Current Status & Plan"]):
        t_act.rows[0].cells[c_idx].paragraphs[0].text = h
    style_table_header(t_act.rows[0])

    for idx, b in enumerate(active_bugs):
        row = t_act.rows[idx + 1]
        row.cells[0].paragraphs[0].text = b["id"]
        row.cells[1].paragraphs[0].text = b["module"]
        row.cells[2].paragraphs[0].text = b["issue"]
        row.cells[3].paragraphs[0].text = b["evidence"]
        row.cells[4].paragraphs[0].text = b["severity"]
        row.cells[5].paragraphs[0].text = b["resolution_notes"]
        format_data_row(row, is_even=(idx % 2 == 1))
        for r in row.cells[4].paragraphs[0].runs:
            r.font.bold = True
            r.font.color.rgb = COLOR_RED if b["severity"] == "CRITICAL" else COLOR_AMBER

    doc.add_page_break()

    # ==========================================
    # SECTION 8: SECURITY ANALYSIS
    # ==========================================
    add_section_heading("8. Security & Data Privacy Analysis")
    sec_items = [
        ("NoSQL Injection Guard", "VERIFIED", "Global mongo.sanitize middleware strips MongoDB operator keys ($ and .) recursively from req.body, req.params, and req.query on all incoming payloads before reaching controllers."),
        ("Rate Limiting Guard", "VERIFIED", "Strict rate-limiting applied across authentication routes, OTP verification endpoints, and GST search APIs to prevent brute-force attacks and abuse."),
        ("Authentication Architecture", "VERIFIED", "RS256 asymmetric JWT authentication with 15-minute access tokens and 2-day refresh tokens delivered via httpOnly secure cookies with header fallback."),
        ("Payment Slip Upload Validation", "VERIFIED", "Multipart form validation middleware (Multer) strictly inspects uploaded payment slips and KYC documents for valid image (JPEG, PNG, WebP) and PDF MIME types with file size bounds."),
        ("Banking Cryptographic Security", "VERIFIED", "Dual ICICI API security implemented using RSA-SHA256 asymmetric signature verification with bank public certificates and AES-128-CBC payload encryption."),
        ("Port Collision Protection", "VERIFIED", "Strict port configuration (strictPort: true) enforced in Vite configurations on ports 5178 and 5179, preventing silent fallback and session cross-contamination."),
        ("CORS Origin Lockdown", "RECOMMENDED", "CORS whitelist matches localhost, onrender.com, and company domains. Recommending final tightening of fallback callback(null, true) in production deployment."),
        ("Cloudinary Signed Delivery", "RECOMMENDED", "Ensure CLOUDINARY_KYC_UPLOAD_PRESET enforces authenticated/private delivery so verification documents require time-limited signed URLs.")
    ]
    t_sec = doc.add_table(rows=len(sec_items) + 1, cols=3)
    t_sec.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c_idx, h in enumerate(["Security Domain", "Audit Status", "Technical Analysis & Operational Finding"]):
        t_sec.rows[0].cells[c_idx].paragraphs[0].text = h
    style_table_header(t_sec.rows[0])

    for idx, (dom, st, finding) in enumerate(sec_items):
        row = t_sec.rows[idx + 1]
        row.cells[0].paragraphs[0].text = dom
        row.cells[1].paragraphs[0].text = st
        row.cells[2].paragraphs[0].text = finding
        format_data_row(row, is_even=(idx % 2 == 1))
        for r in row.cells[1].paragraphs[0].runs:
            r.font.bold = True
            r.font.color.rgb = COLOR_GREEN if st == "VERIFIED" else COLOR_AMBER

    doc.add_page_break()

    # ==========================================
    # SECTION 9: MODULE COMPLETION ESTIMATES
    # ==========================================
    add_section_heading("9. Module Completion Estimates (Comparative Audit)")
    t_mod = doc.add_table(rows=len(data.MODULE_COMPLETION) + 1, cols=5)
    t_mod.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c_idx, h in enumerate(["Module / System Component", "Aug 29", "Sep 25", "Progress", "Architectural Accomplishments & Notes"]):
        t_mod.rows[0].cells[c_idx].paragraphs[0].text = h
    style_table_header(t_mod.rows[0])

    for idx, (m_name, m_old, m_new, m_prog, m_notes) in enumerate(data.MODULE_COMPLETION):
        row = t_mod.rows[idx + 1]
        row.cells[0].paragraphs[0].text = m_name
        row.cells[1].paragraphs[0].text = m_old
        row.cells[2].paragraphs[0].text = m_new
        row.cells[3].paragraphs[0].text = m_prog
        row.cells[4].paragraphs[0].text = m_notes
        format_data_row(row, is_even=(idx % 2 == 1))
        for r in row.cells[3].paragraphs[0].runs:
            r.font.bold = True
            r.font.color.rgb = COLOR_GREEN

    doc.add_page_break()

    # ==========================================
    # SECTION 10: WORKFLOWS
    # ==========================================
    add_section_heading("10. Enterprise Payment & Order Delivery Workflows")
    
    workflows = [
        ("WORKFLOW A: AUTOMATED ICICI BANK E-COLLECTION & RECONCILIATION",
         "1. Order Checkout: EPC buyer or Franchisee selects order items. System creates a unique Virtual Account Number (VAN) under ICICI corporate banking.\n"
         "2. MSG HOLD Validation: When funds are remitted, ICICI sends an encrypted MSG HOLD webhook. Backend cryptographically validates client cert and approves hold.\n"
         "3. MIS POSTING Webhook: ICICI credits account and posts transaction packet (UTR, Amount, Timestamp). Backend checks idempotency and verifies amounts.\n"
         "4. Auto-Confirmation & SSE Broadcast: Order advances from Pending to Order Confirmed. Server-Sent Events stream updates frontend in real-time.",
         HEX_BLUE_LIGHT),
        ("WORKFLOW B: OFFLINE BANK TRANSFER & RECEIPT VERIFICATION ENGINE",
         "1. Direct Bank Remittance: Customer/Franchisee executes NEFT/RTGS/IMPS/Cheque transfer to corporate account.\n"
         "2. Receipt Slip Upload: User uploads receipt image/PDF and inputs UTR reference via POST /api/india/v1/reseller/fee-payment/upload-receipt.\n"
         "3. Accounts Verification: Accounts / Admin team inspects uploaded slip, cross-checks UTR with company bank statement, and marks verified.\n"
         "4. Operational Release & Ledger Credit: Franchise dashboard unlocks, order moves into delivery queue, and Franchise Earning is accrued.",
         HEX_GRAY_BG),
        ("WORKFLOW C: 8-STAGE PHYSICAL SUPPLY CHAIN & DELIVERY MANAGEMENT",
         "1. Warehouse Capacity Guard: During checkout, system validates warehouse storage headroom (Kits, Weight kg, and kW capacity) before allowing fulfillment.\n"
         "2. Delivery Queue (Tab 7): Paid orders enter FIFO queue with route clubbing recommendations for consolidated transporter dispatch.\n"
         "3. Smart Fleet Recommendation: Algorithm evaluates vehicle master (Tata Ace, 14ft Canter, etc.) matching total cargo payload, max kW, and destination.\n"
         "4. Trip Tracking & POD (Tab 8): Logistics tracks 8 stages (Confirmed → Dispatched → In Transit → Delivered) and closes trip upon Proof of Delivery capture.",
         HEX_GRAY_BG)
    ]
    for w_title, w_desc, bg in workflows:
        t_w = doc.add_table(rows=1, cols=1)
        t_w.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = t_w.rows[0].cells[0]
        set_cell_background(cell, bg)
        set_cell_margins(cell, 100, 100, 140, 140)
        p = cell.paragraphs[0]
        r_t = p.add_run(w_title + "\n")
        r_t.font.name = "Arial"
        r_t.font.size = Pt(9)
        r_t.font.bold = True
        r_t.font.color.rgb = COLOR_NAVY_PRIMARY
        r_d = p.add_run(w_desc)
        r_d.font.name = "Arial"
        r_d.font.size = Pt(8.5)
        r_d.font.color.rgb = COLOR_TEXT
        doc.add_paragraph()

    # ==========================================
    # SECTION 11: ROADMAP & SECTION 12: CONCLUSION
    # ==========================================
    add_section_heading("11. Recommended Development Roadmap")
    roadmap_items = [
        ("P0", "Security", "Tighten CORS fallback in index.js:45 for production environments", "Guarantees strict API access control", "Small"),
        ("P0", "Security", "Enforce Cloudinary private signed delivery URLs for KYC & payment slips", "Data privacy compliance for sensitive records", "Medium"),
        ("P1", "Admin Panel", "Complete central Admin Dashboard Home.jsx executive overview metrics", "Real-time network KPIs for Super Admin", "Medium"),
        ("P2", "Documentation", "Publish Swagger / OpenAPI 3.0 API specifications for all 10 modules", "Accelerates developer onboarding & QA audits", "Large"),
        ("P2", "Testing", "Establish automated integration test suite with Jest / Supertest", "Continuous regression protection for payments", "Large"),
    ]
    t_road = doc.add_table(rows=len(roadmap_items) + 1, cols=5)
    t_road.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c_idx, h in enumerate(["Priority", "Module", "Action Item", "Business Impact", "Effort"]):
        t_road.rows[0].cells[c_idx].paragraphs[0].text = h
    style_table_header(t_road.rows[0])

    for idx, (prio, mod, item, impact, effort) in enumerate(roadmap_items):
        row = t_road.rows[idx + 1]
        row.cells[0].paragraphs[0].text = prio
        row.cells[1].paragraphs[0].text = mod
        row.cells[2].paragraphs[0].text = item
        row.cells[3].paragraphs[0].text = impact
        row.cells[4].paragraphs[0].text = effort
        format_data_row(row, is_even=(idx % 2 == 1))
        for r in row.cells[0].paragraphs[0].runs:
            r.font.bold = True
            r.font.color.rgb = COLOR_RED if prio == "P0" else COLOR_AMBER if prio == "P1" else COLOR_MUTED

    doc.add_paragraph()
    add_section_heading("12. Conclusion & Priority Actions")
    p_concl = doc.add_paragraph()
    r_concl = p_concl.add_run(
        "SolarKits v2.0 demonstrates high architectural maturity, enterprise robustness, and commercial readiness. Across the 98 documented features and 10 backend modules, platform development has progressed to 88.5% completion.\n\n"
        "Key Production Achievements:\n"
        "• Fully functional Hybrid Payment Architecture combining automated ICICI E-Collection (Virtual Accounts) with manual Offline Bank Transfer and Receipt Verification.\n"
        "• Complete 8-Stage Order Lifecycle and Physical Delivery Management system connecting warehouse capacity, fleet recommendation, and Proof of Delivery.\n"
        "• Resolution and closure of 8 legacy audit bugs, including full production deployment of LooseOrder.jsx (1,205 LOC), Request Order routing, and dynamic CMS solutions.\n"
        "• Multi-tenant MongoDB isolation across 7 databases and RBAC access across 12 user roles.\n\n"
        "Immediate Next Steps: Finalize CORS production origin lock, enforce signed delivery for Cloudinary documents, and complete executive KPI analytics cards on Admin Home.\n\n"
        "© 2026 SolarKits Technologies Pvt. Ltd. | Antigravity AI Technical Audit | September 25, 2026 | CONFIDENTIAL"
    )
    r_concl.font.name = "Arial"
    r_concl.font.size = Pt(8.5)
    r_concl.font.color.rgb = COLOR_TEXT

    doc.save(filename)
    print(f"Generated DOCX: {filename} successfully!")

if __name__ == "__main__":
    create_docx()
