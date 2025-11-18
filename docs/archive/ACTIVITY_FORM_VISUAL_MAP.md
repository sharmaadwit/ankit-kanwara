# Activity Form Visual Map

## 🗺️ Form Structure Overview

```
CUSTOMER ACTIVITY FORM
├── BASIC INFORMATION (Always Visible)
│   ├── Account Name* [Search/Create]
│   ├── Project Name [Search/Create] (disabled until account selected)
│   ├── Sales Rep Name* [Text]
│   ├── Industry* [Dropdown]
│   ├── SFDC Link [URL]
│   ├── Primary Use Case [Multi-select: Marketing, Commerce, Support, Sales, Service, Other]
│   ├── Customer Type [Dropdown: New, Existing, Prospect]
│   ├── Location [Text]
│   ├── Number of Participants [Number]
│   └── Participants' Roles [Text]
│
├── ACTIVITY DETAILS (Always Visible)
│   ├── Date* [Date] (defaults to today)
│   └── Activity Type* [Dropdown] → TRIGGERS DYNAMIC FIELDS
│       ├── Customer Call
│       ├── POC
│       └── RFx
│
└── DYNAMIC FIELDS (Shown based on Activity Type)
    │
    ├── IF "Customer Call" Selected:
    │   ├── Call Type* [Dropdown: Initial, Discovery, Deep Dive, Follow-up, Deal Review, Q&A]
    │   ├── Duration [Number: minutes]
    │   ├── Products Discussed [Multi-select: AI Agents, Campaign Manager, Agent Assist, Journey Builder, Personalize, Voice AI, Other]
    │   ├── Channels [Multi-select: WhatsApp, Web, Voice, RCS, Instagram, Mobile SDK, Other]
    │   ├── Opportunity Status [Dropdown: No, Yes]
    │   │   └── IF "Yes" → Show: Potential Deal Size [Number]
    │   ├── Competitors Discussed [Text]
    │   └── Objective / Next Steps [Textarea]
    │
    ├── IF "POC" Selected:
    │   ├── Account Type* [Dropdown: New, Existing]
    │   ├── Access Type* [Dropdown: Sandbox, Custom POC - Structured Journey, Custom POC - Agentic, Custom POC - Commerce, Other]
    │   ├── Products Interested [Multi-select: AI Agents, Campaign Manager, Agent Assist, Journey Builder, Other]
    │   ├── Start Date* [Date] (auto-sets End Date to +7 days)
    │   ├── End Date* [Date] (auto-calculated)
    │   ├── Use Case Description* [Textarea]
    │   ├── Demo Environment [Text]
    │   └── Bot Trigger URL [URL]
    │
    └── IF "RFx" Selected:
        ├── RFx Type* [Dropdown: RFP, RFI, RFQ, Other]
        ├── Submission Deadline* [Date]
        ├── Google Folder Link [URL]
        └── Additional Notes [Textarea]

─────────────────────────────────────────────────────────────

INTERNAL ACTIVITY FORM
├── Date* [Date]
├── Activity Type* [Dropdown: Enablement, Video Creation, Webinar, Event/Booth Hosting, Product Feedback, Content Creation, Training, Documentation, Internal Meeting, Other]
├── Time Spent [Number: hours, 0.5 step]
└── Session Name / Topic* [Textarea]
```

* = Required field

---

## 📊 Field Count Summary

| Section | Total Fields | Required Fields | Optional Fields |
|---------|--------------|-----------------|-----------------|
| **Customer Activity - Basic Info** | 10 | 3 | 7 |
| **Customer Activity - Activity Details** | 2 | 2 | 0 |
| **Customer Call Dynamic Fields** | 8 | 1 | 7 |
| **POC Dynamic Fields** | 8 | 4 | 4 |
| **RFx Dynamic Fields** | 4 | 2 | 2 |
| **Internal Activity** | 4 | 2 | 2 |
| **TOTAL** | **36 fields** | **14 required** | **22 optional** |

---

## 🔄 Conditional Logic Flow

```
Activity Type Selection
    │
    ├─→ "Customer Call"
    │   └─→ Opportunity Status = "Yes"?
    │       └─→ Show: Deal Size field
    │
    ├─→ "POC"
    │   └─→ Start Date changed?
    │       └─→ Auto-set End Date = Start Date + 7 days
    │
    └─→ "RFx"
        └─→ (No conditional logic currently)
```

---

## 🎨 Multi-Select Options Reference

### **Primary Use Case** (Customer Activity)
- Marketing
- Commerce
- Support
- Sales
- Service
- Other

### **Products Discussed** (Customer Call)
- AI Agents
- Campaign Manager
- Agent Assist
- Journey Builder
- Personalize
- Voice AI
- Other

### **Channels** (Customer Call)
- WhatsApp
- Web
- Voice
- RCS
- Instagram
- Mobile SDK
- Other

### **Products Interested** (POC)
- AI Agents
- Campaign Manager
- Agent Assist
- Journey Builder
- Other

---

## 🔑 Key Field IDs Reference

