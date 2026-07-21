from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

NAVY = RGBColor(0x1b, 0x4f, 0x72)
BLACK = RGBColor(0x1a, 0x1a, 0x1a)
GREY = RGBColor(0x55, 0x55, 0x55)
GREEN = RGBColor(0x1e, 0x84, 0x49)
LIGHT_BLUE_BG = RGBColor(0xea, 0xf4, 0xfb)

doc = Document()

# ── Page margins ──────────────────────────────────────────────────────────────
for section in doc.sections:
    section.top_margin    = Cm(1.8)
    section.bottom_margin = Cm(1.8)
    section.left_margin   = Cm(2.0)
    section.right_margin  = Cm(2.0)

# ── Default style ─────────────────────────────────────────────────────────────
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(10.5)
style.font.color.rgb = BLACK

def set_cell_bg(cell, hex_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge, attrs in kwargs.items():
        el = OxmlElement(f'w:{edge}')
        for k, v in attrs.items():
            el.set(qn(f'w:{k}'), v)
        tcBorders.append(el)
    tcPr.append(tcBorders)

def add_left_border_para(doc, text, bold_part=None, rest=None):
    """Paragraph with navy left border (competency style)."""
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.15)
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    left = OxmlElement('w:left')
    left.set(qn('w:val'), 'single')
    left.set(qn('w:sz'), '18')
    left.set(qn('w:space'), '4')
    left.set(qn('w:color'), '1b4f72')
    pBdr.append(left)
    pPr.append(pBdr)
    if bold_part:
        run = p.add_run(bold_part + ' ')
        run.bold = True
        run.font.color.rgb = NAVY
        run.font.size = Pt(10)
        if rest:
            r2 = p.add_run(rest)
            r2.font.size = Pt(10)
    else:
        run = p.add_run(text)
        run.font.size = Pt(10)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    return p

def section_heading(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text.upper())
    run.bold = True
    run.font.color.rgb = NAVY
    run.font.size = Pt(9.5)
    run.font.name = 'Calibri'
    # Bottom border
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bot = OxmlElement('w:bottom')
    bot.set(qn('w:val'), 'single')
    bot.set(qn('w:sz'), '6')
    bot.set(qn('w:space'), '1')
    bot.set(qn('w:color'), 'd0e8f5')
    pBdr.append(bot)
    pPr.append(pBdr)
    return p

def bullet(doc, text, bold_part=None, indent=0.2):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.left_indent = Inches(indent)
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(1)
    if bold_part and bold_part in text:
        before, after = text.split(bold_part, 1)
        if before:
            p.add_run(before).font.size = Pt(10.5)
        r = p.add_run(bold_part)
        r.bold = True
        r.font.size = Pt(10.5)
        if after:
            p.add_run(after).font.size = Pt(10.5)
    else:
        p.add_run(text).font.size = Pt(10.5)
    return p

def project_card(doc, title, role_badge, client_line, bullets, badges):
    # Title row
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(1)
    r = p.add_run(title)
    r.bold = True
    r.font.color.rgb = NAVY
    r.font.size = Pt(11)
    r2 = p.add_run(f'  [{role_badge}]')
    r2.font.color.rgb = NAVY
    r2.font.size = Pt(9)
    r2.italic = True

    # Client
    cp = doc.add_paragraph(client_line)
    cp.runs[0].italic = True
    cp.runs[0].font.color.rgb = GREY
    cp.runs[0].font.size = Pt(10)
    cp.paragraph_format.space_before = Pt(0)
    cp.paragraph_format.space_after = Pt(2)

    for b in bullets:
        bold_part = None
        if '**' in b:
            # crude bold extraction
            parts = b.split('**')
            p2 = doc.add_paragraph(style='List Bullet')
            p2.paragraph_format.left_indent = Inches(0.2)
            p2.paragraph_format.space_before = Pt(1)
            p2.paragraph_format.space_after = Pt(1)
            for i, part in enumerate(parts):
                r = p2.add_run(part)
                r.font.size = Pt(10.5)
                if i % 2 == 1:
                    r.bold = True
        else:
            bullet(doc, b)

    # Badges as a single paragraph
    if badges:
        bp = doc.add_paragraph()
        bp.paragraph_format.space_before = Pt(3)
        bp.paragraph_format.space_after = Pt(6)
        for i, badge in enumerate(badges):
            r = bp.add_run(f'  {badge}  ')
            r.font.color.rgb = GREEN
            r.font.size = Pt(9)
            r.bold = True
            if i < len(badges) - 1:
                sep = bp.add_run(' | ')
                sep.font.color.rgb = GREY
                sep.font.size = Pt(9)

