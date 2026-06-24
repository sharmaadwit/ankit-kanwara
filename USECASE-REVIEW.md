# Use Case Review — Primary + Secondary (per industry)

**Design**
- **Primary Use Case** (same for all industries, broad bucket): **Commerce · Marketing · Support** (+ Other)
- **Secondary Use Case** (industry-specific, aligned): listed per industry below.

**Legend:** ✓ = already in your data (current secondary) · ➕ = new suggestion to approve · ⚠️ = needs a decision.

Edit this file freely (add/remove/rename), then tell me to apply it. Nothing is changed until you approve.

All use cases are framed for **B2C** journeys delivered via **structured bot / voice AI / AI agent**. "Other" stays as a free-text escape hatch (routed to admin as a pending suggestion).

---

## Universal — Secondary Use Cases (ALL industries get these)

Stored in the existing `universalUseCases` key; merged with each industry's custom list in the form.

1. Lead Generation & Qualification
2. Customer Onboarding
3. Appointment / Booking Scheduling
4. Order / Booking Confirmation & Updates
5. Payment & Renewal Reminders
6. Delivery / Service Status
7. Customer Support / FAQ (self-serve)
8. Complaint / Grievance Management
9. Feedback / Surveys / NPS
10. Promotions, Offers & Campaigns
11. Loyalty & Rewards
12. Re-engagement / Win-back
13. Notifications & Alerts
14. Document Collection / KYC / Verification
15. Internal AI Assistant / Agent Assist

> Because these are universal, the per-industry lists below should keep only the **genuinely industry-specific** ones (the form auto-dedupes any overlap).

---

## Financial

### Banking
✓ Account Opening, KYC Verification, Loan Processing, Credit Card Services, EMI Reminders, Payment Reminders, Transaction Alerts, Fraud Alerts, Investment Advisory, Collection process, Debt Collection & Negotiation, Merchant Onboarding, gift card activation, Internal Ai Assistant, Claims Processing, Migration from Active.ai to CC
➕ Account Statements, Net/Mobile Banking Support, Branch Appointment Booking, Cross-sell/Upsell, Cheque/Card Services
🔸 *Remove if irrelevant:* "Migration from Active.ai to CC" looks account-specific, not a general use case.

### Fintech
✓ (same 16 as Banking)
➕ eKYC, Digital Lending, BNPL (Buy Now Pay Later), Wallet/UPI Support, Card Issuance, Wealth/Investing
🔸 Trim the pure-banking ones that don't fit a wallet/UPI product if you prefer a leaner list.

