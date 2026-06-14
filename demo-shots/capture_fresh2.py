#!/usr/bin/env python3
"""
QuizHub AI — Fresh Screenshot Capture Part 2
Continues from screenshot 16 onward (skipping form interaction that hung).
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
    time.sleep(1.2)

def ss(page, name, wait=0.8):
    time.sleep(wait)
    p = OUT / f"{name}_desktop.png"
    page.screenshot(path=str(p), full_page=True)
    print(f"    ✓ {name}_desktop")

def ssm(page, name, wait=0.5):
    time.sleep(wait)
    p = OUT / f"{name}_mobile.png"
    page.screenshot(path=str(p), full_page=True)

def safe_click(page, selector, timeout=3000):
    try:
        page.click(selector, timeout=timeout)
        return True
    except:
        return False

def safe_fill(page, selector, text, timeout=3000):
    try:
        page.fill(selector, text, timeout=timeout)
        return True
    except:
        return False

def capture(pw):
    browser = pw.chromium.launch(headless=True)

    # ─────────────────────────────────────────────────────────────
    # ADMIN SESSION
    # ─────────────────────────────────────────────────────────────
    ctx_d = browser.new_context(viewport=DESKTOP)
    ctx_m = browser.new_context(viewport=MOBILE)
    pd = ctx_d.new_page()
    pm = ctx_m.new_page()
    login(pd, ADMIN)
    login(pm, ADMIN)

    # ── MCQ validation error (just hit submit on empty form)
    print("  MCQ form validation...")
    pd.goto(f"{BASE}/mcq/create", wait_until="networkidle"); time.sleep(1)
    safe_click(pd, 'button[type="submit"], button:has-text("Save")')
    ss(pd, "16_mcq_form_validation")
    ssm(pm, "16_mcq_form_validation")

    # MCQ form scrolled to show AI buttons
    pd.goto(f"{BASE}/mcq/create", wait_until="networkidle"); time.sleep(1)
    pd.evaluate("window.scrollTo(0, 400)")
    ss(pd, "17_mcq_form_ai_section")

    # ── MCQ Detail ──
    print("  MCQ Detail...")
    pd.goto(f"{BASE}/my-questions", wait_until="networkidle"); time.sleep(1.5)
    # Click first view link
    links = pd.query_selector_all('a[href*="/mcq/"]')
    if links:
        href = links[0].get_attribute("href")
        pd.goto(f"{BASE}{href}", wait_until="networkidle"); time.sleep(1.5)
        ss(pd, "18_mcq_detail")
        ssm(pm, "18_mcq_detail")
        pd.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(0.5)
        ss(pd, "19_mcq_detail_comments_section")
    else:
        pd.screenshot(path=str(OUT / "18_mcq_detail_desktop.png"), full_page=True)

    # ── Edit MCQ ──
    print("  Edit MCQ...")
    pd.goto(f"{BASE}/my-questions", wait_until="networkidle"); time.sleep(1.5)
    edit_btns = pd.query_selector_all('button:has-text("Edit"), a:has-text("Edit")')
    if edit_btns:
        edit_btns[0].click()
        time.sleep(2)
        ss(pd, "20_edit_mcq")
        ssm(pm, "20_edit_mcq")

    # ── Kanban Board ──
    print("  Kanban...")
    pd.goto(f"{BASE}/kanban", wait_until="networkidle"); time.sleep(2)
    ss(pd, "21_kanban_board")
    ssm(pm, "21_kanban_board")
    # Scroll down for more cards
    pd.evaluate("window.scrollTo(0, 400)")
    time.sleep(0.4)
    ss(pd, "22_kanban_board_scroll", 0)

    # ── Bulk Upload ──
    print("  Bulk Upload...")
    pd.goto(f"{BASE}/bulk-upload", wait_until="networkidle"); time.sleep(1.5)
    ss(pd, "23_bulk_upload")
    ssm(pm, "23_bulk_upload")
    # Drop zone close-up
    pd.evaluate("window.scrollTo(0, 200)")
    ss(pd, "24_bulk_upload_dropzone")

    # ── Pending Reviews ──
    print("  Pending Reviews...")
    pd.goto(f"{BASE}/pending-reviews", wait_until="networkidle"); time.sleep(1.5)
    ss(pd, "25_pending_reviews")
    ssm(pm, "25_pending_reviews")

    # ── Question Bank ──
    print("  Question Bank...")
    pd.goto(f"{BASE}/question-bank", wait_until="networkidle"); time.sleep(2)
    ss(pd, "26_question_bank")
    ssm(pm, "26_question_bank")

    # Question Bank filters
    pd.evaluate("window.scrollTo(0, 200)")
    ss(pd, "27_question_bank_filters")

    # Assign reviewer dialog
    safe_click(pd, 'button:has-text("Assign")', 5000)
    time.sleep(1.2)
    ss(pd, "28_assign_reviewer_dialog")
    ssm(pm, "28_assign_reviewer_dialog")
    pd.keyboard.press("Escape")

    # ── User Management ──
    print("  User Management...")
    pd.goto(f"{BASE}/user-management", wait_until="networkidle"); time.sleep(1.5)
    ss(pd, "29_user_management")
    ssm(pm, "29_user_management")

    # ── Master Data ──
    print("  Master Data...")
    pd.goto(f"{BASE}/master-data", wait_until="networkidle"); time.sleep(1.5)
    ss(pd, "30_master_data")
    ssm(pm, "30_master_data")
    # Topics tab
    safe_click(pd, '[role="tab"]:has-text("Topic"), button:has-text("Topic")', 3000)
    time.sleep(0.8)
    ss(pd, "31_master_data_topics")
    # Add new stack button visible
    safe_click(pd, '[role="tab"]:has-text("Tech"), button:has-text("Tech")', 3000)
    time.sleep(0.5)
    safe_click(pd, 'button:has-text("Add"), button:has-text("+")', 3000)
    time.sleep(0.8)
    ss(pd, "32_master_data_add_stack")
    pd.keyboard.press("Escape")

    # ── Analytics ──
    print("  Analytics...")
    pd.goto(f"{BASE}/analytics", wait_until="networkidle"); time.sleep(2.5)
    ss(pd, "33_analytics")
    ssm(pm, "33_analytics")
    pd.evaluate("window.scrollTo(0, 400)")
    ss(pd, "34_analytics_charts")

    # ── AI Studio ──
    print("  AI Studio...")
    pd.goto(f"{BASE}/ai-studio", wait_until="networkidle"); time.sleep(1.5)
    ss(pd, "35_ai_studio_main")
    ssm(pm, "35_ai_studio_main")

    for (tab_try, slug) in [
        ("Code", "code_to_mcq"),
        ("Rewrite", "ai_rewrite"),
        ("Learning", "learning_path"),
    ]:
        for sel in [f'[role="tab"]:has-text("{tab_try}")', f'button:has-text("{tab_try}")', f'li:has-text("{tab_try}")', f'a:has-text("{tab_try}")',]:
            if safe_click(pd, sel, 2000):
                time.sleep(1)
                break
        ss(pd, f"36_ai_studio_{slug}")

    # ── Screenshot MCQ ──
    print("  Screenshot MCQ...")
    pd.goto(f"{BASE}/screenshot-mcq", wait_until="networkidle"); time.sleep(1.5)
    ss(pd, "37_screenshot_mcq")
    ssm(pm, "37_screenshot_mcq")

    # ── RuleBook ──
    print("  RuleBook...")
    pd.goto(f"{BASE}/rulebook", wait_until="networkidle"); time.sleep(2)
    ss(pd, "38_rulebook_main")
    ssm(pm, "38_rulebook_main")

    for (tab_t, slug) in [("Lifecycle","lifecycle"),("Roles","roles"),("Duplicate","duplicate"),("AI","ai_rules"),("Workflow","workflow"),("Quiz","quiz_rules")]:
        for sel in [f'[role="tab"]:has-text("{tab_t}")', f'button:has-text("{tab_t}")', f'li:has-text("{tab_t}")',]:
            if safe_click(pd, sel, 2000):
                time.sleep(0.8)
                break
        ss(pd, f"39_rulebook_{slug}")

    # ── Question Types ──
    print("  Question Types...")
    pd.goto(f"{BASE}/question-types", wait_until="networkidle"); time.sleep(2)
    ss(pd, "40_question_types")
    ssm(pm, "40_question_types")
    pd.evaluate("window.scrollTo(0, 600)")
    ss(pd, "41_question_types_more")
    pd.evaluate("window.scrollTo(0, 1200)")
    ss(pd, "42_question_types_more2")

    # Question Type Creator
    pd.goto(f"{BASE}/question-type-create/1", wait_until="networkidle"); time.sleep(2)
    ss(pd, "43_question_type_creator")
    ssm(pm, "43_question_type_creator")

    # ── Quiz Builder ──
    print("  Quiz Builder...")
    pd.goto(f"{BASE}/quiz-builder", wait_until="networkidle"); time.sleep(2)
    ss(pd, "44_quiz_builder")
    ssm(pm, "44_quiz_builder")
    # Create quiz button / form
    safe_click(pd, 'button:has-text("Create"), button:has-text("New Quiz")', 3000)
    time.sleep(1)
    ss(pd, "45_quiz_builder_create_form")

    # ── Quiz List ──
    print("  Quiz...")
    pd.goto(f"{BASE}/quiz", wait_until="networkidle"); time.sleep(2)
    ss(pd, "46_quiz_list")
    ssm(pm, "46_quiz_list")

    # Quiz attempts
    links = pd.query_selector_all('a[href*="attempts"], a[href*="quiz-sessions"]')
    if links:
        href = links[0].get_attribute("href")
        pd.goto(f"{BASE}{href}", wait_until="networkidle"); time.sleep(1.5)
        ss(pd, "47_quiz_attempts")
        ssm(pm, "47_quiz_attempts")

    # ── Leaderboard ──
    print("  Leaderboard...")
    pd.goto(f"{BASE}/leaderboard", wait_until="networkidle"); time.sleep(2)
    ss(pd, "48_leaderboard")
    ssm(pm, "48_leaderboard")
    pd.evaluate("window.scrollTo(0, 300)")
    ss(pd, "49_leaderboard_table")

    for (tab_t, slug) in [("SME","sme"),("Assessment","assessment"),("Live","live_battle")]:
        for sel in [f'[role="tab"]:has-text("{tab_t}")', f'button:has-text("{tab_t}")',]:
            if safe_click(pd, sel, 2000):
                time.sleep(0.8)
                break
        ss(pd, f"50_leaderboard_{slug}")

    # ── Smart Interview Kit ──
    print("  Smart Interview Kit...")
    pd.goto(f"{BASE}/smart-interview-kit", wait_until="networkidle"); time.sleep(2)
    ss(pd, "51_smart_interview_kit")
    ssm(pm, "51_smart_interview_kit")

    # ── Inbox ──
    print("  Inbox...")
    pd.goto(f"{BASE}/inbox", wait_until="networkidle"); time.sleep(2)
    ss(pd, "52_inbox_all")
    ssm(pm, "52_inbox_all")

    for (tab_t, slug) in [("Sent","sent"),("Starred","starred"),("Drafts","drafts"),("Trash","trash")]:
        for sel in [f'[role="tab"]:has-text("{tab_t}")', f'button:has-text("{tab_t}")',]:
            if safe_click(pd, sel, 2000):
                time.sleep(0.8)
                break
        ss(pd, f"53_inbox_{slug}")

    # Compose message
    for sel in ['button:has-text("Compose")', 'button:has-text("New")', 'button:has-text("Write")', 'button:has-text("+")',]:
        if safe_click(pd, sel, 2000):
            time.sleep(0.8)
            ss(pd, "54_inbox_compose")
            pd.keyboard.press("Escape")
            break

    # ── Audit Log ──
    print("  Audit Log...")
    pd.goto(f"{BASE}/audit-log", wait_until="networkidle"); time.sleep(2)
    ss(pd, "55_audit_log")
    ssm(pm, "55_audit_log")
    pd.evaluate("window.scrollTo(0, 400)")
    ss(pd, "56_audit_log_table")

    # ── Reviewer Dashboard ──
    print("  Reviewer Dashboard...")
    pd.goto(f"{BASE}/reviewer-dashboard", wait_until="networkidle"); time.sleep(2)
    ss(pd, "57_reviewer_dashboard")
    ssm(pm, "57_reviewer_dashboard")

    # ── Reviewer Metrics ──
    print("  Reviewer Metrics...")
    pd.goto(f"{BASE}/reviewer-metrics", wait_until="networkidle"); time.sleep(2)
    ss(pd, "58_reviewer_metrics")
    ssm(pm, "58_reviewer_metrics")
    pd.evaluate("window.scrollTo(0, 500)")
    ss(pd, "59_reviewer_metrics_sla_table")

    # ── Admin Settings ──
    print("  Admin Settings...")
    pd.goto(f"{BASE}/admin-settings", wait_until="networkidle"); time.sleep(1.5)
    ss(pd, "60_admin_settings")
    ssm(pm, "60_admin_settings")

    # ── Live Quiz ──
    print("  Live Quiz...")
    pd.goto(f"{BASE}/live", wait_until="networkidle"); time.sleep(2)
    ss(pd, "61_live_quiz_home")
    ssm(pm, "61_live_quiz_home")

    # Past sessions
    for sel in ['[role="tab"]:has-text("Past")', 'button:has-text("Past")', '[role="tab"]:has-text("History")',]:
        if safe_click(pd, sel, 2000):
            time.sleep(0.8)
            ss(pd, "62_live_quiz_past_sessions")
            break

    # Participated tab
    for sel in ['[role="tab"]:has-text("Participated")', 'button:has-text("Participated")',]:
        if safe_click(pd, sel, 2000):
            time.sleep(0.8)
            ss(pd, "63_live_quiz_participated")
            break

    # Create live quiz modal
    for sel in ['button:has-text("Create")', 'button:has-text("Host")', 'button:has-text("New")',]:
        if safe_click(pd, sel, 2000):
            time.sleep(1.2)
            ss(pd, "64_live_quiz_create_form")
            ssm(pm, "64_live_quiz_create_form")
            pd.keyboard.press("Escape")
            break

    # Join page
    pd.goto(f"{BASE}/live/join", wait_until="networkidle"); time.sleep(1)
    ss(pd, "65_live_quiz_join")
    ssm(pm, "65_live_quiz_join")

    # Live quiz session detail (if any exist)
    pd.goto(f"{BASE}/live", wait_until="networkidle"); time.sleep(1.5)
    session_links = pd.query_selector_all('a[href*="/live/sessions/"], a[href*="/live/host/"]')
    if session_links:
        href = session_links[0].get_attribute("href")
        pd.goto(f"{BASE}{href}", wait_until="networkidle"); time.sleep(2)
        ss(pd, "66_live_session_detail")
        ssm(pm, "66_live_session_detail")

    # ── Coding Question ──
    print("  Coding Question...")
    pd.goto(f"{BASE}/coding/create", wait_until="networkidle"); time.sleep(2)
    ss(pd, "67_coding_question")
    ssm(pm, "67_coding_question")
    pd.evaluate("window.scrollTo(0, 400)")
    ss(pd, "68_coding_question_editor")
    pd.evaluate("window.scrollTo(0, 800)")
    ss(pd, "69_coding_question_testcases")

    # ── Chatbot ──
    print("  Chatbot...")
    pd.goto(f"{BASE}/", wait_until="networkidle"); time.sleep(1.5)
    # Chatbot open
    opened = False
    for sel in [
        'button[aria-label*="chat" i]',
        '.chat-fab',
        '[class*="collab" i] button',
        'button[class*="chat" i]',
        'img[alt*="chat" i]',
        'button:has-text("Ask")',
    ]:
        if safe_click(pd, sel, 2000):
            time.sleep(1.5)
            ss(pd, "70_chatbot_open")
            ssm(pm, "70_chatbot_open")
            opened = True
            # type a message
            for inp_sel in ['input[placeholder*="Ask" i]', 'input[placeholder*="message" i]', 'textarea']:
                if safe_fill(pd, inp_sel, "How do I create an MCQ?", 2000):
                    ss(pd, "71_chatbot_typing")
                    pd.keyboard.press("Enter")
                    time.sleep(3)
                    ss(pd, "72_chatbot_response")
                    break
            break

    # Chatbot bubble visible on page
    if not opened:
        ss(pd, "70_chatbot_bubble_on_page")

    # ── Keyboard shortcut overlay ──
    print("  Keyboard shortcuts...")
    pd.goto(f"{BASE}/", wait_until="networkidle"); time.sleep(1)
    pd.keyboard.press("?")
    time.sleep(0.8)
    ss(pd, "73_keyboard_shortcuts")
    pd.keyboard.press("Escape")

    # ── Notifications details ──
    print("  Notifications panel...")
    pd.goto(f"{BASE}/", wait_until="networkidle"); time.sleep(1)
    for sel in [
        '.notification-bell',
        '[class*="bell" i]',
        'button[aria-label*="notif" i]',
        '[data-testid*="notif" i]',
    ]:
        if safe_click(pd, sel, 2000):
            time.sleep(0.8)
            ss(pd, "74_notifications_panel")
            ssm(pm, "74_notifications_panel")
            # type filter
            for tab_t in ["Assigned","Approved","Rejected"]:
                for tsel in [f'button:has-text("{tab_t}")', f'[role="tab"]:has-text("{tab_t}")',]:
                    if safe_click(pd, tsel, 1500):
                        time.sleep(0.5)
                        ss(pd, f"75_notifications_{tab_t.lower()}")
                        break
            pd.keyboard.press("Escape")
            break

    ctx_d.close(); ctx_m.close()

    # ─────────────────────────────────────────────────────────────
    # SME SESSION
    # ─────────────────────────────────────────────────────────────
    print("  SME session...")
    ctx_d = browser.new_context(viewport=DESKTOP)
    ctx_m = browser.new_context(viewport=MOBILE)
    pd = ctx_d.new_page()
    pm = ctx_m.new_page()
    login(pd, SME)
    login(pm, SME)

    ss(pd, "76_sme_dashboard")
    ssm(pm, "76_sme_dashboard")

    # SME My Questions
    pd.goto(f"{BASE}/my-questions", wait_until="networkidle"); time.sleep(1.5)
    ss(pd, "77_sme_my_questions")
    ssm(pm, "77_sme_my_questions")

    # SME Pending Reviews
    pd.goto(f"{BASE}/pending-reviews", wait_until="networkidle"); time.sleep(1.5)
    ss(pd, "78_sme_pending_reviews")
    ssm(pm, "78_sme_pending_reviews")

    # Pending review detail — open first one
    review_links = pd.query_selector_all('a[href*="/mcq/"], button:has-text("Review"), button:has-text("View")')
    if review_links:
        review_links[0].click()
        time.sleep(2)
        ss(pd, "79_review_checklist")
        pd.evaluate("window.scrollTo(0, 400)")
        ss(pd, "80_review_approve_reject_buttons")
        # Try reject to show dialog
        safe_click(pd, 'button:has-text("Reject")', 3000)
        time.sleep(0.8)
        ss(pd, "81_review_reject_dialog")
        pd.keyboard.press("Escape")

    # SME blocked pages
    pd.goto(f"{BASE}/user-management", wait_until="networkidle"); time.sleep(1)
    ss(pd, "82_sme_rbac_blocked_user_mgmt")

    # i18n switch to Hindi
    pd.goto(f"{BASE}/", wait_until="networkidle"); time.sleep(1)
    for sel in ['[class*="lang" i]', 'button:has-text("EN")', '[data-testid*="lang" i]',]:
        if safe_click(pd, sel, 2000):
            time.sleep(0.5)
            ss(pd, "83_language_menu_open")
            for hindi_sel in ['button:has-text("HI")', 'li:has-text("Hindi")', 'li:has-text("हि")',]:
                if safe_click(pd, hindi_sel, 2000):
                    time.sleep(1)
                    ss(pd, "84_ui_in_hindi")
                    ssm(pm, "84_ui_in_hindi")
                    break
            break

    # Dark mode from SME
    pd.goto(f"{BASE}/", wait_until="networkidle"); time.sleep(1)
    for sel in ['button[aria-label*="dark" i]', 'button[aria-label*="light" i]', 'button[title*="mode" i]', '[class*="theme-toggle" i]',]:
        if safe_click(pd, sel, 2000):
            time.sleep(0.5)
            ss(pd, "85_dark_mode")
            ssm(pm, "85_dark_mode")
            break

    # MCQ version history (open a detail page and scroll to versions)
    pd.goto(f"{BASE}/my-questions", wait_until="networkidle"); time.sleep(1.5)
    links = pd.query_selector_all('a[href*="/mcq/"]')
    if links:
        href = links[0].get_attribute("href")
        pd.goto(f"{BASE}{href}", wait_until="networkidle"); time.sleep(1.5)
        pd.evaluate("window.scrollTo(0, 1000)")
        ss(pd, "86_mcq_version_history")

    ctx_d.close(); ctx_m.close()
    browser.close()

    files = list(OUT.glob("*.png"))
    print(f"\n✅  Done! Total fresh screenshots: {len(files)}")
    for f in sorted(files):
        print(f"  {f.name}")

with sync_playwright() as pw:
    capture(pw)
