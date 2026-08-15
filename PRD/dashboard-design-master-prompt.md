# Master Prompt — AI Sales Bot Dashboard (for Google Stitch)

## How to use

Copy everything below the `---` into Google Stitch. It is a **functional spec**, not a visual spec — it describes *what* every screen must contain and *which options* each control exposes, and deliberately leaves all visual styling (colors, typography, layout, spacing) up to the designer. Do not hand-edit the styling instructions; Stitch decides the look.

---

## PROMPT

You are designing the UI for **AI Sales Bot**, a SaaS dashboard for F-commerce (Facebook Page) sellers in Bangladesh. The product is an AI sales agent that replies to customer messages and comments on a shop's Facebook Page, tracks customers/conversations/sales, sends follow-ups, and runs on a prepaid "AI Credits" billing model.

Design **every screen listed below**. Treat this as a functional specification: each screen must include the listed sections, fields, and options. You have full creative freedom over the visual design (color, type, layout, components) — do not copy any implied layout from the text. Audience: Bangladeshi shop owners. UI copy is English; use Bengali (Bangla) text only where explicitly indicated. Currency is **৳ (BDT)** with Indian-style digit grouping (e.g. ৳1,999). There must be a single, consistent design system across all screens.

---

### 0. Global app shell (present on all authenticated screens)

- **Left sidebar navigation** with these items, in order:
  1. Overview
  2. Inbox
  3. Customers
  4. Products
  5. Sales
  6. Follow-ups
  7. AI Knowledge
  8. AI Activity
  9. Analytics
  10. Credits
  11. Notifications
  12. Settings
  13. Connected Pages
- **Sidebar footer**: an "AI Credits" readout showing the remaining credit number, and a "Log out" button.
- **Top bar**: current page title on the left; on the right, a **page selector** dropdown listing the owner's connected Facebook Pages (shown only when at least one page is connected). Selecting a page re-scopes the whole dashboard to that page.

---

### 1. Login (unauthenticated)

- Heading and one-line subheading describing the product.
- Form fields: **Email**, **Password** (both required).
- **Sign in** button (with a busy/loading state "Signing in…").
- Inline error message area (e.g. wrong credentials).
- Link: **"New here? Create an account"** → Register.

### 2. Register (unauthenticated)

- Heading and one-line subheading.
- Form fields: **Your name**, **Email**, **Password** (minimum 8 characters).
- **Create account** button (busy state "Creating account…").
- Inline error message area.
- Link: **"Already have an account? Sign in"** → Login.

---

### 3. Overview

- **Summary cards** (top row):
  - AI Credits — remaining number, sublabel "remaining".
  - Conversations today — count.
  - New customers today — count.
  - Total sales — count.
- **Sales funnel** — a five-stage strip showing counts: Customers → Conversations → Leads (interested + negotiating) → Follow-ups → Sales. (Each stage links to its page.)
- **Attention required** — a list. Each item shows: customer name, attention reason (human-readable), a status badge, and relative time ("5m ago"). Empty state: "Nothing needs your attention right now." Each item links to that conversation's Inbox detail.
- **Recent conversations** — a list (up to 8). Each item shows: customer name, handling indicator ("AI handling" or "Human handling"), status badge, relative time. Empty state text. Each item links to Inbox detail.

### 4. Inbox (conversation list)

- **Search** input — searches by customer name or PSID.
- **Status filter** dropdown with options: All statuses, New, Interested, Negotiating, Follow-up, Purchased, Not interested.
- **Conversation list**. Each row shows: customer avatar (initial), name, a subline combining handling ("AI handling" / "Human handling") and attention reason (e.g. "Human handling · angry"), a status badge, and relative time. Rows link to the conversation detail.

### 5. Inbox — Conversation detail

- **Header card** showing:
  - Customer name and PSID, plus customer status.
  - Attention reason (shown when present, styled as a warning).
  - A status badge and a handling badge ("AI handling" / "Human handling").
  - A **status dropdown** with options: New, Interested, Negotiating, Follow-up, Purchased, Not interested, Closed.
  - A toggle button that is **"Take over"** when AI is handling, or **"Return to AI"** when a human is handling.
- **Message thread** — a scrollable transcript of messages. User messages and AI/human messages are visually distinct; each message shows its text and a timestamp. Updates live via SSE.
- **Footer note**: "Replies are sent by the AI on Facebook Messenger. Take over to answer as yourself from your page."

