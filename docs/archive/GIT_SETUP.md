# Git Repository Setup Instructions

## Prerequisites
1. Install Git if not already installed: https://git-scm.com/download/win
2. Create a GitHub account if you don't have one: https://github.com

## Steps to Initialize Git Repository

### 1. Open Terminal/Command Prompt in the project directory
Navigate to: `C:\Users\ankit.kanwara\Desktop\Project PAT`

### 2. Initialize Git Repository
```bash
git init
```

### 3. Add All Files
```bash
git add .
```

### 4. Create Initial Commit
```bash
git commit -m "Initial commit: PAMS - Presales Activity Management System"
```

### 5. Create Repository on GitHub
1. Go to https://github.com/new
2. Repository name: `Presales-Activity-Monitoring-System-PAMS-`
3. Description: "Presales Activity Management System - Track customer activities, internal activities, manage users, and generate reports"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 6. Connect Local Repository to GitHub
After creating the repository on GitHub, you'll see instructions. Run these commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/Presales-Activity-Monitoring-System-PAMS-.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Alternative: Using GitHub Desktop
If you prefer a GUI:
1. Download GitHub Desktop: https://desktop.github.com/
2. Open GitHub Desktop
3. File → Add Local Repository
4. Select the project folder
5. Commit the changes
6. Publish to GitHub

## Project Structure
```
Project PAT/
├── pams-app/              # Main application
│   ├── index.html         # Entry point
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript modules
│   └── README.md          # Application documentation
├── PAMS V1.html           # Original version (reference)
├── enhanced_presales_tracker.html  # Reference file
├── .gitignore            # Git ignore rules
└── GIT_SETUP.md          # This file
```

## Files Included
- ✅ Complete PAMS application with modular structure
- ✅ Authentication system
- ✅ Activity tracking (Customer & Internal)
- ✅ Admin panel
- ✅ User settings
- ✅ Reports (basic structure)
- ✅ Win/Loss tracking
- ✅ .gitignore file

## Next Steps After Setup
1. Push your code to GitHub
2. Set up branch protection (optional)
3. Add collaborators (if needed)
4. Configure GitHub Pages for hosting (optional)


