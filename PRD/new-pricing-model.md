Implement the finalized recharge and credit pricing system across the existing SaaS platform.

IMPORTANT:
- Apply these changes to the existing project without breaking existing features.
- Do not redesign unrelated pages or change unrelated functionality.
- Use the existing architecture, database patterns, authentication, payment flow, and coding conventions.
- Do not hardcode pricing logic in the frontend only. The backend must be the source of truth.

## 1. Credit System

Use the following pricing model:

- 1 credit = $0.0001 customer usage value
- $1 = 150 BDT
- Therefore, 1 credit = 0.015 BDT

The system should use actual AI usage to calculate credits consumed.

Do not use “1 credit = X output tokens” as the billing rule.

Instead:

Actual provider cost
→ 4× customer billing value
→ convert billing value into credits
→ deduct credits from the user's balance

The 4× multiplier is the current starting pricing model.

Make the multiplier configurable in the backend so it can be changed later without rewriting the billing system.

## 2. AI Model Rates

Use these current provider rates for internal cost calculation:

### openai/gpt-5.6-luna
- Input: $0.10 / 1M tokens
- Output: $0.60 / 1M tokens

Therefore:
- 1K input = $0.0001 API cost
- 1K output = $0.0006 API cost

After 4× customer billing:
- 1K input = $0.0004 customer usage value
- 1K output = $0.0024 customer usage value

With the current credit value:
- 1K input = 4 credits
- 1K output = 24 credits

### google/gemini-2.5-flash-lite
- Input: $0.10 / 1M tokens
- Output: $0.40 / 1M tokens

Therefore:
- 1K input = $0.0001 API cost
- 1K output = $0.0004 API cost

After 4× customer billing:
- 1K input = $0.0004 customer usage value
- 1K output = $0.0016 customer usage value

With the current credit value:
- 1K input = 4 credits
- 1K output = 16 credits

## 3. Recharge Packages

Create these five recharge packages:

### Starter
Price: ৳199
Base Credits: 10,000
Bonus Credits: 3,000
Total Credits: 13,000

### Growth
Price: ৳499
Base Credits: 25,000
Bonus Credits: 7,500
Total Credits: 32,500

### Pro
Price: ৳999
Base Credits: 50,000
Bonus Credits: 15,000
Total Credits: 65,000

### Business
Price: ৳1,999
Base Credits: 100,000
Bonus Credits: 35,000
Total Credits: 135,000

### Enterprise
Price: ৳4,999
Base Credits: 250,000
Bonus Credits: 100,000
Total Credits: 350,000

IMPORTANT:
The “Bonus Credits” are currently only a frontend marketing/display concept.

The backend should treat each package as a single total credit amount:

- ৳199 → 13,000 credits
- ৳499 → 32,500 credits
- ৳999 → 65,000 credits
- ৳1,999 → 135,000 credits
- ৳4,999 → 350,000 credits

Do not create separate bonus-credit consumption logic unless it is required by the existing architecture.

## 4. Credit Expiry

There is currently NO credit expiry.

Purchased credits remain available until they are consumed.

Do not add:
- 7-day expiry
- 15-day expiry
- 30-day expiry
- 60-day expiry
- 90-day expiry
- any other validity period

Do not display credit validity/expiry on the pricing cards.

## 5. Frontend Pricing Cards

Update the recharge/pricing page to show the five packages above.

Each pricing card should include:
- Package name
- Price in BDT
- Base credits
- Bonus credits
- Total credits
- Recharge button

Example:

৳199
10,000 Credits
+3,000 Bonus Credits
Total: 13,000 Credits

The pricing page should make it clear that credits can be used across the platform's AI-powered features.

Do not add fake features, fake limits, or fake credit validity information.

## 6. Credit Deduction

Whenever AI is used, calculate the actual usage and deduct the appropriate credits.

The system must support all AI usage currently present in the platform, including where applicable:
- Text processing
- Text generation
- Image understanding
- Voice/audio understanding
- Comment processing
- Inbox replies
- Follow-up messages
- Any other AI-powered processing

