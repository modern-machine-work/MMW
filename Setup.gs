/**
 * MMW ERP temporary setup file.
 *
 * Use this file only to create or reset the Google Sheets database.
 * After setup works, you can keep it or delete it from Apps Script.
 *
 * Run this function first:
 *   setupMMWERPSheets
 *
 * If you want to wipe and recreate all ERP sheets, run:
 *   resetMMWERPSheets
 */
const MMW_SETUP_SPREADSHEET_ID = '';

const MMW_SETUP_SCHEMAS = {
  Clients: ['ClientCode', 'ClientName', 'GSTIN', 'Address', 'StateCode', 'Status'],
  Parts: ['PartID', 'PartName', 'ClientCode', 'DrawingNo', 'ProgramNo', 'CycleTime', 'Status'],
  Vendors: ['VendorID', 'VendorName', 'Category', 'GSTIN', 'Status'],
  Machines: ['MachineID', 'MachineName', 'MachineType', 'Status'],
  Employees: ['EmployeeID', 'EmployeeName', 'Contact', 'Department', 'Designation', 'SalaryType', 'MonthlySalary', 'PerDaySalary', 'OTRate', 'Status'],
  Orders: ['OrderID', 'PartID', 'ClientCode', 'ClientChallanNo', 'PONo', 'WONo', 'ReceivedDate', 'ReceivedQty', 'Rate', 'Status', 'Remarks'],
  Production: ['ProductionID', 'Date', 'OrderID', 'MachineID', 'EmployeeID', 'Shift', 'Code', 'OKQty', 'ReworkQty', 'RejectQty', 'Remarks'],
  Dispatch: ['DispatchID', 'OrderID', 'DispatchDate', 'QtyDispatched', 'Remarks'],
  Invoices: ['InvoiceID', 'InvoiceNo', 'OrderID', 'ClientCode', 'InvoiceDate', 'Amount', 'DueDate', 'PaymentStatus', 'PaymentDate'],
  Expenses: ['ExpenseID', 'Date', 'VendorID', 'Category', 'Description', 'Qty', 'Rate', 'GST', 'Amount', 'PaymentStatus'],
  Attendance: ['AttendanceID', 'EmployeeID', 'Date', 'CheckIn', 'BreakStart', 'BreakEnd', 'CheckOut', 'WorkMinutes', 'OTHours', 'Remarks'],
  Advances: ['AdvanceID', 'EmployeeID', 'Date', 'Amount', 'Status', 'Remarks'],
  SalaryRegister: ['SalaryID', 'Month', 'EmployeeID', 'EmployeeName', 'GrossSalary', 'AdvanceDeducted', 'OtherDeductions', 'NetSalaryPayable', 'PaymentStatus', 'PaymentDate'],
  CustomerPayments: ['PaymentID', 'InvoiceID', 'ClientCode', 'AmountReceived', 'PaymentDate', 'PaymentMode', 'ReferenceNo', 'Remarks'],
  VendorPayments: ['PaymentID', 'VendorID', 'AmountPaid', 'PaymentDate', 'PaymentMode', 'ReferenceNo', 'Remarks'],
  Notifications: ['NotificationID', 'Type', 'ReferenceID', 'DueDate', 'Status'],
  DriveFolders: ['FolderID', 'EntityType', 'EntityID', 'ParentID', 'FolderName', 'FolderUrl', 'CreatedAt'],
  Settings: ['Key', 'Value'],
};

function setupMMWERPSheets() {
  const spreadsheet = mmwSetupGetSpreadsheet();
  const created = [];
  const updated = [];

  Object.keys(MMW_SETUP_SCHEMAS).forEach((sheetName) => {
    const headers = MMW_SETUP_SCHEMAS[sheetName];
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      created.push(sheetName);
    } else {
      updated.push(sheetName);
    }

    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#e7f5f3');
    sheet.autoResizeColumns(1, headers.length);
  });

  mmwSetupSeedSettings(spreadsheet);

  SpreadsheetApp.flush();
  Logger.log('MMW ERP setup complete.');
  Logger.log('Created sheets: ' + created.join(', '));
  Logger.log('Reset existing sheets: ' + updated.join(', '));

  return {
    message: 'MMW ERP sheets are ready.',
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl(),
    sheetCount: Object.keys(MMW_SETUP_SCHEMAS).length,
    created,
    reset: updated,
  };
}

