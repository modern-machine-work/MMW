/**
 * MMW ERP permanent API file.
 *
 * Use this file after the database sheets are created.
 * If this Apps Script project is bound to the Google Sheet, leave SPREADSHEET_ID blank.
 * If this is a standalone Apps Script project, paste the Sheet ID between the quotes.
 */
const SPREADSHEET_ID = '';

const MMW_SCHEMAS = {
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

const MMW_ID_FIELDS = {
  Clients: 'ClientCode',
  Parts: 'PartID',
  Vendors: 'VendorID',
  Machines: 'MachineID',
  Employees: 'EmployeeID',
  Orders: 'OrderID',
  Production: 'ProductionID',
  Dispatch: 'DispatchID',
  Invoices: 'InvoiceID',
  Expenses: 'ExpenseID',
  Attendance: 'AttendanceID',
  Advances: 'AdvanceID',
  SalaryRegister: 'SalaryID',
  CustomerPayments: 'PaymentID',
  VendorPayments: 'PaymentID',
  Notifications: 'NotificationID',
  DriveFolders: 'FolderID',
  Settings: 'Key',
};

function doGet(event) {
  try {
    const action = event && event.parameter ? event.parameter.action : '';

    if (action === 'health') {
      return mmwJsonResponse({
        success: true,
        data: {
          app: 'MMW ERP API',
          spreadsheet: mmwGetSpreadsheet().getName(),
          time: new Date().toISOString(),
        },
      });
    }

    mmwRequireAuth(event.parameter.token);

    if (action === 'setup') {
      mmwEnsureSheets();
      return mmwJsonResponse({ success: true, message: 'MMW ERP sheets are ready.' });
    }

    if (action === 'getDashboard') {
      return mmwJsonResponse({ success: true, data: mmwGetDashboard() });
    }

    if (action && action.indexOf('get') === 0) {
      const sheetName = action.replace('get', '');
      mmwAssertSheetName(sheetName);
      return mmwJsonResponse({ success: true, data: mmwGetRows(sheetName) });
    }

    return mmwJsonResponse({
      success: true,
      message: 'MMW ERP API is running. Use ?action=health, ?action=setup, or module actions like ?action=getClients.',
    });
  } catch (error) {
    return mmwJsonResponse({ success: false, message: error.message });
  }
}

function doPost(event) {
  try {
    const payload = JSON.parse((event.postData && event.postData.contents) || '{}');
    const action = payload.action || '';
    const data = payload.data || {};

    if (action === 'login') {
      return mmwJsonResponse({ success: true, data: mmwLogin(data) });
    }

    mmwRequireAuth(payload.token);

    if (action === 'createDriveFolders') {
      return mmwJsonResponse({ success: true, data: mmwCreateDriveFolders(data.entityType, data.entityID) });
    }

    if (action.indexOf('save') === 0) {
      const sheetName = action.replace('save', '');
      mmwAssertSheetName(sheetName);
      mmwSaveRow(sheetName, data);
      return mmwJsonResponse({ success: true, message: 'Saved successfully.' });
    }

    if (action.indexOf('delete') === 0) {
      const sheetName = action.replace('delete', '');
      mmwAssertSheetName(sheetName);
      mmwDeleteRow(sheetName, data.idField || MMW_ID_FIELDS[sheetName], data.idValue);
      return mmwJsonResponse({ success: true, message: 'Deleted successfully.' });
    }

    throw new Error('Invalid POST action: ' + action);
  } catch (error) {
    return mmwJsonResponse({ success: false, message: error.message });
  }
}

function mmwEnsureSheets() {
  Object.keys(MMW_SCHEMAS).forEach((sheetName) => {
    mmwGetSheet(sheetName);
  });
}

function mmwGetDashboard() {
  mmwEnsureSheets();
  return {
    stats: {
      Clients: mmwGetRows('Clients').length,
      Orders: mmwGetRows('Orders').length,
      Production: mmwGetRows('Production').length,
      Invoices: mmwGetRows('Invoices').length,
    },
    notifications: mmwGetRows('Notifications')
      .filter((row) => String(row.Status || '').toLowerCase() !== 'done')
      .slice(0, 10),
  };
}

function mmwGetRows(sheetName) {
  const sheet = mmwGetSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || MMW_SCHEMAS[sheetName];

  return values.slice(1)
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
      record[header] = mmwFormatCell(row[index], header);
      });
      return record;
    });
}

