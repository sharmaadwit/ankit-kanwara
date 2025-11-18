# Activity Form Restructure Plan

## 📋 My Understanding - Please Confirm

### **1. NEW FORM STRUCTURE (4 Sections)**

```
┌─────────────────────────────────────────────────┐
│ SECTION 1: ACTIVITY TYPE (First Selection)    │
│   ○ Internal Activity                          │
│   ○ External Activity                          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ SECTION 2: ACCOUNT (Global - All Users)        │
│   • Account Name* (auto-populates below)       │
│   • Sales Rep Name (auto-populated)            │
│   • Industry (auto-populated)                  │
│   • Project Name (dropdown OR type to create)   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ SECTION 3: PROJECT (Only if External)          │
│   • SFDC Link [Optional]                        │
│     ☐ No SFDC link exists (checkbox)           │
│   • Primary Use Case [Multi-select]            │
│     - Marketing                                 │
│     - Commerce                                 │
│     - Support                                  │
│     - Other (with text entry)                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ SECTION 4: ACTIVITY DETAILS                    │
│   • Date*                                       │
│   • Activity Type* (varies by Internal/External)│
│   • Type-specific fields                       │
└─────────────────────────────────────────────────┘
```

---

## 🔄 CHANGES FROM CURRENT STRUCTURE

### **Dashboard Changes:**
- ❌ Remove: "Log Customer Activity" button
- ❌ Remove: "Log Internal Activity" button  
- ✅ Add: Single "Log Activity" button

### **Form Flow Changes:**
1. **First Decision:** Internal vs External (moved to top)
2. **Account Selection:** Auto-populates Sales Rep & Industry
3. **Project:** Only shown for External activities
4. **Activity Type:** Shown after Internal/External selection

---

## 📝 DETAILED FIELD BREAKDOWN

### **SECTION 1: Activity Type (First Selection)**
```
[ ] Internal Activity
[ ] External Activity
```

### **SECTION 2: Account Section (Always Visible for External, Hidden for Internal?)**

**Questions:**
- Q1: Should Account section be hidden for Internal activities?
- Q2: Or should Internal activities also link to an Account?

| Field | Type | Auto-populated? | Notes |
|-------|------|-----------------|-------|
| Account Name* | Search/Dropdown | No | User selects, then auto-fills below |
| Sales Rep Name | Text | ✅ Yes | Auto-filled from account |
| Industry | Dropdown | ✅ Yes | Auto-filled from account |
| Project Name | Search/Dropdown | No | Shows dropdown if projects exist, can type to create new |

### **SECTION 3: Project Section (Only for External)**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| SFDC Link | URL | ❌ No | Optional |
| ☐ No SFDC link exists | Checkbox | - | When checked, hides SFDC Link field |
| Primary Use Case | Multi-select | ❌ No | Marketing, Commerce, Support, Other (with text entry) |

**Questions:**
- Q3: Should "Primary Use Case" be required or optional?
- Q4: When "Other" is selected in Use Case, should it show a text field?

### **SECTION 4: Activity Details**

#### **If INTERNAL Selected:**

| Field | Type | Required | Options |
|-------|------|----------|---------|
| Date* | Date | ✅ Yes | - |
| Activity Type* | Dropdown | ✅ Yes | Enablement, Video Creation, Webinar, Event/Booth Hosting, Product Feedback, Content Creation, Training, Documentation, Internal Meeting, Other |
| Time Spent | Radio/Select | ❌ No | Options: Full day, Multi day, Hours (then number input) |

**Questions:**
- Q5: For "Time Spent" - should it be:
  - Radio buttons: [ ] Full day [ ] Multi day [ ] Hours
  - Then if Hours selected, show number input?
- Q6: For "Multi day" - should we ask how many days?

#### **If EXTERNAL Selected:**

**Activity Type Options:**
- Customer Call
- SOW (Statement of Work)
- POC (Proof of Concept)
- RFx
- Pricing

---

### **EXTERNAL ACTIVITY: Customer Call**

| Field | Type | Required | Options |
|-------|------|----------|---------|
| Call Type* | Dropdown | ✅ Yes | Demo, Discovery, Scoping Deep Dive, Follow-up, Q&A, Internal Kickoff, Customer Kickoff |
| Products Discussed | Multi-select | ❌ No | AI Agents, Campaign Manager, Agent Assist, Journey Builder, Personalize, Voice AI, Other (with text entry) |
| Channels | Multi-select | ❌ No | WhatsApp, Web, Voice, RCS, Instagram, Mobile SDK, Other |

**Questions:**
- Q7: Should "Other" in Products/Channels show a text field for custom entry?
- Q8: Remove Duration field? (currently exists)
- Q9: Remove Opportunity Status, Deal Size, Competitors, Next Steps? (currently exist)

---

### **EXTERNAL ACTIVITY: POC**

**Base Fields (Always Shown):**
| Field | Type | Required | Options |
|-------|------|----------|---------|
| Access Type* | Dropdown | ✅ Yes | Sandbox, Custom POC - Structured Journey, Custom POC - Agentic, Custom POC - Commerce, Other |
| Use Case Description* | Textarea | ✅ Yes | - |