# ═══════════════════════════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════════════════════════
tbl = doc.add_table(rows=1, cols=2)
tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
tbl.columns[0].width = Inches(4.5)
tbl.columns[1].width = Inches(2.5)

left_cell = tbl.cell(0, 0)
right_cell = tbl.cell(0, 1)

# Name
name_p = left_cell.paragraphs[0]
name_run = name_p.add_run('Karthik Sankaran')
name_run.bold = True
name_run.font.size = Pt(24)
name_run.font.color.rgb = NAVY

# Tagline
tag_p = left_cell.add_paragraph()
tag_run = tag_p.add_run('Associate Director  |  Head of Cloud Engineering  |  GCP · Azure · AWS  |  30+ Years')
tag_run.font.size = Pt(10)
tag_run.font.color.rgb = GREY
tag_p.paragraph_format.space_before = Pt(3)

# Contact (right cell)
right_cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
rc_p = right_cell.paragraphs[0]
rc_p.add_run('karthik.a.sankaran@outlook.com\n+44 747 130 2755\nUnited Kingdom').font.size = Pt(10)
rc_p.runs[0].font.color.rgb = GREY

# Remove table borders
for row in tbl.rows:
    for cell in row.cells:
        for edge in ['top','bottom','left','right']:
            set_cell_border(cell, **{edge: {'val':'none','sz':'0','space':'0','color':'FFFFFF'}})

doc.add_paragraph()  # spacer

# ═══════════════════════════════════════════════════════════════════════════════
# EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
section_heading(doc, 'Executive Summary')
p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(4)
runs = [
    ('Senior technology leader and ', False),
    ('Senior Manager at Deloitte', True),
    (' with over ', False),
    ('30 years of experience', True),
    (' delivering large-scale cloud transformation, infrastructure modernisation, and managed services programmes for global Financial Services, Retail, and Manufacturing clients. Proven track record of building and leading high-performing engineering teams, driving automation-led operational efficiency, and acting as a trusted advisor to C-suite stakeholders. Deep technical expertise across ', False),
    ('GCP, Azure, and AWS', True),
    (', combined with strong commercial acumen and a passion for engineering craft and innovation. Currently leading the GCP Engineering stream at Deloitte Cloud Managed Services on an interim basis, with responsibility for strategy, delivery, and team development.', False),
]
for text, bold in runs:
    r = p.add_run(text)
    r.bold = bold
    r.font.size = Pt(10.5)

# ═══════════════════════════════════════════════════════════════════════════════
# STATS BAR
# ═══════════════════════════════════════════════════════════════════════════════
section_heading(doc, 'Career Highlights')
stats = [
    ('30+', 'Years in Technology'),
    ('95%', 'Faster GCP Provisioning'),
    ('50%', 'Cost Reduction Delivered'),
    ('£1.2M', 'Azure Cost Savings'),
    ('15,000', 'Users — WebEx Rollout'),
]
st = doc.add_table(rows=2, cols=len(stats))
st.alignment = WD_TABLE_ALIGNMENT.CENTER
for i, (num, label) in enumerate(stats):
    nc = st.cell(0, i)
    lc = st.cell(1, i)
    set_cell_bg(nc, 'eaf4fb')
    set_cell_bg(lc, 'eaf4fb')
    np_ = nc.paragraphs[0]
    np_.alignment = WD_ALIGN_PARAGRAPH.CENTER
    nr = np_.add_run(num)
    nr.bold = True
    nr.font.size = Pt(16)
    nr.font.color.rgb = NAVY
    lp = lc.paragraphs[0]
    lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    lr = lp.add_run(label)
    lr.font.size = Pt(8.5)
    lr.font.color.rgb = GREY

# ═══════════════════════════════════════════════════════════════════════════════
# CORE COMPETENCIES
# ═══════════════════════════════════════════════════════════════════════════════
section_heading(doc, 'Core Competencies')
competencies = [
    ('Technology Leadership', 'Leading engineering teams, setting cloud strategy, interim Head of GCP Engineering at Deloitte'),
    ('Cloud Architecture', 'GCP, Azure, AWS — multi-cloud design, landing zones, hybrid cloud, enterprise-scale IaC'),
    ('Programme Delivery', 'End-to-end delivery of complex cloud transformation and managed services programmes'),
    ('DevOps & Automation', 'CI/CD pipelines, GitHub Actions, Azure DevOps, Terraform, reusable automation frameworks'),
    ('Stakeholder Management', 'Trusted advisor to client C-suite; managing expectations across global, cross-functional teams'),
    ('Commercial Acumen', 'Delivering cost reduction, resource optimisation, and business value from technology investment'),
    ('People & Team Development', 'Mentoring engineers, growing team capability, supporting apprenticeship programmes since 2017'),
    ('Security & Compliance', 'Okta, IAM, Workload Identity Federation, Trend Micro, ITIL V4, cloud security standards'),
    ('Governance & Process', 'ITSM (ServiceNow), SLA management, School Governor, Scrum Master, audit-ready delivery'),
]
for bold_text, rest in competencies:
    add_left_border_para(doc, '', bold_text, rest)