function upgradeMMWERPSheets() {
  const spreadsheet = mmwSetupGetSpreadsheet();
  const created = [];
  const checked = [];

  Object.keys(MMW_SETUP_SCHEMAS).forEach((sheetName) => {
    const headers = MMW_SETUP_SCHEMAS[sheetName];
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#e7f5f3');
      sheet.autoResizeColumns(1, headers.length);
      created.push(sheetName);
    } else {
      checked.push(sheetName);
      const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      if (firstRow.every((cell) => cell === '')) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
      } else if (firstRow.join('|') !== headers.join('|')) {
        mmwSetupRemapHeaders(sheet, headers);
      }
    }
  });

  mmwSetupEnsureSetting(spreadsheet, 'CompanyName', 'Modern Machine Works');
  mmwSetupEnsureSetting(spreadsheet, 'Location', 'Rajkot, Gujarat, India');
  mmwSetupEnsureSetting(spreadsheet, 'Currency', 'INR');
  mmwSetupEnsureSetting(spreadsheet, 'InvoiceDueDays', '30');
  mmwSetupEnsureSetting(spreadsheet, 'AdminUsername', 'admin');
  mmwSetupEnsureSetting(spreadsheet, 'AdminPassword', 'admin123');
  mmwSetupEnsureSetting(spreadsheet, 'DriveRootFolderId', '');
  mmwSetupEnsureSetting(spreadsheet, 'AutoCreateDriveFolders', 'Yes');

  SpreadsheetApp.flush();
  Logger.log('MMW ERP upgrade complete. Created: ' + created.join(', '));

  return {
    message: 'MMW ERP sheets upgraded without clearing existing data.',
    spreadsheetName: spreadsheet.getName(),
    created,
    checked,
  };
}

function resetMMWERPSheets() {
  return setupMMWERPSheets();
}

function testMMWERPSetup() {
  const spreadsheet = mmwSetupGetSpreadsheet();
  const missing = Object.keys(MMW_SETUP_SCHEMAS).filter((sheetName) => !spreadsheet.getSheetByName(sheetName));

  if (missing.length) {
    throw new Error('Missing sheets: ' + missing.join(', '));
  }

  Logger.log('All MMW ERP sheets exist in: ' + spreadsheet.getName());
  return 'All MMW ERP sheets exist.';
}

function mmwSetupSeedSettings(spreadsheet) {
  const settingsSheet = spreadsheet.getSheetByName('Settings');
  const rows = [
    ['CompanyName', 'Modern Machine Works'],
    ['Location', 'Rajkot, Gujarat, India'],
    ['Currency', 'INR'],
    ['InvoiceDueDays', '30'],
    ['AdminUsername', 'admin'],
    ['AdminPassword', 'admin123'],
    ['DriveRootFolderId', ''],
    ['AutoCreateDriveFolders', 'Yes'],
  ];

  settingsSheet.getRange(2, 1, rows.length, 2).setValues(rows);
  settingsSheet.autoResizeColumns(1, 2);
}

function mmwSetupEnsureSetting(spreadsheet, key, value) {
  const settingsSheet = spreadsheet.getSheetByName('Settings') || spreadsheet.insertSheet('Settings');
  const data = settingsSheet.getDataRange().getValues();
  const existingRow = data.findIndex((row) => row[0] === key);

  if (existingRow >= 0) {
    return;
  }

  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
  }

  settingsSheet.appendRow([key, value]);
}

function mmwSetupRemapHeaders(sheet, newHeaders) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  const oldHeaders = values[0].map((header) => String(header || '').trim());
  const dataRows = values.slice(1).filter((row) => row.some((cell) => cell !== ''));

  const nextRows = dataRows.map((row) => {
    return newHeaders.map((header) => {
      const oldIndex = oldHeaders.indexOf(header);
      return oldIndex >= 0 ? row[oldIndex] : '';
    });
  });

  sheet.clear();
  sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
  if (nextRows.length) {
    sheet.getRange(2, 1, nextRows.length, newHeaders.length).setValues(nextRows);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, newHeaders.length)
    .setFontWeight('bold')
    .setBackground('#e7f5f3');
  sheet.autoResizeColumns(1, newHeaders.length);
}

function mmwSetupGetSpreadsheet() {
  if (MMW_SETUP_SPREADSHEET_ID) {
    return SpreadsheetApp.openById(MMW_SETUP_SPREADSHEET_ID);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('No active spreadsheet found. Open Apps Script from Google Sheets, or set MMW_SETUP_SPREADSHEET_ID.');
  }

  return spreadsheet;
}
