# HomeRepairHub website — local preview and launch

A responsive static website built with HTML, CSS and vanilla JavaScript. No Node.js or build step is required for local preview. It includes an optional Google Sheets lead-capture endpoint, WhatsApp enquiry handoff, multi-select appliances, A–Z brand selection, full service address and warranty status.

## Project contents
- `index.html` — website sections and enquiry form
- `styles.css` — responsive design and form/brand styling
- `script.js` — zone tabs, multi-appliance form, WhatsApp message and optional sheet submission
- `config.js` — business WhatsApp number and optional Google Apps Script endpoint
- `GOOGLE_SHEETS_SETUP.md` — instructions and Apps Script code for recording enquiries in Google Sheets
- `assets/` — logo and favicon

## 1. Configure WhatsApp
1. Open `config.js` in Notepad or VS Code.
2. Replace `REPLACE_WITH_YOUR_WHATSAPP_NUMBER` with the business WhatsApp number in international format, digits only. India example: `919876543210`.
3. Save. Do not include `+`, spaces or hyphens.

## 2. Preview locally on Windows
1. Extract the ZIP to a folder such as `C:\HomeRepairHub_Website`.
2. Open the folder in VS Code and install the **Live Server** extension, or double-click `index.html` to open it in Chrome.
3. Test desktop and mobile layouts. Google Fonts and remote brand-logo images require an internet connection.

## 3. Save enquiries internally
A static site cannot write directly into an Excel file stored on your computer. Follow `GOOGLE_SHEETS_SETUP.md` to create a Google Sheet and deploy a Google Apps Script receiver. Paste the receiver's `/exec` URL into `config.js`. The sheet can be downloaded as `.xlsx` for Excel.

**Important:** The form opens WhatsApp with the enquiry; the customer must press **Send**. To store customer records centrally, configure `enquiryWebhookUrl` in `config.js` using the steps in `GOOGLE_SHEETS_SETUP.md` (Make.com webhook → Google Sheets or Excel Online). The site cannot verify the remote write from the browser, so confirm that test submissions create rows before launch. Restrict spreadsheet access and publish a privacy notice because names, phone numbers and addresses are personal data.

## 4. Before publishing
- Verify your actual service areas, technician availability and all listed PIN codes.
- Do not promise guaranteed repair outcomes. Confirm diagnosis, scope, estimate, charges and applicable warranty before work starts.
- The technician overview describes the service-coordination approach; it does not imply all technicians are employees or manufacturer-authorised agents.
- Brand logos are informational and may load from a third-party icon CDN. HomeRepairHub does not claim manufacturer-authorised status.
- Finalise privacy, payment, cancellation, inspection-fee and warranty policies.
- Test the form, WhatsApp number, sheet capture, mobile navigation, brand dropdown and all links on a real device.

## 5. Publish free using Cloudflare Pages + GitHub
Official guide: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
1. Create a GitHub repository and upload the contents of this folder to the repository root (`index.html` must be at the root).
2. In Cloudflare, go to **Workers & Pages → Create application → Pages → Connect to Git** and select the repository.
3. Deploy as a static site, then test the generated `*.pages.dev` URL.
4. In the Pages project, choose **Custom domains** and follow the instructions to connect `homerepairhub.in`.
5. Preserve existing email DNS records if you use domain email. Never share registrar passwords or OTPs.

Custom domain guide: https://developers.cloudflare.com/pages/configuration/custom-domains/


## Customer enquiry storage

For central storage, follow `GOOGLE_SHEETS_SETUP.md` to connect a Make.com Custom Webhook to Google Sheets (or Excel Online). Configure `enquiryWebhookUrl` in `config.js`. The website cannot verify the remote write from the browser, so test that each enquiry creates a row before launch.


## Customer enquiry storage status

Automatic customer-data storage is currently paused because the previous webhook setup was not reliably recording submissions. Enquiries currently open WhatsApp for the customer to send manually. No spreadsheet or database save is performed by this version. Configure and test a reliable backend before enabling data storage.
