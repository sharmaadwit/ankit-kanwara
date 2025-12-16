# Gmail API Integration Guide

This walkthrough covers how to configure Gmail API access with Google Cloud Console and connect it to the PAMS backend so administrators can receive automated notifications.

## 1. Create or select a Google Cloud project
1. Sign in to [https://console.cloud.google.com/](https://console.cloud.google.com/).
2. Use the project selector in the top bar to create a new project (for example `pams-admin`) or choose an existing one.

## 2. Enable the Gmail API
1. With your project selected, navigate to **APIs & Services → Library**.
2. Search for “Gmail API”.
3. Click **Gmail API**, then press **Enable**.

## 3. Configure OAuth consent screen
1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **Internal** if you use a Google Workspace domain, otherwise select **External** and complete the verification prompts.
3. Populate the app name, support email, and authorized domain (for example `gmail.com` or your company domain).
4. Add your contact email under “Developer contact information”.
5. Save the consent screen.

## 4. Create OAuth 2.0 credentials
1. Navigate to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Choose **Web application**.
4. Add an authorized redirect URI. The quickest option is the Google OAuth Playground:  
   `https://developers.google.com/oauthplayground`
5. Save. Copy the generated **Client ID** and **Client Secret** – they populate `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`.

## 5. Generate a refresh token
1. Visit [https://developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
2. Click the settings gear in the top right and enable **Use your own OAuth credentials**. Paste the Client ID and Client Secret you created.
3. In “Step 1”, select **Gmail API v1 → https://mail.google.com/** scope. Click **Authorize APIs**.
4. Sign in with the Gmail account that will send notifications and grant access.
5. In “Step 2”, click **Exchange authorization code for tokens**.
6. Copy the **Refresh token** and store it as `GMAIL_REFRESH_TOKEN`. The Playground shows an access token too, but only the refresh token is required by the app.

## 6. Configure environment variables
Add the following entries (example shown for `.env` or Railway variables):
```
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground
GMAIL_SENDER=alerts@yourdomain.com
```
`GMAIL_SENDER` must match the Gmail address authorized in the OAuth flow.

## 7. Deploy and test
1. Redeploy or restart the Node.js service so the new environment variables load.
2. In the Admin panel, add notification recipients and toggle “Feature flag changes”.
3. Update a feature toggle; the backend will send a test email through Gmail. Check service logs for events:
   - `email_sent` confirms delivery.
   - `notification_skipped_email_unconfigured` indicates missing variables.

## 8. Production readiness checklist
- Store OAuth credentials and refresh tokens in a secure vault (Railway secrets, Google Secret Manager, etc.).
- Rotate the refresh token if you regenerate credentials.
- Limit API scope to `https://mail.google.com/` or `https://www.googleapis.com/auth/gmail.send` only.
- Audit the Gmail account regularly; it will appear as the sender for all automated notifications.




