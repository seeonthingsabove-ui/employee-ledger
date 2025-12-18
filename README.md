<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/1

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set env in [.env.local](.env.local):
   - `SHEETS_API_KEY` and `SHEET_ID` for Google Sheet access (acts as DB)
   - Optional overrides:
     - `SHEET_EMPLOYEE_RANGE` (default `employeedetails!A:E` with headers: S_NO, EMP_CODE, EMP_NAME, ROLE, EMAIL_ID)
     - `SHEET_LOG_RANGE` (default `logs!A:I`)
   - To append logs securely, set `SHEET_LOG_WEBHOOK` (e.g., Apps Script Web App URL) that takes the posted log entry and writes to the log sheet.
   - `GOOGLE_CLIENT_ID` for Google Sign-In (from Google Cloud console OAuth client; type Web)
3. Run the app:
   `npm run dev`
