# Business Owner Dashboard PRD

## 1. Dashboard-এর উদ্দেশ্য

Business owner ওয়েব অ্যাপে লগইন করার পর এমন একটি কেন্দ্রীয় Dashboard পাবেন, যেখান থেকে তার পুরো AI Sales System পরিচালনা করা যাবে।

Dashboard থেকে Business owner দেখতে পারবেন:

- কতজন customer এসেছে
- AI কতগুলো conversation handle করেছে
- কতগুলো sale হয়েছে
- কোন customer বর্তমানে interested
- কার সাথে follow-up করতে হবে
- AI কত Credit ব্যবহার করেছে
- কোন প্রশ্নের উত্তর AI জানে না
- কোন conversation-এ human intervention প্রয়োজন
- Product ও business information
- AI-এর বর্তমান অবস্থা

Dashboard-এর মূল লক্ষ্য হবে:

> **Customer → Conversation → Lead → Follow-up → Sale**

পুরো journey-টা এক জায়গা থেকে পরিচালনা করা।

---

# 2. Dashboard Layout

মূল navigation:

1. **Overview**
2. **Inbox**
3. **Customers**
4. **Leads**
5. **Products**
6. **Sales**
7. **Follow-ups**
8. **AI Knowledge**
9. **AI Activity**
10. **Analytics**
11. **Team**
12. **Recharge & Credits**
13. **Notifications**
14. **Settings**

Sidebar-এর নিচে:

- Business Profile
- Help & Support
- Logout

---

# 3. Overview / Home

লগইন করার পর Business owner প্রথমে Overview page দেখতে পাবেন।

### Top Summary Cards

- AI Credits remaining
- Total conversations
- New customers
- Interested customers
- Follow-ups due
- Total sales

উদাহরণ:

> **AI Credits**\
> 8,450 remaining

> **New Customers**\
> 126

> **Interested Leads**\
> 42

> **Sales**\
> 18

---

## 3.1 Today's Overview

আজকের গুরুত্বপূর্ণ তথ্য:

- আজকের নতুন customer
- আজকের conversation
- আজকের AI replies
- আজকের follow-up
- আজকের sales
- আজকের revenue

---

## 3.2 Recent Conversations

সাম্প্রতিক conversation-এর তালিকা:

- Customer name
- Profile image
- Platform
- Last message
- Conversation status
- AI/Human status
- Last activity time

যেমন:

> Rahim\
> Interested in T-shirt\
> AI handling\
> 5 min ago

---

## 3.3 Attention Required

AI বা system যেসব conversation-এর জন্য Business owner-এর attention প্রয়োজন, সেগুলো এখানে দেখাবে।

যেমন:

- AI customer-এর প্রশ্নের উত্তর জানে না
- Customer human support চেয়েছে
- Customer angry/frustrated
- Customer purchase করতে প্রস্তুত
- High-value lead
- Follow-up pending
- AI response failed

---

# 4. Inbox

এটি Dashboard-এর সবচেয়ে গুরুত্বপূর্ণ sectionগুলোর একটি।

Business owner এখানে সব customer conversation দেখতে পারবেন।

### Conversation List

প্রতিটি conversation-এ থাকবে:

- Customer name
- Profile image
- Last message
- Last active time
- Product
- Conversation status
- AI/Human indicator
- Follow-up status
- Sale status

---

## 4.1 Conversation Status

প্রতিটি chat-এর status:

- New
- Conversation Started
- Interested
- Negotiating
- Follow-up
- Purchased
- Not Interested
- Closed

Business owner চাইলে status manually পরিবর্তন করতে পারবেন।

---

## 4.2 AI / Human Status

প্রতিটি conversation-এ স্পষ্টভাবে দেখা যাবে:

- **AI Handling**
- **Human Handling**
- **AI Paused**
- **Waiting for Owner**
- **Handover Required**

---

## 4.3 Human Takeover

Business owner যেকোনো conversation খুলে:

> **Take Over**

button চাপলে AI ওই conversation-এ reply দেওয়া বন্ধ করবে।

Business owner নিজে customer-এর সাথে কথা বলবেন।

পরে:

> **Return to AI**

দিলে AI আবার conversation handle করবে।

---

## 4.4 Conversation Search & Filter

Search করা যাবে:

- Customer name
- Phone number
- Product
- Message
- Conversation ID

Filter:

- New
- Interested
- Follow-up
- Purchased
- Not Interested
- AI handled
- Human handled
- Waiting for owner

---

# 5. Customers

সব customer-এর একটি central customer database থাকবে।

প্রতিটি customer profile-এ:

- Name
- Profile picture
- Social media account
- Contact information
- First conversation
- Last conversation
- Interested products
- Purchased products
- Total purchase amount
- Conversation history
- Follow-up history
- Customer status
- Tags
- Internal notes