### Insurance ⚠️
✓ (currently shows the **banking** set — Loan Processing, Account Opening, etc. — which doesn't fit insurance)
➕ **Replace with:** Policy Issuance/Onboarding, Premium Reminders, Policy Renewal, Claims Intimation, Claim Status, Quote/Lead Follow-up, KYC Verification, Coverage Advisory, Endorsements/Changes, Grievance & Support, Add-on Cross-sell
⚠️ **Decision:** replace the banking set entirely, or keep both?

---

## Retail & Consumer

### Retail
✓ WhatsApp Commerce, Order Management, COD (Cash on Delivery), Returns & Refunds, Customer Onboarding, Promotions & Campaigns, Inventory Management, Product Recommendations, Abandoned Cart Recovery, Post Sales Support, Assisted Selling - AA mobile App, Gift card processing, Lead Generation
➕ Loyalty Program, Delivery/Shipping Updates, Back-in-stock Alerts, Store Locator, Feedback/Review

### CPG & FMCG ➕ (currently generic only)
➕ Distributor/Retailer Onboarding, Order Booking, Trade Promotions, Loyalty Programs, Product Catalog & Sampling, Stock Availability, Field Sales Support, Consumer Surveys/Engagement, Complaint Management, Reorder Reminders

---

## Tech & Media

### IT & Software
✓ Product Onboarding, Feature Updates, Technical Support, License Management, User Training, Bug Reports, API Documentation, System Alerts, Customer Advisory, CTWA, Internal reminders
➕ Subscription/Renewal, Demo Scheduling, Incident/Outage Alerts, Usage/Billing Notifications

### Media & Entertainment
✓ Content Notifications, Subscription Management, User Engagement, Event Reminders, Audience Polls, Content Alerts, Event Updates
➕ Ticketing, Renewal/Win-back, Live Event Support, Watchlist/Recommendations

---

## Healthcare & Life Sciences

### Healthcare
✓ Appointment Booking, Patient Reminders, Prescription Management, Health Check-ups, Lab Reports, Telemedicine, Patient Onboarding, Medical Records, Vaccination Reminders, Doctor engagement, lead Generation
➕ Billing/Payment, Feedback/NPS, Insurance/TPA Coordination

### Pharma & Life Sciences ➕ (currently generic only)
➕ HCP (Doctor) Engagement, Medical Rep Support, Patient Adherence Programs, Sample/Literature Requests, Pharmacovigilance/Adverse Event, Clinical Trial Recruitment, Distributor Order Management, Compliance Notifications, CME/Training

---

## Industrial & Supply

### Manufacturing ➕ (currently generic only)
➕ Dealer/Distributor Onboarding, Order & Dispatch Tracking, Service/Warranty Requests, Spare Parts Ordering, Field Service Scheduling, Quality/Complaint Management, Production Alerts, Vendor Communication, AMC Reminders

### Logistics & Supply Chain
✓ Order Tracking
➕ Shipment/Delivery Notifications, Pickup Scheduling, Proof of Delivery, Address Confirmation, COD Reconciliation, Driver/Fleet Communication, Exception/Delay Alerts, Returns Coordination

### Industrial ➕ (currently generic only)
➕ Equipment Onboarding, Service & Maintenance Requests, Spare Parts, Safety/Compliance Alerts, Field Engineer Dispatch, Warranty/AMC, Vendor/Procurement, Plant/Operations Alerts

### Agritech ➕ (currently generic only)
➕ Farmer Onboarding, Crop/Weather Advisory, Input Ordering (seeds/fertilizer), Mandi/Price Alerts, Loan/Subsidy Info, Harvest/Procurement Coordination, Equipment Rental, Payment Reminders, Helpline/Support

---

## Services & Public

### Real Estate & Construction ➕ (currently generic only)
➕ Lead Capture/Qualification, Site Visit Scheduling, Project Updates, Booking & Payment Milestones, Document Collection (KYC), Possession/Handover, Channel Partner/Broker, Maintenance Requests, Loan Assistance

### Education
✓ Student Enrollment, Course Updates, Fee Reminders, Exam Notifications, Assignment Submissions, Parent-Teacher Communication, Library Management, Attendance Alerts, Result Notifications
➕ Admission Lead Nurturing, Counseling/Demo Booking, Placement/Alumni Engagement

### Travel & Hospitality
✓ Booking Confirmations, Check-in Reminders, Loyalty Updates, Offers, Ai Agent - Trip discovery
➕ Itinerary Updates, Cancellation/Refund, Concierge/Support, Feedback/Review, Upgrade/Upsell

### Government & Public Sector
✓ Citizen Notifications, Document Status, Super Agent
➕ Grievance Redressal, Scheme/Benefit Awareness, Appointment/Token Booking, Bill/Tax Payment Reminders, Certificate Issuance, Helpline

### Professional Services ➕ (currently generic only)
➕ Client Onboarding, Consultation Booking, Document Collection, Invoice/Payment Reminders, Project/Case Updates, Lead Qualification, Feedback/NPS, Renewal/Retainer

---

## After you review
1. Edit this file (add/remove/rename per industry).
2. I apply it: each industry's **Secondary** list = your approved set; **Primary** stays Commerce/Marketing/Support/Other.
3. Implementation: add a **Secondary Use Case** field to the Log Activity form that loads these per the selected industry (Primary stays the 3 buckets). Both saved on the activity/project.
