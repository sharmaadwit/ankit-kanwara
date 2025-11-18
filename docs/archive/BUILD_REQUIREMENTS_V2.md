# Build Requirements V2 - Review & Confirmation

## 📋 My Understanding - Please Confirm

### **1. SALES REP SELECTION FIX**

**Current Issue:** Sales rep dropdown doesn't work - can't select names.

**New Implementation:**
- Simple dropdown (select element) showing all active sales reps from admin list
- Format: "Name (Region)" or just "Name"
- Option at bottom: "--- Add New Sales Rep ---"
- When "Add New" selected, show fields: Name, Email, Region
- All sales reps have: Name, Email, Region (required fields)
- Email is PRIMARY KEY (unique identifier)

**Question:** Should the dropdown show "Name (Region)" or just "Name"? If multiple sales reps have same name, how to differentiate?

**Suggestion:** Show "Name - Email" in dropdown for uniqueness, or "Name (Region)" if names can be unique per region.

---

### **2. MOVE PRODUCTS INTERESTED TO PROJECT LEVEL**

**Current:** Products Interested is in POC activity (Sandbox section)

**New:** 
- Move "Products Interested" to Project section
- Available when creating/editing projects
- Multi-select with same product options
- Applies to all activities under that project

**Question:** Should this be:
- A) Required field in Project section?
- B) Optional field in Project section?
- C) Only shown for External activities (not Internal)?

---

### **3. MOVE ALL ACTIVITIES MANAGEMENT TO REPORTS**

**Current:** "All Activities Management" is in Admin view

**New:**
- Move to Reports view
- Add as a third tab: "Activity List | Reports & Charts | Activity Management"
- OR: Keep as part of "Activity List" tab with admin filters

**Question:** Should it be:
- A) Third tab in Reports?
- B) Enhanced "Activity List" tab with admin filters (user filter, region filter, etc.)?

---

### **4. ACTIVITY PAGE LAYOUT CHANGE**

**Current:** Activities grouped by month with activity details

**New Layout:**
```
┌─────────────────────────────────────────┐
│ Account Name → Project Name             │
│ Activity Type (Badge)                   │
│ Date • User • Details                    │
└─────────────────────────────────────────┘
```

**Format:** Rectangle card showing:
- Top line: Account Name → Project Name
- Activity Type with badge (Internal/Customer)
- Bottom: Date • User Name • Activity details summary

**Question:** Should this be the same for both Activities view and Reports > Activity List tab?

---

### **5. USER TRACKING (Already Implemented)**

**Current:** Activities already have `userId` and `userName` fields

**Verification Needed:**
- Ensure `userId` and `userName` are always captured
- Reports should show user-wise breakdown
- Person-wise report in Reports section

**Question:** Do you want a dedicated "User Performance" report, or just ensure user filtering works in existing reports?

---

### **6. REMOVE INDUSTRY & REGION MANAGEMENT FROM ADMIN**

**Current:** Admin can add/edit/delete Industries and Regions

**New:**
- Remove Industry & Region Management section from Admin
- Industries: Dropdown in form with ability to type new (auto-adds to list)
- Regions: Dropdown in form with ability to type new (auto-adds to list)
- No separate management needed - just use in forms

**Question:** Should these be:
- A) Simple dropdowns with "Other" option that allows typing?
- B) Searchable dropdowns that auto-create if not found?
- C) Dropdowns with "+ Add New" option that shows input field?

---

### **7. ADMIN SECTIONS RESTRUCTURE**

**Current:** User Management, Sales Rep Management, Industry/Region Management, etc.

**New Structure:**
- **System Users** section:
  - Existing user management (username, email, password, roles, etc.)
  - All current user management features
  
- **Sales Users** section:
  - Name (required)
  - Email (required, PRIMARY KEY - unique)
  - Region (required)
  - Active/Inactive status
  - Add/Edit/Delete functionality
  
**Auto-Add Logic:**
- When system user enters new sales user name in activity form:
  - If email provided → Auto-add to Sales Users list
  - If no email → Still save in activity, but show in "Incomplete Sales Users" for admin to complete

**Question:** 
- Should we require email when adding new sales user in activity form?
- Or allow name-only entry, then admin completes email later?

---

### **8. FIX PRIMARY USE CASE "OTHER" OPTION**

**Current Issue:** "Other" option in Primary Use Case doesn't show text field

**Fix:**
- Ensure "Other" checkbox triggers text input display
- Text input should appear when "Other" is selected
- Handle saving "Other: [text]" format

---

## 🎯 SUMMARY OF CHANGES

### **Navigation:**
- Reports: Activity List | Reports & Charts | Activity Management (or enhanced Activity List)

### **Sales Rep:**
- Simple dropdown with admin-maintained list
- "Add New" option with Name, Email, Region
- Email as PRIMARY KEY
- Auto-add when system user creates new (if email provided)

### **Products:**
- Move from POC activity to Project level
- Multi-select in Project section

### **Activity Layout:**
- Card format: Account → Project | Activity Type | Date • User • Details

### **Admin:**
- System Users section (existing)
- Sales Users section (new, email as primary key)
- Remove Industry & Region Management

### **Forms:**
- Industry: Dropdown with add-new capability
- Region: Dropdown with add-new capability
- Fix Use Case "Other" option

---

## ❓ QUESTIONS FOR CLARIFICATION

1. **Q1:** Sales Rep dropdown format - "Name (Region)" or "Name - Email"?

2. **Q2:** Products Interested in Project - Required or Optional? Only for External?

3. **Q3:** Activity Management in Reports - Third tab or enhanced Activity List tab?

4. **Q4:** Activity card layout - Same for Activities view and Reports tab?

5. **Q5:** User tracking - Need dedicated "User Performance" report or just filtering?

6. **Q6:** Industry/Region in forms - Dropdown with "Other", searchable, or "+ Add New" button?

7. **Q7:** Sales User auto-add - Require email in activity form, or allow name-only?

8. **Q8:** When system user adds new sales user without email, should it:
   - A) Still save in activity, show in "Incomplete" list for admin
   - B) Require email before saving activity
   - C) Allow saving, but prompt admin to complete later

---

## 💡 RECOMMENDATIONS

### **1. Sales Rep Dropdown:**
- Show "Name - Email" for uniqueness
- Or show "Name (Region)" if names are unique per region
- **Recommendation:** "Name - Email" is safest

### **2. Products in Project:**
- Make it Optional (not required)
- Only show for External activities
- **Recommendation:** Optional field, shown for all projects

### **3. Activity Management:**
- Enhanced Activity List tab with filters
- **Recommendation:** Better UX than separate tab

### **4. Industry/Region:**
- Searchable dropdown with auto-create
- **Recommendation:** Best user experience

### **5. Sales User Auto-Add:**
- Require email when adding new
- **Recommendation:** Ensures data quality

---

**Please review and answer the questions above so I can implement exactly what you need!** 🚀


