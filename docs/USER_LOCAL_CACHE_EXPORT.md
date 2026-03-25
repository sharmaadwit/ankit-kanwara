# How users can export their local cache so admin can restore their activities

If a user still has activities in their browser (e.g. they added some today and the app hasn’t synced, or their list is more complete than the server), they can export that data so an admin can merge it into the main storage or restore it for them.

---

## Option 1: Export from browser console (recommended)

Ask the user to:

1. Open the **PAMS app** in the browser where they usually work.
2. Press **F12** to open Developer Tools → go to the **Console** tab.
3. Paste and run this **one line** (it copies a JSON string to the clipboard):

```javascript
copy(JSON.stringify({ activities: (await (typeof DataManager !== 'undefined' && DataManager.getActivities ? DataManager.getActivities() : Promise.resolve([]))), exportedAt: new Date().toISOString(), user: typeof Auth !== 'undefined' && Auth.getCurrentUser ? Auth.getCurrentUser().username : null }))
```

4. If their browser doesn’t support `copy()`, use this instead and then **manually copy the output**:

```javascript
(async function(){ const a = typeof DataManager !== 'undefined' && DataManager.getActivities ? await DataManager.getActivities() : []; console.log(JSON.stringify({ activities: a, exportedAt: new Date().toISOString(), user: typeof Auth !== 'undefined' && Auth.getCurrentUser ? Auth.getCurrentUser().username : null })); })();
```

5. **Paste the result** into a text file and send it to you (e.g. email, Teams, or upload to a shared drive). Name the file e.g. `activities-export-USERNAME-2026-03-04.json`.

**Admin:** The user export format `{ activities: [...], exportedAt, user }` works with **Admin → Activity recovery**: choose the user's file, then click "Load missing activities into my drafts". Or use a script that:
- Reads the file (or pasted JSON).
- Compares `activities` in the file to current server activities (by id).
- Merges (current + missing from file, by id newer wins) and either restores to storage or creates one “recovery” draft for the user.

---

## Option 2: Export drafts backup (if they had unsaved drafts)

If the user had **drafts** (e.g. “Submit again” not clicked) and lost them from the list:

1. Open the app, **F12** → **Console**.
2. Run:  
   `copy(JSON.stringify(Drafts.getBackup()))`  
   or if no `copy`:  
   `console.log(JSON.stringify(Drafts.getBackup()))`  
   and copy the output.
3. Send that JSON to you.

**Admin:** The object is `{ at, drafts }`. Each draft can have a full-list payload. You can parse it and feed the activity lists into the same merge/restore flow as in Option 1.

---

## Option 3: Admin uses “Activity recovery” with the user’s file

Once the user has sent a file from Option 1 or 2:

1. **Admin** opens **Admin → Activity recovery**.
2. Chooses the file the user sent (e.g. `activities-export-USERNAME-2026-03-04.json`).
3. Clicks **“Load missing activities into my drafts”** (if the app expects that format) **or** you run a small script that:
   - Loads the user’s JSON.
   - Loads current activities from server (or from a backup).
   - Merges by id (newer wins), dedupes.
   - Restores the merged list to storage (or creates a single recovery draft).

If your “Activity recovery” UI expects a **full snapshot** (with `data.activities`), then for Option 1 the user’s export should be wrapped as:  
`{ "data": { "activities": <their activities array> } }`  
so the same “Load missing activities into my drafts” flow can use it.

---

## Summary for users (text you can send)

**Subject: Export your PAMS activities so we can restore them**

If you still have the PAMS app open in your browser and see activities that are missing for others (or that you don’t want to lose):

1. Press **F12** → open the **Console** tab.
2. Paste and press Enter:
   `copy(JSON.stringify({ activities: (await (DataManager.getActivities())), exportedAt: new Date().toISOString(), user: Auth.getCurrentUser().username }))`
3. Save the copied text into a file and send it to [admin contact]. Name the file: `activities-export-YOURNAME-2026-03-04.json`.

We will merge your list with the server and restore any missing activities.
