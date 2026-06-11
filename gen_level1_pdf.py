from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, 'QuizHub AI - Hack-N-Stack 2026 | Level 1 Submission', align='C')
        self.ln(10)
        self.set_draw_color(52, 152, 219)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')

    def section_title(self, title):
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(44, 62, 80)
        self.cell(0, 10, title, ln=True)
        self.ln(2)

    def sub_title(self, title):
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(52, 73, 94)
        self.cell(0, 8, title, ln=True)
        self.ln(1)

pdf = PDF()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.add_page()

# Title
pdf.set_font('Helvetica', 'B', 20)
pdf.set_text_color(44, 62, 80)
pdf.cell(0, 15, 'Level 1 - Mentor Presentation', align='C', ln=True)
pdf.ln(5)

# ===================== TABLE 1 =====================
pdf.section_title('Table 1: Basic Requirements (Level 1 PPT)')

# Result badge
pdf.set_font('Helvetica', 'B', 11)
pdf.set_text_color(39, 174, 96)
pdf.cell(0, 8, 'Result: 11/11 - All Level 1 basic requirements fully implemented', ln=True)
pdf.ln(3)

# Table 1 data
basic_reqs = [
    ("1", "SME: Add single MCQ (stem, options, difficulty, tech stack, topic)", "Full form with validation, dropdowns from DB, real-time field validation"),
    ("2", "SME: Save as Draft / Save & Send for Review", "Two buttons - Draft stays editable, Send for Review moves to next state"),
    ("3", "SME: Bulk upload via XLSX template", "Upload XLSX, server-side validation, error report for invalid rows"),
    ("4", "SME: View 'My Questions' - paginated with status", "Paginated table with filters by status, tech stack, topic; color-coded badges"),
    ("5", "SME: Edit Draft/Rejected MCQs, see reviewer comments", "Edit only for Draft/Rejected; rejected MCQs show feedback inline"),
    ("6", "SME: Review assigned MCQs - Approve/Reject with feedback", "Pending Reviews tab, full view, mandatory comment on reject"),
    ("7", "Admin: View ALL questions (Question Bank)", "Global paginated view with search, sort, filter by status/stack/topic/creator"),
    ("8", "Admin: Assign reviewer (same tech stack, exclude creator)", "Assign dialog shows eligible SMEs, auto-excludes question creator"),
    ("9", "Admin: Edit any MCQ, has all SME capabilities", "Admin edits at any stage (except Draft - only creator)"),
    ("10", "MCQ Lifecycle: Draft > Ready for Review > Under Review > Approved/Rejected", "5-state machine enforced at backend, multiple review cycles"),
    ("11", "Master data: 6 Tech Stacks, Topics, SME-Stack mapping", "Pre-seeded: Spring Cloud/Boot/Core/MVC/ORM/Core Java + 40+ topics"),
]

# Table header
col_widths = [8, 75, 82, 15]
pdf.set_font('Helvetica', 'B', 8)
pdf.set_fill_color(52, 152, 219)
pdf.set_text_color(255, 255, 255)
pdf.cell(col_widths[0], 7, '#', border=1, fill=True, align='C')
pdf.cell(col_widths[1], 7, 'Requirement', border=1, fill=True, align='C')
pdf.cell(col_widths[2], 7, 'How We Implemented It', border=1, fill=True, align='C')
pdf.cell(col_widths[3], 7, 'Status', border=1, fill=True, align='C')
pdf.ln()

# Table rows
pdf.set_font('Helvetica', '', 7)
for i, (num, req, impl) in enumerate(basic_reqs):
    pdf.set_text_color(44, 62, 80)
    fill = i % 2 == 0
    if fill:
        pdf.set_fill_color(236, 240, 241)
    else:
        pdf.set_fill_color(255, 255, 255)
    
    # Calculate row height based on content
    req_lines = pdf.multi_cell(col_widths[1], 4, req, split_only=True)
    impl_lines = pdf.multi_cell(col_widths[2], 4, impl, split_only=True)
    max_lines = max(len(req_lines), len(impl_lines), 1)
    row_h = max_lines * 4 + 2
    
    y_start = pdf.get_y()
    x_start = pdf.get_x()
    
    # Check if we need a new page
    if y_start + row_h > 270:
        pdf.add_page()
        y_start = pdf.get_y()
    
    # Draw cells
    pdf.set_xy(x_start, y_start)
    pdf.cell(col_widths[0], row_h, num, border=1, fill=fill, align='C')
    
    x_after_num = pdf.get_x()
    pdf.multi_cell(col_widths[1], 4, req, border=0)
    y_after_req = pdf.get_y()
    
    pdf.set_xy(x_after_num + col_widths[1], y_start)
    pdf.multi_cell(col_widths[2], 4, impl, border=0)
    y_after_impl = pdf.get_y()
    
    actual_h = max(y_after_req, y_after_impl) - y_start
    if actual_h < row_h:
        actual_h = row_h
    
    # Draw borders
    pdf.rect(x_start, y_start, col_widths[0], actual_h)
    pdf.rect(x_start + col_widths[0], y_start, col_widths[1], actual_h)
    pdf.rect(x_start + col_widths[0] + col_widths[1], y_start, col_widths[2], actual_h)
    pdf.rect(x_start + col_widths[0] + col_widths[1] + col_widths[2], y_start, col_widths[3], actual_h)
    
    # Status checkmark
    pdf.set_xy(x_start + col_widths[0] + col_widths[1] + col_widths[2], y_start)
    pdf.set_text_color(39, 174, 96)
    pdf.set_font('Helvetica', 'B', 9)
    pdf.cell(col_widths[3], actual_h, 'DONE', align='C')
    pdf.set_font('Helvetica', '', 7)
    
    pdf.set_xy(x_start, y_start + actual_h)