---

## 5.1 Customer Tags

Business owner customer-কে custom tag দিতে পারবেন।

যেমন:

- VIP
- Hot Lead
- Regular Customer
- New Customer
- High Value
- Follow-up Required

---

# 6. Leads

যেসব customer এখনো purchase করেনি কিন্তু product নিয়ে আগ্রহ দেখিয়েছে, তাদের Lead হিসেবে দেখা যাবে।

### Lead Status

- New Lead
- Warm Lead
- Hot Lead
- Negotiating
- Follow-up
- Converted
- Lost

Business owner Lead status manually পরিবর্তন করতে পারবেন।

---

# 7. Products

Business owner এখান থেকে AI-এর জন্য product information manage করবেন।

প্রতিটি product-এ:

- Product name
- Product image
- Description
- Price
- Discount
- Stock status
- Specification
- Category
- Available size/variant
- Delivery information
- Related products

### Product Status

- Available
- Low Stock
- Out of Stock
- Hidden

Product out of stock হলে AI customer-কে purchase করার জন্য ভুলভাবে product available বলবে না।

---

# 8. Sales

এই section থেকে sales track করা যাবে।

প্রতিটি sale-এর তথ্য:

- Customer
- Product
- Quantity
- Price
- Discount
- Delivery charge
- Total amount
- Order date
- Sales source
- Conversation source
- AI/Human assisted

---

## 8.1 Sales Source

কোন জায়গা থেকে sale এসেছে তা দেখা যাবে:

- Post Comment
- Inbox
- Follow-up
- Direct Customer
- Other

---

# 9. Follow-ups

যেসব customer-এর সাথে পরে আবার যোগাযোগ করতে হবে, তাদের এখানে দেখা যাবে।

### Follow-up List

- Customer
- Product
- Last conversation
- Follow-up date
- Follow-up reason
- AI/Human
- Status

### Follow-up Status

- Scheduled
- Due
- Sent
- Customer Replied
- Completed
- Cancelled

Business owner চাইলে manually follow-up schedule করতে পারবেন।

---

# 10. AI Knowledge

এই section AI-এর business knowledge manage করার জন্য।

Business owner এখানে যোগ করতে পারবেন:

- Business information
- Product information
- Delivery charge
- Delivery area
- Payment methods
- Return policy
- Refund policy
- Warranty
- Opening hours
- Frequently Asked Questions
- Custom information

---

## 10.1 AI Information Request

AI কোনো information না জানলে Dashboard-এ request তৈরি করবে।

উদাহরণ:

> **Customer:** Rajshahi delivery charge কত?

> **AI:** এই information আমার Knowledge Base-এ নেই।

Dashboard-এ:

> **Information Required: Rajshahi Delivery Charge**

Business owner উত্তর দেবেন:

> ৳80

তারপর:

> **Save to Knowledge Base**

AI ভবিষ্যতে এই information ব্যবহার করতে পারবে।

---

# 11. AI Activity

Business owner AI কী কী কাজ করছে তার activity দেখতে পারবেন।

যেমন:

- Comment reply
- Inbox message
- Product information sent
- Follow-up sent
- Lead detected
- Sale detected
- Human handover
- Knowledge request
- AI error

প্রতিটি activity-তে:

- Time
- Customer
- Conversation
- Action
- AI/Human
- Credit used

দেখানো যাবে।

---

# 12. Analytics

Analytics section-এ business performance এবং AI performance আলাদাভাবে দেখা যাবে।

### Customer Analytics

- Total customers
- New customers
- Returning customers
- Interested customers
- Converted customers
- Lost customers

### Conversation Analytics

- Total conversations
- AI handled conversations
- Human handled conversations
- Average conversation length
- Average response time
- Unanswered conversations

### Sales Analytics

- Total sales
- Total revenue
- Conversion rate
- AI-assisted sales
- Human-assisted sales
- Top-selling products

### Content Analytics

- কোন post থেকে সবচেয়ে বেশি customer এসেছে
- কোন post থেকে সবচেয়ে বেশি sale এসেছে
- কোন product নিয়ে সবচেয়ে বেশি প্রশ্ন এসেছে

---

# 13. AI Usage & Credits

Business owner নিজের AI usage দেখতে পারবেন।

### Credit Summary

- Current balance
- Total purchased
- Total used
- Remaining credits

### Usage Details

- Daily usage
- Weekly usage
- Monthly usage
- Conversation usage
- Follow-up usage
- Comment reply usage

---

## 13.1 Recharge

Dashboard থেকেই:

> **Recharge Credits**

করা যাবে।

Available packages:

