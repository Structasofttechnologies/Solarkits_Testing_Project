# -*- coding: utf-8 -*-
"""
SolarKits v2.0 - Comprehensive Audit & Status Report Generator
Generates:
1. SolarKits_Project_Development_Status_Report.pdf
2. SolarKits_Project_Development_Status_Report.docx
3. SolarKits_Audit_Summary.md
4. SolarKits_Feature_Traceability_Matrix.xlsx
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Register TrueType Fonts for perfect Unicode rendering
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
    """Two-pass canvas to dynamically compute and draw total page numbers and running headers/footers."""
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
            self.drawString(left_m, page_h - 26, "SolarKits v2.0 - Project Development Status & Technical Architecture Report")
            self.drawRightString(right_m, page_h - 26, "CONFIDENTIAL | September 25, 2026")
            
            self.setStrokeColor(GRAY_BORDER)
            self.setLineWidth(0.5)
            self.line(left_m, page_h - 30, right_m, page_h - 30)

        # Running Footer (On all pages)
        self.setFont('Arial', 7.5)
        self.setFillColor(TEXT_MUTED)
        self.drawString(left_m, 22, "SolarKits Technologies Pvt. Ltd. | Architecture: Hybrid ICICI E-Collection & Offline Verification | v2.0 Production Audit")
        self.drawRightString(right_m, 22, f"Page {self._pageNumber} of {page_count}")
        
        self.setStrokeColor(GRAY_BORDER)
        self.setLineWidth(0.5)
        self.line(left_m, 30, right_m, 30)
        
        self.restoreState()

print("Base setup ready.")
