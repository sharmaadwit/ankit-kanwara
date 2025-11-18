# Activity Form Structure Breakdown

## 📋 Complete Form Hierarchy

### **CUSTOMER ACTIVITY FORM** (`customerActivityModal`)

#### **Section 1: Basic Information** (Always Visible)

| Field | Type | Required | ID | Options/Notes |
|-------|------|----------|-----|---------------|
| Account Name | Search/Text | ✅ Yes | `accountSearch` | Search existing or create new |
| Project Name | Search/Text | ❌ No | `projectSearch` | Enabled after account selection |
| Sales Rep Name | Text | ✅ Yes | `salesRep` | Free text input |
| Industry | Dropdown | ✅ Yes | `industry` | From DataManager.getIndustries() |
| SFDC Link | URL | ❌ No | `sfdcLink` | Salesforce link |
| Primary Use Case | Multi-select | ❌ No | `useCaseSelected` | Options: Marketing, Commerce, Support, Sales, Service, Other |
| Customer Type | Dropdown | ❌ No | `customerType` | Options: New, Existing, Prospect |
| Location | Text | ❌ No | `location` | Free text |
| Number of Participants | Number | ❌ No | `participantCount` | Min: 1 |
| Participants' Roles | Text | ❌ No | `participantRoles` | e.g., "CEO, CTO, PM" |

#### **Section 2: Activity Details** (Always Visible)

| Field | Type | Required | ID | Notes |
|-------|------|----------|-----|-------|
| Date | Date | ✅ Yes | `activityDate` | Defaults to today |
| Activity Type | Dropdown | ✅ Yes | `customerActivityType` | **Triggers dynamic fields** |

**Activity Type Options:**
- `customerCall` → Shows Customer Call fields
- `poc` → Shows POC fields
- `rfx` → Shows RFx fields

---

### **DYNAMIC FIELDS BY ACTIVITY TYPE**

#### **1. CUSTOMER CALL** (`customerCall`)

**Location:** `getCustomerCallFields()` function (lines 236-312)

| Field | Type | Required | ID | Options/Notes |
|-------|------|----------|-----|---------------|
| Call Type | Dropdown | ✅ Yes | `callType` | Options: Initial Call, Discovery Call, Deep Dive, Follow-up, Deal Review, Q&A |
| Duration | Number | ❌ No | `callDuration` | Minutes, min: 15, step: 15 |
| Products Discussed | Multi-select | ❌ No | `productsSelected` | Options: AI Agents, Campaign Manager, Agent Assist, Journey Builder, Personalize, Voice AI, Other |
| Channels | Multi-select | ❌ No | `channelsSelected` | Options: WhatsApp, Web, Voice, RCS, Instagram, Mobile SDK, Other |
| Opportunity Status | Dropdown | ❌ No | `opportunityStatus` | Options: No, Yes (shows Deal Size if Yes) |
| Potential Deal Size | Number | ❌ No | `dealSize` | **Conditional** - Only shown if Opportunity Status = "Yes" |
| Competitors Discussed | Text | ❌ No | `competitors` | Free text |
| Objective / Next Steps | Textarea | ❌ No | `objectiveNextSteps` | 3 rows |

---

#### **2. POC (Proof of Concept)** (`poc`)

**Location:** `getPOCFields()` function (lines 315-379)

| Field | Type | Required | ID | Options/Notes |
|-------|------|----------|-----|---------------|
| Account Type | Dropdown | ✅ Yes | `pocAccountType` | Options: New Account, Existing Account |
| Access Type | Dropdown | ✅ Yes | `accessType` | Options: Sandbox Access, Custom POC - Structured Journey, Custom POC - Agentic, Custom POC - Commerce, Other |
| Products Interested | Multi-select | ❌ No | `pocProductsSelected` | Options: AI Agents, Campaign Manager, Agent Assist, Journey Builder, Other |
| Start Date | Date | ✅ Yes | `pocStartDate` | Auto-sets End Date to +7 days |
| End Date | Date | ✅ Yes | `pocEndDate` | Auto-calculated from Start Date |
| Use Case Description | Textarea | ✅ Yes | `useCaseDescription` | 3 rows |
| Demo Environment | Text | ❌ No | `demoEnvironment` | Free text |
| Bot Trigger URL | URL | ❌ No | `botTriggerUrl` | URL format |

---

#### **3. RFx** (`rfx`)

**Location:** `getRFxFields()` function (lines 382-409)

| Field | Type | Required | ID | Options/Notes |
|-------|------|----------|-----|---------------|
| RFx Type | Dropdown | ✅ Yes | `rfxType` | Options: RFP (Request for Proposal), RFI (Request for Information), RFQ (Request for Quote), Other |
| Submission Deadline | Date | ✅ Yes | `submissionDeadline` | Date picker |
| Google Folder Link | URL | ❌ No | `googleFolderLink` | Google Drive link |
| Additional Notes | Textarea | ❌ No | `rfxNotes` | 3 rows |

---

### **INTERNAL ACTIVITY FORM** (`internalActivityModal`)

**Location:** `createInternalActivityModal()` function (lines 160-215)

| Field | Type | Required | ID | Options/Notes |
|-------|------|----------|-----|---------------|
| Date | Date | ✅ Yes | `internalDate` | Date picker |
| Activity Type | Dropdown | ✅ Yes | `internalActivityType` | Options: Enablement, Video Creation, Webinar, Event/Booth Hosting, Product Feedback, Content Creation, Training, Documentation, Internal Meeting, Other |
| Time Spent | Number | ❌ No | `internalTimeSpent` | Hours, min: 0.5, step: 0.5 |
| Session Name / Topic | Textarea | ✅ Yes | `internalTopic` | 3 rows, required |

