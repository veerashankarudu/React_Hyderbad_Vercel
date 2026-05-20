"""
QuizHub AI — Full Screenshot Capture Script
Captures desktop (1440x900) + mobile (400x800) for all 30 feature areas.
Saves to test-screenshots/ folder.
"""

import os, time, json
from playwright.sync_api import sync_playwright

BASE    = "http://localhost:3000"
OUT     = "/Users/veera.konjeti/Desktop/hack-n-stack/test-screenshots"
os.makedirs(OUT, exist_ok=True)

ADMIN1  = {"user": "divya.madhanasekar",     "pass": "Admin@123"}
ADMIN2  = {"user": "gaurav.a.bhola",          "pass": "Admin@123"}
SME1    = {"user": "birendra.kumar.singh",    "pass": "Sme@1234"}
SME2    = {"user": "swati.avinash.nikam",     "pass": "Sme@1234"}
SME3    = {"user": "indugu.hari.prasad",      "pass": "Sme@1234"}

results = {}   # filename -> "PASS" | "FAIL" | "SKIP"

def shot(page, name, note=""):
    path = os.path.join(OUT, name)
    try:
        page.screenshot(path=path, type="png")
        results[name] = "PASS"
        print(f"  📸 {name}")
    except Exception as e:
        results[name] = "FAIL"
        print(f"  ❌ {name}: {e}")

def login(page, creds):
    page.goto(f"{BASE}/login", wait_until="networkidle", timeout=15000)
    page.fill("input[name='username'], input[placeholder*='Enterprise'], input[type='text']", creds["user"])
    page.fill("input[type='password']", creds["pass"])
    page.click("button[type='submit']")
    page.wait_for_url(f"{BASE}/**", timeout=10000)
    time.sleep(0.8)

def logout(page):
    try:
        page.goto(f"{BASE}/login", wait_until="networkidle", timeout=10000)
        page.evaluate("localStorage.clear()")
        page.reload(wait_until="networkidle", timeout=10000)
    except:
        pass

def set_desktop(page):
    page.set_viewport_size({"width": 1440, "height": 900})

def set_mobile(page):
    page.set_viewport_size({"width": 400, "height": 800})

def nav(page, path, wait=0.8):
    page.goto(f"{BASE}{path}", wait_until="networkidle", timeout=15000)
    time.sleep(wait)

def safe_click(page, selector, timeout=5000):
    try:
        page.click(selector, timeout=timeout)
        time.sleep(0.5)
        return True
    except:
        return False

def safe_fill(page, selector, value, timeout=5000):
    try:
        page.fill(selector, value, timeout=timeout)
        return True
    except:
        return False

