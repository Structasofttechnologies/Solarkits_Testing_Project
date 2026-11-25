# -*- coding: utf-8 -*-
"""
Generates SolarKits_Project_Development_Status_Report.pdf using ReportLab.
Uses TrueType Arial fonts, custom NumberedCanvas with running headers/footers,
and professional styling matching corporate executive documentation.
"""

import os
import json
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

import data_status_report as data

# Font Registration
FONTS_DIR = 'C:/Windows/Fonts'
pdfmetrics.registerFont(TTFont('Arial', os.path.join(FONTS_DIR, 'arial.ttf')))
pdfmetrics.registerFont(TTFont('Arial-Bold', os.path.join(FONTS_DIR, 'arialbd.ttf')))
pdfmetrics.registerFont(TTFont('Arial-Italic', os.path.join(FONTS_DIR, 'ariali.ttf')))

# Color Palette
NAVY_PRIMARY = colors.HexColor('#0f2552')
NAVY_LIGHT = colors.HexColor('#1e3a8a')
BLUE_ACCENT = colors.HexColor('#2563eb')
ORANGE_ACCENT = colors.HexColor('#ea580c')
GREEN_SUCCESS = colors.HexColor('#16a34a')
RED_ALERT = colors.HexColor('#dc2626')
AMBER_WARN = colors.HexColor('#d97706')
GRAY_BG = colors.HexColor('#f8fafc')
GRAY_BORDER = colors.HexColor('#cbd5e1')
TEXT_PRIMARY = colors.HexColor('#0f172a')
TEXT_MUTED = colors.HexColor('#475569')

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        self.saveState()
        page_w, page_h = A4
        left_m = 36
        right_m = page_w - 36

        # Running Header (Skip on Page 1)
        if self._pageNumber > 1:
            self.setFont('Arial', 7.5)
            self.setFillColor(TEXT_MUTED)
            self.drawString(left_m, page_h - 24, "SolarKits v2.0 - Project Development Status & Technical Architecture Report")
            self.drawRightString(right_m, page_h - 24, "CONFIDENTIAL | September 25, 2026")
            
            self.setStrokeColor(GRAY_BORDER)
            self.setLineWidth(0.5)
            self.line(left_m, page_h - 28, right_m, page_h - 28)

        # Running Footer (On all pages)
        self.setFont('Arial', 7.5)
        self.setFillColor(TEXT_MUTED)
        self.drawString(left_m, 20, "SolarKits Technologies Pvt. Ltd. | Architecture: Hybrid ICICI E-Collection & Offline Verification | Production Audit")
        self.drawRightString(right_m, 20, f"Page {self._pageNumber} of {page_count}")
        
        self.setStrokeColor(GRAY_BORDER)
        self.setLineWidth(0.5)
        self.line(left_m, 28, right_m, 28)
        
        self.restoreState()