### **Common Fields**
- `accountSearch` - Account name input
- `selectedAccountId` - Hidden account ID
- `projectSearch` - Project name input
- `selectedProjectId` - Hidden project ID
- `salesRep` - Sales rep name
- `industry` - Industry dropdown
- `sfdcLink` - SFDC URL
- `customerType` - Customer type
- `location` - Location
- `participantCount` - Number of participants
- `participantRoles` - Participant roles
- `activityDate` - Activity date
- `customerActivityType` - Activity type selector

### **Customer Call Fields**
- `callType` - Call type
- `callDuration` - Duration
- `productsSelected` - Products (multi-select)
- `channelsSelected` - Channels (multi-select)
- `opportunityStatus` - Opportunity status
- `dealSize` - Deal size (conditional)
- `competitors` - Competitors
- `objectiveNextSteps` - Next steps

### **POC Fields**
- `pocAccountType` - Account type
- `accessType` - Access type
- `pocProductsSelected` - Products (multi-select)
- `pocStartDate` - Start date
- `pocEndDate` - End date
- `useCaseDescription` - Use case
- `demoEnvironment` - Demo environment
- `botTriggerUrl` - Bot URL

### **RFx Fields**
- `rfxType` - RFx type
- `submissionDeadline` - Deadline
- `googleFolderLink` - Google folder
- `rfxNotes` - Notes

### **Internal Activity Fields**
- `internalDate` - Date
- `internalActivityType` - Activity type
- `internalTimeSpent` - Time spent
- `internalTopic` - Topic/description

---

## 💻 Code Modification Examples

### **Example 1: Add a New Field to Customer Call**

```javascript
// In getCustomerCallFields() function, add:
<div class="form-group">
    <label class="form-label">Meeting Platform</label>
    <select class="form-control" id="meetingPlatform">
        <option value="">Select Platform</option>
        <option value="Zoom">Zoom</option>
        <option value="Teams">Microsoft Teams</option>
        <option value="Google Meet">Google Meet</option>
        <option value="Other">Other</option>
    </select>
</div>

// In saveCustomerActivity() function, add to customerCall details:
if (activityType === 'customerCall') {
    activity.details = {
        // ... existing fields ...
        meetingPlatform: document.getElementById('meetingPlatform')?.value || ''
    };
}
```

### **Example 2: Add a New Activity Type**

```javascript
// 1. Add to dropdown in createCustomerActivityModal():
<option value="demo">Product Demo</option>

// 2. Add case in showActivityFields():
else if (type === 'demo') {
    html = this.getDemoFields();
}

// 3. Create new function:
getDemoFields() {
    return `
        <div class="form-group">
            <label class="form-label required">Demo Type</label>
            <select class="form-control" id="demoType" required>
                <option value="">Select Type</option>
                <option value="Live">Live Demo</option>
                <option value="Recorded">Recorded Demo</option>
            </select>
        </div>
        <!-- Add more fields as needed -->
    `;
}

// 4. Add case in saveCustomerActivity():
else if (activityType === 'demo') {
    activity.details = {
        demoType: document.getElementById('demoType').value,
        // ... other demo fields ...
    };
}
```

### **Example 3: Modify Dropdown Options**

```javascript
// To change Call Type options, edit getCustomerCallFields():
<select class="form-control" id="callType" required>
    <option value="">Select Type</option>
    <option value="Initial Call">Initial Call</option>
    <option value="Discovery Call">Discovery Call</option>
    <option value="Deep Dive">Deep Dive</option>
    <option value="Follow-up">Follow-up</option>
    <option value="Deal Review">Deal Review</option>
    <option value="Q&A">Q&A</option>
    <option value="Technical Discussion">Technical Discussion</option> <!-- NEW -->
    <option value="Pricing Discussion">Pricing Discussion</option> <!-- NEW -->
</select>
```

### **Example 4: Add Conditional Field**

```javascript
// Add field that shows only for certain activity types
// In showActivityFields(), after setting html:
if (type === 'customerCall' || type === 'poc') {
    html += `
        <div class="form-group">
            <label class="form-label">Meeting Recording Link</label>
            <input type="url" class="form-control" id="recordingLink" placeholder="https://...">
        </div>
    `;
}
```

---

## 📍 Where to Find Everything

| What You Want to Change | File | Function | Approx. Line |
|-------------------------|------|----------|-------------|
| Add common field to customer form | `activities.js` | `createCustomerActivityModal()` | 27-157 |
| Modify Customer Call fields | `activities.js` | `getCustomerCallFields()` | 236-312 |
| Modify POC fields | `activities.js` | `getPOCFields()` | 315-379 |
| Modify RFx fields | `activities.js` | `getRFxFields()` | 382-409 |
| Add new activity type | `activities.js` | `showActivityFields()` + new function | 218-233 |
| Modify Internal Activity | `activities.js` | `createInternalActivityModal()` | 160-215 |
| Change how data is saved | `activities.js` | `saveCustomerActivity()` | 564-705 |
| Change validation | `activities.js` | `saveCustomerActivity()` | 564-705 |

---

This visual map should help you quickly locate and modify any part of the activity forms!


