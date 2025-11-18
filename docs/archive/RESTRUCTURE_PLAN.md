# Navigation & Sales Rep Restructure Plan

## 📋 My Understanding - Please Confirm

### **1. NAVIGATION RESTRUCTURE**

**Current Structure:**
- Dashboard
- Activities (separate view)
- Win/Loss
- Reports
- Accounts
- Settings (user settings)
- Admin (admin-only)

**New Structure:**
- Dashboard
- Win/Loss
- Reports (includes Activity Management)
- Accounts
- Admin & Settings (merged, admin-only section)

**Changes:**
- ✅ Merge Admin + Settings into single "Admin & Settings" section
- ✅ Move Activity Management (viewing, filtering, editing activities) to Reports section
- ✅ Reports section will have:
  - Activity Management (list, filter, edit, delete activities)
  - Reports/Charts (existing reports functionality)
- ✅ Remove standalone "Activities" view from sidebar
- ✅ Remove standalone "Settings" view from sidebar

---

### **2. SALES REP MANAGEMENT RESTRUCTURE**

**Current Implementation:**
- Sales Reps stored as simple strings in `globalSalesReps` array
- Searchable dropdown in activity form
- Users can add new sales reps directly

**New Implementation:**

#### **Sales Rep Data Model:**
```javascript
{
  id: "unique-id",
  name: "John Doe",
  email: "john.doe@company.com",
  regions: ["India South", "India North"], // Multi-select regions
  isActive: true,
  createdAt: "2024-01-01",
  createdBy: "admin-id"
}
```

#### **Admin Functions:**
- ✅ Add Sales Rep (with name, email, region mapping)
- ✅ Edit Sales Rep (update name, email, regions)
- ✅ Delete Sales Rep
- ✅ View pending sales rep requests (from users)
- ✅ Approve/Reject sales rep requests

#### **User Functions:**
- ✅ Dropdown (not searchable) showing only active sales reps
- ✅ Option to enter new sales rep name (if not in list)
- ✅ When user enters new name, create a "pending request"
- ✅ Pending requests visible to admin for approval

#### **Pending Request Model:**
```javascript
{
  id: "unique-id",
  requestedName: "New Sales Rep Name",
  requestedBy: "user-id",
  requestedByUsername: "john.doe",
  status: "pending", // pending, approved, rejected
  createdAt: "2024-01-01",
  approvedBy: null,
  approvedAt: null
}
```

---

### **3. ACTIVITY FORM - SALES REP FIELD**

**Current:**
- Searchable input with dropdown
- Can type to create new

**New:**
- Simple dropdown (select element)
- Shows: "Select Sales Rep..." + list of active sales reps
- Option at bottom: "--- Add New Sales Rep ---"
- When "Add New Sales Rep" selected, show text input
- When text entered, create pending request

---

### **4. FIX "OTHER" TEXT BOX ISSUE**

**Problem:** When "Other" is selected in Products/Use Cases, text box doesn't appear.

**Root Cause:** Need to check the `toggleOption` function and ensure it properly handles "Other" selection.

**Fix:**
- Ensure `toggleOption` function correctly shows/hides "Other" text fields
- Check that event handlers are properly attached
- Verify IDs match between HTML and JavaScript

---

## 🎯 RECOMMENDATIONS

### **1. Navigation Structure**
**Recommendation:** Keep the structure simple. Consider:
- **Dashboard** - Overview
- **Activities** - Quick access to log/view activities (keep this!)
- **Win/Loss** - Project tracking
- **Reports** - Analytics and detailed reports
- **Accounts** - Account/Project management
- **Admin** - Admin-only settings

**Alternative:** If you want to move activity management to Reports, consider:
- Rename "Activities" to "Log Activity" (just the button, no list view)
- Move activity list/filter/edit to Reports as a tab/section

**Question:** Do you want to completely remove the Activities view, or just move the management (list/edit/delete) to Reports while keeping a quick "Log Activity" access?

---

### **2. Sales Rep Approval Workflow**
**Recommendation:** Implement a notification system:
- When user requests new sales rep, show notification to admin
- Admin sees badge/indicator in Admin section showing pending requests
- Admin can approve (adds to global list) or reject (removes request)
- User gets notification when approved/rejected

**Alternative (Simpler):**
- User enters new sales rep name
- It's saved as-is in the activity
- Admin can later see all unique sales rep names used in activities
- Admin can "promote" frequently used names to global list

**Question:** Which workflow do you prefer? Approval-based or promotion-based?

---

### **3. Sales Rep Region Mapping**
**Recommendation:** 
- Allow multiple regions per sales rep (multi-select)
- When filtering activities by region, include activities with sales reps mapped to that region
- Useful for reporting and analytics

**Question:** Should sales reps be restricted to specific regions, or can they work across all regions?

---

### **4. Settings Merge**
**Recommendation:** 
- Keep user-specific settings (regions, sales reps) in merged Admin section
- Only visible to admins
- Regular users don't need settings (they're managed by admin)

**Question:** Should regular users have any settings, or is everything managed by admin?

---

## ❓ QUESTIONS FOR CLARIFICATION

1. **Q1:** For Activities view - completely remove from sidebar, or keep as "Log Activity" quick access?

2. **Q2:** Sales Rep approval workflow - approval-based (user requests, admin approves) or promotion-based (admin promotes from activity data)?

3. **Q3:** Should sales reps be restricted to specific regions, or can they work across all regions?

4. **Q4:** Should regular users have any settings section, or is everything managed by admin?

5. **Q5:** In Reports section, how should Activity Management be organized?
   - Tab 1: Activity List/Management
   - Tab 2: Reports/Charts
   - OR: Side-by-side sections?

6. **Q6:** For the "Other" text box fix - should I also check Products, Channels, Use Cases, and POC Products?

---

## 📊 SUMMARY OF UNDERSTANDING

### **Navigation:**
- Merge Admin + Settings → "Admin & Settings" (admin-only)
- Move Activity Management to Reports section
- Remove standalone Activities and Settings views

### **Sales Reps:**
- Admin-only management (add/edit/delete with email + region mapping)
- Simple dropdown for users (not searchable)
- Users can request new sales reps (pending approval)
- Pending requests visible to admin

### **Fixes:**
- Fix "Other" text box not appearing when selected

---

**Please review and answer the questions above so I can implement exactly what you need!** 🚀