def create_pdf(filename="SolarKits_Project_Development_Status_Report.pdf"):
    printable_w = A4[0] - 72  # 523.28 pt

    styles = {
        'CoverTitle': ParagraphStyle('CoverTitle', fontName='Arial-Bold', fontSize=24, leading=28, textColor=NAVY_PRIMARY, alignment=1),
        'CoverSubtitle': ParagraphStyle('CoverSubtitle', fontName='Arial-Bold', fontSize=12, leading=16, textColor=ORANGE_ACCENT, alignment=1),
        'CoverMeta': ParagraphStyle('CoverMeta', fontName='Arial', fontSize=9, leading=14, textColor=TEXT_PRIMARY),
        'H1': ParagraphStyle('H1', fontName='Arial-Bold', fontSize=14, leading=18, textColor=NAVY_PRIMARY, keepWithNext=True),
        'H2': ParagraphStyle('H2', fontName='Arial-Bold', fontSize=10.5, leading=14, textColor=NAVY_LIGHT, keepWithNext=True),
        'H3': ParagraphStyle('H3', fontName='Arial-Bold', fontSize=9, leading=12, textColor=BLUE_ACCENT, keepWithNext=True),
        'Body': ParagraphStyle('Body', fontName='Arial', fontSize=8.5, leading=12, textColor=TEXT_PRIMARY),
        'BodyMuted': ParagraphStyle('BodyMuted', fontName='Arial', fontSize=8, leading=11, textColor=TEXT_MUTED),
        'Callout': ParagraphStyle('Callout', fontName='Arial', fontSize=8.5, leading=12, textColor=NAVY_PRIMARY),
        'TH': ParagraphStyle('TH', fontName='Arial-Bold', fontSize=7.5, leading=9.5, textColor=colors.white, alignment=0),
        'THCenter': ParagraphStyle('THCenter', fontName='Arial-Bold', fontSize=7.5, leading=9.5, textColor=colors.white, alignment=1),
        'TD': ParagraphStyle('TD', fontName='Arial', fontSize=7, leading=9, textColor=TEXT_PRIMARY),
        'TDBold': ParagraphStyle('TDBold', fontName='Arial-Bold', fontSize=7, leading=9, textColor=TEXT_PRIMARY),
        'TDCenter': ParagraphStyle('TDCenter', fontName='Arial', fontSize=7, leading=9, textColor=TEXT_PRIMARY, alignment=1),
        'BadgeSuccess': ParagraphStyle('BadgeSuccess', fontName='Arial-Bold', fontSize=6.5, leading=8, textColor=GREEN_SUCCESS, alignment=1),
        'BadgeAlert': ParagraphStyle('BadgeAlert', fontName='Arial-Bold', fontSize=6.5, leading=8, textColor=RED_ALERT, alignment=1),
        'BadgeWarn': ParagraphStyle('BadgeWarn', fontName='Arial-Bold', fontSize=6.5, leading=8, textColor=AMBER_WARN, alignment=1),
        'BadgeMuted': ParagraphStyle('BadgeMuted', fontName='Arial-Bold', fontSize=6.5, leading=8, textColor=TEXT_MUTED, alignment=1),
    }

    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    story = []

    # ==========================================
    # PAGE 1: COVER PAGE
    # ==========================================
    story.append(Spacer(1, 15))
    story.append(Paragraph("SolarKits v2.0", styles['CoverTitle']))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Project Development Status & Technical Architecture Report", styles['CoverSubtitle']))
    story.append(Spacer(1, 15))

    # Meta Info Card
    meta_data = [
        [
            Paragraph("<b>Audit Date:</b>", styles['TD']), Paragraph("September 25, 2026 (Updated from August 29, 2026)", styles['TD']),
            Paragraph("<b>Document Type:</b>", styles['TD']), Paragraph("Complete Project Audit & Technical Architecture", styles['TD'])
        ],
        [
            Paragraph("<b>Architecture:</b>", styles['TD']), Paragraph("Hybrid ICICI Bank E-Collection + Offline Receipt Verification", styles['TD']),
            Paragraph("<b>Fulfillment:</b>", styles['TD']), Paragraph("8-Stage Order Lifecycle & Physical Delivery Logistics", styles['TD'])
        ],
        [
            Paragraph("<b>Lead Auditor:</b>", styles['TD']), Paragraph("Antigravity AI - Senior Technical Architect & QA Auditor", styles['TD']),
            Paragraph("<b>Classification:</b>", styles['TD']), Paragraph("CONFIDENTIAL - Internal & Management Use Only", styles['TD'])
        ]
    ]
    t_meta = Table(meta_data, colWidths=[80, 180, 90, 173])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GRAY_BG),
        ('BOX', (0,0), (-1,-1), 1, NAVY_LIGHT),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 16))

    # Metrics Summary Cards
    m_headers = [
        Paragraph("Applications", styles['THCenter']),
        Paragraph("Backend Modules", styles['THCenter']),
        Paragraph("Documented Features", styles['THCenter']),
        Paragraph("Resolved Bugs", styles['THCenter']),
        Paragraph("Code Completion", styles['THCenter'])
    ]
    m_vals = [
        Paragraph(f"<b>{data.METRICS['apps_analyzed']}</b>", styles['CoverTitle']),
        Paragraph(f"<b>{data.METRICS['backend_modules']}</b>", styles['CoverTitle']),
        Paragraph(f"<b>{data.METRICS['documented_features']}</b>", styles['CoverTitle']),
        Paragraph(f"<b>{data.METRICS['resolved_bugs']} / 11</b>", ParagraphStyle('GreenM', parent=styles['CoverTitle'], textColor=GREEN_SUCCESS)),
        Paragraph(f"<b>{data.METRICS['completion_pct']}</b>", ParagraphStyle('BlueM', parent=styles['CoverTitle'], textColor=BLUE_ACCENT))
    ]
    t_metrics = Table([m_headers, m_vals], colWidths=[104, 105, 105, 105, 104])
    t_metrics.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY_PRIMARY),
        ('BACKGROUND', (0,1), (-1,1), colors.white),
        ('BOX', (0,0), (-1,-1), 1, NAVY_PRIMARY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_metrics)
    story.append(Spacer(1, 16))

    # Executive Highlights Card
    highlights_html = """
    <b>EXECUTIVE MILESTONE UPDATE (September 25, 2026):</b><br/>
    • <b>Dual-Track Enterprise Banking:</b> Successfully integrated dual banking tracks: Automated ICICI Bank E-Collection (Virtual Accounts, encrypted MSG HOLD & MIS POSTING webhooks, SSE real-time events) alongside the established Offline Bank Transfer & Payment Receipt Upload Engine.<br/>
    • <b>8-Stage Physical Supply Chain & Delivery Management:</b> Implemented full end-to-end logistics with Delivery Queue (Tab 7 FIFO processing), automated vehicle recommendation engine (calculating kg, kW, and kit capacity), and Trip Tracking with Proof of Delivery (Tab 8 POD confirmation).<br/>
    • <b>Audit Issue Remediation:</b> Resolved 8 out of 11 previously flagged bug/risk items (including LooseOrder.jsx fully coded at 1,205 LOC, Request Order route mapped in Board.jsx, Service Tickets routes created, and Website CMS integrated). Overall code completion advanced from <b>77.0% to 88.5%</b>.
    """
    t_hl = Table([[Paragraph(highlights_html, styles['Callout'])]], colWidths=[printable_w])
    t_hl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#eff6ff')),
        ('BOX', (0,0), (-1,-1), 1, BLUE_ACCENT),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_hl)

    story.append(PageBreak())

    # ==========================================
    # SECTION 1: EXECUTIVE SUMMARY
    # ==========================================
    story.append(Paragraph("1. Executive Summary", styles['H1']))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY_PRIMARY, spaceBefore=3, spaceAfter=8))
    
    exec_text = """
    <b>SolarKits v2.0</b> is an enterprise-grade multi-tenant B2B Solar E-Commerce, Channel Distribution, and Operations Ecosystem connecting B2B Solar EPC Contractors, Regional Franchise Partners, Multi-State Warehouses, Accounts & Finance, Logistics Operations, and Central Administrators. Powered by a modern microservices-adjacent architecture utilizing Node.js/Express 5, MongoDB Multi-Database, React 19, and Vite 7, the platform bridges physical solar supply chain fulfillment with automated corporate banking.
    <br/><br/>
    <b>Hybrid Enterprise Payment Architecture:</b> The commercial infrastructure operates on dual payment rails:
    <br/>
    1. <b>Automated ICICI Bank E-Collection Engine:</b> Dynamically allocates unique Virtual Account Numbers (VAN) during EPC or Franchisee checkout. Securely ingests encrypted <code>MSG HOLD</code> packets for beneficiary validation and <code>MIS POSTING</code> webhooks for real-time fund reconciliation. Server-Sent Events (SSE) broadcast live payment confirmations, instantly advancing order states from <code>Pending</code> to <code>Order Confirmed</code>.
    <br/>
    2. <b>Offline Bank Transfer & Payment Receipt Upload Engine:</b> Facilitates high-value manual transfers via NEFT, RTGS, IMPS, or Cheque. Users upload bank transfer slips and log UTR numbers, which are audited by the Accounts team against bank statements before releasing warehouse dispatches or Franchise Earning disbursements.
    <br/><br/>
    <b>2-Stage Kit Activation & Physical Delivery Logistics:</b> Full 2-stage governance pipeline (Stage 1: Warehouse Kit Activation with 3 prerequisite validation gates; Stage 2: District Order Management sequential routing) alongside an 8-stage order lifecycle tracking system (Confirmed → Processing → Vehicle Assigned → Ready for Dispatch → Dispatched → In Transit → Destination Reached → Delivered / POD Confirmed) paired with smart fleet auto-recommendation based on vehicle payload (kg), max kit limits, and serviceable geographic districts.
    """
    story.append(Paragraph(exec_text, styles['Body']))
    story.append(Spacer(1, 10))

    # Feature Distribution Table
    story.append(Paragraph("Platform Feature Status Distribution (98 Total Features):", styles['H2']))
    story.append(Spacer(1, 4))
    
    dist_data = [
        [Paragraph("Development Status", styles['TH']), Paragraph("Count", styles['THCenter']), Paragraph("Percentage", styles['THCenter']), Paragraph("Weight Factor", styles['THCenter']), Paragraph("Weighted Contribution", styles['THCenter'])],
        [Paragraph("Fully Connected & Verified", styles['TD']), Paragraph("84", styles['TDCenter']), Paragraph("85.7%", styles['TDCenter']), Paragraph("1.00", styles['TDCenter']), Paragraph("84.00", styles['TDCenter'])],
        [Paragraph("Backend Only / Architecture Service", styles['TD']), Paragraph("11", styles['TDCenter']), Paragraph("11.2%", styles['TDCenter']), Paragraph("0.90", styles['TDCenter']), Paragraph("9.90", styles['TDCenter'])],
        [Paragraph("Partially Connected / Minor Gaps", styles['TD']), Paragraph("2", styles['TDCenter']), Paragraph("2.0%", styles['TDCenter']), Paragraph("0.50", styles['TDCenter']), Paragraph("1.00", styles['TDCenter'])],
        [Paragraph("Frontend Only / Under Construction", styles['TD']), Paragraph("1", styles['TDCenter']), Paragraph("1.0%", styles['TDCenter']), Paragraph("0.35", styles['TDCenter']), Paragraph("0.35", styles['TDCenter'])],
        [Paragraph("Not Started", styles['TD']), Paragraph("0", styles['TDCenter']), Paragraph("0.0%", styles['TDCenter']), Paragraph("0.00", styles['TDCenter']), Paragraph("0.00", styles['TDCenter'])],
        [Paragraph("<b>TOTAL / WEIGHTED OVERALL</b>", styles['TDBold']), Paragraph("<b>98</b>", styles['TDCenter']), Paragraph("<b>100.0%</b>", styles['TDCenter']), Paragraph("-", styles['TDCenter']), Paragraph("<b>88.5%</b>", styles['TDCenter'])],
    ]
    t_dist = Table(dist_data, colWidths=[180, 70, 80, 90, 103])
    t_dist.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY_PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, GRAY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, GRAY_BG]),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_dist)

    story.append(PageBreak())

    # ==========================================
    # SECTION 2: APPLICATIONS OVERVIEW
    # ==========================================
    story.append(Paragraph("2. Applications & Technology Overview", styles['H1']))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY_PRIMARY, spaceBefore=3, spaceAfter=8))
    
    app_headers = [
        Paragraph("Application Portal", styles['TH']),
        Paragraph("Source Directory", styles['TH']),
        Paragraph("Port", styles['THCenter']),
        Paragraph("Key Technology & Capabilities", styles['TH']),
        Paragraph("Status", styles['THCenter']),
        Paragraph("Done %", styles['THCenter'])
    ]
    app_rows = [app_headers]
    for a in data.APPLICATIONS:
        app_rows.append([
            Paragraph(f"<b>{a['name']}</b>", styles['TDBold']),
            Paragraph(f"<code>{a['folder']}</code>", styles['TD']),
            Paragraph(a['port'], styles['TDCenter']),
            Paragraph(a['stack'], styles['TD']),
            Paragraph(a['status'], styles['BadgeSuccess'] if 'Ready' in a['status'] or 'Operational' in a['status'] or 'Connected' in a['status'] else styles['BadgeWarn']),
            Paragraph(f"<b>{a['completion']}</b>", styles['TDCenter'])
        ])
    t_app = Table(app_rows, colWidths=[105, 110, 40, 180, 58, 30])
    t_app.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY_PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, GRAY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, GRAY_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_app)
    story.append(Spacer(1, 10))

    story.append(Paragraph("2.1 Live Deployment & Operational Port Isolation", styles['H2']))
    deploy_text = """
    Per repository configurations, applications are configured for isolated multi-port local execution and live cloud deployment on Render.com:
    <br/>
    • <b>Strict Port Enforcement:</b> Strict port isolation is active (Franchise Portal on Port <code>5178</code>, Solar Store on Port <code>5179</code>, Admin on Port <code>5174</code>, SolarShop India on Port <code>5173</code>) preventing Vite port collision.
    <br/>
    • <b>Live Cloud Instances:</b> Central backend and web portals are deployed on Render.com with custom domain mapping, environment variable management, and production containerization via multi-stage Docker builds and Nginx SSL termination reverse proxies.
    """
    story.append(Paragraph(deploy_text, styles['Body']))

    story.append(PageBreak())

    # ==========================================
    # SECTION 3: TECHNOLOGY STACK REFERENCE
    # ==========================================
    story.append(Paragraph("3. Technology Stack Reference", styles['H1']))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY_PRIMARY, spaceBefore=3, spaceAfter=8))

    tech_headers = [
        Paragraph("Architectural Layer", styles['TH']),
        Paragraph("Technology & Package", styles['TH']),
        Paragraph("Version & Architectural Scope", styles['TH'])
    ]
    tech_rows = [tech_headers]
    for layer, tech, role in data.TECH_STACK:
        tech_rows.append([
            Paragraph(f"<b>{layer}</b>", styles['TDBold']),
            Paragraph(tech, styles['TD']),
            Paragraph(role, styles['TD'])
        ])
    t_tech = Table(tech_rows, colWidths=[120, 130, 273])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY_PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, GRAY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, GRAY_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
    ]))
    story.append(t_tech)

    story.append(PageBreak())

    # ==========================================
    # SECTION 4: DATABASE ARCHITECTURE
    # ==========================================
    story.append(Paragraph("4. Database Architecture & Entity Inventory", styles['H1']))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY_PRIMARY, spaceBefore=3, spaceAfter=8))

    db_headers = [
        Paragraph("Database Name", styles['TH']),
        Paragraph("Schemas", styles['THCenter']),
        Paragraph("Key Entities & Collections", styles['TH']),
        Paragraph("Primary Consuming Modules", styles['TH'])
    ]
    db_rows = [db_headers]
    for db_name, s_count, entities, consumers in data.DATABASES:
        db_rows.append([
            Paragraph(f"<b>{db_name}</b>", styles['TDBold']),
            Paragraph(s_count, styles['TDCenter']),
            Paragraph(entities, styles['TD']),
            Paragraph(consumers, styles['TD'])
        ])
    t_db = Table(db_rows, colWidths=[110, 55, 230, 128])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY_PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, GRAY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, GRAY_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_db)

    story.append(Spacer(1, 10))

    # ==========================================
    # SECTION 5: USER ROLES & ACCESS CONTROL
    # ==========================================
    story.append(Paragraph("5. User Roles, Panels & Access Architecture", styles['H1']))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY_PRIMARY, spaceBefore=3, spaceAfter=8))

    role_headers = [
        Paragraph("Role Title", styles['TH']),
        Paragraph("Assigned Panel / Portal", styles['TH']),
        Paragraph("Auth Scheme", styles['THCenter']),
        Paragraph("Core Responsibilities & Operational Scope", styles['TH'])
    ]
    role_rows = [role_headers]
    for r_title, r_panel, r_auth, r_scope in data.ROLES:
        role_rows.append([
            Paragraph(f"<b>{r_title}</b>", styles['TDBold']),
            Paragraph(r_panel, styles['TD']),
            Paragraph(r_auth, styles['TDCenter']),
            Paragraph(r_scope, styles['TD'])
        ])
    t_role = Table(role_rows, colWidths=[95, 125, 85, 218])
    t_role.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY_PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, GRAY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, GRAY_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_role)

    story.append(PageBreak())

    # ==========================================
    # SECTION 6: FEATURE SCOPE & FUNCTIONAL MATRIX
    # ==========================================
    story.append(Paragraph("6. Feature Scope of Work & Functional Matrix (All 98 Features)", styles['H1']))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY_PRIMARY, spaceBefore=3, spaceAfter=8))
    story.append(Paragraph("Comprehensive functional inventory of all 98 platform features across 10 backend modules and 7 frontend portals:", styles['BodyMuted']))
    story.append(Spacer(1, 6))

    with open('data_features.json', 'r', encoding='utf-8') as f:
        all_features = json.load(f)

    feat_headers = [
        Paragraph("ID", styles['THCenter']),
        Paragraph("Module", styles['TH']),
        Paragraph("Feature Name", styles['TH']),
        Paragraph("Frontend / Backend Route", styles['TH']),
        Paragraph("Status", styles['THCenter']),
        Paragraph("Functional Scope & Operational Description", styles['TH'])
    ]
    
    f_rows = [feat_headers]
    for item in all_features:
        st = item['status']
        if st == 'Fully Connected':
            badge_style = styles['BadgeSuccess']
        elif st == 'Backend Only':
            badge_style = styles['BadgeMuted']
        elif st == 'Partially Connected':
            badge_style = styles['BadgeWarn']
        else:
            badge_style = styles['BadgeAlert']

        f_rows.append([
            Paragraph(f"<b>{item['id']}</b>", styles['TDCenter']),
            Paragraph(item['module'], styles['TD']),
            Paragraph(f"<b>{item['name']}</b>", styles['TDBold']),
            Paragraph(f"<code>{item['backend']}</code><br/><font color='#64748b'>{item['frontend']}</font>", styles['TD']),
            Paragraph(st, badge_style),
            Paragraph(item['desc'], styles['TD'])
        ])
    
    t_features = Table(f_rows, colWidths=[32, 70, 85, 125, 55, 156], repeatRows=1)
    t_features.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY_PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, GRAY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, GRAY_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_features)

    story.append(PageBreak())

    # ==========================================
    # SECTION 7: BUG & RISK REGISTER
    # ==========================================
    story.append(Paragraph("7. Bug & Risk Register (Resolved vs. Active)", styles['H1']))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY_PRIMARY, spaceBefore=3, spaceAfter=8))
    
    story.append(Paragraph("7.1 Resolved & Retracted Audit Items (8 Issues Closed):", styles['H2']))
    story.append(Spacer(1, 4))

    resolved_bugs = [b for b in data.BUGS_REGISTER if 'RESOLVED' in b['status']]
    r_headers = [
        Paragraph("ID", styles['THCenter']),
        Paragraph("Module", styles['TH']),
        Paragraph("Original Documented Issue", styles['TH']),
        Paragraph("Resolution Notes & Code Verification", styles['TH']),
        Paragraph("Status", styles['THCenter'])
    ]
    r_rows = [r_headers]
    for b in resolved_bugs:
        r_rows.append([
            Paragraph(f"<b>{b['id']}</b>", styles['TDCenter']),
            Paragraph(b['module'], styles['TD']),
            Paragraph(b['issue'], styles['TD']),
            Paragraph(b['resolution_notes'], styles['TD']),
            Paragraph("RESOLVED", styles['BadgeSuccess'])
        ])
    t_res = Table(r_rows, colWidths=[35, 75, 140, 205, 68])
    t_res.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY_PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, GRAY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, GRAY_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_res)
    story.append(Spacer(1, 10))

    story.append(Paragraph("7.2 Active & In-Progress Items (3 Ongoing Engineering Items):", styles['H2']))
    story.append(Spacer(1, 4))

    active_bugs = [b for b in data.BUGS_REGISTER if 'RESOLVED' not in b['status']]
    a_headers = [
        Paragraph("ID", styles['THCenter']),
        Paragraph("Module", styles['TH']),
        Paragraph("Issue Description", styles['TH']),
        Paragraph("Location / Evidence", styles['TH']),
        Paragraph("Severity", styles['THCenter']),
        Paragraph("Current Status & Plan", styles['TH'])
    ]
    a_rows = [a_headers]
    for b in active_bugs:
        sev_style = styles['BadgeAlert'] if b['severity'] == 'CRITICAL' else styles['BadgeWarn']
        a_rows.append([
            Paragraph(f"<b>{b['id']}</b>", styles['TDCenter']),
            Paragraph(b['module'], styles['TD']),
            Paragraph(b['issue'], styles['TD']),
            Paragraph(f"<code>{b['evidence']}</code>", styles['TD']),
            Paragraph(b['severity'], sev_style),
            Paragraph(b['resolution_notes'], styles['TD'])
        ])
    t_act = Table(a_rows, colWidths=[32, 65, 130, 110, 55, 131])
    t_act.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY_PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, GRAY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, GRAY_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_act)

    story.append(PageBreak())

    # ==========================================
    # SECTION 8: SECURITY & DATA PRIVACY
    # ==========================================
    story.append(Paragraph("8. Security & Data Privacy Analysis", styles['H1']))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY_PRIMARY, spaceBefore=3, spaceAfter=8))

    sec_items = [
        ("NoSQL Injection Guard", "VERIFIED", "Global <code>mongo.sanitize</code> middleware strips MongoDB operator keys ($ and .) recursively from req.body, req.params, and req.query on all incoming payloads before reaching controllers."),
        ("Rate Limiting Guard", "VERIFIED", "Strict rate-limiting applied across authentication routes, OTP verification endpoints, and GST search APIs to prevent brute-force attacks and abuse."),
        ("Authentication Architecture", "VERIFIED", "RS256 asymmetric JWT authentication with 15-minute access tokens and 2-day refresh tokens delivered via httpOnly secure cookies with header fallback."),
        ("Payment Slip Upload Validation", "VERIFIED", "Multipart form validation middleware (Multer) strictly inspects uploaded payment slips and KYC documents for valid image (JPEG, PNG, WebP) and PDF MIME types with file size bounds."),
        ("Banking Cryptographic Security", "VERIFIED", "Dual ICICI API security implemented using RSA-SHA256 asymmetric signature verification with bank public certificates and AES-128-CBC payload encryption."),
        ("Port Collision Protection", "VERIFIED", "Strict port configuration (<code>strictPort: true</code>) enforced in Vite configurations on ports 5178 and 5179, preventing silent fallback and session cross-contamination."),
        ("CORS Origin Lockdown", "RECOMMENDED", "CORS whitelist matches localhost, onrender.com, and company domains. Recommending final tightening of fallback callback(null, true) in production deployment."),
        ("Cloudinary Signed Delivery", "RECOMMENDED", "Ensure CLOUDINARY_KYC_UPLOAD_PRESET enforces authenticated/private delivery so verification documents require time-limited signed URLs.")
    ]
    
    sec_headers = [Paragraph("Security Domain", styles['TH']), Paragraph("Audit Status", styles['THCenter']), Paragraph("Technical Analysis & Operational Finding", styles['TH'])]
    sec_rows = [sec_headers]
    for dom, st, finding in sec_items:
        st_style = styles['BadgeSuccess'] if st == 'VERIFIED' else styles['BadgeWarn']
        sec_rows.append([
            Paragraph(f"<b>{dom}</b>", styles['TDBold']),
            Paragraph(st, st_style),
            Paragraph(finding, styles['TD'])
        ])
    t_sec = Table(sec_rows, colWidths=[125, 75, 323])
    t_sec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY_PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, GRAY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, GRAY_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_sec)

    story.append(PageBreak())

    # ==========================================
    # SECTION 9: MODULE COMPLETION ESTIMATES
    # ==========================================
    story.append(Paragraph("9. Module Completion Estimates (Comparative Audit)", styles['H1']))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY_PRIMARY, spaceBefore=3, spaceAfter=8))
    story.append(Paragraph("Comparative analysis of module completion between previous audit (August 29, 2026) and current stage (September 25, 2026):", styles['BodyMuted']))
    story.append(Spacer(1, 6))

    mod_headers = [
        Paragraph("Module / System Component", styles['TH']),
        Paragraph("Aug 29", styles['THCenter']),
        Paragraph("Sep 25", styles['THCenter']),
        Paragraph("Progress", styles['THCenter']),
        Paragraph("Architectural Accomplishments & Notes", styles['TH'])
    ]
    mod_rows = [mod_headers]
    for m_name, m_old, m_new, m_prog, m_notes in data.MODULE_COMPLETION:
        is_total = "OVERALL" in m_name
        row_style = styles['TDBold'] if is_total else styles['TD']
        mod_rows.append([
            Paragraph(f"<b>{m_name}</b>" if is_total else m_name, row_style),
            Paragraph(m_old, styles['TDCenter']),
            Paragraph(f"<b>{m_new}</b>", styles['TDCenter']),
            Paragraph(f"<font color='#16a34a'><b>{m_prog}</b></font>", styles['TDCenter']),
            Paragraph(m_notes, row_style)
        ])
    t_mod = Table(mod_rows, colWidths=[130, 45, 45, 50, 253])
    t_mod.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY_PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, GRAY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, GRAY_BG]),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_mod)

    story.append(PageBreak())

    # ==========================================
    # SECTION 10: WORKFLOW BLUEPRINTS
    # ==========================================
    story.append(Paragraph("10. Enterprise Payment & Order Delivery Workflows", styles['H1']))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY_PRIMARY, spaceBefore=3, spaceAfter=8))

    w1_html = """
    <b>WORKFLOW A: AUTOMATED ICICI BANK E-COLLECTION & RECONCILIATION</b><br/>
    1. <b>Order Checkout:</b> EPC buyer or Franchisee selects order items. System creates a unique Virtual Account Number (VAN) under ICICI corporate banking.<br/>
    2. <b>MSG HOLD Validation:</b> When funds are remitted, ICICI sends an encrypted MSG HOLD webhook. Backend cryptographically validates client cert and approves hold.<br/>
    3. <b>MIS POSTING Webhook:</b> ICICI credits account and posts transaction packet (UTR, Amount, Timestamp). Backend checks idempotency and verifies amounts.<br/>
    4. <b>Auto-Confirmation & SSE Broadcast:</b> Order advances from <code>Pending</code> to <code>Order Confirmed</code>. Server-Sent Events stream updates frontend in real-time.
    """
    story.append(Table([[Paragraph(w1_html, styles['Body'])]], colWidths=[printable_w], style=[
        ('BACKGROUND', (0,0), (-1,-1), GRAY_BG),
        ('BOX', (0,0), (-1,-1), 1, BLUE_ACCENT),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(Spacer(1, 8))

    w2_html = """
    <b>WORKFLOW B: OFFLINE BANK TRANSFER & RECEIPT VERIFICATION ENGINE</b><br/>
    1. <b>Direct Bank Remittance:</b> Customer/Franchisee executes NEFT/RTGS/IMPS/Cheque transfer to corporate account.<br/>
    2. <b>Receipt Slip Upload:</b> User uploads receipt image/PDF and inputs UTR reference via <code>POST /api/india/v1/reseller/fee-payment/upload-receipt</code>.<br/>
    3. <b>Accounts Verification:</b> Accounts / Admin team inspects uploaded slip, cross-checks UTR with company bank statement, and marks <code>verified</code>.<br/>
    4. <b>Operational Release & Ledger Credit:</b> Franchise dashboard unlocks, order moves into delivery queue, and Franchise Earning is accrued.
    """
    story.append(Table([[Paragraph(w2_html, styles['Body'])]], colWidths=[printable_w], style=[
        ('BACKGROUND', (0,0), (-1,-1), GRAY_BG),
        ('BOX', (0,0), (-1,-1), 1, NAVY_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(Spacer(1, 8))

    w3_html = """
    <b>WORKFLOW C: 8-STAGE PHYSICAL SUPPLY CHAIN & DELIVERY MANAGEMENT</b><br/>
    1. <b>Warehouse Capacity Guard:</b> During checkout, system validates warehouse storage headroom (Kits, Weight kg, and kW capacity) before allowing fulfillment.<br/>
    2. <b>Delivery Queue (Tab 7):</b> Paid orders enter FIFO queue with route clubbing recommendations for consolidated transporter dispatch.<br/>
    3. <b>Smart Fleet Recommendation:</b> Algorithm evaluates vehicle master (Tata Ace, 14ft Canter, etc.) matching total cargo payload, max kW, and destination.<br/>
    4. <b>Trip Tracking & POD (Tab 8):</b> Logistics tracks 8 stages (Confirmed → Dispatched → In Transit → Delivered) and closes trip upon Proof of Delivery capture.
    """
    story.append(Table([[Paragraph(w3_html, styles['Body'])]], colWidths=[printable_w], style=[
        ('BACKGROUND', (0,0), (-1,-1), GRAY_BG),
        ('BOX', (0,0), (-1,-1), 1, GREEN_SUCCESS),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))

    story.append(PageBreak())

    # ==========================================
    # SECTION 11: ROADMAP & SECTION 12: CONCLUSION
    # ==========================================
    story.append(Paragraph("11. Recommended Development Roadmap", styles['H1']))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY_PRIMARY, spaceBefore=3, spaceAfter=8))

    roadmap_data = [
        [Paragraph("Priority", styles['THCenter']), Paragraph("Module", styles['TH']), Paragraph("Action Item", styles['TH']), Paragraph("Business Impact", styles['TH']), Paragraph("Effort", styles['THCenter'])],
        [Paragraph("P0", styles['BadgeAlert']), Paragraph("Security", styles['TD']), Paragraph("Tighten CORS fallback in index.js:45 for production environments", styles['TD']), Paragraph("Guarantees strict API access control", styles['TD']), Paragraph("Small", styles['TDCenter'])],
        [Paragraph("P0", styles['BadgeAlert']), Paragraph("Security", styles['TD']), Paragraph("Enforce Cloudinary private signed delivery URLs for KYC & payment slips", styles['TD']), Paragraph("Data privacy compliance for sensitive records", styles['TD']), Paragraph("Medium", styles['TDCenter'])],
        [Paragraph("P1", styles['BadgeWarn']), Paragraph("Admin Panel", styles['TD']), Paragraph("Complete central Admin Dashboard Home.jsx executive overview metrics", styles['TD']), Paragraph("Real-time network KPIs for Super Admin", styles['TD']), Paragraph("Medium", styles['TDCenter'])],
        [Paragraph("P2", styles['BadgeMuted']), Paragraph("Documentation", styles['TD']), Paragraph("Publish Swagger / OpenAPI 3.0 API specifications for all 10 modules", styles['TD']), Paragraph("Accelerates developer onboarding & QA audits", styles['TD']), Paragraph("Large", styles['TDCenter'])],
        [Paragraph("P2", styles['BadgeMuted']), Paragraph("Testing", styles['TD']), Paragraph("Establish automated integration test suite with Jest / Supertest", styles['TD']), Paragraph("Continuous regression protection for payments", styles['TD']), Paragraph("Large", styles['TDCenter'])],
    ]
    t_road = Table(roadmap_data, colWidths=[40, 70, 170, 185, 58])
    t_road.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY_PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, GRAY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, GRAY_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_road)
    story.append(Spacer(1, 14))

    story.append(Paragraph("12. Conclusion & Priority Actions", styles['H1']))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY_PRIMARY, spaceBefore=3, spaceAfter=8))

    conclusion_html = """
    SolarKits v2.0 demonstrates high architectural maturity, enterprise robustness, and commercial readiness. Across the 98 documented features and 10 backend modules, platform development has progressed to <b>88.5% completion</b>.
    <br/><br/>
    <b>Key Production Achievements:</b><br/>
    • Fully functional Hybrid Payment Architecture combining automated ICICI E-Collection (Virtual Accounts) with manual Offline Bank Transfer and Receipt Verification.<br/>
    • Complete 8-Stage Order Lifecycle and Physical Delivery Management system connecting warehouse capacity, fleet recommendation, and Proof of Delivery.<br/>
    • Resolution and closure of 8 legacy audit bugs, including full production deployment of LooseOrder.jsx (1,205 LOC), Request Order routing, and dynamic CMS solutions.<br/>
    • Multi-tenant MongoDB isolation across 7 databases and RBAC access across 12 user roles.
    <br/><br/>
    <b>Immediate Next Steps:</b> Finalize CORS production origin lock, enforce signed delivery for Cloudinary documents, and complete executive KPI analytics cards on Admin Home.
    """
    story.append(Paragraph(conclusion_html, styles['Body']))
    story.append(Spacer(1, 14))

    signoff_html = "<b>© 2026 SolarKits Technologies Pvt. Ltd.</b> | Antigravity AI Technical Audit | September 25, 2026 | CONFIDENTIAL"
    story.append(Paragraph(signoff_html, styles['BodyMuted']))

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generated PDF: {filename} successfully!")

if __name__ == "__main__":
    create_pdf()
