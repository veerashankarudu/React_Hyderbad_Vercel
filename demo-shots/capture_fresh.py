#!/usr/bin/env python3
"""
QuizHub AI — Fresh Screenshot Capture (ALL pages, desktop + mobile)
Playwright-based. Takes every screen needed for the 440-feature Word doc.
"""

import time
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
OUT = Path("/Users/veera.konjeti/Desktop/hack-n-stack/screenshots/fresh")
OUT.mkdir(parents=True, exist_ok=True)

ADMIN = {"enterpriseId": "divya.madhanasekar", "password": "Admin@123"}
SME   = {"enterpriseId": "birendra.kumar.singh", "password": "Sme@1234"}

DESKTOP = {"width": 1440, "height": 900}
MOBILE  = {"width": 390,  "height": 844}

def login(page, creds):
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.fill('input[placeholder*="gaurav"]', creds["enterpriseId"])
    page.fill('input[placeholder*="password" i]', creds["password"])
    page.click('button:has-text("Sign In")')
    page.wait_for_url(f"{BASE}/", timeout=10000)
    time.sleep(1)

def ss(page, name, extra_wait=0.8):
    """Take desktop screenshot."""
    if extra_wait:
        time.sleep(extra_wait)
    page.screenshot(path=str(OUT / f"{name}_desktop.png"), full_page=True)

def ss_mobile(page, name, extra_wait=0.5):
    """Take mobile screenshot."""
    if extra_wait:
        time.sleep(extra_wait)
    page.screenshot(path=str(OUT / f"{name}_mobile.png"), full_page=True)

