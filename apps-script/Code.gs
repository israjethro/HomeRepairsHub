const SPREADSHEET_PROPERTY = 'HRH_ENQUIRY_SPREADSHEET_ID';
const SHEET_NAME = 'Enquiries';
const HEADERS = [
  'Submitted at (UTC)', 'Enquiry type', 'Headline', 'Customer name', 'Mobile',
  'Appliances', 'Brands', 'Warranty status', 'Warranty confirmation',
  'Fault / request', 'Zone', 'Area', 'PIN code', 'Full service address',
  'Preferred visit time'
];

function doPost(e) {
  try {
    const params = (e && e.parameter) || {};
    const data = JSON.parse(params.payload || '{}');\n    requestId = String(data.requestId || '');

    // Honeypot: silently accept bot submissions without storing them.
    if (String(params.website || data.website || '').trim()) {
      return response_({ type: 'hrh-sheet-result', ok: true, requestId });
    }

    const required = ['name', 'phone', 'appliances', 'warranty', 'problem', 'zone', 'area', 'pin', 'fullAddress', 'preferredTime'];
    for (const key of required) {
      if (!String(data[key] || '').trim()) throw new Error('Missing required field: ' + key);
    }
    if (!/^\d{10}$/.test(String(data.phone))) throw new Error('Invalid mobile number.');
    if (!/^\d{6}$/.test(String(data.pin))) throw new Error('Invalid PIN code.');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const props = PropertiesService.getScriptProperties();
      let spreadsheetId = props.getProperty(SPREADSHEET_PROPERTY);
      let spreadsheet;
      if (spreadsheetId) {
        spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      } else {
        spreadsheet = SpreadsheetApp.create('HomeRepairsHub Customer Enquiries');
        spreadsheetId = spreadsheet.getId();
        props.setProperty(SPREADSHEET_PROPERTY, spreadsheetId);
      }

      let sheet = spreadsheet.getSheetByName(SHEET_NAME);
      if (!sheet) {\n        const existing = spreadsheet.getSheets();\n        if (existing.length === 1 && existing[0].getLastRow() === 0) { sheet = existing[0]; sheet.setName(SHEET_NAME); }\n        else sheet = spreadsheet.insertSheet(SHEET_NAME);\n      }
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(HEADERS);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#102f4b').setFontColor('#ffffff');
        sheet.autoResizeColumns(1, HEADERS.length);
      }

      const submitted = data.submittedAt ? new Date(data.submittedAt) : new Date();
      const row = [
        isNaN(submitted.getTime()) ? new Date() : submitted,
        safeCell_(data.enquiryType), safeCell_(data.headline), safeCell_(data.name),
        safeCell_(data.phone), safeCell_(data.appliances), safeCell_(data.brands),
        safeCell_(data.warranty), safeCell_(data.warrantyConfirmation),
        safeCell_(data.problem), safeCell_(data.zone), safeCell_(data.area),
        safeCell_(data.pin), safeCell_(data.fullAddress), safeCell_(data.preferredTime)
      ];
      sheet.appendRow(row);
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
      sheet.getRange(lastRow, 5).setNumberFormat('@');
      sheet.getRange(lastRow, 13).setNumberFormat('@');
    } finally {
      lock.releaseLock();
    }

    return response_({ type: 'hrh-sheet-result', ok: true, requestId });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return response_({
      type: 'hrh-sheet-result',
      ok: false,
      message: 'Google Sheets could not save this enquiry. Please try again in a moment.'
    });
  }
}

function doGet() {
  return HtmlService.createHtmlOutput(
    '<h2>HomeRepairsHub enquiry receiver</h2><p>Endpoint is available. Customer enquiries are accepted by POST.</p>'
  );
}

function safeCell_(value) {
  let text = String(value == null ? '' : value).slice(0, 5000);
  if (/^[=+@\-]/.test(text)) text = "'" + text;
  return text;
}

function response_(message) {
  const encoded = JSON.stringify(message).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' +
    'window.top.postMessage(' + encoded + ', "*");' +
    '</script><p>Enquiry response processed.</p></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
