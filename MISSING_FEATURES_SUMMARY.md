# Missing Features Summary

## Overview
This document lists all features that were requested but have not been implemented yet.

---

## 🔴 CRITICAL MISSING FEATURES

### 1. **Account & Project Selection UI Change** ❌ NOT IMPLEMENTED
**Request**: Change Account and Project selection from search/type interface to a **dropdown with all existing items + "Add New" button**

**Current State**: 
- Account selection: Uses `searchAccounts()` with type-to-search
- Project selection: Uses `searchProjects()` with type-to-search

**Required Changes**:
- Account dropdown should show ALL accounts immediately (no typing needed)
- "Add New Account" button/option should show form fields when clicked
- Project dropdown should show ALL projects for selected account immediately
- "Add New Project" button/option should show form fields when clicked

**Location**: `pams-app/js/activities.js` - `createActivityModal()` function

---

### 2. **Accounts Section - Merge Functionality** ❌ NOT IMPLEMENTED
**Request**: Add "Merge" functionality to Accounts section

**Requirements**:
- Merge two accounts into one
- Combine all projects from both accounts
- Combine all activities from both accounts
- Handle conflicts (different sales reps, industries):
  - Inform user about conflicts
  - Allow user to select which values to keep
  - One account can only have one sales rep going forward
  - Old activities can retain old sales rep
  - Ask user what to do with each conflicting information

**Current State**: 
- `loadAccountsView()` in `pams-app/js/app.js` only displays accounts
- No merge functionality exists

**Location**: `pams-app/js/app.js` - `loadAccountsView()` function

---

### 3. **Accounts Section - Edit Functionality** ❌ NOT IMPLEMENTED
**Request**: Add "Edit" functionality to Accounts section

**Requirements**:
- Allow editing account name, industry, sales rep
- Update all related projects and activities if needed
- Handle validation

**Current State**: 
- No edit functionality exists
- Accounts are displayed as read-only cards

**Location**: `pams-app/js/app.js` - `loadAccountsView()` function

---

### 4. **Accounts Section - Delete Functionality** ❌ NOT IMPLEMENTED
**Request**: Add "Delete" functionality to Accounts section

**Requirements**:
- Inform user that associated activities and projects will also be deleted
- If there are conflicts (e.g., different sales persons), inform the user and allow them to fix it
- Allow reassigning activities to another account before deletion
- Show confirmation dialog with details of what will be deleted

**Current State**: 
- No delete functionality exists

**Location**: `pams-app/js/app.js` - `loadAccountsView()` function

---

## 🟡 PARTIALLY IMPLEMENTED / NEEDS FIXING

### 5. **Account Selection Not Working** ⚠️ NEEDS VERIFICATION
**Request**: Fix account selection in activity form

**Current State**: 
- Code exists for `selectAccount()` function
- May be related to the dropdown interface change (item #1)
- Needs testing to verify if it's actually broken

**Location**: `pams-app/js/activities.js` - `selectAccount()` function

---

### 6. **Form Testing** ⚠️ NOT DONE
**Request**: Conduct thorough testing of all form branches

**Required Testing**:
- Internal activities: All activity types (Enablement, Video Creation, Webinar, etc.)
- External activities: Customer Call, SOW, POC, RFx, Pricing
- Conditional fields based on activity type
- Validation for all required fields
- Save functionality for all branches
- "Other" text boxes for all multi-selects
- Project pre-population when selecting existing project

**Current State**: 
- Code exists but comprehensive testing not done
- Some bugs may exist that haven't been discovered

---

## ✅ COMPLETED FEATURES (For Reference)

1. ✅ Channels moved to Project section
2. ✅ Sidebar fixed position
3. ✅ Project Name moved to Project Information section
4. ✅ Project pre-population when selecting existing project
5. ✅ Primary Use Case "Other" option fixed
6. ✅ "Add New Sales Rep" removed from activity form
7. ✅ Internal activity save error fixed
8. ✅ Sales Rep management (Admin-only)

---

## 📋 IMPLEMENTATION PRIORITY

### Priority 1 (P0 - Critical)
1. **Account & Project Selection UI Change** - Blocks user workflow
2. **Account Selection Fix** - Blocks activity logging

### Priority 2 (P1 - High)
3. **Accounts Section - Delete Functionality** - Requested feature
4. **Accounts Section - Edit Functionality** - Requested feature

### Priority 3 (P2 - Medium)
5. **Accounts Section - Merge Functionality** - Complex but requested
6. **Form Testing** - Quality assurance

---

## 🔧 FILES THAT NEED MODIFICATION

1. **`pams-app/js/activities.js`**
   - Change `searchAccounts()` to show dropdown immediately
   - Change `searchProjects()` to show dropdown immediately
   - Add "Add New" button handlers
   - Fix account selection if broken

2. **`pams-app/js/app.js`**
   - Add `mergeAccount()` function
   - Add `editAccount()` function
   - Add `deleteAccount()` function
   - Update `loadAccountsView()` to include Merge/Edit/Delete buttons
   - Add conflict resolution UI for merge/delete

3. **`pams-app/js/data.js`**
   - Add `mergeAccounts()` data function
   - Add `updateAccount()` data function
   - Add `deleteAccount()` data function with activity/project cleanup

4. **`pams-app/index.html`**
   - May need modal HTML for merge/edit/delete operations

---

## 📝 NOTES

- The Accounts section currently only displays accounts in a read-only format
- No action buttons (Merge/Edit/Delete) exist in the UI
- Account/Project selection still uses search interface instead of dropdown
- Merge functionality is complex and requires conflict resolution UI
- Delete functionality needs careful handling of cascading deletes