### 6. Customers (list)

- **Search** input — searches by customer name or PSID.
- **Table** with columns: Name, Status, Tags, First seen, Last active. Name links to the customer detail page.

### 7. Customers — detail

- **Profile card** (left):
  - Name, PSID, "first seen" time.
  - **Status** dropdown: New, Interested, Negotiating, Purchased, Not interested.
  - **Tags** input (comma-separated), e.g. "VIP, Hot Lead".
  - **Internal notes** textarea.
  - **Save changes** button.
- **Purchases** section — list of sales records for this customer; each row shows source, relative time, and amount in ৳. Empty state: "No sales recorded for this customer."
- **Conversations** section — list of this customer's conversations; each row shows a status badge and relative time, linking to the Inbox detail.

### 8. Products

- **Add product** form with fields:
  - Name (required)
  - Search keywords (required, comma-separated)
  - Image URL (required)
  - Price (BDT, optional number)
  - Stock status dropdown: Available, Low stock, Out of stock
  - Variants (comma-separated, optional)
  - **Add product** button (busy state "Adding…").
- **Product table** with columns: Product (thumbnail + name), Price, Stock (badge), Keywords, and an actions area per row containing a **stock-status dropdown** (Available / Low stock / Out of stock) and a **Remove** button.

### 9. Sales

- **Record a sale** form:
  - **Customer** dropdown (required) — lists the page's customers.
  - **Amount (BDT)** (required number).
  - **Source** dropdown: Inbox, Post comment, Follow-up, Direct.
  - **Assisted by** dropdown: AI, Human.
  - **Record sale** button (busy state "Saving…").
- **Total** line — "Total: ৳X across N orders".
- **Sales table** with columns: Amount, Source (badge), Assisted (AI/Human badge), When (relative time).

### 10. Follow-ups

- **Schedule a follow-up** form:
  - **Customer** dropdown (required).
  - **Follow-up time** (datetime picker, required).
  - **Reason** (optional text).
  - **Schedule follow-up** button (busy state "Scheduling…").
- **Follow-up table** with columns: Customer, Reason, Scheduled (date/time), Status (badge), and per-row actions:
  - When status is "scheduled": **Mark sent** and **Cancel**.
  - When status is "sent": **Mark completed**.

### 11. AI Knowledge

- **Knowledge base** section:
  - Add form: **Question** (required), **Answer** (required), **Add to knowledge base** button.
  - List of existing FAQ entries, each showing question and answer.
- **"AI needs your answer"** section — pending knowledge requests. Each pending card shows:
  - "Customer asked: <question>" plus relative time.
  - An answer textarea.
  - Two buttons: **Answer & save to knowledge base**, and **Answer only**.
- **Answered history** list (below pending) — each item shows question, answer, and a status badge (answered / dismissed).

### 12. AI Activity

- **Table** with columns: Action, Tokens in, Tokens out, Credits, When.
- Action is a badge with one of: "inbox reply", "comment reply", "follow up". Credits shows a negative value (e.g. "-1"). Empty state text mentions that replies, comment replies, and follow-ups appear here.

### 13. Analytics

- **Period selector** dropdown: Today, Last 7 days, Last 30 days.
- **Stat cards**:
  - Total customers (sub: "N new this period")
  - Conversations (sub: "N AI replies")
  - Sales (sub: "N AI-assisted")
  - Credits used (sub: "N AI calls")
- **Revenue this period** card — large ৳ figure plus "From N recorded orders".
- **Conversion** card — a progress indicator plus text "N% of conversations became a sale this period".

### 14. Credits

- **Summary cards** (4): Credits remaining, Total purchased, Total used, Status (badge: Healthy / zero / low_5 / low_10 / low_20).
- **Recharge with bKash** section — five pricing cards (see Pricing cards section below).
- **Recharge history** table with columns: Package, Amount, Credits, Status (badge), Provider, When.

### 15. Credits — Payment callback (post-bKash redirect)

- Three states:
  - **Verifying** — spinner + "Verifying your bKash payment…".
  - **Paid** — "Payment confirmed", note that credits were added, link "View my credits".
  - **Failed** — "Verification failed", error message, link "Back to credits".

### 16. Notifications