**If "Sandbox" Selected:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Products Interested | Multi-select | ❌ No | Same options as Products Discussed |
| Start Date* | Date | ✅ Yes | Auto-sets End Date to +7 days |
| End Date* | Date | ✅ Yes | Auto-calculated |

**If "Custom POC" Selected:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Demo Environment | Text | ❌ No | - |
| Bot Trigger URL/Number | Text/URL | ❌ No | Can be URL or number |

**Questions:**
- Q10: For Custom POC, should Bot Trigger be one field that accepts both URL and number, or separate fields?
- Q11: Should "Other" in Access Type show additional fields?

---

### **EXTERNAL ACTIVITY: RFx**

| Field | Type | Required | Options |
|-------|------|----------|---------|
| RFx Type* | Dropdown | ✅ Yes | RFP, RFI, RFQ, Other |
| Submission Deadline* | Date | ✅ Yes | - |
| Google Folder Link | URL | ❌ No | - |
| Additional Notes | Textarea | ❌ No | - |

---

### **EXTERNAL ACTIVITY: SOW**

**Questions:**
- Q12: What fields should SOW have? (Not specified yet)

---

### **EXTERNAL ACTIVITY: Pricing**

**Questions:**
- Q13: You said "no info to capture for now" - so just the activity type selection, no additional fields?

---

## 🔧 TECHNICAL IMPLEMENTATION NOTES

### **1. Common Products List (Avoid Redundancy)**
Create a single source of truth for products:
```javascript
const PRODUCTS = [
    'AI Agents',
    'Campaign Manager', 
    'Agent Assist',
    'Journey Builder',
    'Personalize',
    'Voice AI',
    'Other'
];
```

Use this for:
- Products Discussed (Customer Call)
- Products Interested (POC Sandbox)

### **2. Auto-population Logic**
When Account is selected:
1. Fetch account from DataManager
2. Auto-fill: Sales Rep Name, Industry
3. Load projects for that account
4. Show project dropdown if projects exist

### **3. Conditional Fields**
- Account/Project sections: Hide for Internal activities
- Project section: Only show for External activities
- POC fields: Show different fields based on Access Type (Sandbox vs Custom POC)
- SFDC Link: Hide when "No SFDC link exists" checkbox is checked

### **4. Form Validation**
- Account Name: Required for External
- Activity Type: Required
- Type-specific required fields based on selection

---

## ❓ QUESTIONS FOR CLARIFICATION

1. **Q1:** Should Account section be completely hidden for Internal activities, or should Internal activities optionally link to accounts?

2. **Q2:** For Internal activities, do we need any account/project linkage at all?

3. **Q3:** Is "Primary Use Case" required or optional in Project section?

4. **Q4:** When "Other" is selected in Use Case multi-select, should it show a text input field?

5. **Q5:** For Time Spent in Internal activities, should the UI be:
   - Radio buttons: [ ] Full day [ ] Multi day [ ] Hours
   - Then conditional number input for Hours/Multi day?

6. **Q6:** For "Multi day" option, should we ask "How many days?" or just store "Multi day"?

7. **Q7:** When "Other" is selected in Products/Channels, should it show a text field for custom entry?

8. **Q8:** Remove Duration field from Customer Call? (currently exists)

9. **Q9:** Remove Opportunity Status, Deal Size, Competitors, Next Steps from Customer Call? (currently exist)

10. **Q10:** For Custom POC "Bot Trigger", should it be one field accepting both URL and number, or separate fields?

11. **Q11:** Should "Other" in Access Type (POC) show additional fields?

12. **Q12:** What fields should SOW (Statement of Work) have?

13. **Q13:** For Pricing activity type, confirm: Just selection, no fields?

14. **Q14:** Should we keep the "Location" and "Participants" fields that currently exist in Basic Information?

15. **Q15:** Should we keep "Customer Type" (New/Existing/Prospect) field?

---

## 📊 SUMMARY OF UNDERSTANDING

### **Form Flow:**
1. User clicks "Log Activity" (single button on dashboard)
2. Selects: Internal or External
3. If External: Selects Account → Auto-fills Sales Rep & Industry → Selects/Creates Project → Fills Project details
4. Selects Activity Type (varies by Internal/External)
5. Fills activity-specific fields
6. Saves

### **Key Changes:**
- ✅ Single "Log Activity" button
- ✅ Internal/External selection first
- ✅ Account auto-populates Sales Rep & Industry
- ✅ Project dropdown with create option
- ✅ SFDC link with "No link exists" checkbox
- ✅ Common products list (no redundancy)
- ✅ Simplified Customer Call (removed some fields?)
- ✅ Conditional POC fields (Sandbox vs Custom)
- ✅ Added SOW and Pricing activity types
- ✅ Time Spent options for Internal (Full day/Multi day/Hours)

### **Removed/To Remove:**
- ❌ Separate Customer/Internal activity buttons
- ❌ Duration from Customer Call? (confirm)
- ❌ Opportunity Status, Deal Size, Competitors, Next Steps? (confirm)
- ❌ Location, Participants fields? (confirm)
- ❌ Customer Type field? (confirm)

---

**Please review and answer the questions above so I can implement exactly what you need!** 🚀