# ═══════════════════════════════════════════════════════════════════════════════
# CAREER HISTORY
# ═══════════════════════════════════════════════════════════════════════════════
section_heading(doc, 'Career History')

# Deloitte
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(6)
p.paragraph_format.space_after = Pt(1)
r = p.add_run('Senior Manager – Solutions')
r.bold = True
r.font.size = Pt(12)
r2 = p.add_run('  |  previously Manager & Senior Consultant')
r2.font.size = Pt(10)
r2.font.color.rgb = GREY

p2 = doc.add_paragraph()
p2.paragraph_format.space_before = Pt(0)
p2.paragraph_format.space_after = Pt(2)
r3 = p2.add_run('Deloitte MCS – Cloud Managed Services')
r3.font.size = Pt(10)
r3.font.color.rgb = GREY
r4 = p2.add_run('          Oct 2020 – Present')
r4.font.size = Pt(10)
r4.font.color.rgb = GREY
r4.italic = True

sub_p = doc.add_paragraph()
sub_p.paragraph_format.space_before = Pt(6)
sub_p.paragraph_format.space_after = Pt(2)
sr = sub_p.add_run('Leadership & Strategic Impact')
sr.bold = True
sr.font.size = Pt(10)
sr.font.color.rgb = NAVY

leadership_bullets = [
    'Appointed interim **Head of GCP Engineering** within Deloitte Cloud Managed Services — leading the engineering team, setting technical direction, and overseeing delivery quality across all GCP workstreams.',
    'Led a smooth transition of GCP Engineering responsibilities from the ERDC team with minimal disruption to clients or operations.',
    'Championing GCP standardisation across the CMS practice, defining engineering standards and guiding the GCP practice maturity roadmap.',
    'Supporting the Deloitte Apprenticeship Programme and actively mentoring junior engineers and consultants.',
    'Recognised by senior leadership for aligning delivery approach with Deloitte\'s Engineering CRAFT principles.',
]
for b in leadership_bullets:
    if '**' in b:
        parts = b.split('**')
        p2 = doc.add_paragraph(style='List Bullet')
        p2.paragraph_format.left_indent = Inches(0.2)
        p2.paragraph_format.space_before = Pt(1)
        p2.paragraph_format.space_after = Pt(1)
        for i, part in enumerate(parts):
            r = p2.add_run(part)
            r.font.size = Pt(10.5)
            if i % 2 == 1:
                r.bold = True
    else:
        bullet(doc, b)

# ═══════════════════════════════════════════════════════════════════════════════
# KEY PROJECTS
# ═══════════════════════════════════════════════════════════════════════════════
section_heading(doc, 'Key Projects & Achievements')

project_card(doc,
    'GCP Project Vending Pipeline — Deloitte Cloud Managed Services',
    'Engineering Lead',
    'Deloitte Internal & External Clients  |  2024–Present',
    [
        'Initiated and led the end-to-end design and delivery of a fully automated GCP project vending pipeline, now in production across Deloitte\'s managed cloud estate.',
        'Integrated Okta group creation, user provisioning, and GitHub Actions workflows directly into the pipeline — eliminating manual steps and reducing human error.',
        'Developed reusable automation scripts deployable across multiple clients, saving over 6 hours per engagement on reporting and data gathering tasks.',
    ],
    ['95% faster provisioning (5 hrs → <1 hr)', '~50% operational cost reduction', 'Automated OKTA + GitHub Actions integration']
)

project_card(doc,
    'West Brom Building Society — GCP Environment Build',
    'GCP Lead',
    'West Bromwich Building Society  |  2024–Present',
    [
        'Sole GCP technical lead supporting West Brom\'s non-production GCP environment, enabling their address validation tool API and Google SecOps instance.',
        'Designed and implemented cross-cloud backup architecture, facilitating AWS-to-GCP backup pipelines for resilience and data sovereignty.',
        'Acted as primary technical advisor, translating client requirements into GCP-native solutions and managing all engineering delivery.',
    ],
    ['Multi-cloud (AWS + GCP) architecture', 'Google SecOps deployment', 'Client-facing technical leadership']
)

