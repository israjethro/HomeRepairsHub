# HomeRepairsHub — Google Sheets enquiry storage setup

This is a one-time setup for the customer enquiry form. It creates a Google spreadsheet automatically on the first valid submission and appends each subsequent enquiry as a new row.

## 1. Create the Apps Script

1. Sign in to the Google account that should own the customer enquiry sheet.
2. Open https://script.google.com/home and choose **New project**.
3. Rename the project to **HomeRepairsHub Enquiry Storage**.
4. Replace the contents of `Code.gs` with the code in [apps-script/Code.gs](apps-script/Code.gs) from this repository's staging branch.
5. Click **Save**.

## 2. Deploy it as a web app

1. Click **Deploy → New deployment**.
2. Select the gear icon / deployment type **Web app**.
3. Set **Execute as** to **Me**.
4. Set **Who has access** to **Anyone** (or the broadest access Google permits for your account). This is needed for public website visitors to submit the form.
5. Click **Deploy** and approve the requested Google permissions.
6. Copy the Web app URL. It must end in `/exec`, not `/dev`.

Keep this URL private from public posts. The website needs it in its configuration, so it will be visible in browser source; do not treat the URL itself as a secret. If your Google account does not allow public web-app access, stop and tell me the exact message rather than weakening account security.

## 3. Connect the website

1. Open [config.js](config.js) on the `staging-home-repairshub-refresh` branch.
2. Replace the empty `googleSheetsEndpoint` value with the copied `/exec` URL, for example:

   ```js
   googleSheetsEndpoint: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
   ```

3. Commit the change to the **staging branch only**. Do not edit `main`.
4. Wait for the Cloudflare preview build to complete, then open its preview URL.

## 4. Test before launch

1. Submit one test enquiry using your own test details.
2. Confirm a new spreadsheet named **HomeRepairsHub Customer Enquiries** appears in the Google account used for deployment.
3. Open the **Enquiries** tab and confirm the test submission appears as a new row.
4. Confirm the site shows the saved confirmation and opens WhatsApp as an additional step.
5. If the save fails, the form displays an error and does not show the enquiry as saved.

The sheet contains customer names, phone numbers, addresses, appliance/fault details and PIN codes. Limit access to people who need it, and avoid sharing the sheet publicly. Remove test rows before launch if needed.

## Data columns

Submitted time, enquiry type, headline, name, mobile, appliances, brands, warranty status and confirmation, fault description, zone, area, PIN code, full address, and preferred visit time.

**Important:** The website will not claim an enquiry was saved until the Apps Script responds with success. Storage remains disabled until the real deployment URL is added to `config.js`.
