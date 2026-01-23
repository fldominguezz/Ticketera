import pandas as pd
from io import BytesIO
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from datetime import datetime
from typing import List, Dict, Any

class ExportService:
    def to_csv(self, data: List[Dict[str, Any]]) -> bytes:
        df = pd.DataFrame(data)
        return df.to_csv(index=False).encode('utf-8')

    def to_excel(self, data: List[Dict[str, Any]]) -> bytes:
        df = pd.DataFrame(data)
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Tickets')
        return output.getvalue()

    def to_pdf(self, data: List[Dict[str, Any]], title: str = "Ticket Report") -> bytes:
        output = BytesIO()
        doc = SimpleDocTemplate(output, pagesize=landscape(letter))
        elements = []
        styles = getSampleStyleSheet()

        # Title
        elements.append(Paragraph(f"<b>{title}</b>", styles['Title']))
        elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        elements.append(Spacer(1, 12))

        if not data:
            elements.append(Paragraph("No data available.", styles['Normal']))
        else:
            # Prepare Table Data
            headers = list(data[0].keys())
            table_data = [headers]
            for item in data:
                row = [str(item.get(h, "")) for h in headers]
                table_data.append(row)

            # Create Table
            t = Table(table_data, repeatRows=1)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
            ]))
            elements.append(t)

        doc.build(elements)
        return output.getvalue()

export_service = ExportService()