project_card(doc,
    'Global Manufacturing — Azure Landing Zone & Hybrid Cloud',
    'Azure Workstream Lead & Architect',
    'Global Manufacturing Client  |  Deloitte',
    [
        'Led Azure workstream and acted as Cloud Architect for enterprise-scale landing zone design based on Open Cloud Framework.',
        'Architected hybrid cloud design and implementation across multiple global business unit sites.',
        'Developed infrastructure as code using Terraform, deployed via Buildkite pipelines for repeatable, auditable delivery.',
    ],
    ['Enterprise Landing Zone', 'Global multi-site delivery', 'Terraform + Buildkite IaC']
)

project_card(doc,
    'Large Retail Bank UAE — Digital Banking Platform',
    'Azure Infrastructure DevOps Engineer',
    'UAE Retail Bank  |  Deloitte',
    [
        'Designed and implemented Azure cloud infrastructure for a new digital banking platform using Terraform and Buildkite pipelines.',
        'Delivered secure, scalable infrastructure to support digital banking services for a regulated financial institution.',
    ],
    ['Financial Services cloud delivery', 'Azure DevOps & Terraform']
)

# Accenture header
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(12)
p.paragraph_format.space_after = Pt(1)
r = p.add_run('Cloud Migration & Implementation Delivery Associate Manager')
r.bold = True
r.font.size = Pt(12)
p2 = doc.add_paragraph()
p2.paragraph_format.space_before = Pt(0)
p2.paragraph_format.space_after = Pt(2)
r3 = p2.add_run('Accenture')
r3.font.size = Pt(10)
r3.font.color.rgb = GREY
r4 = p2.add_run('          2016 – 2020')
r4.font.size = Pt(10)
r4.font.color.rgb = GREY
r4.italic = True

project_card(doc,
    'Global Insurance Broker — Azure Cloud Migration',
    'Data Centre Design Lead & Azure SME',
    'Global Insurance Broker  |  Accenture',
    [
        'Led the design and build of a large-scale, UK-first migration of financial applications and infrastructure to Microsoft Azure — one of the most significant cloud migrations in UK financial services at the time.',
        'Delivery lead for end-to-end migration of ecommerce environment from on-premises datacentre to Azure.',
        'Led Azure Optimisation & Redesign project — assessed and implemented measures to reduce cloud spend, delivering approximately **£1.2 million in savings**.',
    ],
    ['£1.2M Azure cost savings', 'UK-first financial cloud migration', 'End-to-end delivery lead']
)

project_card(doc,
    'UK Communications & Media — Cisco WebEx Enterprise Rollout',
    'Technology Lead',
    'UK Communications & Media Client  |  Accenture',
    [
        'Led the technical release and enterprise-wide adoption of Cisco WebEx to **15,000 users**, managing cross-functional teams and stakeholder communications throughout.',
    ],
    ['15,000-user rollout', 'Technical delivery lead']
)

project_card(doc,
    'Large UK Retail Bank — Cloud Enablement & Architecture',
    'Delivery Lead & Cloud Architect',
    'UK Retail Bank  |  Accenture',
    [
        'Led cloud enablement for application stakeholders, developing cloud-native reference architectures and working directly with client architects on their cloud journey strategy.',
    ],
    ['Cloud-native reference architectures', 'Stakeholder cloud enablement']
)

# ═══════════════════════════════════════════════════════════════════════════════
# EARLIER CAREER TABLE
# ═══════════════════════════════════════════════════════════════════════════════
section_heading(doc, 'Earlier Career')
early = [
    ('Consultant / Azure SME', 'Avanade, Singapore', '2013–2015', 'Solution Architect for Azure-hosted Sitecore platform; SME for Government, Marina Bay Sands, Fuji Xerox bids'),
    ('Senior Analyst / Infrastructure Consultant', 'Avanade Pty, Australia', '2011–2013', 'Led SCCM infrastructure readiness across 6 asset sites; VDI PoC infrastructure build'),
    ('Executive / Release & Config Manager', 'Barclays Capital Services, Singapore', '2007–2011', 'PoC for LEH-to-Barclays SCCM migration; £150K infrastructure consolidation saving'),
    ('Project Lead', 'Medsys E-Solutions, Dubai', '2005–2007', 'Desktop migration lead for global bank in UAE; 1,000+ application repackaging; 14-country EMEA PoC'),
    ('IT Consultant / Packaging SME', 'LogicaCMG, India', '2004–2005', 'Developed Application Tracker Tool and automated MSI packaging tool; 300+ applications packaged'),
    ('Software Engineer', 'HP Global Delivery Centre, India', '2002–2004', 'Application repackaging for KPMG UK, Fidelity; Process Improvement Plan contributor'),
]
et = doc.add_table(rows=1 + len(early), cols=4)
et.style = 'Table Grid'
headers = ['Role', 'Organisation', 'Period', 'Key Contribution']
for i, h in enumerate(headers):
    c = et.cell(0, i)
    set_cell_bg(c, '1b4f72')
    p = c.paragraphs[0]
    r = p.add_run(h)
    r.bold = True
    r.font.color.rgb = RGBColor(0xff, 0xff, 0xff)
    r.font.size = Pt(10)

