# PAMS - Quick Reference Guide

## 🎯 Project Summary

**What we're building**: A merged application combining PAMS V1's comprehensive activity tracking with Enhanced Presales Tracker's admin functionality.

---

## ✅ Key Decisions Made

| Aspect | Decision |
|--------|----------|
| **Users** | 20 main users + 2-4 admins + analytics users (no login) |
| **Authentication** | Email/password, admin can reset |
| **Data Visibility** | All users see all activities (no isolation) |
| **Theme** | Purple (PAMS V1) |
| **Navigation** | Modern left sidebar with 3 interface options |
| **Interface Toggle** | Admin can toggle between 3 interfaces |
| **Storage** | localStorage (migrate to Railways + PostgreSQL later) |
| **Priority** | P0: View all activities, P1: User management, P2: Industry/Region |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (Single Page App)      │
│  ┌──────────┐  ┌─────────────────────┐ │
│  │   HTML   │  │   CSS (Purple)      │ │
│  └──────────┘  └─────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │   JavaScript Modules              │ │
│  │   - app.js (main)                 │ │
│  │   - auth.js (login/logout)        │ │
│  │   - admin.js (user management)     │ │
│  │   - activities.js (PAMS V1 forms) │ │
│  │   - data.js (localStorage)        │ │
│  │   - interfaces.js (toggle)         │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│      localStorage (Phase 1)             │
│  - users                                 │
│  - activities                            │
│  - accounts                              │
│  - projects                              │
│  - industries                            │
│  - regions                               │
└─────────────────────────────────────────┘
           │
           ▼ (Future: Phase 2)
┌─────────────────────────────────────────┐
│      Railways + PostgreSQL               │
│  - REST API                              │
│  - JWT Authentication                    │
│  - Database                              │
└─────────────────────────────────────────┘
```

---

## 👥 User Roles

| Role | Count | Permissions |
|------|-------|-------------|
| **Admin** | 2-4 | Full access, user management, interface toggle |
| **Presales User** | 20 | Create activities, view all activities |
| **Analytics User** | Many | Read-only, no login (future) |

---

## 📋 Feature Priority

### **P0 - Critical (Must Have)**
- ✅ View all activities (all users)
- ✅ Activity creation (Customer Call, POC, RFx, Internal)
- ✅ Authentication system
- ✅ Dashboard

### **P1 - High Priority**
- ✅ User management (Admin)
- ✅ Role-based access control
- ✅ Interface toggle (Admin)

### **P2 - Medium Priority**
- ✅ Industry management (Admin)
- ✅ Region management (Admin)
- ✅ User settings (My Regions, My Sales Reps)

### **P3 - Future**
- ⏳ File attachments
- ⏳ Email notifications
- ⏳ Calendar integration
- ⏳ Export functionality

---

## 🎨 Interface Options

### **Option 1: Modern Sidebar** (Default)
- Full sidebar with labels
- Standard layout
- Best for new users

### **Option 2: Compact Sidebar**
- Icon-only sidebar
- Hover to expand
- More screen space

### **Option 3: Dashboard-First**
- Minimized sidebar
- Large dashboard cards
- Quick actions prominent

**Toggle Location**: Admin Panel → Settings → Interface Preference

---

## 📊 Data Model (Key Fields)

### **Activity**
```javascript
{
  id, userId, userName, type, accountId, projectId,
  date, // ... all PAMS V1 fields
  createdAt, updatedAt
}
```

### **User**
```javascript
{
  id, username, email, password, roles,
  regions, salesReps, isActive
}
```

### **Account/Project**
```javascript
{
  id, name, // ... PAMS V1 fields
  createdBy, createdAt
}
```

---

## 🗓️ Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| **Week 1** | Foundation | Auth, UI structure, interface toggle |
| **Week 2** | Core Features | Activities, Dashboard, Accounts, Win/Loss |
| **Week 3** | Admin Features | User mgmt, Industry/Region mgmt |
| **Week 4** | Polish | Testing, validation, documentation |

---

## 🔄 Migration Path

### **Phase 1: localStorage (Now)**
- All data in browser localStorage
- Multi-user support with userId tracking
- Ready for backend migration

### **Phase 2: Backend (Future)**
- Export localStorage data
- Import to PostgreSQL
- Update API calls
- JWT authentication

---

## 📁 File Structure

```
pams-app/
├── index.html
├── css/
│   ├── main.css
│   ├── components.css
│   ├── interfaces.css
│   └── admin.css
├── js/
│   ├── app.js
│   ├── auth.js
│   ├── admin.js
│   ├── activities.js
│   ├── data.js
│   ├── ui.js
│   └── interfaces.js
└── assets/
```

---

## ✅ Implementation Checklist

### **Week 1**
- [ ] File structure
- [ ] Authentication
- [ ] Sidebar navigation
- [ ] Interface toggle
- [ ] PAMS V1 forms migration

### **Week 2**
- [ ] Activity CRUD
- [ ] Dashboard
- [ ] Accounts/Projects
- [ ] Win/Loss
- [ ] Reports

### **Week 3**
- [ ] Admin Panel
- [ ] User management
- [ ] Industry/Region mgmt
- [ ] User settings

### **Week 4**
- [ ] Testing
- [ ] Validation
- [ ] Documentation
- [ ] Polish

---

## 🎯 Success Criteria

1. ✅ All PAMS V1 features working
2. ✅ Authentication functional
3. ✅ Admin can manage users
4. ✅ All users see all activities
5. ✅ Interface toggle working
6. ✅ Data persists correctly
7. ✅ Ready for backend migration

---

## ❓ Open Questions

1. **Interface Toggle**: Global, per-user, or admin-only?
2. **Activity Editing**: Can users edit others' activities?
3. **Default Users**: admin/admin123, user/user123?
4. **Analytics Users**: Separate public dashboard or Phase 2?

---

**Status**: ⏳ Awaiting approval to start implementation