- ৳199
- ৳499
- ৳999
- ৳1,999
- ৳4,999

---

## 13.2 Recharge History

দেখা যাবে:

- Date
- Package
- Amount
- Credits
- Payment status
- Transaction ID

---

# 14. Notifications

Dashboard-এর notification center থাকবে।

Notifications আসবে:

- Low Credit
- Credit Exhausted
- New Lead
- High-value customer
- Human takeover required
- AI doesn't know an answer
- Follow-up due
- Sale completed
- Integration error
- AI response failed

---

# 15. Team Management

Business owner চাইলে team member যোগ করতে পারবেন।

### Roles

**Owner**

সবকিছু control করতে পারবে।

**Manager**

Customer, sales, products এবং conversation manage করতে পারবে।

**Moderator**

Customer-এর সাথে কথা বলতে পারবে এবং conversation manage করতে পারবে।

---

## 15.1 Permission Control

Owner নির্ধারণ করতে পারবেন কে:

- Chat দেখতে পারবে
- Chat reply দিতে পারবে
- AI takeover করতে পারবে
- Product edit করতে পারবে
- Sales update করতে পারবে
- Knowledge Base edit করতে পারবে
- Analytics দেখতে পারবে
- Recharge করতে পারবে
- Settings পরিবর্তন করতে পারবে

---

# 16. Settings

Business owner এখান থেকে পুরো AI system control করবেন।

### AI Controls

- Comment reply ON/OFF
- Inbox reply ON/OFF
- Price detection ON/OFF
- Automatic sales conversation ON/OFF
- Follow-up ON/OFF
- Automatic follow-up timing
- Human handover settings
- Unknown information handling
- AI response style
- AI language
- AI personality

---

## 16.1 Automation Settings

Owner rule সেট করতে পারবেন।

উদাহরণ:

> Customer price জানতে চাইলে → Price + Product information পাঠাও

> Customer "পরে নেব" বললে → 2 days পরে follow-up করো

> Customer human support চাইলে → Human-এর কাছে handover করো

---

# 17. Connected Accounts

Business owner যেসব platform connect করেছেন সেগুলো এখান থেকে manage করবেন।

প্রাথমিকভাবে:

- Facebook Page

ভবিষ্যতে:

- WhatsApp
- Instagram
- Other sales channels

প্রতিটি integration-এর status:

- Connected
- Disconnected
- Connection Error
- Reconnect Required

---

# 18. Business Settings

Business information:

- Business name
- Logo
- Description
- Address
- Phone
- Email
- Business hours
- Delivery information
- Payment methods
- Return policy

এই information AI-এর Knowledge Base-এর অংশ হিসেবে ব্যবহার করা যাবে।

---

# 19. Activity Log

Business owner দেখতে পারবেন কোন team member কখন কী করেছে।

যেমন:

> Moderator added a customer note

> Manager updated product price

> Owner took over a conversation

> Owner updated AI knowledge

> Moderator changed lead status

এতে business-এর পুরো activity history থাকবে।

---

# 20. Support

Dashboard-এর মধ্যে:

- Help Center
- Documentation
- Contact Support
- Report Problem
- Feature Request

থাকবে।

---

# 21. Dashboard-এর Priority

প্রথম version-এ সব feature একসাথে না বানিয়ে নিচেরগুলোকে **Core Dashboard** হিসেবে রাখা উচিত।

### MVP Dashboard

1. Overview
2. Inbox
3. Customers
4. Products
5. Sales
6. Follow-ups
7. AI Knowledge
8. AI Activity
9. Analytics
10. AI Credits & Recharge
11. Notifications
12. Settings
13. Connected Accounts

### Phase 2

14. Leads
15. Team Management
16. Advanced Automation
17. Advanced Analytics
18. Reports
19. Activity Logs
20. Advanced Permissions

### Phase 3

21. WhatsApp Integration
22. Multiple Business/Page Management
23. Advanced CRM
24. Order Management
25. Advanced AI Sales Insights

---

# 22. Dashboard-এর মূল User Flow

Business owner লগইন করার পর:

**Login**

↓

**Overview**

↓

**নতুন Customer / Conversation দেখতে পারবে**

↓

**AI conversation handle করছে**

↓

**প্রয়োজনে Human Takeover**

↓

**Customer Interested**

↓

**Follow-up Schedule**

↓

**Customer Purchase**

↓

**Sales Update**

↓

**Analytics-এ Result দেখা**

একইসাথে:

**AI Credits কমে গেলে → Notification → Recharge**

এবং:

**AI কোনো তথ্য না জানলে → Knowledge Request → Owner Answer → Knowledge Base Update**

এই flow-টাই পুরো Dashboard-এর মূল ভিত্তি হবে।