def capture(pw):
    browser = pw.chromium.launch(headless=True)

    # ─────────────────────────────────────────────────────────────
    # 1. LOGIN PAGE
    # ─────────────────────────────────────────────────────────────
    print("  [01] Login page...")
    ctx_d = browser.new_context(viewport=DESKTOP)
    ctx_m = browser.new_context(viewport=MOBILE)
    page_d = ctx_d.new_page()
    page_m = ctx_m.new_page()

    page_d.goto(f"{BASE}/login", wait_until="networkidle")
    page_m.goto(f"{BASE}/login", wait_until="networkidle")
    ss(page_d, "01_login")
    ss_mobile(page_m, "01_login")

    # Wrong password error
    page_d.fill('input[placeholder*="gaurav"]', "wrong.user")
    page_d.fill('input[placeholder*="password" i]', "wrongpass")
    page_d.click('button:has-text("Sign In")')
    time.sleep(1.5)
    ss(page_d, "02_login_error", 0)

    ctx_d.close(); ctx_m.close()

    # ─────────────────────────────────────────────────────────────
    # 2. REGISTER
    # ─────────────────────────────────────────────────────────────
    print("  [02] Register page...")
    ctx_d = browser.new_context(viewport=DESKTOP)
    ctx_m = browser.new_context(viewport=MOBILE)
    page_d = ctx_d.new_page(); page_m = ctx_m.new_page()
    page_d.goto(f"{BASE}/register", wait_until="networkidle")
    page_m.goto(f"{BASE}/register", wait_until="networkidle")
    ss(page_d, "03_register"); ss_mobile(page_m, "03_register")
    ctx_d.close(); ctx_m.close()

    # ─────────────────────────────────────────────────────────────
    # 3. FORGOT PASSWORD
    # ─────────────────────────────────────────────────────────────
    print("  [03] Forgot password...")
    ctx_d = browser.new_context(viewport=DESKTOP)
    ctx_m = browser.new_context(viewport=MOBILE)
    page_d = ctx_d.new_page(); page_m = ctx_m.new_page()
    page_d.goto(f"{BASE}/forgot-password", wait_until="networkidle")
    page_m.goto(f"{BASE}/forgot-password", wait_until="networkidle")
    ss(page_d, "04_forgot_password"); ss_mobile(page_m, "04_forgot_password")
    ctx_d.close(); ctx_m.close()

    # ─────────────────────────────────────────────────────────────
    # ADMIN SESSION — most screens
    # ─────────────────────────────────────────────────────────────
    print("  [04] Admin login + dashboard...")
    ctx_d = browser.new_context(viewport=DESKTOP)
    ctx_m = browser.new_context(viewport=MOBILE)
    page_d = ctx_d.new_page(); page_m = ctx_m.new_page()
    login(page_d, ADMIN); login(page_m, ADMIN)

    # Dashboard
    ss(page_d, "05_admin_dashboard"); ss_mobile(page_m, "05_admin_dashboard")

    # Dark mode
    print("  [05] Dark mode...")
    try:
        page_d.click('button[title*="ight"], button[title*="ark"], button[aria-label*="mode" i], [class*="theme" i]', timeout=3000)
        time.sleep(0.5)
        ss(page_d, "06_dark_mode", 0)
        # toggle back
        page_d.click('button[title*="ight"], button[title*="ark"], button[aria-label*="mode" i], [class*="theme" i]', timeout=3000)
    except:
        page_d.screenshot(path=str(OUT / "06_dark_mode_desktop.png"))

    # Language switcher
    print("  [06] Language switcher...")
    try:
        page_d.click('[class*="lang" i], button:has-text("EN"), [data-testid*="lang" i]', timeout=3000)
        time.sleep(0.5)
        ss(page_d, "07_language_switcher", 0)
        page_d.keyboard.press("Escape")
    except:
        page_d.screenshot(path=str(OUT / "07_language_switcher_desktop.png"))

    # Navbar profile menu
    print("  [07] Profile menu...")
    try:
        page_d.click('[class*="profile" i], [class*="avatar" i], [class*="user-menu" i]', timeout=3000)
        time.sleep(0.5)
        ss(page_d, "08_profile_menu", 0)
        page_d.keyboard.press("Escape")
    except:
        page_d.screenshot(path=str(OUT / "08_profile_menu_desktop.png"))

    # Notifications
    print("  [08] Notifications panel...")
    try:
        page_d.click('[class*="notif" i] button, button[aria-label*="notif" i], .notification-bell, [class*="bell" i]', timeout=3000)
        time.sleep(0.8)
        ss(page_d, "09_notifications", 0)
        page_d.keyboard.press("Escape")
    except:
        page_d.screenshot(path=str(OUT / "09_notifications_desktop.png"))

    # ─── MY QUESTIONS ───
    print("  [09] My Questions...")
    page_d.goto(f"{BASE}/my-questions", wait_until="networkidle"); time.sleep(1)
    ss(page_d, "10_my_questions_all"); ss_mobile(page_m, "10_my_questions_all")

    # Status tabs
    for tab_text, slug in [("Draft","draft"),("Ready","ready"),("Under Review","under_review"),("Approved","approved"),("Rejected","rejected")]:
        try:
            page_d.click(f'button:has-text("{tab_text}"), [role="tab"]:has-text("{tab_text}")', timeout=3000)
            time.sleep(0.8)
            ss(page_d, f"11_my_questions_{slug}", 0)
        except:
            pass

    # Search filter
    try:
        page_d.fill('input[placeholder*="search" i], input[type="search"]', "Spring")
        time.sleep(0.8)
        ss(page_d, "12_my_questions_search", 0)
        page_d.fill('input[placeholder*="search" i], input[type="search"]', "")
    except:
        pass

    # Export buttons
    try:
        page_d.click('button:has-text("Export"), button:has-text("CSV"), button:has-text("Excel")', timeout=3000)
        time.sleep(0.5)
        ss(page_d, "13_my_questions_export", 0)
        page_d.keyboard.press("Escape")
    except:
        pass

    # ─── CREATE MCQ ───
    print("  [10] Create MCQ...")
    page_d.goto(f"{BASE}/mcq/create", wait_until="networkidle"); time.sleep(1)
    ss(page_d, "14_create_mcq_blank"); ss_mobile(page_m, "14_create_mcq_blank")

    # Fill the form
    try:
        page_d.fill('textarea, input[placeholder*="question" i]', "What is the purpose of @SpringBootApplication annotation in a Spring Boot application?")
        # Tech Stack dropdown
        selects = page_d.query_selector_all('select, [class*="select" i] [role="combobox"]')
        if selects:
            page_d.select_option('select:first-of-type', index=1)
            time.sleep(0.3)
            try: page_d.select_option('select:nth-of-type(2)', index=1)
            except: pass
        # Options
        inputs = page_d.query_selector_all('input[placeholder*="option" i], input[placeholder*="Option" i]')
        texts = ["It combines @Configuration, @EnableAutoConfiguration, and @ComponentScan",
                 "It enables database connectivity only",
                 "It is used to define REST endpoints",
                 "It marks the class as a JPA entity"]
        for i, inp in enumerate(inputs[:4]):
            inp.fill(texts[i])
        time.sleep(0.5)
        ss(page_d, "15_create_mcq_filled", 0)
    except Exception as e:
        print(f"    create MCQ fill: {e}")
        ss(page_d, "15_create_mcq_filled", 0)

    # MCQ form - validation error
    try:
        page_d.goto(f"{BASE}/mcq/create", wait_until="networkidle"); time.sleep(0.8)
        page_d.click('button:has-text("Save"), button:has-text("Submit"), button[type="submit"]', timeout=3000)
        time.sleep(0.8)
        ss(page_d, "16_create_mcq_validation", 0)
    except:
        pass

    # ─── MCQ DETAIL ───
    print("  [11] MCQ Detail...")
    page_d.goto(f"{BASE}/my-questions", wait_until="networkidle"); time.sleep(1)
    try:
        page_d.click('a[href*="/mcq/"], button:has-text("View"), td a', timeout=5000)
        time.sleep(1.5)
        ss(page_d, "17_mcq_detail"); ss_mobile(page_m, "17_mcq_detail")
        # Comments section
        page_d.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(0.5)
        ss(page_d, "18_mcq_detail_comments", 0)
    except Exception as e:
        print(f"    MCQ detail: {e}")

    # ─── KANBAN ───
    print("  [12] Kanban board...")
    page_d.goto(f"{BASE}/kanban", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "19_kanban_board"); ss_mobile(page_m, "19_kanban_board")

    # ─── BULK UPLOAD ───
    print("  [13] Bulk Upload...")
    page_d.goto(f"{BASE}/bulk-upload", wait_until="networkidle"); time.sleep(1)
    ss(page_d, "20_bulk_upload"); ss_mobile(page_m, "20_bulk_upload")

    # ─── PENDING REVIEWS ───
    print("  [14] Pending Reviews...")
    page_d.goto(f"{BASE}/pending-reviews", wait_until="networkidle"); time.sleep(1)
    ss(page_d, "21_pending_reviews"); ss_mobile(page_m, "21_pending_reviews")

    # ─── QUESTION BANK ───
    print("  [15] Question Bank...")
    page_d.goto(f"{BASE}/question-bank", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "22_question_bank"); ss_mobile(page_m, "22_question_bank")

    # Assign reviewer dialog
    try:
        page_d.click('button:has-text("Assign"), button:has-text("Reviewer")', timeout=5000)
        time.sleep(1)
        ss(page_d, "23_assign_reviewer_dialog", 0)
        page_d.keyboard.press("Escape")
    except:
        pass

    # Semantic search
    try:
        page_d.fill('input[placeholder*="search" i], input[type="search"]', "Spring Boot annotation")
        time.sleep(0.8)
        ss(page_d, "24_question_bank_search", 0)
        page_d.fill('input[placeholder*="search" i], input[type="search"]', "")
    except:
        pass

    # ─── USER MANAGEMENT ───
    print("  [16] User Management...")
    page_d.goto(f"{BASE}/user-management", wait_until="networkidle"); time.sleep(1)
    ss(page_d, "25_user_management"); ss_mobile(page_m, "25_user_management")

    # ─── MASTER DATA ───
    print("  [17] Master Data...")
    page_d.goto(f"{BASE}/master-data", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "26_master_data"); ss_mobile(page_m, "26_master_data")

    # Topics tab
    try:
        page_d.click('button:has-text("Topic"), [role="tab"]:has-text("Topic")', timeout=3000)
        time.sleep(0.8)
        ss(page_d, "27_master_data_topics", 0)
    except:
        pass

    # ─── ANALYTICS ───
    print("  [18] Analytics...")
    page_d.goto(f"{BASE}/analytics", wait_until="networkidle"); time.sleep(2)
    ss(page_d, "28_analytics"); ss_mobile(page_m, "28_analytics")

    # ─── AI STUDIO ───
    print("  [19] AI Studio...")
    page_d.goto(f"{BASE}/ai-studio", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "29_ai_studio"); ss_mobile(page_m, "29_ai_studio")

    # AI Studio tabs
    for tab, slug in [("Code", "code_to_mcq"), ("Rewrite", "ai_rewrite"), ("Learning", "learning_path")]:
        try:
            page_d.click(f'button:has-text("{tab}"), [role="tab"]:has-text("{tab}")', timeout=3000)
            time.sleep(1)
            ss(page_d, f"30_ai_studio_{slug}", 0)
        except:
            pass

    # ─── SCREENSHOT MCQ ───
    print("  [20] Screenshot MCQ...")
    page_d.goto(f"{BASE}/screenshot-mcq", wait_until="networkidle"); time.sleep(1)
    ss(page_d, "31_screenshot_mcq"); ss_mobile(page_m, "31_screenshot_mcq")

    # ─── RULEBOOK ───
    print("  [21] RuleBook...")
    page_d.goto(f"{BASE}/rulebook", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "32_rulebook"); ss_mobile(page_m, "32_rulebook")

    for tab, slug in [("Lifecycle","lifecycle"), ("Roles","roles"), ("Duplicate","duplicate"), ("AI","ai_rules"), ("Workflow","workflow"), ("Quiz","quiz_rules")]:
        try:
            page_d.click(f'button:has-text("{tab}"), [role="tab"]:has-text("{tab}")', timeout=3000)
            time.sleep(0.8)
            ss(page_d, f"33_rulebook_{slug}", 0)
        except:
            pass

    # ─── QUESTION TYPES ───
    print("  [22] Question Types...")
    page_d.goto(f"{BASE}/question-types", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "34_question_types"); ss_mobile(page_m, "34_question_types")

    # Scroll to see more types
    page_d.evaluate("window.scrollTo(0, 500)")
    time.sleep(0.5)
    ss(page_d, "35_question_types_scroll2", 0)

    page_d.evaluate("window.scrollTo(0, 1200)")
    time.sleep(0.5)
    ss(page_d, "36_question_types_scroll3", 0)

    # ─── QUESTION TYPE CREATOR ───
    print("  [23] Question Type Creator...")
    page_d.goto(f"{BASE}/question-type-create/1", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "37_question_type_creator"); ss_mobile(page_m, "37_question_type_creator")

    # ─── QUIZ BUILDER ───
    print("  [24] Quiz Builder...")
    page_d.goto(f"{BASE}/quiz-builder", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "38_quiz_builder"); ss_mobile(page_m, "38_quiz_builder")

    # ─── QUIZ LIST ───
    print("  [25] Quiz list...")
    page_d.goto(f"{BASE}/quiz", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "39_quiz_list"); ss_mobile(page_m, "39_quiz_list")

    # ─── QUIZ ATTEMPTS ───
    print("  [26] Quiz attempts...")
    page_d.goto(f"{BASE}/quiz", wait_until="networkidle"); time.sleep(1)
    try:
        page_d.click('a[href*="attempts"], button:has-text("Attempt"), button:has-text("View")', timeout=5000)
        time.sleep(1.5)
        current_url = page_d.url
        ss(page_d, "40_quiz_attempts", 0)
        ss_mobile(page_m, "40_quiz_attempts")
    except:
        page_d.screenshot(path=str(OUT / "40_quiz_attempts_desktop.png"))

    # ─── LEADERBOARD ───
    print("  [27] Leaderboard...")
    page_d.goto(f"{BASE}/leaderboard", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "41_leaderboard"); ss_mobile(page_m, "41_leaderboard")

    for tab, slug in [("SME", "sme_tab"), ("Assessment", "assessment_tab"), ("Live", "live_tab")]:
        try:
            page_d.click(f'button:has-text("{tab}"), [role="tab"]:has-text("{tab}")', timeout=3000)
            time.sleep(0.8)
            ss(page_d, f"42_leaderboard_{slug}", 0)
        except:
            pass

    # ─── SMART INTERVIEW KIT ───
    print("  [28] Smart Interview Kit...")
    page_d.goto(f"{BASE}/smart-interview-kit", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "43_smart_interview_kit"); ss_mobile(page_m, "43_smart_interview_kit")

    # ─── INBOX ───
    print("  [29] Inbox...")
    page_d.goto(f"{BASE}/inbox", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "44_inbox"); ss_mobile(page_m, "44_inbox")

    for tab, slug in [("Sent","sent"), ("Starred","starred"), ("Drafts","drafts"), ("Trash","trash")]:
        try:
            page_d.click(f'button:has-text("{tab}"), [role="tab"]:has-text("{tab}")', timeout=3000)
            time.sleep(0.8)
            ss(page_d, f"45_inbox_{slug}", 0)
        except:
            pass

    # Compose
    try:
        page_d.click('button:has-text("Compose"), button:has-text("New"), button:has-text("Write")', timeout=3000)
        time.sleep(0.8)
        ss(page_d, "46_inbox_compose", 0)
        page_d.keyboard.press("Escape")
    except:
        pass

    # ─── AUDIT LOG ───
    print("  [30] Audit Log...")
    page_d.goto(f"{BASE}/audit-log", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "47_audit_log"); ss_mobile(page_m, "47_audit_log")

    # ─── REVIEWER DASHBOARD ───
    print("  [31] Reviewer Dashboard...")
    page_d.goto(f"{BASE}/reviewer-dashboard", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "48_reviewer_dashboard"); ss_mobile(page_m, "48_reviewer_dashboard")

    # ─── REVIEWER METRICS ───
    print("  [32] Reviewer Metrics...")
    page_d.goto(f"{BASE}/reviewer-metrics", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "49_reviewer_metrics"); ss_mobile(page_m, "49_reviewer_metrics")

    # Scroll to SLA table
    page_d.evaluate("window.scrollTo(0, 600)")
    time.sleep(0.5)
    ss(page_d, "50_reviewer_metrics_sla", 0)

    # ─── ADMIN SETTINGS ───
    print("  [33] Admin Settings...")
    page_d.goto(f"{BASE}/admin-settings", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "51_admin_settings"); ss_mobile(page_m, "51_admin_settings")

    # ─── LIVE QUIZ ───
    print("  [34] Live Quiz pages...")
    page_d.goto(f"{BASE}/live", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "52_live_quiz_home"); ss_mobile(page_m, "52_live_quiz_home")

    # Past sessions tab
    try:
        page_d.click('button:has-text("Past"), button:has-text("History"), [role="tab"]:has-text("Past")', timeout=3000)
        time.sleep(0.8)
        ss(page_d, "53_live_quiz_past_sessions", 0)
    except:
        pass

    # Create Live Quiz form
    try:
        page_d.click('button:has-text("Create"), button:has-text("Host"), button:has-text("New")', timeout=3000)
        time.sleep(1)
        ss(page_d, "54_live_quiz_create_form", 0)
        ss_mobile(page_m, "54_live_quiz_create_form")
        page_d.keyboard.press("Escape")
    except:
        pass

    # Join page
    page_d.goto(f"{BASE}/live/join", wait_until="networkidle"); time.sleep(1)
    ss(page_d, "55_live_quiz_join"); ss_mobile(page_m, "55_live_quiz_join")

    # ─── CODING QUESTION ───
    print("  [35] Coding Question...")
    page_d.goto(f"{BASE}/coding/create", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "56_coding_question"); ss_mobile(page_m, "56_coding_question")

    # ─── RESUME INTERVIEW ───
    print("  [36] Resume Interview...")
    page_d.goto(f"{BASE}/smart-interview-kit", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "57_resume_interview"); ss_mobile(page_m, "57_resume_interview")

    # ─── CHATBOT ───
    print("  [37] AI Chatbot...")
    page_d.goto(f"{BASE}/", wait_until="networkidle"); time.sleep(1)
    try:
        page_d.click('button[aria-label*="chat" i], button[class*="chat" i], .chat-fab, [class*="collab" i]', timeout=5000)
        time.sleep(1)
        ss(page_d, "58_chatbot_open", 0)
        ss_mobile(page_m, "58_chatbot_open")

        # Type a message
        page_d.fill('input[placeholder*="message" i], input[placeholder*="Ask" i], textarea[placeholder*="Ask" i]', "How do I create an MCQ?")
        ss(page_d, "59_chatbot_typing", 0)
        page_d.keyboard.press("Enter")
        time.sleep(3)
        ss(page_d, "60_chatbot_response", 0)
    except Exception as e:
        print(f"    chatbot: {e}")

    # ─── WELLNESS REMINDER ───
    print("  [38] Misc: sound, keyboard shortcuts...")
    page_d.goto(f"{BASE}/", wait_until="networkidle"); time.sleep(1)
    # Keyboard shortcut overlay
    try:
        page_d.keyboard.press("?")
        time.sleep(0.8)
        ss(page_d, "61_keyboard_shortcuts", 0)
        page_d.keyboard.press("Escape")
    except:
        pass

    # ─── MCQ FORM — special features ───
    print("  [39] MCQ Form special features...")
    page_d.goto(f"{BASE}/mcq/create", wait_until="networkidle"); time.sleep(1)

    # Code block button
    try:
        page_d.click('button:has-text("Code"), button:has-text("</>"), [title*="code" i]', timeout=3000)
        time.sleep(0.5)
        ss(page_d, "62_mcq_form_code_block", 0)
    except:
        pass

    # AI Generate button area
    try:
        page_d.evaluate("window.scrollTo(0, 300)")
        time.sleep(0.3)
        ss(page_d, "63_mcq_form_ai_buttons", 0)
    except:
        pass

    # Bloom's taxonomy dropdown
    try:
        page_d.evaluate("window.scrollTo(0, 0)")
        ss(page_d, "64_mcq_form_blooms", 0)
    except:
        pass

    # ─── LOGOUT ───
    print("  [40] Logout...")
    try:
        page_d.click('[class*="profile" i], [class*="avatar" i], [class*="user-menu" i]', timeout=3000)
        time.sleep(0.5)
        page_d.click('button:has-text("Sign out"), button:has-text("Logout"), a:has-text("Sign out")', timeout=3000)
        time.sleep(1)
        ss(page_d, "65_after_logout", 0)
    except:
        pass

    ctx_d.close(); ctx_m.close()

    # ─────────────────────────────────────────────────────────────
    # SME SESSION
    # ─────────────────────────────────────────────────────────────
    print("  [41] SME login + dashboard...")
    ctx_d = browser.new_context(viewport=DESKTOP)
    ctx_m = browser.new_context(viewport=MOBILE)
    page_d = ctx_d.new_page(); page_m = ctx_m.new_page()
    login(page_d, SME); login(page_m, SME)
    ss(page_d, "66_sme_dashboard"); ss_mobile(page_m, "66_sme_dashboard")

    # SME My Questions
    page_d.goto(f"{BASE}/my-questions", wait_until="networkidle"); time.sleep(1)
    ss(page_d, "67_sme_my_questions"); ss_mobile(page_m, "67_sme_my_questions")

    # SME Pending Reviews
    page_d.goto(f"{BASE}/pending-reviews", wait_until="networkidle"); time.sleep(1)
    ss(page_d, "68_sme_pending_reviews"); ss_mobile(page_m, "68_sme_pending_reviews")

    # Pre-submission checklist
    try:
        page_d.click('button:has-text("Review"), a[href*="/mcq/"]', timeout=5000)
        time.sleep(1.5)
        ss(page_d, "69_pending_review_checklist", 0)
        page_d.evaluate("window.scrollTo(0, 400)")
        time.sleep(0.3)
        ss(page_d, "70_pending_review_checklist_scroll", 0)
    except:
        pass

    # SME blocked from admin pages
    page_d.goto(f"{BASE}/user-management", wait_until="networkidle"); time.sleep(1)
    ss(page_d, "71_sme_blocked_user_mgmt", 0)

    page_d.goto(f"{BASE}/audit-log", wait_until="networkidle"); time.sleep(1)
    ss(page_d, "72_sme_blocked_audit_log", 0)

    # SME Reviewer Dashboard
    page_d.goto(f"{BASE}/reviewer-dashboard", wait_until="networkidle"); time.sleep(1.5)
    ss(page_d, "73_sme_reviewer_dashboard"); ss_mobile(page_m, "73_sme_reviewer_dashboard")

    # i18n switch
    try:
        page_d.goto(f"{BASE}/", wait_until="networkidle"); time.sleep(1)
        page_d.click('[class*="lang" i], button:has-text("EN")', timeout=3000)
        time.sleep(0.5)
        ss(page_d, "74_i18n_menu", 0)
        # click Hindi
        page_d.click('button:has-text("HI"), li:has-text("Hindi"), li:has-text("हिं")', timeout=3000)
        time.sleep(1)
        ss(page_d, "75_i18n_hindi", 0)
        # back to English
        try:
            page_d.click('[class*="lang" i], button:has-text("HI"), button:has-text("EN")', timeout=3000)
            page_d.click('button:has-text("EN"), li:has-text("English")', timeout=3000)
        except: pass
    except Exception as e:
        print(f"    i18n: {e}")

    ctx_d.close(); ctx_m.close()

    browser.close()
    print(f"\n✅  Screenshots saved to {OUT}")
    files = list(OUT.glob("*.png"))
    print(f"   Total: {len(files)} screenshots")

with sync_playwright() as pw:
    capture(pw)