---

## 🔧 How to Modify Fields

### **To Add a New Field:**

1. **For Customer Activity (Common Fields):**
   - Edit `createCustomerActivityModal()` function (around line 27)
   - Add field in appropriate section (Basic Information or Activity Details)

2. **For Dynamic Fields (Customer Call/POC/RFx):**
   - Edit the respective function:
     - `getCustomerCallFields()` for Customer Call
     - `getPOCFields()` for POC
     - `getRFxFields()` for RFx

3. **For Internal Activity:**
   - Edit `createInternalActivityModal()` function (around line 160)

4. **Update Save Function:**
   - Edit `saveCustomerActivity()` function (around line 564)
   - Add field extraction: `document.getElementById('fieldId').value`
   - Add to activity object

### **To Remove a Field:**

1. Remove from HTML in the modal creation function
2. Remove from save function (optional - won't break if left)
3. Remove from any display/rendering functions

### **To Add a New Activity Type:**

1. Add option to `customerActivityType` dropdown
2. Add case in `showActivityFields()` function
3. Create new function like `getNewActivityFields()`
4. Add case in `saveCustomerActivity()` function

### **To Modify Dropdown Options:**

Find the `<select>` element and modify the `<option>` tags:
- **Use Case Options:** Line 89
- **Customer Type:** Line 103
- **Call Type:** Line 241
- **Products (Call):** Line 265
- **Channels:** Line 281
- **Access Type (POC):** Line 328
- **Products (POC):** Line 346
- **RFx Type:** Line 387
- **Internal Activity Type:** Line 182

---

## 💡 Suggestions for Improvement

### **1. Field Organization**
- ✅ **Current:** Good separation of Basic Info and Activity Details
- 💡 **Suggestion:** Add collapsible sections for better UX on long forms

### **2. Validation**
- ✅ **Current:** Basic HTML5 validation
- 💡 **Suggestion:** 
  - Add custom validation messages
  - Validate dates (end date after start date)
  - Validate URLs format
  - Show field-level error messages

### **3. Auto-population**
- ✅ **Current:** Date defaults to today, POC end date auto-calculated
- 💡 **Suggestion:**
  - Auto-populate Sales Rep from user profile
  - Remember last used account/project
  - Auto-suggest based on user's regions

### **4. Conditional Fields**
- ✅ **Current:** Deal Size shows/hides based on Opportunity Status
- 💡 **Suggestion:**
  - Show Location field only for certain activity types
  - Show Participants fields only for calls/meetings
  - Conditional validation (required if other field has value)

### **5. Multi-select Improvements**
- ✅ **Current:** Custom multi-select component
- 💡 **Suggestion:**
  - Add "Select All" / "Clear All" buttons
  - Show count of selected items
  - Better visual feedback

### **6. Additional Fields to Consider**

**For Customer Call:**
- Meeting Platform (Zoom, Teams, etc.)
- Recording Link
- Attendees List (structured)
- Follow-up Date
- Sentiment/Outcome (Positive, Neutral, Negative)

**For POC:**
- Success Criteria
- Key Stakeholders
- Technical Requirements
- Integration Points
- Success Metrics

**For RFx:**
- Budget Range
- Decision Timeline
- Key Decision Makers
- Evaluation Criteria
- Win Probability

**For Internal Activity:**
- Related Customer/Project (optional link)
- Attendees/Team Members
- Outcome/Results
- Follow-up Actions

### **7. Form UX Enhancements**
- Progress indicator for multi-step forms
- Save as draft functionality
- Form templates for common scenarios
- Bulk import option
- Duplicate activity option

### **8. Data Quality**
- Make Industry required (currently optional in some flows)
- Add Region field (currently only in user settings)
- Add validation for phone numbers, emails if added
- Add character limits with counters

### **9. Integration Points**
- SFDC sync (if SFDC link provided, fetch account details)
- Calendar integration (create calendar event)
- Email integration (send summary)

### **10. Mobile Responsiveness**
- Ensure all fields work well on mobile
- Consider mobile-specific layouts
- Touch-friendly multi-selects

---

## 📝 Quick Reference: File Locations

| Component | File | Function | Line Range |
|-----------|------|----------|------------|
| Customer Activity Modal | `activities.js` | `createCustomerActivityModal()` | 27-157 |
| Dynamic Fields Handler | `activities.js` | `showActivityFields()` | 218-233 |
| Customer Call Fields | `activities.js` | `getCustomerCallFields()` | 236-312 |
| POC Fields | `activities.js` | `getPOCFields()` | 315-379 |
| RFx Fields | `activities.js` | `getRFxFields()` | 382-409 |
| Internal Activity Modal | `activities.js` | `createInternalActivityModal()` | 160-215 |
| Save Customer Activity | `activities.js` | `saveCustomerActivity()` | 564-705 |
| Save Internal Activity | `activities.js` | `saveInternalActivity()` | 702-714 |

---

## 🎯 Recommended Next Steps

1. **Review current fields** - Identify what's missing for your workflow
2. **Prioritize additions** - What fields are most critical?
3. **Test form flow** - Ensure all conditional logic works
4. **Add validation** - Improve data quality
5. **Enhance UX** - Better organization and feedback

Would you like me to implement any of these suggestions or help you add/remove specific fields?