for ri, row_data in enumerate(early):
    for ci, val in enumerate(row_data):
        c = et.cell(ri + 1, ci)
        if (ri + 1) % 2 == 0:
            set_cell_bg(c, 'f7fbff')
        p = c.paragraphs[0]
        r = p.add_run(val)
        r.font.size = Pt(10)

# ═══════════════════════════════════════════════════════════════════════════════
# CERTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════════
section_heading(doc, 'Professional Certifications')
certs = [
    ('Microsoft Certified: Azure Solutions Architect Expert', 'Microsoft Certified: DevOps Engineer Expert'),
    ('Google Cloud Certified: Associate Cloud Engineer', 'AWS Certified: Solutions Architect Associate'),
    ('MCSE: Cloud Platform and Infrastructure', 'MCSA: Cloud Platform'),
    ('MS: Server Virtualisation with Hyper-V & System Center', 'ITIL V4 Foundation'),
    ('ITIL4 Specialist: Acquiring & Managing Cloud Services', 'Certified ScrumMaster®'),
]
ct = doc.add_table(rows=len(certs), cols=2)
for ri, (c1, c2) in enumerate(certs):
    for ci, val in enumerate([c1, c2]):
        cell = ct.cell(ri, ci)
        set_cell_bg(cell, 'f7fbff')
        set_cell_border(cell, left={'val': 'single', 'sz': '12', 'space': '0', 'color': '1b4f72'})
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(val)
        r.font.size = Pt(10)

# ═══════════════════════════════════════════════════════════════════════════════
# EDUCATION & COMMUNITY
# ═══════════════════════════════════════════════════════════════════════════════
section_heading(doc, 'Education & Community')
et2 = doc.add_table(rows=1, cols=2)
for row in et2.rows:
    for cell in row.cells:
        for edge in ['top','bottom','left','right']:
            set_cell_border(cell, **{edge: {'val':'none','sz':'0','space':'0','color':'FFFFFF'}})

lc = et2.cell(0, 0)
rc = et2.cell(0, 1)

# Education
ep = lc.paragraphs[0]
er = ep.add_run('Education')
er.bold = True
er.font.color.rgb = NAVY
er.font.size = Pt(10.5)

for degree, univ in [
    ("Master's in Computer Applications (MCA)", "Madurai Kamaraj University, India — First Class Honours (1999–2002)"),
    ("BSc Mathematics", "Bharathidasan University, India — First Class Honours (1992–1995)"),
]:
    dp = lc.add_paragraph()
    dr = dp.add_run(degree)
    dr.bold = True
    dr.font.size = Pt(10.5)
    dp.paragraph_format.space_before = Pt(4)
    up = lc.add_paragraph(univ)
    up.runs[0].font.color.rgb = GREY
    up.runs[0].font.size = Pt(10)
    up.paragraph_format.space_after = Pt(2)

# Community
cp_ = rc.paragraphs[0]
cr = cp_.add_run('Community & Leadership')
cr.bold = True
cr.font.color.rgb = NAVY
cr.font.size = Pt(10.5)

for item in [
    ('School Governor', 'Curriculum & Student Committee, local school (2018–present)'),
    ('Apprenticeship Programme Champion', 'Supporting early-career technologists at Deloitte (2017–present)'),
]:
    ip = rc.add_paragraph()
    ip.paragraph_format.space_before = Pt(4)
    ir = ip.add_run(item[0] + ' — ')
    ir.bold = True
    ir.font.size = Pt(10.5)
    ir2 = ip.add_run(item[1])
    ir2.font.size = Pt(10.5)

output_path = '/Users/karthiksankaran/PS-Scripts/CV/Karthik_Sankaran_CV_AD.docx'
doc.save(output_path)
print(f'Saved: {output_path}')