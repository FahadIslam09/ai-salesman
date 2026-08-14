# AI SaaS Pricing Model

## 1. Pricing Strategy

The platform will use a **Prepaid AI Credit Recharge Model** instead of a mandatory monthly subscription.

Business owners will purchase AI Credits in advance and use those credits when the AI handles customer conversations.

The user will not be charged separately for the platform and AI usage. The AI usage cost will be included within the purchased AI Credit balance.

This approach keeps the pricing simple for customers while protecting the platform from unpredictable AI API costs.

---

## 2. AI Model & API Cost

### AI Model

- **Model:** GPT-4o mini
- **API Provider:** OpenRouter
- **Input Price:** $0.15 / 1M tokens
- **Output Price:** $0.60 / 1M tokens
- **Internal USD Conversion Rate:** $1 = ৳150

### Estimated API Cost

Based on the initial estimated usage pattern:

> **Average AI conversation cost: ৳0.40–৳0.50**

For initial pricing calculations, the platform will use:

> **Estimated average cost per AI conversation: ৳0.45**

This is an initial estimate and will be recalculated after the platform goes live and real usage data becomes available.

---

# 3. AI Credit System

The platform will use **AI Credits** as its internal usage unit.

Users will see their remaining AI Credits instead of raw token usage.

Example:

> **AI Credits: 8,450 remaining**

The backend will track actual:

- Input tokens
- Output tokens
- Total tokens
- API cost
- AI requests
- Conversation usage

The credit deduction system should remain configurable so that the platform can change the credit-to-cost ratio later without rebuilding the billing system.

---

# 4. Recharge Packages

The initial pricing structure will be:

| Package    |  Price | AI Credits | Estimated API Cost | Estimated Gross Margin |
| ---------- | -----: | ---------: | -----------------: | ---------------------: |
| Starter    |   ৳199 |        300 |               ৳135 |                    ৳64 |
| Basic      |   ৳499 |        750 |            ৳337.50 |                ৳161.50 |
| Business   |   ৳999 |      1,700 |               ৳765 |                   ৳234 |
| Pro        | ৳1,999 |      3,700 |             ৳1,665 |                   ৳334 |
| Enterprise | ৳4,999 |      9,500 |             ৳4,275 |                   ৳724 |

### Calculation Basis

Estimated API cost:

> **AI Credits × ৳0.45**

The estimated gross margin represents:

> **Recharge Price − Estimated AI API Cost**

It does not include:

- Server costs
- Database costs
- Payment gateway fees
- Social media API costs
- Storage
- Monitoring
- Customer support
- Other operational expenses

Therefore, the actual net profit will be lower than the estimated gross margin.

---

# 5. Package Positioning

### Starter — ৳199

Designed for small businesses and users who want to test the AI sales system.

Includes:

- 300 AI Credits
- AI comment reply
- AI inbox conversation
- Basic product information
- Basic follow-up
- Basic conversation tracking

### Basic — ৳499

Designed for small businesses with regular customer conversations.

Includes:

- 750 AI Credits
- Comment automation
- Inbox automation
- Product information
- Sales conversation
- Follow-up automation
- Customer tracking
- Basic analytics

### Business — ৳999

The primary package for regular businesses.

Includes:

- 1,700 AI Credits
- Full AI sales agent
- Comment and inbox automation
- Smart follow-up
- Customer management
- Sales tracking
- Knowledge base
- Human takeover
- Advanced analytics

### Pro — ৳1,999

Designed for businesses with higher customer volume.

Includes:

- 3,700 AI Credits
- Everything in Business
- Advanced automation
- Team members
- Advanced customer management
- Advanced analytics
- Priority features

### Enterprise — ৳4,999

Designed for businesses with high-volume customer interactions.

Includes:

- 9,500 AI Credits
- Everything in Pro
- Multiple business/page support
- Advanced team management
- Higher usage capacity
- Advanced reporting
- Priority support

Enterprise customers may receive customized pricing and usage limits based on their requirements.

---

# 6. Credit Recharge

Users can purchase additional AI Credits whenever their balance becomes low or reaches zero.

The platform will support: 

- Manual recharge
- Multiple recharge packages
- Payment history
- Credit balance history
- Credit usage history
- Recharge history

When the user's AI Credit balance reaches zero, AI-powered actions will be paused until the user purchases additional credits.

---

# 7. Low Credit Notification

The system will notify users when their credit balance becomes low.

Example thresholds:

- 20% remaining
- 10% remaining
- 5% remaining

Example notification:

> **Your AI Credits are running low. Recharge now to keep your AI Sales Agent active.**
>
> #

---

# 9. Credit Usage Tracking

Every AI request should be recorded internally.

Each usage record should contain:

- User ID
- Business ID
- Conversation ID
- Request ID
- AI model
- Input tokens
- Output tokens
- Total tokens
- API cost
- Credits deducted
- Timestamp

This data will be used to calculate the actual cost and improve future pricing.

---

# 10. Future Pricing Adjustment

The current pricing is based on estimated AI usage because the platform has not yet collected real production data.

After launch, the platform will monitor:

- Average tokens per conversation
- Average API cost per conversation
- Average credits consumed per customer
- Average daily AI usage
- Average monthly usage per business
- Heavy-user usage
- Follow-up usage
- Long conversation usage
- Actual infrastructure costs
- Payment processing costs
- Overall profit margin

After sufficient real-world data has been collected, the pricing model may be adjusted.

Possible adjustments include:

- Changing the number of credits in each package
- Changing recharge prices
- Adding or removing packages
- Introducing bonus credits
- Introducing business-specific pricing
- Introducing enterprise usage-based pricing

The existing credit architecture should remain unchanged so that pricing can be adjusted without major changes to the core system.

---

# 11. Important Pricing Principle

The platform should **not promise unlimited AI usage**.

All plans and recharge packages will have a defined AI usage capacity.

This protects the platform from unexpected API costs caused by:

- Very long conversations
- High-volume customers
- Excessive automated follow-ups
- Large conversation histories
- Unusual usage patterns

The system should always calculate and track the actual API cost internally.

---

# 12. Initial Pricing Status

**Status:** Initial / Estimated

The above pricing model is intended for the initial launch and PRD planning stage.

The estimated average AI cost of **৳0.45 per conversation** is a planning assumption, not a guaranteed production cost.

Once the application is live, real API usage data will replace the initial estimates and the pricing model will be optimized accordingly.

**Initial Business Model:**

> **Prepaid Recharge → AI Credits → AI Usage → Automatic Credit Deduction → Recharge When Needed**

The platform will not require a mandatory monthly subscription for AI usage during the initial phase.
