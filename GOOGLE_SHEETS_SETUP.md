# HomeRepairHub customer enquiry storage — paused

Automatic spreadsheet/database storage has intentionally been disabled in this website version because the previous Make.com webhook setup did not reliably save enquiries.

For now, a valid enquiry opens a pre-filled WhatsApp message. The customer must press **Send**. The website does not save a copy to Google Sheets, Excel, or a database.

When you are ready to revisit storage, choose and test a reliable backend first. A possible option is Make.com Custom Webhook → Google Sheets Add a Row, but it must be tested end-to-end with sample data before it is enabled on the public site. Do not add a webhook URL to `config.js` in this version; the website deliberately does not call one.

Suggested spreadsheet columns when storage is implemented: `submittedAt`, `enquiryType`, `headline`, `name`, `phone`, `appliances`, `brands`, `warranty`, `warrantyConfirmation`, `problem`, `zone`, `area`, `pin`, `fullAddress`, `preferredTime`.