- A list of notification items. Each shows a title, a detail line, and a tone badge (Critical / Low / Review), linking to the relevant page. Item types:
  - **AI Credits exhausted** (critical) — "The AI has paused replying. Recharge to resume." → Credits.
  - **AI Credits running low** — "Only N credits left. Recharge soon to keep your AI selling." → Credits.
  - **<customer> needs attention** (review) — attention reason as detail → Inbox.
- Empty state: "All clear. No notifications right now."
- Footer note: "Notifications appear when credits run low, the AI needs an answer, or a conversation needs your attention."

### 17. Settings

- **AI sales agent** toggle (On/Off) with subtitle "When enabled, the AI replies to messages and comments on your page."
- Form fields:
  - **Tone** dropdown: Friendly, Professional, Casual.
  - **Language** dropdown: Auto (match the customer), Bangla, English.
  - **Business information** textarea.
  - **Custom instructions** textarea.
- **Save settings** button (busy state "Saving…") with a "Saved." confirmation.
- Helper note: "These settings shape the AI's personality and knowledge. Changes apply from the next reply."

### 18. Connected Pages (accounts)

- **Connect a Facebook page** form:
  - **Page ID** (required)
  - **Page name** (required)
  - **Page access token** (required)
  - Helper text explaining the token is stored encrypted and must have `pages_messaging` and `pages_manage_posts` permissions.
  - Error message area and success message area.
  - **Connect page** button (busy state "Connecting…").
- **Connected pages list** — each row: page name, page ID, "connected <time ago>", and a "Connected" / "Inactive" badge.
- Empty state: "No pages connected yet. Connect your Facebook page above to start selling with AI."

---

### Pricing cards (used on the Credits page)

Render five recharge package cards. Each card shows: package name, price in ৳, credit amount, and a **Recharge** button (busy state "Opening bKash…").

| Package | Price | AI Credits |
| --- | --- | --- |
| Starter | ৳199 | 300 |
| Basic | ৳499 | 750 |
| Business | ৳999 | 1,700 |
| Pro | ৳1,999 | 3,700 |
| Enterprise | ৳4,999 | 9,500 |

Feature positioning to communicate on each card (higher tiers include lower-tier features):

- **Starter** — AI comment reply, AI inbox conversation, basic product info, basic follow-up, basic conversation tracking.
- **Basic** — comment automation, inbox automation, product info, sales conversation, follow-up automation, customer tracking, basic analytics.
- **Business** — full AI sales agent, comment + inbox automation, smart follow-up, customer management, sales tracking, knowledge base, human takeover, advanced analytics.
- **Pro** — everything in Business, plus advanced automation, team members, advanced customer management, advanced analytics, priority features.
- **Enterprise** — everything in Pro, plus multiple business/page support, advanced team management, higher usage capacity, advanced reporting, priority support.

---

### Reference values (use these exact labels in mockups)

- **Conversation status:** New, Interested, Negotiating, Follow-up, Purchased, Not interested, Closed.
- **Customer status:** New, Interested, Negotiating, Purchased, Not interested.
- **Handling indicator:** "AI handling", "Human handling".
- **Attention reasons** (display with underscores removed): knowledge_request, human_requested, angry, purchase_ready, high_value, follow_up_pending, ai_error, credit_exhausted.
- **Product stock:** Available, Low stock, Out of stock.
- **Sale source:** Inbox, Post comment, Follow-up, Direct.
- **Follow-up status:** Scheduled, Sent, Replied, Completed, Cancelled.
- **AI activity action:** inbox reply, comment reply, follow up.
- **Knowledge request status:** Pending, Answered, Dismissed.
- **Payment status:** Pending, Paid, Failed, Refunded.
- **Payment provider:** bKash, Manual.
- **Tone:** Friendly, Professional, Casual.
- **Language:** Auto, Bangla, English.
- **Credit level:** Healthy, Zero, Low (5%), Low (10%), Low (20%).
- **Customer tags** (examples): VIP, Hot Lead, Regular Customer, New Customer, High Value, Follow-up Required.
- **Low-credit notification thresholds:** 20% remaining, 10% remaining, 5% remaining, zero (AI pauses).

### Content & tone notes for the designer

- All numeric credit amounts use Indian-style grouping (e.g. 8,450).
- All money is ৳ (BDT).
- Keep the product feeling like a helpful, trustworthy sales tool for non-technical shop owners — clear labels, plain language, no jargon.
- Bangla appears in realistic sample data only (e.g. product names, FAQ answers); interface copy stays English.