function mmwSaveRow(sheetName, data) {
  const sheet = mmwGetSheet(sheetName);
  const headers = MMW_SCHEMAS[sheetName];
  const idField = MMW_ID_FIELDS[sheetName];
  const idValue = data[idField];

  if (!idValue) {
    throw new Error(idField + ' is required.');
  }

  const rowValues = headers.map((header) => data[header] || '');
  const existingRow = mmwFindRowNumber(sheet, idField, idValue);

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  if (sheetName === 'Parts' && mmwGetSetting('AutoCreateDriveFolders') === 'Yes') {
    mmwCreatePartFolders(data.PartID);
  }

  if (sheetName === 'Orders' && mmwGetSetting('AutoCreateDriveFolders') === 'Yes') {
    mmwCreateOrderFolder(data.OrderID);
  }

  if (sheetName === 'SalaryRegister') {
    mmwApplySalaryAdvanceDeduction(data);
  }
}

function mmwApplySalaryAdvanceDeduction(salaryRow) {
  const employeeID = String(salaryRow.EmployeeID || '');
  const month = String(salaryRow.Month || '').slice(0, 7);
  const deductedAmount = Number(salaryRow.AdvanceDeducted || 0);
  const paymentStatus = String(salaryRow.PaymentStatus || '').toLowerCase();

  if (!employeeID || !month || deductedAmount <= 0 || paymentStatus.indexOf('paid') !== 0) {
    return;
  }

  const sheet = mmwGetSheet('Advances');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const employeeCol = headers.indexOf('EmployeeID');
  const dateCol = headers.indexOf('Date');
  const statusCol = headers.indexOf('Status');
  const remarksCol = headers.indexOf('Remarks');

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const advanceMonth = mmwFormatCell(row[dateCol], 'Date').slice(0, 7);
    const status = String(row[statusCol] || '').toLowerCase();

    if (String(row[employeeCol]) === employeeID && advanceMonth === month && status !== 'deducted' && status !== 'cancelled') {
      sheet.getRange(rowIndex + 1, statusCol + 1).setValue('Deducted');
      if (remarksCol >= 0) {
        const oldRemarks = String(row[remarksCol] || '');
        const note = 'Deducted in salary ' + salaryRow.SalaryID;
        sheet.getRange(rowIndex + 1, remarksCol + 1).setValue(oldRemarks ? oldRemarks + '; ' + note : note);
      }
    }
  }
}

function mmwDeleteRow(sheetName, idField, idValue) {
  if (!idValue) {
    throw new Error('Record ID is required.');
  }

  const sheet = mmwGetSheet(sheetName);
  const rowNumber = mmwFindRowNumber(sheet, idField, idValue);

  if (rowNumber < 1) {
    throw new Error('Record not found.');
  }

  sheet.deleteRow(rowNumber);
}

function mmwFindRowNumber(sheet, idField, idValue) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idColumn = headers.indexOf(idField);

  if (idColumn < 0) {
    throw new Error(idField + ' column not found in ' + sheet.getName() + '.');
  }

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][idColumn]) === String(idValue)) {
      return rowIndex + 1;
    }
  }

  return -1;
}

function mmwGetSheet(sheetName) {
  const spreadsheet = mmwGetSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);
  const headers = MMW_SCHEMAS[sheetName];

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasNoHeaders = existingHeaders.every((cell) => cell === '');
  const hasWrongHeaders = existingHeaders.join('|') !== headers.join('|');

  if (hasNoHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  } else if (hasWrongHeaders) {
    throw new Error(sheetName + ' headers do not match. Run setupMMWERPSheets from temporary setup file or fix headers manually.');
  }

  return sheet;
}

function mmwGetSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('No active spreadsheet found. Open Apps Script from Google Sheets, or set SPREADSHEET_ID in Code.gs.');
  }

  return spreadsheet;
}

function mmwLogin(data) {
  const expectedUsername = mmwGetSetting('AdminUsername') || 'admin';
  const expectedPassword = mmwGetSetting('AdminPassword') || '';
  const username = String(data.username || '');
  const password = String(data.password || '');

  if (!expectedPassword) {
    throw new Error('AdminPassword is missing in Settings sheet.');
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    throw new Error('Invalid username or password.');
  }

  return {
    authenticated: true,
    username,
    token: mmwCreateSession(username),
  };
}

function mmwCreateSession(username) {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('session_' + token, username, 21600);
  return token;
}

function mmwRequireAuth(token) {
  if (!token) {
    throw new Error('Login required.');
  }

  const username = CacheService.getScriptCache().get('session_' + token);
  if (!username) {
    throw new Error('Session expired. Please login again.');
  }

  return username;
}

function mmwCreateDriveFolders(entityType, entityID) {
  if (entityType === 'Part') {
    return mmwCreatePartFolders(entityID);
  }

  if (entityType === 'Order') {
    return mmwCreateOrderFolder(entityID);
  }

  throw new Error('Unsupported Drive entity type: ' + entityType);
}