If multiple AI models are used for one customer interaction, calculate the cost of each AI call and combine them.

Example:

Gemini understanding cost
+
OpenAI/DeepSeek/etc. response-generation cost
=
Total actual AI cost

Then apply the 4× customer billing multiplier and convert that amount into credits.

## 7. Important AI Billing Rule

Do not charge only based on output tokens.

Both input and output usage must be included when provider usage data is available.

For every AI request, calculate:

- Input tokens
- Output tokens
- Provider/model
- Actual API cost
- Customer billing cost after 4× multiplier
- Credits used

## 8. Database / Billing Records

Keep payment and AI usage information separate.

For each AI usage record, store appropriate fields such as:

- user_id
- business_id
- conversation_id
- message_id
- provider
- model
- input_tokens
- output_tokens
- actual_api_cost
- markup_multiplier
- billable_cost
- credits_used
- created_at

For recharge/payment records, keep separate information such as:

- user_id
- package_id
- payment_amount_bdt
- total_credits_added
- payment_status
- transaction_reference
- created_at

Do not mix payment amount, API cost, and credit balance into a single field.

## 9. Precision / Money Calculation

Avoid unsafe floating-point calculations for financial and credit accounting.

Use fixed-point or integer-based calculations wherever practical so that:
- token cost calculations remain accurate
- credit balances remain accurate
- recharge amounts remain accurate
- rounding errors do not accumulate

The UI may display normal decimal BDT/USD values, but backend accounting should use precise integer/fixed-point representations.

## 10. Credit Balance

Every user/business should have an isolated credit balance.

When a recharge succeeds:
- Add the package's total credits to that user's account.
- Update the balance transaction/history.

When AI usage occurs:
- Check available credit before starting billable AI processing.
- Deduct the calculated credits.
- Record the usage.

When the user's credit balance is insufficient:
- Prevent further billable AI usage.
- Show an appropriate “Insufficient Credits” state.
- Provide a way to recharge.

Do not allow users to use another user's credits.

## 11. Multi-Tenant Isolation

This is a SaaS product.

Credit balances, recharge history, payment records, AI usage, products, customers, orders, conversations, business information, and analytics must remain isolated per user/business.

A user must never be able to access another user's:
- credits
- recharge history
- payments
- AI usage
- billing information

Enforce this at the backend/database level, not only in the frontend.

## 12. AI Activity Integration

The existing AI Activity page must use real billing/usage data.

For each activity, show accurate:
- Input tokens
- Output tokens
- Credits used
- Date/time

Make sure the AI Activity calculations are consistent with the new credit system.

## 13. Recharge Flow

User flow should be:

Choose recharge package
→ Pay in BDT
→ Payment verified successfully
→ Total package credits added
→ Updated credit balance shown immediately
→ AI can use the credits

If payment fails or is rejected:
- Do not add credits.

If payment succeeds:
- Add the exact total credits defined for the package.

## 14. Important Restrictions

Do not:
- Add credit expiry
- Add separate feature-based subscriptions
- Charge users separately for image, voice, inbox, comments, follow-ups, etc.
- Use fake/static AI usage numbers
- Hardcode the balance in the frontend
- Trust frontend credit calculations
- Allow negative credit balances unless absolutely required for a controlled atomic transaction flow
- Break existing payment or AI functionality

## 15. Final Verification

After implementation, verify the full flow:

1. User purchases ৳199 package.
2. Backend adds exactly 13,000 credits.
3. Dashboard shows 13,000 available credits.
4. AI request happens.
5. Actual input/output usage is captured.
6. Actual API cost is calculated.
7. 4× multiplier is applied.
8. Correct credits are deducted.
9. AI Activity shows the same usage and credit deduction.
10. Recharge history shows the correct payment and credit amount.
11. When credits are insufficient, AI usage is blocked.
12. Another user's credits and billing data remain completely isolated.
13. No credit expiry appears anywhere.
14. Pricing cards correctly show base + bonus + total credits.

Before finishing, audit the existing credit/billing implementation and remove or correct any conflicting old pricing, token-to-credit formulas, fake balances, expiry logic, or hardcoded package values.