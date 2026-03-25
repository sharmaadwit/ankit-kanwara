# User recovery: get local cache so admin can restore your activities

If you're missing activities, your browser may still have a **local cache** (last-known good copy). Send that to an admin so they can restore your data.

---

## Copy-paste: steps to send to users (admin)

Send this to users who lost activities:

1. **Log in** to the app.
2. Go to **My drafts** (sidebar).
3. Click **Export my data for recovery**.
4. A file will download (e.g. `pams-recovery-2026-03-04.json`). **Send this file to me** (admin) by email or secure link.
5. I will load it in Admin → Activity recovery and restore your activities. You may need to do one more step (Submit again from My drafts) after I tell you.

If the Export button is not there or doesn’t work, see “Option B: Export from browser” below.

---

## Option A: Export from the app (easiest)

1. Log in to the app.
2. Open **My drafts** (or go to **Admin** → **Activity recovery** if you're admin).
3. Click **Export my data for recovery** (or in Admin → Activity recovery, use the same button if available).
4. A JSON file will download (e.g. `pams-recovery-YYYY-MM-DD.json`). **Send this file to your admin** (e.g. by email or secure link).

The file contains your local backup of activities and drafts (no passwords). Admin can load it in **Admin** → **Activity recovery** and merge missing activities.

---

## Option B: Export from browser (manual)

If there is no Export button or it fails, use the browser’s Application/Storage tab.

### Chrome / Edge

1. Open the app and log in.
2. Press **F12** to open DevTools.
3. Go to the **Application** tab (or **Storage** in some versions).
4. In the left sidebar, open **Local Storage** and click your app’s origin (e.g. `https://your-app.up.railway.app`).
5. Find these keys and copy their **values** (right‑click → Copy value, or double‑click to select and copy):
   - **`__pams_backup__activities`** – main activities cache (can be very long).
   - Any **`__pams_backup__activities:YYYY-MM`** – monthly shards, if present.
   - **`__pams_drafts__`** – your drafts (optional).
   - **`__pams_drafts_backup__`** – draft backup (optional).

6. Create a JSON file for the admin:
   - Open Notepad (or any text editor).
   - Paste this and replace `PASTE_ACTIVITIES_HERE` with the value of `__pams_backup__activities` (the long string):

   ```json
   {
     "source": "user-local-cache",
     "at": "2026-03-04T12:00:00.000Z",
     "backups": {
       "activities": PASTE_ACTIVITIES_HERE
     }
   }
   ```

   - If the value you copied is already a JSON array (starts with `[`), put it in quotes so it’s a string: `"activities": "[ ... ]"`.  
   - Or use this format (activities as raw string):

   ```json
   {
     "source": "user-local-cache",
     "at": "2026-03-04T12:00:00.000Z",
     "backups": {
       "activities": "<paste the exact value of __pams_backup__activities here>"
     }
   }
   ```

   - Save as `pams-recovery-MYNAME.json` (e.g. `pams-recovery-john.json`).
7. Send the file to your admin.

### Firefox

1. Open the app and log in.
2. Press **F12** → **Storage** tab (or **Application** if available).
3. Under **Local Storage**, select your app’s URL.
4. Copy the values for **`__pams_backup__activities`** (and any **`__pams_backup__activities:YYYY-MM`**) as above.
5. Build the same JSON file and send it to the admin.

---

## What the admin does with your file

1. Admin logs in and goes to **Admin** → **Activity recovery**.
2. Clicks **Choose file** and selects your recovery JSON file.
3. Clicks **Load missing activities into my drafts**.
4. The app adds any activities that are in your file but not on the server into **one draft**.
5. Admin (or you) opens **My drafts**, clicks **Submit again** on that draft so the missing activities are saved.
6. After that, everyone can see the restored activities in the app (hard refresh if needed).

---

## If you have no local cache

- If you never had a successful load on this device, or the cache was cleared, there is no local copy.
- Admin can still restore from **server backups** (e.g. `backups/storage-snapshot-latest.json` or another snapshot). See **docs/WHERE_TO_LOOK_ACTIVITIES.md**.