pdf.ln(8)

# ===================== TABLE 2 =====================
pdf.add_page()
pdf.section_title('Table 2: Extra Features Added (Level 1 - Without AI)')

extra_features = [
    ("1", "Security & Authentication", "Login, Logout, SME Registration, Forgot Password, JWT Sign-In/Sign-Out", "Production-grade security"),
    ("2", "User Profile & Personalization", "Profile picture, Change password, Dark/Light theme toggle", "UX polish beyond requirements"),
    ("3", "Real-Time Notifications", "Bell icon with live notification feed for all actions", "Instant updates, no refresh"),
    ("4", "Built-In Email Configuration", "Auto-emails when MCQs assigned, approved, or rejected", "Zero external tool dependency"),
    ("5", "Multiple Selection MCQs", "Support multiple correct options (not just single-answer)", "Beyond '4 options, 1 correct'"),
    ("6", "Kanban Board View", "Visual board showing MCQ lifecycle states", "Intuitive visual management"),
    ("7", "Assessment, Live Quiz, Leaderboard", "Quiz engine + live sessions + scoring + competitive ranking", "Complete learning ecosystem"),
    ("8", "Dynamic Master Data (No-Code)", "Admin adds/edits Tech Stacks, Topics, SMEs from UI", "UNIQUE: Future-proof, no devs needed"),
    ("9", "User Mgmt with Approval Workflow", "New users can't login until Admin approves", "Enterprise access control"),
    ("10", "Reviewer Metrics & SLA Tracking", "Reviewer performance + MCQs stuck >48hrs flagged", "Accountability - no MCQ sits idle"),
    ("11", "Complete Audit Log", "Full history: role changes, downloads, all actions", "Enterprise compliance ready"),
    ("12", "Smart Dashboard", "Greetings, activity feed, top reviewers, workload, progress", "Single view shows everything"),
]

# Table header
col_widths2 = [8, 42, 72, 58]
pdf.set_font('Helvetica', 'B', 8)
pdf.set_fill_color(155, 89, 182)
pdf.set_text_color(255, 255, 255)
pdf.cell(col_widths2[0], 7, '#', border=1, fill=True, align='C')
pdf.cell(col_widths2[1], 7, 'Feature', border=1, fill=True, align='C')
pdf.cell(col_widths2[2], 7, 'Description', border=1, fill=True, align='C')
pdf.cell(col_widths2[3], 7, "Why It's Unique", border=1, fill=True, align='C')
pdf.ln()

# Table rows
pdf.set_font('Helvetica', '', 7)
for i, (num, feature, desc, unique) in enumerate(extra_features):
    pdf.set_text_color(44, 62, 80)
    fill = i % 2 == 0
    if fill:
        pdf.set_fill_color(245, 238, 248)
    else:
        pdf.set_fill_color(255, 255, 255)
    
    y_start = pdf.get_y()
    x_start = pdf.get_x()
    
    # Calculate height
    feat_lines = pdf.multi_cell(col_widths2[1], 4, feature, split_only=True)
    desc_lines = pdf.multi_cell(col_widths2[2], 4, desc, split_only=True)
    uniq_lines = pdf.multi_cell(col_widths2[3], 4, unique, split_only=True)
    max_lines = max(len(feat_lines), len(desc_lines), len(uniq_lines), 1)
    row_h = max_lines * 4 + 2
    
    if y_start + row_h > 270:
        pdf.add_page()
        y_start = pdf.get_y()
        x_start = pdf.get_x()
    
    # Number
    pdf.set_xy(x_start, y_start)
    pdf.cell(col_widths2[0], row_h, num, border=1, fill=fill, align='C')
    
    # Feature name (bold)
    pdf.set_xy(x_start + col_widths2[0], y_start)
    pdf.set_font('Helvetica', 'B', 7)
    pdf.cell(col_widths2[1], row_h, feature, border=1, fill=fill)
    pdf.set_font('Helvetica', '', 7)
    
    # Description
    pdf.set_xy(x_start + col_widths2[0] + col_widths2[1], y_start)
    pdf.cell(col_widths2[2], row_h, desc, border=1, fill=fill)
    
    # Unique
    pdf.set_xy(x_start + col_widths2[0] + col_widths2[1] + col_widths2[2], y_start)
    pdf.set_font('Helvetica', 'I', 7)
    pdf.cell(col_widths2[3], row_h, unique, border=1, fill=fill)
    pdf.set_font('Helvetica', '', 7)
    
    pdf.set_xy(x_start, y_start + row_h)

pdf.ln(10)

# ===================== TALKING POINTS =====================
pdf.section_title('What Makes Us Stand Out')
pdf.set_font('Helvetica', '', 10)
pdf.set_text_color(44, 62, 80)

points = [
    "No-Code Master Data - Unlike other teams who hardcode stacks/topics, we built an Admin UI so the platform grows without developers.",
    "SLA Tracking (48-hour rule) - Questions stuck in review get automatically flagged. Nobody else tracks this.",
    "Full Audit Trail - Enterprise-grade logging of every action, ready for compliance review.",
    "Registration Approval Flow - Not just login/password. Actual user lifecycle management.",
    "12 extra features delivered in Phase 1 alone - before even touching AI (Phase 2).",
]

for i, point in enumerate(points, 1):
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_text_color(52, 152, 219)
    pdf.cell(8, 7, f'{i}.')
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(44, 62, 80)
    pdf.multi_cell(0, 7, point)
    pdf.ln(2)

# Save
output_path = '/Users/veera.konjeti/Desktop/hack-n-stack/LEVEL1-SUBMISSION.pdf'
pdf.output(output_path)
print(f'PDF saved: {output_path}')
