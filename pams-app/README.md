# PAMS - Presales Activity Management System

## 🎉 Application Complete!

A comprehensive presales activity management system combining PAMS V1's detailed activity tracking with Enhanced Presales Tracker's admin functionality.

## 📁 File Structure

```
pams-app/
├── index.html              # Main HTML file
├── css/
│   ├── main.css           # Core styles, layout, sidebar
│   ├── components.css      # Buttons, forms, modals, cards
│   ├── interfaces.css     # Interface switching styles
│   └── admin.css          # Admin panel styles
├── js/
│   ├── data.js           # Data management (localStorage)
│   ├── auth.js           # Authentication system
│   ├── ui.js             # UI utilities
│   ├── interfaces.js     # Interface management
│   ├── activities.js     # Activity management
│   ├── admin.js          # Admin panel
│   └── app.js            # Main application
└── assets/               # Future: file uploads
```

## 🚀 Getting Started

1. **Open the application**: Simply open `index.html` in a web browser
2. **Login**: 
   - Admin: `admin` / `admin123`
   - User: `user` / `user123`
3. **Start using**: All data is stored in browser localStorage

## ✨ Features

### ✅ Authentication & User Management
- Login/logout system
- Role-based access control (Admin, Presales User, Analytics Access)
- User management (Admin only)
- Password management

### ✅ Activity Management
- **Customer Activities**:
  - Customer Call (with detailed fields)
  - POC (Proof of Concept)
  - RFx (RFP/RFI/RFQ)
- **Internal Activities**:
  - Enablement, Video Creation, Webinar, Events, etc.
- Users can only edit/delete their own activities
- All users see all activities (no data isolation)

### ✅ Dashboard
- Statistics overview
- Recent activities
- Quick actions

### ✅ Admin Panel
- User management (Add, Edit, Delete)
- Industry management
- Region management
- View all activities with filters

### ✅ Settings
- My Regions (user-specific)
- My Sales Reps (user-specific)
- Interface Preference (Admin only, global)

### ✅ Reports
- Monthly activity reports
- Activity breakdown by type
- Statistics and analytics

### ✅ Win/Loss Tracking
- Project status management
- Win/Loss reasons
- MRR tracking
- Competitor analysis

### ✅ Interface Options (Admin Toggleable)
1. **Modern Sidebar** (Default) - Full sidebar with labels
2. **Compact Sidebar** - Icon-only sidebar
3. **Dashboard-First** - Minimized sidebar, large dashboard

## 🎨 Design

- **Theme**: Purple (PAMS V1 color scheme)
- **Navigation**: Modern left sidebar
- **Responsive**: Works on desktop and mobile
- **UI**: Clean, modern, professional

## 📊 Data Storage

- **Current**: localStorage (browser-based)
- **Future**: Ready for migration to Railways + PostgreSQL

## 🔐 Security Notes

- Passwords are stored in plain text (for demo purposes)
- In production, implement password hashing
- All data is client-side only (localStorage)

## 🛠️ Technology

- **Frontend**: Pure HTML, CSS, JavaScript (no frameworks)
- **Storage**: localStorage
- **Architecture**: Modular JavaScript (ES6)

## 📝 Default Data

On first load, the application initializes:
- 2 default users (admin, user)
- Default industries (BFSI, IT & Software, etc.)
- Default regions (India South, India North, etc.)

## 🚧 Future Enhancements

- Backend API integration
- Database migration
- File attachments
- Email notifications
- Calendar integration
- Advanced analytics
- Export functionality

## 📖 Usage

### For Regular Users:
1. Login with your credentials
2. Log activities (Customer or Internal)
3. View dashboard and reports
4. Manage your settings (regions, sales reps)

### For Admins:
1. Login with admin credentials
2. Access Admin Panel
3. Manage users, industries, regions
4. Change interface preference (global)
5. View all activities with filters

## 🐛 Known Limitations

- Edit activity functionality is partially implemented
- Win/Loss modal needs full implementation
- Reports can be enhanced based on PDF requirements
- No data export/import yet

## 📄 License

Internal use only.

---

**Built with ❤️ for the Presales Team**

