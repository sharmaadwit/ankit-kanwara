# Push Code to GitHub Repository

Your repository is ready at: **https://github.com/ankit-kanwara-gupshup/Presales-Activity-Monitoring-System-PAMS-**

## Step 1: Install Git

Download and install Git for Windows: https://git-scm.com/download/win

After installation, **restart your terminal/PowerShell**.

## Step 2: Verify Git Installation

Open PowerShell and run:
```powershell
git --version
```

You should see something like: `git version 2.x.x`

## Step 3: Navigate to Project Directory

```powershell
cd "C:\Users\ankit.kanwara\Desktop\Project PAT"
```

## Step 4: Initialize Git Repository

```powershell
git init
```

## Step 5: Add Remote Repository

```powershell
git remote add origin https://github.com/ankit-kanwara-gupshup/Presales-Activity-Monitoring-System-PAMS-.git
```

## Step 6: Add All Files

```powershell
git add .
```

## Step 7: Create Initial Commit

```powershell
git commit -m "Initial commit: PAMS - Presales Activity Management System

- Complete modular application structure
- User authentication with role-based access
- Customer activity tracking (Calls, POC, RFx)
- Internal activity tracking
- Admin panel (user management, industries, regions)
- Dashboard with statistics
- Win/Loss tracking
- Settings (regions, sales reps, interface preferences)
- Reports section
- Modern purple-themed UI with sidebar navigation"
```

## Step 8: Set Main Branch

```powershell
git branch -M main
```

## Step 9: Push to GitHub

```powershell
git push -u origin main
```

**Note**: You'll be prompted for your GitHub username and password (or Personal Access Token if 2FA is enabled).

### If you have 2FA enabled:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` permissions
3. Use the token as your password when prompted

## Alternative: Using GitHub Desktop (Easier)

1. Download GitHub Desktop: https://desktop.github.com/
2. Sign in with your GitHub account
3. Click "File" → "Add Local Repository"
4. Browse to: `C:\Users\ankit.kanwara\Desktop\Project PAT`
5. Click "Publish repository"
6. Repository name: `Presales-Activity-Monitoring-System-PAMS-`
7. Click "Publish Repository"

## Troubleshooting

### If you get "remote origin already exists":
```powershell
git remote remove origin
git remote add origin https://github.com/ankit-kanwara-gupshup/Presales-Activity-Monitoring-System-PAMS-.git
```

### If you get authentication errors:
- Use a Personal Access Token instead of password
- Or use GitHub Desktop which handles authentication automatically

### If files are not showing up:
```powershell
git status
```
This will show which files are tracked/untracked.

## What Will Be Pushed

✅ Complete `pams-app/` directory with all modules
✅ Documentation files (README.md, GIT_SETUP.md)
✅ .gitignore file
✅ Original reference files (PAMS V1.html, etc.)

## After Pushing

Your repository will be available at:
**https://github.com/ankit-kanwara-gupshup/Presales-Activity-Monitoring-System-PAMS-**

You can:
- View code online
- Share with team members
- Set up GitHub Pages for hosting
- Create issues and track bugs
- Set up CI/CD pipelines


