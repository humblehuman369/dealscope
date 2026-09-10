#!/usr/bin/env python3
"""Generate the InvestIQ LLC / DealGapIQ trade-name affiliation cover PDF."""

from typing import Optional
from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

INK = HexColor("#0F172A")
MUTED = HexColor("#475569")
RULE = HexColor("#0FA4E9")
LIGHT = HexColor("#F1F5F9")

OUT = Path(__file__).with_name(
    "InvestIQ-LLC-DealGapIQ-Trade-Name-Affiliation-Statement.pdf"
)


def link(url: str, label: Optional[str] = None) -> str:
    text = label or url
    return f'<link href="{url}" color="#0369A1"><u>{text}</u></link>'


def build():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            "Kicker",
            parent=styles["Normal"],
            fontName="Times-Bold",
            fontSize=9,
            textColor=RULE,
            tracking=0,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            "TitleMain",
            parent=styles["Title"],
            fontName="Times-Bold",
            fontSize=16,
            leading=20,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            "Sub",
            parent=styles["Normal"],
            fontName="Times-Italic",
            fontSize=10,
            textColor=MUTED,
            spaceAfter=14,
        )
    )
    styles.add(
        ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontName="Times-Roman",
            fontSize=11,
            leading=15,
            textColor=INK,
            alignment=TA_JUSTIFY,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            "H",
            parent=styles["Normal"],
            fontName="Times-Bold",
            fontSize=12,
            textColor=INK,
            spaceBefore=8,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            "BulletBody",
            parent=styles["Normal"],
            fontName="Times-Roman",
            fontSize=11,
            leading=15,
            textColor=INK,
        )
    )
    styles.add(
        ParagraphStyle(
            "Sign",
            parent=styles["Normal"],
            fontName="Times-Roman",
            fontSize=11,
            leading=15,
            textColor=INK,
            spaceAfter=2,
        )
    )
    styles.add(
        ParagraphStyle(
            "FooterNote",
            parent=styles["Normal"],
            fontName="Times-Italic",
            fontSize=8.5,
            leading=11,
            textColor=MUTED,
        )
    )

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=letter,
        leftMargin=0.85 * inch,
        rightMargin=0.85 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
        title="Trade Name Affiliation Statement — InvestIQ LLC d/b/a DealGapIQ",
        author="InvestIQ LLC",
        subject="Public disclosure of the DealGapIQ trade name used by InvestIQ LLC",
    )

    story = []
    header = Table(
        [
            [
                Paragraph("INVESTIQ LLC", styles["Kicker"]),
                Paragraph("September 9, 2026", ParagraphStyle("DateR", parent=styles["Sub"], alignment=2, spaceAfter=0)),
            ]
        ],
        colWidths=[4.6 * inch, 2.2 * inch],
    )
    header.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "BOTTOM"), ("BACKGROUND", (0, 0), (-1, -1), white)]))
    story.append(header)
    story.append(Paragraph("Trade Name Affiliation Statement", styles["TitleMain"]))
    story.append(
        Paragraph(
            "InvestIQ LLC, a Wyoming limited liability company, doing business as DealGapIQ",
            styles["Sub"],
        )
    )

    story.append(Paragraph("To whom it may concern:", styles["Body"]))
    story.append(
        Paragraph(
            "This letter confirms the legal relationship between <b>InvestIQ LLC</b> "
            "and the public trade name <b>DealGapIQ</b>. It is provided as a cover "
            "statement for platform, advertising, and carrier verification. It is not a "
            "substitute for the enclosed government and company records.",
            styles["Body"],
        )
    )

    story.append(Paragraph("1. Legal entity and trade name", styles["H"]))
    story.append(
        Paragraph(
            "InvestIQ LLC is a limited liability company organized under the laws of the "
            "State of Wyoming. DealGapIQ is a trade name (also called a d/b/a) of InvestIQ LLC. "
            "The same company owns and operates the DealGapIQ website, web application, and "
            "mobile applications. Full legal identification: <b>InvestIQ LLC d/b/a DealGapIQ</b>.",
            styles["Body"],
        )
    )

    story.append(Paragraph("2. Wyoming does not require trade-name registration", styles["H"]))
    story.append(
        Paragraph(
            "Wyoming does not require an LLC to register a “doing business as” or trade name "
            "with the Secretary of State in order to use that name. The Wyoming Secretary of "
            "State states: “In Wyoming it is not mandatory to register a DBA name. However, "
            "you may register a DBA by filing an Application for Registration of Trade Name.” "
            f"See {link('https://sos.wyo.gov/FAQS.aspx?root=BUS')}. "
            "Optional registration is governed by Wyoming Statutes §§ 40-2-101 through 40-2-109. "
            "The application form is published at "
            f"{link('https://sos.wyo.gov/Forms/Business/TN/TN-RegistrationApplication.pdf')}.",
            styles["Body"],
        )
    )

    story.append(Paragraph("3. Registration filed today", styles["H"]))
    story.append(
        Paragraph(
            "Although registration is optional, InvestIQ LLC filed an Application for "
            "Registration of Trade Name for <b>DealGapIQ</b> with the Wyoming Secretary of State "
            "on <b>September 9, 2026</b>, to create a public record of the affiliation. A copy "
            "of that filing is enclosed. Processing by the Secretary of State may take up to "
            "fifteen business days after receipt.",
            styles["Body"],
        )
    )

    story.append(Paragraph("4. Documents enclosed with this statement", styles["H"]))
    bullets = [
        "Application for Registration of Trade Name — DealGapIQ (filed September 9, 2026).",
        "Signed manager resolution of InvestIQ LLC adopting the trade name DealGapIQ.",
        "Articles of Organization of InvestIQ LLC (Wyoming).",
        "IRS EIN confirmation for InvestIQ LLC.",
    ]
    story.append(
        ListFlowable(
            [ListItem(Paragraph(b, styles["BulletBody"]), leftIndent=12, bulletColor=INK) for b in bullets],
            bulletType="1",
            start="1",
            leftIndent=18,
            spaceAfter=10,
        )
    )

    story.append(Paragraph("5. Public website disclosures of the affiliation", styles["H"]))
    story.append(
        Paragraph(
            "The following pages on dealgapiq.com identify InvestIQ LLC as the operator and "
            "DealGapIQ as its trade name. Reviewers may open these URLs directly:",
            styles["Body"],
        )
    )
    urls = [
        ("Homepage (legal footer)", "https://dealgapiq.com/"),
        ("Legal entity statement", "https://dealgapiq.com/legal"),
        ("Privacy Policy (Who we are)", "https://dealgapiq.com/privacy"),
        ("Terms of Service (operated by)", "https://dealgapiq.com/terms"),
        ("Disclosures (offered by)", "https://dealgapiq.com/disclosures"),
    ]
    story.append(
        ListFlowable(
            [
                ListItem(
                    Paragraph(f"{label}: {link(url)}", styles["BulletBody"]),
                    leftIndent=12,
                    bulletColor=INK,
                )
                for label, url in urls
            ],
            bulletType="bullet",
            leftIndent=18,
            spaceAfter=10,
        )
    )

    story.append(Paragraph("6. Contact", styles["H"]))
    story.append(
        Paragraph(
            "InvestIQ LLC d/b/a DealGapIQ<br/>"
            f"Email: {link('mailto:support@dealgapiq.com', 'support@dealgapiq.com')}<br/>"
            f"Phone: {link('tel:+18663888222', '(866) 388-8222')}<br/>"
            f"Web: {link('https://dealgapiq.com/')}",
            styles["Body"],
        )
    )

    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            "I am a manager of InvestIQ LLC and am authorized to make this statement.",
            styles["Body"],
        )
    )
    story.append(Spacer(1, 28))
    story.append(Paragraph("________________________________", styles["Sign"]))
    story.append(Paragraph("Brad Geisen", styles["Sign"]))
    story.append(Paragraph("Manager, InvestIQ LLC", styles["Sign"]))
    story.append(Paragraph("d/b/a DealGapIQ", styles["Sign"]))
    story.append(Spacer(1, 16))
    story.append(
        Paragraph(
            "This cover letter is a company statement. Official proof of formation and tax identity "
            "is in the enclosed Articles of Organization and EIN confirmation. Official proof of the "
            "optional Wyoming trade-name filing is in the enclosed Application for Registration of Trade Name.",
            styles["FooterNote"],
        )
    )

    def on_page(canvas, _doc):
        canvas.saveState()
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(2)
        canvas.line(0.85 * inch, letter[1] - 0.45 * inch, letter[0] - 0.85 * inch, letter[1] - 0.45 * inch)
        canvas.setFillColor(MUTED)
        canvas.setFont("Times-Roman", 8)
        canvas.drawString(0.85 * inch, 0.42 * inch, "InvestIQ LLC d/b/a DealGapIQ  ·  Confidential — for verification use")
        canvas.drawRightString(letter[0] - 0.85 * inch, 0.42 * inch, "Page %d" % canvas.getPageNumber())
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(OUT)


if __name__ == "__main__":
    build()
