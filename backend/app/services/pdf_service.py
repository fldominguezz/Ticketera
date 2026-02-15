from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import inch
import io
from datetime import datetime

class PDFService:
    async def generate_ticket_report(self, ticket, comments):
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
        
        styles = getSampleStyleSheet()
        # Custom Styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            alignment=1, # Center
            spaceAfter=20,
            fontName='Helvetica-Bold'
        )
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=12,
            color=colors.HexColor("#0056b3"),
            spaceBefore=15,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        normal_style = styles["Normal"]
        
        elements = []

        # --- HEADER ---
        elements.append(Paragraph("TICKETERA SOC - REPORTE DE INCIDENCIA", title_style))
        elements.append(Paragraph(f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}", normal_style))
        elements.append(Spacer(1, 0.2 * inch))

        # --- TICKET INFO TABLE ---
        data = [
            ["ID del Ticket:", str(ticket.id)[:13].upper()],
            ["Asunto:", ticket.title],
            ["Estado:", ticket.status.upper()],
            ["Prioridad:", ticket.priority.upper()],
            ["Creado por:", ticket.created_by_name or "Sistema"],
            ["Fecha de Apertura:", ticket.created_at.strftime('%d/%m/%Y %H:%M') if ticket.created_at else "N/A"]
        ]
        
        t = Table(data, colWidths=[1.5 * inch, 4.5 * inch])
        t.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.whitesmoke),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)

        # --- ASSETS SECTION ---
        elements.append(Paragraph("EQUIPOS AFECTADOS / RELACIONADOS", section_style))
        
        asset_data = [["Hostname", "IP Address", "MAC Address", "Ubicación Actual"]]
        
        # Combinar asset individual y lista de assets
        all_linked = (ticket.assets or [])
        if ticket.asset and ticket.asset not in all_linked:
            all_linked.insert(0, ticket.asset)

        if not all_linked:
            asset_data.append(["N/A", "N/A", "N/A", "Sin equipos vinculados"])
        else:
            for a in all_linked:
                # El objeto ya viene enriquecido desde el validator
                loc_name = getattr(a, "location_name", "Desconocida")
                asset_data.append([
                    a.hostname or "---", 
                    a.ip_address or "---", 
                    a.mac_address or "---",
                    loc_name
                ])

        at = Table(asset_data, colWidths=[1.2 * inch, 1.2 * inch, 1.5 * inch, 2.1 * inch])
        at.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0056b3")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(at)

        # --- DESCRIPTION ---
        elements.append(Paragraph("DESCRIPCIÓN DEL CASO", section_style))
        # Limpiar HTML básico para ReportLab
        clean_desc = (ticket.description or "Sin descripción").replace("<p>", "").replace("</p>", "\n").replace("<br/>", "\n").replace("<br>", "\n")
        elements.append(Paragraph(clean_desc, normal_style))

        # --- COMMENTS / TIMELINE ---
        elements.append(Paragraph("CRONOLOGÍA DE ACTIVIDAD", section_style))
        comment_data = [["Fecha", "Usuario", "Comentario"]]
        for c in comments:
            comment_data.append([
                c.created_at.strftime('%d/%m/%Y %H:%M'),
                c.user_name or "Usuario",
                Paragraph(c.content[:200], styles["Normal"]) # Truncar o usar Paragraph para wrap
            ])
        
        if len(comment_data) > 1:
            ct = Table(comment_data, colWidths=[1.2 * inch, 1.2 * inch, 3.6 * inch])
            ct.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BACKGROUND', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            elements.append(ct)
        else:
            elements.append(Paragraph("Sin actividad registrada.", normal_style))

        # --- SIGNATURE SPACE ---
        elements.append(Spacer(1, 0.5 * inch))
        sig_data = [
            ["__________________________", "__________________________"],
            ["Firma del Técnico", "Responsable de Área"]
        ]
        st = Table(sig_data, colWidths=[3 * inch, 3 * inch])
        st.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 1), (-1, 1), 0),
        ]))
        elements.append(st)

        doc.build(elements)
        buffer.seek(0)
        return buffer

pdf_service = PDFService()