# ─────────────────────────────────────────────────────────────
print("\n🚀 Starting screenshot capture...\n")

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    ctx = browser.new_context()

    # ══════════════════════════════════════════════════════════
    # SECTION 1 — LOGIN (TC01–TC06)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 1: Login ──")
    page = ctx.new_page()
    set_desktop(page)
    nav(page, "/login")
    shot(page, "TC01_d_login_page.png")                     # TC-01 desktop login
    set_mobile(page)
    page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC01_m_login_page.png")                     # TC-01 mobile login

    # TC-02: Login with Admin credentials → dashboard
    set_desktop(page)
    login(page, ADMIN1)
    shot(page, "TC02_d_dashboard_admin.png")

    set_mobile(page)
    nav(page, "/")
    shot(page, "TC02_m_dashboard_admin.png")

    # TC-03: Login as SME
    logout(page); set_desktop(page)
    login(page, SME1)
    shot(page, "TC03_d_dashboard_sme.png")
    set_mobile(page)
    nav(page, "/")
    shot(page, "TC03_m_dashboard_sme.png")

    # TC-04: Wrong password → error
    logout(page); set_desktop(page)
    nav(page, "/login")
    page.fill("input[type='text']", ADMIN1["user"])
    page.fill("input[type='password']", "WrongPass999!")
    page.click("button[type='submit']")
    time.sleep(1.5)
    shot(page, "TC04_d_login_error.png")

    # TC-05: Blank fields → validation
    nav(page, "/login")
    page.click("button[type='submit']")
    time.sleep(0.8)
    shot(page, "TC05_d_login_blank_validation.png")

    # TC-06: Forgot password page
    nav(page, "/forgot-password")
    shot(page, "TC06_d_forgot_password.png")
    set_mobile(page)
    page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC06_m_forgot_password.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 2 — REGISTER (TC07–TC12)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 2: Register ──")
    page = ctx.new_page(); set_desktop(page)
    nav(page, "/register")
    shot(page, "TC07_d_register_page.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC07_m_register_page.png")

    # Fill register form
    set_desktop(page); nav(page, "/register")
    safe_fill(page, "input[name='firstName'], input[placeholder*='First']", "Test")
    safe_fill(page, "input[name='lastName'],  input[placeholder*='Last']",  "User")
    safe_fill(page, "input[name='enterpriseId'], input[placeholder*='Enterprise']", "test.user.demo")
    safe_fill(page, "input[name='email'], input[type='email']", "testuser@example.com")
    safe_fill(page, "input[name='password'], input[type='password']", "Test@1234")
    shot(page, "TC08_d_register_form_filled.png")

    # Submit registration
    page.click("button[type='submit']")
    time.sleep(2)
    shot(page, "TC09_d_register_submit_result.png")

    # Duplicate email validation
    nav(page, "/register")
    safe_fill(page, "input[name='enterpriseId'], input[placeholder*='Enterprise']", ADMIN1["user"])
    safe_fill(page, "input[type='password']", "Test@1234")
    page.click("button[type='submit']"); time.sleep(1.5)
    shot(page, "TC10_d_register_duplicate.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 3 — CHANGE PASSWORD (TC13–TC16)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 3: Change Password ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    # Open change password modal via navbar
    clicked = safe_click(page, "[class*='navbar'] [class*='avatar'], [class*='user-menu'], button[title*='Profile'], .navbar-user, [class*='profile']")
    time.sleep(0.5)
    shot(page, "TC13_d_change_password_modal.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 4 — DASHBOARD (TC17–TC24)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 4: Dashboard ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/")
    shot(page, "TC17_d_dashboard_stats.png")              # stat cards
    set_mobile(page); nav(page, "/")
    shot(page, "TC17_m_dashboard_stats.png")

    # Dark mode toggle
    set_desktop(page); nav(page, "/")
    toggled = safe_click(page, "[class*='dark'], button[title*='dark'], button[title*='theme'], [class*='theme-toggle'], [aria-label*='dark'], [aria-label*='theme']")
    time.sleep(0.5)
    shot(page, "TC18_d_dark_mode.png")
    # Toggle back
    safe_click(page, "[class*='dark'], button[title*='dark'], button[title*='theme'], [class*='theme-toggle'], [aria-label*='dark'], [aria-label*='theme']")
    time.sleep(0.3)

    # Language switch
    lang_clicked = safe_click(page, "[class*='lang'], select[class*='lang'], button[title*='lang'], [class*='language'], [aria-label*='language']")
    time.sleep(0.5)
    shot(page, "TC19_d_language_switcher.png")

    # Recent activity timestamps
    nav(page, "/")
    shot(page, "TC20_d_recent_activity_timestamps.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 5 — MCQ FORM (TC25–TC36)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 5: MCQ Form ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, SME1)
    nav(page, "/mcq/new")
    shot(page, "TC25_d_mcq_form_blank.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC25_m_mcq_form_blank.png")

    # Fill MCQ form
    set_desktop(page); nav(page, "/mcq/new")
    time.sleep(1)
    # Question stem
    safe_fill(page, "textarea[name*='question'], textarea[placeholder*='question'], .ql-editor, [contenteditable='true']", "What is the primary purpose of the OSI model in networking?")
    time.sleep(0.3)
    # Options
    opts = ["To provide a conceptual framework for network communication", "To assign IP addresses to devices", "To encrypt data transmissions", "To manage DNS resolution"]
    option_inputs = page.query_selector_all("input[placeholder*='Option'], input[placeholder*='option'], input[name*='option']")
    for i, inp in enumerate(option_inputs[:4]):
        try: inp.fill(opts[i]); time.sleep(0.1)
        except: pass
    # Try selecting correct answer radio
    safe_click(page, "input[type='radio']:first-of-type, label:first-of-type input[type='radio']")
    shot(page, "TC26_d_mcq_form_filled.png")

    # Try AI generate button
    ai_btn = safe_click(page, "button[class*='ai'], button[title*='AI'], button[title*='generate'], [class*='ai-generate']", timeout=3000)
    time.sleep(1)
    shot(page, "TC27_d_mcq_ai_generate.png")

    # Submit MCQ as draft
    nav(page, "/mcq/new")
    time.sleep(0.8)
    shot(page, "TC28_d_mcq_form_submit_area.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 6 — MY QUESTIONS (TC37–TC44)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 6: My Questions ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, SME1)
    nav(page, "/my-questions")
    shot(page, "TC37_d_my_questions.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC37_m_my_questions.png")

    # Filter by status
    set_desktop(page); nav(page, "/my-questions")
    safe_click(page, "select[class*='filter'], select[name*='status'], [class*='filter-status']")
    time.sleep(0.3)
    shot(page, "TC38_d_my_questions_filter.png")

    # Search
    safe_fill(page, "input[placeholder*='Search'], input[type='search']", "OSI")
    time.sleep(0.5)
    shot(page, "TC39_d_my_questions_search.png")

    # Sort
    safe_click(page, "th[class*='sort'], th[class*='sortable'], button[class*='sort']")
    time.sleep(0.3)
    shot(page, "TC40_d_my_questions_sort.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 7 — MCQ DETAIL + COMMENTS (TC45–TC52)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 7: MCQ Detail ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/question-bank")
    time.sleep(1)
    # Click first MCQ row
    first_row = page.query_selector("table tbody tr:first-child td:first-child a, table tbody tr:first-child [class*='view'], table tbody tr:first-child td:first-child")
    if first_row:
        first_row.click(); time.sleep(1.5)
    shot(page, "TC45_d_mcq_detail.png")
    set_mobile(page); time.sleep(0.5)
    shot(page, "TC45_m_mcq_detail.png")

    # Comment section
    set_desktop(page)
    comment_area = page.query_selector("textarea[placeholder*='comment'], textarea[placeholder*='Comment'], input[placeholder*='comment']")
    if comment_area:
        comment_area.fill("This question is well-structured and tests key networking concepts.")
        time.sleep(0.3)
    shot(page, "TC46_d_mcq_comment_input.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 8 — PENDING REVIEWS (TC53–TC60)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 8: Pending Reviews ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, SME2)
    nav(page, "/pending-reviews")
    shot(page, "TC53_d_pending_reviews.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC53_m_pending_reviews.png")

    set_desktop(page); nav(page, "/pending-reviews")
    # Click first review item
    safe_click(page, "table tbody tr:first-child td a, table tbody tr:first-child button[class*='review'], table tbody tr:first-child")
    time.sleep(1.5)
    shot(page, "TC54_d_review_detail.png")

    # Try approve
    approve_clicked = safe_click(page, "button[class*='approve'], button:has-text('Approve'), [class*='btn-approve']", timeout=3000)
    time.sleep(0.8)
    shot(page, "TC55_d_review_approved.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 9 — QUESTION BANK (TC61–TC70)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 9: Question Bank (Admin) ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/question-bank")
    shot(page, "TC61_d_question_bank.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC61_m_question_bank.png")

    # Filter by subject
    set_desktop(page); nav(page, "/question-bank")
    safe_click(page, "select[name*='subject'], select[class*='subject'], [class*='filter-subject']")
    time.sleep(0.3)
    shot(page, "TC62_d_qbank_filter_subject.png")

    # Filter by status
    safe_click(page, "select[name*='status'], select[class*='status']")
    time.sleep(0.3)
    shot(page, "TC63_d_qbank_filter_status.png")

    # Search
    safe_fill(page, "input[placeholder*='Search'], input[type='search']", "network")
    time.sleep(0.8)
    shot(page, "TC64_d_qbank_search.png")

    # Export
    safe_click(page, "button[class*='export'], button:has-text('Export'), [class*='btn-export']", timeout=3000)
    time.sleep(0.5)
    shot(page, "TC65_d_qbank_export.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 10 — BULK UPLOAD (TC71–TC77)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 10: Bulk Upload ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, SME1)
    nav(page, "/bulk-upload")
    shot(page, "TC71_d_bulk_upload_page.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC71_m_bulk_upload_page.png")

    # Template download
    set_desktop(page); nav(page, "/bulk-upload")
    safe_click(page, "a[href*='template'], button:has-text('template'), button:has-text('Template'), a:has-text('Download')", timeout=3000)
    time.sleep(0.5)
    shot(page, "TC72_d_bulk_upload_template.png")

    # Upload the test CSV
    set_desktop(page); nav(page, "/bulk-upload")
    csv_path = "/Users/veera.konjeti/Desktop/hack-n-stack/test-mcqs.csv"
    if os.path.exists(csv_path):
        file_input = page.query_selector("input[type='file']")
        if file_input:
            file_input.set_input_files(csv_path)
            time.sleep(1.5)
            shot(page, "TC73_d_bulk_upload_preview.png")
            # Submit
            safe_click(page, "button[type='submit'], button:has-text('Upload'), button:has-text('upload')", timeout=5000)
            time.sleep(2)
            shot(page, "TC74_d_bulk_upload_result.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 11 — USER MANAGEMENT (TC78–TC85)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 11: User Management ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/user-management")
    shot(page, "TC78_d_user_management.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC78_m_user_management.png")

    # Approve pending user
    set_desktop(page); nav(page, "/user-management")
    safe_click(page, "button:has-text('Approve'), button[class*='approve']", timeout=3000)
    time.sleep(1)
    shot(page, "TC79_d_user_approve.png")

    # Reject user
    nav(page, "/user-management")
    safe_click(page, "button:has-text('Reject'), button[class*='reject']", timeout=3000)
    time.sleep(1)
    shot(page, "TC80_d_user_reject.png")

    # Change role
    nav(page, "/user-management")
    safe_click(page, "select[class*='role'], button[class*='role'], [class*='change-role']", timeout=3000)
    time.sleep(0.5)
    shot(page, "TC81_d_user_change_role.png")

    # Search
    safe_fill(page, "input[placeholder*='Search'], input[type='search']", "birendra")
    time.sleep(0.8)
    shot(page, "TC82_d_user_search.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 12 — MASTER DATA (TC86–TC93)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 12: Master Data ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/master-data")
    shot(page, "TC86_d_master_data.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC86_m_master_data.png")

    # Add subject
    set_desktop(page); nav(page, "/master-data")
    safe_click(page, "button:has-text('Add'), button[class*='add'], button:has-text('+')", timeout=3000)
    time.sleep(0.5)
    shot(page, "TC87_d_master_data_add.png")

    # Fill and cancel
    safe_fill(page, "input[placeholder*='name'], input[name*='name'], input[class*='name']", "Test Subject XYZ")
    time.sleep(0.3)
    shot(page, "TC88_d_master_data_form.png")
    safe_click(page, "button:has-text('Cancel'), button[class*='cancel']", timeout=3000)
    time.sleep(0.3)

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 13 — ANALYTICS (TC94–TC99)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 13: Analytics ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/analytics")
    shot(page, "TC94_d_analytics.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC94_m_analytics.png")

    set_desktop(page); nav(page, "/analytics")
    # Date range filter
    safe_click(page, "input[type='date'], [class*='date-picker'], [class*='datepicker']", timeout=3000)
    time.sleep(0.5)
    shot(page, "TC95_d_analytics_datefilter.png")

    # Export chart
    safe_click(page, "button:has-text('Export'), button[class*='export'], button:has-text('Download')", timeout=3000)
    time.sleep(0.5)
    shot(page, "TC96_d_analytics_export.png")

    # SME analytics
    logout(page); set_desktop(page)
    login(page, SME1)
    nav(page, "/analytics")
    shot(page, "TC97_d_analytics_sme_view.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 14 — KANBAN BOARD (TC100–TC104)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 14: Kanban Board ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/kanban")
    shot(page, "TC100_d_kanban_board.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC100_m_kanban_board.png")

    set_desktop(page); nav(page, "/kanban")
    # SME kanban
    logout(page); set_desktop(page)
    login(page, SME1)
    nav(page, "/kanban")
    shot(page, "TC101_d_kanban_sme.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 15 — QUIZ + ANTI-CHEAT (TC105–TC118)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 15: Quiz Builder + Anti-cheat ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/quiz-builder")
    shot(page, "TC105_d_quiz_builder.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC105_m_quiz_builder.png")

    # Build a quiz
    set_desktop(page); nav(page, "/quiz-builder")
    safe_fill(page, "input[name*='title'], input[placeholder*='title'], input[placeholder*='Quiz']", "Networking Basics Quiz")
    time.sleep(0.3)
    shot(page, "TC106_d_quiz_builder_form.png")

    # Quiz history / attempts
    nav(page, "/quiz-attempts")
    shot(page, "TC107_d_quiz_attempts.png")

    # Take quiz
    nav(page, "/quiz")
    shot(page, "TC108_d_quiz_landing.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC108_m_quiz_landing.png")

    # Anti-cheat: fullscreen mode
    set_desktop(page); nav(page, "/quiz")
    safe_click(page, "button:has-text('Start'), button:has-text('Take Quiz'), button:has-text('Begin'), [class*='start-quiz']", timeout=3000)
    time.sleep(1.5)
    shot(page, "TC109_d_quiz_in_progress.png")
    set_mobile(page); time.sleep(0.5)
    shot(page, "TC109_m_quiz_in_progress.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 16 — LEADERBOARD (TC119–TC123)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 16: Leaderboard ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/leaderboard")
    shot(page, "TC119_d_leaderboard.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC119_m_leaderboard.png")

    # Subject filter
    set_desktop(page); nav(page, "/leaderboard")
    safe_click(page, "select[class*='subject'], select[name*='subject'], [class*='filter']", timeout=3000)
    time.sleep(0.3)
    shot(page, "TC120_d_leaderboard_filter.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 17 — INBOX (TC124–TC133)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 17: Inbox ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/inbox")
    shot(page, "TC124_d_inbox.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC124_m_inbox.png")

    # Compose message
    set_desktop(page); nav(page, "/inbox")
    safe_click(page, "button:has-text('Compose'), button:has-text('New'), button:has-text('+'), button[class*='compose']", timeout=3000)
    time.sleep(0.5)
    shot(page, "TC125_d_inbox_compose.png")

    # Fill compose form
    safe_fill(page, "input[placeholder*='To'], input[name*='to'], input[name*='recipient']", SME1["user"])
    time.sleep(0.3)
    safe_fill(page, "input[placeholder*='Subject'], input[name*='subject']", "Test Message from Admin")
    time.sleep(0.3)
    safe_fill(page, "textarea[placeholder*='Message'], textarea[name*='body'], textarea[name*='message']", "Hello, this is a test message sent via QuizHub Inbox.")
    time.sleep(0.3)
    shot(page, "TC126_d_inbox_compose_filled.png")

    # Send
    safe_click(page, "button[type='submit'], button:has-text('Send')", timeout=3000)
    time.sleep(1.5)
    shot(page, "TC127_d_inbox_sent.png")

    # Read inbox as SME
    logout(page); set_desktop(page)
    login(page, SME1)
    nav(page, "/inbox")
    shot(page, "TC128_d_inbox_sme_received.png")

    # Click message
    safe_click(page, "table tbody tr:first-child, [class*='message-item']:first-child, [class*='inbox-row']:first-child", timeout=3000)
    time.sleep(1)
    shot(page, "TC129_d_inbox_message_open.png")
    set_mobile(page); time.sleep(0.5)
    shot(page, "TC129_m_inbox_message_open.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 18 — NOTIFICATIONS (TC134–TC140)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 18: Notifications ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, SME1)
    nav(page, "/")
    # Click bell icon
    safe_click(page, "[class*='notification-bell'], [class*='bell'], button[aria-label*='notification'], svg[class*='bell']", timeout=3000)
    time.sleep(0.8)
    shot(page, "TC134_d_notifications_panel.png")
    set_mobile(page)
    nav(page, "/")
    safe_click(page, "[class*='notification-bell'], [class*='bell'], button[aria-label*='notification']", timeout=3000)
    time.sleep(0.5)
    shot(page, "TC134_m_notifications_panel.png")

    # Mark all read
    set_desktop(page); nav(page, "/")
    safe_click(page, "[class*='notification-bell'], [class*='bell']", timeout=3000)
    time.sleep(0.5)
    safe_click(page, "button:has-text('Mark all read'), button:has-text('mark all'), [class*='mark-read']", timeout=3000)
    time.sleep(0.8)
    shot(page, "TC135_d_notifications_marked_read.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 19 — CHATBOT (TC141–TC150)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 19: ChatBot ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/")
    # Click chatbot icon
    safe_click(page, "[class*='chatbot'], button[class*='chat'], [class*='chat-icon'], [aria-label*='chat']", timeout=3000)
    time.sleep(0.8)
    shot(page, "TC141_d_chatbot_open.png")
    set_mobile(page); time.sleep(0.5)
    shot(page, "TC141_m_chatbot_open.png")

    # Type a message
    set_desktop(page)
    safe_fill(page, "[class*='chatbot'] input, [class*='chat-input'], input[placeholder*='message'], input[placeholder*='Ask']", "How do I create a new question?")
    time.sleep(0.3)
    safe_click(page, "[class*='chatbot'] button[type='submit'], [class*='send-btn'], [class*='chat-send']", timeout=3000)
    time.sleep(2)
    shot(page, "TC142_d_chatbot_response.png")

    # Close chatbot
    safe_click(page, "[class*='chatbot'] button[class*='close'], [class*='chat-close'], [class*='chatbot-close']", timeout=3000)
    time.sleep(0.3)

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 20 — AUDIT LOG (TC151–TC154)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 20: Audit Log ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/audit-log")
    shot(page, "TC151_d_audit_log.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC151_m_audit_log.png")

    set_desktop(page); nav(page, "/audit-log")
    safe_fill(page, "input[placeholder*='Search'], input[type='search']", "LOGIN")
    time.sleep(0.8)
    shot(page, "TC152_d_audit_log_search.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 21 — REVIEWER DASHBOARD / METRICS (TC155–TC158)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 21: Reviewer Metrics ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    # Reviewer metrics page
    nav(page, "/reviewer-metrics")
    shot(page, "TC155_d_reviewer_metrics.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC155_m_reviewer_metrics.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 22 — ACCESS CONTROL (TC159–TC165)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 22: Access Control ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, SME1)
    # SME tries to access admin-only pages
    nav(page, "/user-management")
    shot(page, "TC159_d_access_denied_user_mgmt.png")
    nav(page, "/audit-log")
    shot(page, "TC160_d_access_denied_audit_log.png")
    nav(page, "/master-data")
    shot(page, "TC161_d_access_denied_master_data.png")

    # Unauthenticated → should redirect to login
    logout(page)
    nav(page, "/my-questions")
    shot(page, "TC162_d_unauthenticated_redirect.png")
    nav(page, "/question-bank")
    shot(page, "TC163_d_unauthenticated_qbank.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 23 — PAGINATION (TC166–TC173)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 23: Pagination ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/question-bank")
    shot(page, "TC166_d_pagination_question_bank.png")
    # Click next page
    safe_click(page, "button:has-text('Next'), [class*='pagination'] button:last-child, [aria-label*='next']", timeout=3000)
    time.sleep(0.8)
    shot(page, "TC167_d_pagination_next_page.png")

    nav(page, "/audit-log")
    shot(page, "TC168_d_pagination_audit_log.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 24 — MCQ WORKFLOW: SUBMIT → REVIEW → APPROVE (TC174–TC185)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 24: MCQ Workflow ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, SME3)
    nav(page, "/my-questions")
    shot(page, "TC174_d_workflow_my_questions.png")

    # Click submit on a draft question
    safe_click(page, "button:has-text('Submit'), button[class*='submit']", timeout=5000)
    time.sleep(1)
    shot(page, "TC175_d_workflow_submit_for_review.png")

    # Login as Admin → assign reviewer
    logout(page); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/question-bank")
    shot(page, "TC176_d_workflow_qbank_admin.png")
    safe_click(page, "button:has-text('Assign'), button[class*='assign']", timeout=5000)
    time.sleep(1)
    shot(page, "TC177_d_workflow_assign_reviewer_modal.png")
    # Select reviewer and confirm
    safe_click(page, "select[class*='reviewer'], input[class*='reviewer']", timeout=3000)
    time.sleep(0.3)
    safe_click(page, "button:has-text('Confirm'), button[type='submit']", timeout=3000)
    time.sleep(1)
    shot(page, "TC178_d_workflow_reviewer_assigned.png")

    # Login as reviewer SME2 → approve
    logout(page); set_desktop(page)
    login(page, SME2)
    nav(page, "/pending-reviews")
    shot(page, "TC179_d_workflow_pending_reviews.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 25 — CONTENT TRANSLATION / i18n (TC186–TC188)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 25: i18n / Translations ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/")
    # Switch to Hindi
    lang_el = page.query_selector("select[class*='lang'], [class*='language-select'], select option[value='hi']")
    if lang_el:
        page.select_option("select[class*='lang'], [class*='language-select']", "hi")
        time.sleep(1)
        shot(page, "TC186_d_lang_hindi.png")
    else:
        # Try clicking language buttons
        shot(page, "TC186_d_lang_switcher_area.png")

    # Switch to French
    try:
        page.select_option("select[class*='lang'], [class*='language-select']", "fr")
        time.sleep(1)
        shot(page, "TC187_d_lang_french.png")
    except:
        shot(page, "TC187_d_lang_area.png")

    # Switch to Kannada
    try:
        page.select_option("select[class*='lang'], [class*='language-select']", "kn")
        time.sleep(1)
        shot(page, "TC188_d_lang_kannada.png")
    except:
        shot(page, "TC188_d_lang_area.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 26 — TIMESTAMP / TIME DISPLAY (TC189)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 26: Timestamp Display ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/")
    shot(page, "TC189_d_timestamps_dashboard.png")
    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 27 — QUIZ ATTEMPTS HISTORY (TC190–TC193)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 27: Quiz Attempts History ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)
    nav(page, "/quiz-attempts")
    shot(page, "TC190_d_quiz_attempts.png")
    set_mobile(page); page.reload(wait_until="networkidle"); time.sleep(0.5)
    shot(page, "TC190_m_quiz_attempts.png")
    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 28 — MOBILE RESPONSIVENESS CROSS-CUTTING (TC194–TC203)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 28: Mobile Responsiveness ──")
    page = ctx.new_page(); set_mobile(page)
    login(page, ADMIN1)

    pages_mobile = [
        ("/",                "TC194_m_home_hamburger.png"),
        ("/question-bank",   "TC195_m_question_bank.png"),
        ("/my-questions",    "TC196_m_my_questions.png"),
        ("/analytics",       "TC197_m_analytics.png"),
        ("/inbox",           "TC198_m_inbox.png"),
        ("/leaderboard",     "TC199_m_leaderboard.png"),
        ("/audit-log",       "TC200_m_audit_log.png"),
        ("/kanban",          "TC201_m_kanban.png"),
        ("/bulk-upload",     "TC202_m_bulk_upload.png"),
        ("/user-management", "TC203_m_user_management.png"),
    ]
    for path_str, fname in pages_mobile:
        nav(page, path_str)
        shot(page, fname)

    # Hamburger menu open
    nav(page, "/")
    safe_click(page, "button[class*='hamburger'], button[class*='menu-toggle'], button[aria-label*='menu'], [class*='hamburger']", timeout=3000)
    time.sleep(0.5)
    shot(page, "TC194b_m_hamburger_open.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 29 — EDGE CASES / NEGATIVE (TC204–TC230)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 29: Edge Cases ──")
    page = ctx.new_page(); set_desktop(page)

    # TC204: Empty question bank
    login(page, ADMIN1)
    nav(page, "/question-bank")
    safe_fill(page, "input[placeholder*='Search'], input[type='search']", "XYZXYZXYZ_no_results_12345")
    time.sleep(1)
    shot(page, "TC204_d_empty_search_results.png")

    # TC205: Empty inbox
    logout(page); login(page, ADMIN2)
    nav(page, "/inbox")
    shot(page, "TC205_d_inbox_empty_state.png")

    # TC206: Register with weak password
    logout(page)
    nav(page, "/register")
    safe_fill(page, "input[name='enterpriseId'], input[placeholder*='Enterprise']", "weak.user.test")
    safe_fill(page, "input[type='password']", "weak")
    page.click("button[type='submit']"); time.sleep(1)
    shot(page, "TC206_d_register_weak_password.png")

    # TC207: Login with empty Enterprise ID
    nav(page, "/login")
    page.fill("input[type='password']", "Admin@123")
    page.click("button[type='submit']"); time.sleep(0.8)
    shot(page, "TC207_d_login_empty_username.png")

    # TC208: MCQ form missing required fields
    login(page, SME1)
    nav(page, "/mcq/new")
    time.sleep(0.8)
    page.click("button[type='submit']"); time.sleep(1)
    shot(page, "TC208_d_mcq_form_validation.png")

    # TC209: Bulk upload with wrong file type
    nav(page, "/bulk-upload")
    file_input = page.query_selector("input[type='file']")
    # Create a fake txt file
    fake_path = "/tmp/wrong_type.txt"
    with open(fake_path, "w") as f: f.write("not a csv")
    if file_input:
        file_input.set_input_files(fake_path)
        time.sleep(1)
        shot(page, "TC209_d_bulk_upload_wrong_filetype.png")

    page.close()

    # ══════════════════════════════════════════════════════════
    # SECTION 30 — OVERALL UI / UX (TC231–TC242)
    # ══════════════════════════════════════════════════════════
    print("── SECTION 30: UI/UX Cross-cutting ──")
    page = ctx.new_page(); set_desktop(page)
    login(page, ADMIN1)

    # Status badges
    nav(page, "/question-bank")
    shot(page, "TC231_d_status_badges.png")

    # Sortable headers
    safe_click(page, "th[class*='sortable'], th[class*='sort']", timeout=3000)
    time.sleep(0.3)
    shot(page, "TC232_d_sortable_columns.png")

    # Navbar with all items (admin)
    nav(page, "/")
    shot(page, "TC233_d_navbar_admin.png")

    # Navbar SME
    logout(page); login(page, SME1)
    nav(page, "/")
    shot(page, "TC234_d_navbar_sme.png")

    # Footer / branding
    nav(page, "/login")
    shot(page, "TC235_d_login_branding.png")

    # 404 page
    nav(page, "/nonexistent-page-xyz")
    shot(page, "TC236_d_404_page.png")

    # Session logout
    login(page, ADMIN1)
    shot(page, "TC237_d_logged_in_state.png")
    logout(page)
    nav(page, "/")
    shot(page, "TC238_d_after_logout.png")

    # Responsive table
    set_mobile(page)
    login(page, ADMIN1)
    nav(page, "/question-bank")
    shot(page, "TC239_m_responsive_table.png")

    # Print / export
    set_desktop(page)
    nav(page, "/analytics")
    shot(page, "TC240_d_analytics_full.png")

    nav(page, "/leaderboard")
    shot(page, "TC241_d_leaderboard_full.png")

    nav(page, "/")
    shot(page, "TC242_d_final_dashboard.png")

    page.close()
    browser.close()

# ── Save results ───────────────────────────────────────────
results_path = os.path.join(OUT, "_results.json")
with open(results_path, "w") as f:
    json.dump(results, f, indent=2)

total  = len(results)
passed = sum(1 for v in results.values() if v == "PASS")
failed = sum(1 for v in results.values() if v == "FAIL")
print(f"\n✅ Done — {passed}/{total} screenshots captured  ({failed} failed)")
print(f"   Results saved to {results_path}")
