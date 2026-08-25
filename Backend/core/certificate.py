import os
from reportlab.lib.pagesizes import landscape, letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor

def generate_certificate(student_name: str, course_name: str, batch_code: str, issue_date: str, output_path: str):
    """
    Generates a PDF completion certificate for a student.
    """
    c = canvas.Canvas(output_path, pagesize=landscape(letter))
    width, height = landscape(letter)

    # Background color / border
    c.setStrokeColor(HexColor("#1e3a8a"))
    c.setLineWidth(10)
    c.rect(0.5 * inch, 0.5 * inch, width - 1 * inch, height - 1 * inch, stroke=1, fill=0)
    
    c.setStrokeColor(HexColor("#3b82f6"))
    c.setLineWidth(3)
    c.rect(0.6 * inch, 0.6 * inch, width - 1.2 * inch, height - 1.2 * inch, stroke=1, fill=0)

    # Title
    c.setFont("Helvetica-Bold", 36)
    c.setFillColor(HexColor("#1e3a8a"))
    c.drawCentredString(width / 2.0, height - 2 * inch, "Certificate of Completion")

    # Body
    c.setFont("Helvetica", 18)
    c.setFillColor(HexColor("#333333"))
    c.drawCentredString(width / 2.0, height - 3 * inch, "This is to certify that")

    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(HexColor("#000000"))
    c.drawCentredString(width / 2.0, height - 4 * inch, student_name)

    c.setFont("Helvetica", 18)
    c.setFillColor(HexColor("#333333"))
    c.drawCentredString(width / 2.0, height - 4.8 * inch, "has successfully completed the course")

    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(HexColor("#1e3a8a"))
    c.drawCentredString(width / 2.0, height - 5.5 * inch, course_name)

    # Batch and Date
    c.setFont("Helvetica", 14)
    c.setFillColor(HexColor("#666666"))
    c.drawCentredString(width / 2.0, height - 6.2 * inch, f"Batch: {batch_code}  |  Date: {issue_date}")

    # Signatures
    c.setFont("Helvetica", 14)
    c.drawCentredString(2.5 * inch, 1.5 * inch, "_________________________")
    c.drawCentredString(2.5 * inch, 1.2 * inch, "Course Coordinator")
    
    c.drawCentredString(width - 2.5 * inch, 1.5 * inch, "_________________________")
    c.drawCentredString(width - 2.5 * inch, 1.2 * inch, "Director")

    c.showPage()
    c.save()