function mmwCreatePartFolders(partID) {
  const part = mmwFindRecord('Parts', 'PartID', partID);
  if (!part) {
    throw new Error('Part not found: ' + partID);
  }

  const client = mmwFindRecord('Clients', 'ClientCode', part.ClientCode);
  const root = mmwGetDriveRootFolder();
  const clientsFolder = mmwGetOrCreateChildFolder(root, 'Clients');
  const clientFolderName = mmwCleanFolderName(`${part.ClientCode} - ${client ? client.ClientName : 'Unknown Client'}`);
  const clientFolder = mmwGetOrCreateChildFolder(clientsFolder, clientFolderName);
  const partFolderName = mmwCleanFolderName(`${part.PartID} - ${part.PartName}`);
  const partFolder = mmwGetOrCreateChildFolder(clientFolder, partFolderName);

  ['Drawings', 'Programs', 'Process Sheets', 'Inspection Reports', 'Setup Photos', 'Orders', 'Documents'].forEach((folderName) => {
    mmwGetOrCreateChildFolder(partFolder, folderName);
  });

  mmwTrackDriveFolder('Part', part.PartID, clientFolder.getId(), partFolder);

  return {
    entityType: 'Part',
    entityID: part.PartID,
    folderName: partFolder.getName(),
    folderUrl: partFolder.getUrl(),
  };
}

function mmwCreateOrderFolder(orderID) {
  const order = mmwFindRecord('Orders', 'OrderID', orderID);
  if (!order) {
    throw new Error('Order not found: ' + orderID);
  }

  const partFolderResult = mmwCreatePartFolders(order.PartID);
  const partFolderId = mmwFindRecord('DriveFolders', 'EntityID', order.PartID).FolderID;
  const partFolder = DriveApp.getFolderById(partFolderId);
  const ordersFolder = mmwGetOrCreateChildFolder(partFolder, 'Orders');
  const orderFolder = mmwGetOrCreateChildFolder(ordersFolder, mmwCleanFolderName(order.OrderID));

  mmwTrackDriveFolder('Order', order.OrderID, ordersFolder.getId(), orderFolder);

  return {
    entityType: 'Order',
    entityID: order.OrderID,
    partFolderUrl: partFolderResult.folderUrl,
    folderName: orderFolder.getName(),
    folderUrl: orderFolder.getUrl(),
  };
}

function mmwGetDriveRootFolder() {
  const rootFolderId = mmwGetSetting('DriveRootFolderId');

  if (rootFolderId) {
    return DriveApp.getFolderById(rootFolderId);
  }

  const folders = DriveApp.getFoldersByName('Modern Machine Works');
  if (folders.hasNext()) {
    const folder = folders.next();
    mmwSetSetting('DriveRootFolderId', folder.getId());
    return folder;
  }

  const folder = DriveApp.createFolder('Modern Machine Works');
  mmwSetSetting('DriveRootFolderId', folder.getId());
  return folder;
}

function mmwGetOrCreateChildFolder(parentFolder, folderName) {
  const cleanName = mmwCleanFolderName(folderName);
  const folders = parentFolder.getFoldersByName(cleanName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parentFolder.createFolder(cleanName);
}

function mmwTrackDriveFolder(entityType, entityID, parentID, folder) {
  const data = {
    FolderID: folder.getId(),
    EntityType: entityType,
    EntityID: entityID,
    ParentID: parentID,
    FolderName: folder.getName(),
    FolderUrl: folder.getUrl(),
    CreatedAt: new Date().toISOString(),
  };
  mmwSaveRow('DriveFolders', data);
}

function mmwFindRecord(sheetName, fieldName, value) {
  const rows = mmwGetRows(sheetName);
  return rows.find((row) => String(row[fieldName]) === String(value)) || null;
}

function mmwGetSetting(key) {
  const setting = mmwFindRecord('Settings', 'Key', key);
  return setting ? String(setting.Value || '') : '';
}

function mmwSetSetting(key, value) {
  mmwSaveRow('Settings', { Key: key, Value: value });
}

function mmwCleanFolderName(value) {
  return String(value || 'Untitled')
    .replace(/[\\/:*?"<>|#%{}~&]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

function mmwAssertSheetName(sheetName) {
  if (!MMW_SCHEMAS[sheetName]) {
    throw new Error('Unknown sheet: ' + sheetName);
  }
}

function mmwFormatCell(value, header) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (['CheckIn', 'BreakStart', 'BreakEnd', 'CheckOut'].indexOf(header) >= 0) {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
    }
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return value;
}

function mmwJsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
