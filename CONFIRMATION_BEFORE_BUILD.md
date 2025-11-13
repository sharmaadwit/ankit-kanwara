# Confirmation - Understanding of Requirements

## ✅ MY UNDERSTANDING - Please Confirm

### 1. **Products at Project Level ONLY** 🎯

**Current State:**
- Products Discussed in Customer Call activity
- Products Interested in POC Sandbox activity
- Products Interested in Project section (newly added)

**Your Requirement:**
- **REMOVE** Products from:
  - Customer Call activity (Products Discussed field)
  - POC activity (Products Interested field)
- **KEEP ONLY** Products Interested at Project level
- **Rationale:** We don't need to track which activity discussed which products. We only care about what products the project is interested in overall.

**Confirmation:** ✅ Products ONLY at project level, remove from all activities?

---

### 2. **Internal Activities Display Format** 📋

**Current:** Shows various details (date, user, etc.)

**Your Requirement:**
- Display format: **"Internal - [Activity Name]"**
- That's it - simplified display

**Confirmation:** ✅ Just "Internal - Activity Name" format?

---

### 3. **Description Field for Internal Activity** 📝

**Current:** Description field missing for internal activities

**Your Requirement:**
- Add description/text field back to Internal Activity form
- Users should be able to enter description for internal activities

**Confirmation:** ✅ Add description textarea to Internal Activity form?

---

### 4. **Admin UI Layout Toggle** ⚙️

**Current:** Interface preference toggle removed from Admin view

**Your Requirement:**
- Add back the Interface Preference (Global) section in Admin
- Allow admin to toggle between interface styles for all users

**Confirmation:** ✅ Restore Interface Preference toggle in Admin & Settings?

---

### 5. **Remove from Admin** 🗑️

**Your Requirement:**
- Remove Industry & Region Management from Admin (already removed from UI, but verify functions are cleaned up)
- Remove All Activities Management from Admin (already moved to Reports, but verify it's completely removed from Admin)

**Confirmation:** ✅ Clean up any remaining references to these in Admin?

---

### 6. **POC Sandbox Access View** 🔐

**Your Requirement:**
- New section in Admin: "POC Sandbox Access Management"
- **Tabular format** showing POC Sandbox requests
- **Fields:**
  - POC Environment Name (text field - editable)
  - Assigned/Unassigned status (default: Unassigned)
  - Other relevant POC details (Account, Project, Start Date, End Date, etc.)
- **Filters:**
  - Filter by Assigned/Unassigned status
  - Filter by Account/Project
  - Filter by Date range
  - Other useful filters

**Questions:**
- Should this pull from activities where `activityType === 'poc'` and `accessType === 'Sandbox'`?
- Should admin be able to edit the POC Environment Name?
- Should admin be able to change Assigned/Unassigned status?
- What happens when admin assigns a POC? (just status change, or more?)

**Confirmation:** ✅ Create new POC Sandbox Access Management view in Admin with table, filters, and Assigned/Unassigned field?

---

## 📋 PRIORITY ORDER

### P0: Error Fixing (First)
1. Add Project Products HTML field
2. Add `getProjectProductsWithOther()` function
3. Update project save to include productsInterested
4. Fix `selectAccount()` sales rep matching
5. Add Industry/Region modal functions
6. Reset `selectedProjectProducts` in reset function

### P1: Your New Requirements (After P0)
1. Remove Products from Customer Call and POC activities
2. Update Internal Activity display format
3. Add Description field to Internal Activity
4. Restore Interface Preference toggle in Admin
5. Clean up Industry/Region and Activities Management from Admin
6. Create POC Sandbox Access Management view

---

## ❓ QUESTIONS FOR CLARIFICATION

1. **POC Sandbox Access View:**
   - Should "Assigned/Unassigned" be a dropdown/select field that admin can change?
   - Should "POC Environment Name" be editable in the table, or in a separate edit modal?
   - What columns should the table show? (Account, Project, Environment Name, Status, Start Date, End Date, User?)

2. **Products Removal:**
   - Should I remove `selectedProducts` array completely, or keep it for other uses?
   - Should I remove Products Discussed from Customer Call details when saving?

3. **Internal Activity Description:**
   - Should description be required or optional?
   - Where should it appear in the form? (After Topic field?)

4. **Interface Preference:**
   - Should this be exactly as it was before, or any changes needed?

---

## ✅ READY TO PROCEED?

Once you confirm:
1. ✅ All understanding is correct
2. ✅ Answer the clarification questions
3. ✅ Give permission to start

I will:
1. **First:** Fix all P0 errors
2. **Then:** Implement your new requirements
3. **Finally:** Test and verify everything works

---

**Please confirm and answer questions above!** 🚀


