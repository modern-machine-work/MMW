const AUTH_KEY = 'mmwAuth';

function isAuthenticated() {
  if (getApiUrl() && !localStorage.getItem('mmwToken')) {
    return false;
  }
  return localStorage.getItem(AUTH_KEY) === 'true';
}

async function login(username, password) {
  const response = await apiPost('login', { username, password });
  if (response.authenticated) {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem('mmwUser', response.username || username);
    localStorage.setItem('mmwToken', response.token || '');
    return true;
  }
  return false;
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem('mmwUser');
  localStorage.removeItem('mmwToken');
  window.location.hash = 'login';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
}

function titleToActionPrefix(title) {
  return title.charAt(0).toLowerCase() + title.slice(1).replace(/\s+/g, '');
}

function createId(prefix) {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${stamp}${random}`;
}

function formatDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function safeFileName(value) {
  return String(value || 'export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function downloadBlob(fileName, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function tableRowsToCsv(fields, rows) {
  const visibleFields = fields.filter((field) => !field.hidden && !field.tableHidden);
  const header = visibleFields.map((field) => csvCell(field.label)).join(',');
  const body = rows.map((row) => visibleFields.map((field) => csvCell(formatDisplayValue(field, row[field.name], row))).join(',')).join('\n');
  return [header, body].filter(Boolean).join('\n');
}

function exportRowsToCsv(config, rows) {
  const content = tableRowsToCsv(config.fields, rows);
  downloadBlob(`${safeFileName(config.sheet)}-${formatDateStamp()}.csv`, 'text/csv;charset=utf-8', content);
}

function exportRowsToExcel(config, rows) {
  const visibleFields = config.fields.filter((field) => !field.hidden && !field.tableHidden);
  const headerCells = visibleFields.map((field) => `<th>${escapeHtml(field.label)}</th>`).join('');
  const bodyRows = rows.map((row) => `
    <tr>
      ${visibleFields.map((field) => `<td>${escapeHtml(formatDisplayValue(field, row[field.name], row))}</td>`).join('')}
    </tr>
  `).join('');
  const html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #999; padding: 8px; text-align: left; }
          th { background: #e7f5f3; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>Modern Machine Works - ${escapeHtml(config.sheet)}</h2>
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `;
  downloadBlob(`${safeFileName(config.sheet)}-${formatDateStamp()}.xls`, 'application/vnd.ms-excel;charset=utf-8', html);
}

function printRowsAsPdf(config, rows) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF.');
    return;
  }

  const visibleFields = config.fields.filter((field) => !field.hidden && !field.tableHidden);
  const headerCells = visibleFields.map((field) => `<th>${escapeHtml(field.label)}</th>`).join('');
  const bodyRows = rows.length
    ? rows.map((row) => `
        <tr>
          ${visibleFields.map((field) => `<td>${escapeHtml(formatDisplayValue(field, row[field.name], row))}</td>`).join('')}
        </tr>
      `).join('')
    : `<tr><td colspan="${visibleFields.length}">No records found.</td></tr>`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${escapeHtml(config.sheet)} Report</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #17202a; margin: 24px; }
        h1 { margin: 0 0 4px; font-size: 22px; }
        p { margin: 0 0 18px; color: #627084; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #c9d4df; padding: 7px; text-align: left; vertical-align: top; }
        th { background: #e7f5f3; }
        @page { margin: 14mm; }
      </style>
    </head>
    <body>
      <h1>Modern Machine Works - ${escapeHtml(config.sheet)}</h1>
      <p>Generated on ${escapeHtml(formatDateStamp())}</p>
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <script>
        window.onload = function () {
          window.print();
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

async function initLayout() {
  const [sidebarHtml, navbarHtml] = await Promise.all([
    loadHtml('components/sidebar.html'),
    loadHtml('components/navbar.html'),
  ]);
  document.getElementById('sidebar').innerHTML = sidebarHtml;
  document.getElementById('navbar').innerHTML = navbarHtml;
  document.getElementById('logoutBtn').addEventListener('click', logout);
}

async function initLoginPage() {
  const form = document.getElementById('loginForm');
  const error = document.getElementById('loginError');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    try {
      const ok = await login(formData.get('username'), formData.get('password'));
      if (!ok) {
        error.textContent = 'Invalid username or password.';
        return;
      }
      window.location.hash = 'dashboard';
    } catch (loginError) {
      error.textContent = loginError.message;
    }
  });
}

function renderField(field, value = '') {
  if (field.round && value !== '' && value !== null && value !== undefined) {
    value = Math.round(Number(value || 0));
  }
  if (field.hidden) {
    return `<input type="hidden" name="${field.name}" value="${escapeHtml(value)}">`;
  }
  const id = `field_${field.name}`;
  const required = field.required ? 'required' : '';
  const fieldClass = field.type === 'textarea' ? 'form-field full' : 'form-field';
  const options = field.options || [];

  if (field.type === 'select' || field.type === 'lookup') {
    const normalizedOptions = options.map((option) => {
      if (typeof option === 'object') {
        return option;
      }
      return { value: option, label: option };
    });
    return `
      <div class="${fieldClass}">
        <label for="${id}">${escapeHtml(field.label)}</label>
        <select id="${id}" name="${field.name}" ${required}>
          <option value="">Select ${escapeHtml(field.label)}</option>
          ${normalizedOptions.map((option) => `<option value="${escapeHtml(option.value)}" ${String(value) === String(option.value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
        </select>
      </div>
    `;
  }

  if (field.type === 'textarea') {
    return `
      <div class="${fieldClass}">
        <label for="${id}">${escapeHtml(field.label)}</label>
        <textarea id="${id}" name="${field.name}" ${required}>${escapeHtml(value)}</textarea>
      </div>
    `;
  }

  const numberStep = field.type === 'number' ? 'step="any"' : '';
  return `
    <div class="${fieldClass}">
      <label for="${id}">${escapeHtml(field.label)}</label>
      <input id="${id}" name="${field.name}" type="${field.type || 'text'}" value="${escapeHtml(value)}" ${numberStep} ${required}>
    </div>
  `;
}

function formatDisplayValue(field, value, row) {
  if (typeof field.display === 'function') {
    return field.display(value, row);
  }
  if (field.displayAs === 'time') {
    return formatTimeDisplay(value);
  }
  if (field.displayAs === 'hours') {
    const hours = Number(value || 0) / 60;
    return hours ? `${hours.toFixed(2)} hrs` : '';
  }
  if (field.displayAs === 'integer') {
    return value === '' || value === null || value === undefined ? '' : String(Math.round(Number(value || 0)));
  }
  if (field.displayAs === 'employeeName') {
    return getEmployeeName(value);
  }
  return value ?? '';
}

function formatTimeDisplay(value) {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const match = text.match(/(?:^|\s)(\d{1,2}):(\d{2})/);
  if (!match) return text;
  let hour = Number(match[1]);
  const minute = match[2];
  if (hour >= 24) hour -= 24;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}

function getEmployeeName(employeeID) {
  const employee = findCachedRow('Employees', 'EmployeeID', employeeID);
  return employee ? employee.EmployeeName : employeeID;
}

const lookupCache = {};

function uniqueValues(rows, fieldName) {
  return [...new Set(rows.map((row) => row[fieldName]).filter((value) => value !== undefined && value !== null && value !== ''))];
}

function lookupLabel(row, lookup) {
  const value = row[lookup.valueField];
  const labelParts = (lookup.labelFields || [lookup.valueField]).map((fieldName) => row[fieldName]).filter(Boolean);
  return labelParts.length ? `${value} - ${labelParts.join(' / ')}` : value;
}

async function loadLookupRows(sheetName) {
  if (!lookupCache[sheetName]) {
    lookupCache[sheetName] = await apiGet(`get${sheetName}`);
  }
  return lookupCache[sheetName];
}

async function prepareLookups(config) {
  await Promise.all(config.fields.map(async (field) => {
    if (field.lookup) {
      const rows = await loadLookupRows(field.lookup.sheet);
      field.type = 'lookup';
      field.options = rows.map((row) => ({
        value: row[field.lookup.valueField],
        label: lookupLabel(row, field.lookup),
      })).filter((option) => option.value);
    }
    if (field.optionsFrom) {
      const rows = await loadLookupRows(field.optionsFrom.sheet);
      field.type = 'select';
      field.options = uniqueValues(rows, field.optionsFrom.field);
    }
  }));
}

function setupCrudModule(config) {
  const state = { rows: [], filteredRows: [] };
  const section = document.querySelector(`[data-crud-page="${config.page}"]`);
  const head = section.querySelector('[data-table-head]');
  const body = section.querySelector('[data-table-body]');
  const modalRoot = section.querySelector('[data-modal-root]');
  const search = section.querySelector('[data-search]');
  const toolbar = section.querySelector('.toolbar');
  const dateFields = config.fields.filter((field) => field.type === 'date');

  if (config.preloadLookups) {
    config.preloadLookups.forEach((sheetName) => loadLookupRows(sheetName).then(renderTable).catch(() => {}));
  }

  function getDateFilterValues() {
    return {
      field: toolbar?.querySelector('[data-date-field]')?.value || '',
      from: toolbar?.querySelector('[data-date-from]')?.value || '',
      to: toolbar?.querySelector('[data-date-to]')?.value || '',
    };
  }

  function setupExportButtons() {
    if (!toolbar || toolbar.querySelector('[data-export-csv]')) {
      return;
    }

    if (config.monthEmployeeFilter) {
      toolbar.insertAdjacentHTML('beforeend', `
        <input class="range-input" type="month" data-month-filter aria-label="Month filter">
        <select class="range-select" data-employee-filter aria-label="Employee filter">
          <option value="">All Employees</option>
        </select>
        <button class="btn small" type="button" data-clear-month>Clear</button>
      `);
    } else if (dateFields.length) {
      toolbar.insertAdjacentHTML('beforeend', `
        <input class="range-input" type="month" data-month-filter aria-label="Month filter">
        <button class="btn small" type="button" data-clear-month>Clear</button>
      `);
    }

    toolbar.insertAdjacentHTML('beforeend', `
      <button class="btn small" type="button" data-export-csv>CSV</button>
      <button class="btn small" type="button" data-export-excel>Excel</button>
      <button class="btn small" type="button" data-export-pdf>PDF</button>
      ${['Parts', 'Orders'].includes(config.sheet) ? '<button class="btn small" type="button" data-drive-folder>Drive Folder</button>' : ''}
    `);

    toolbar.querySelector('[data-export-csv]').addEventListener('click', () => {
      exportRowsToCsv(config, state.filteredRows);
    });
    toolbar.querySelector('[data-export-excel]').addEventListener('click', () => {
      exportRowsToExcel(config, state.filteredRows);
    });
    toolbar.querySelector('[data-export-pdf]').addEventListener('click', () => {
      printRowsAsPdf(config, state.filteredRows);
    });

    toolbar.querySelectorAll('[data-month-filter], [data-employee-filter]').forEach((control) => {
      control.addEventListener('input', applySearch);
      control.addEventListener('change', applySearch);
    });

    toolbar.querySelector('[data-clear-month]')?.addEventListener('click', () => {
      toolbar.querySelector('[data-month-filter]').value = '';
      const employeeFilter = toolbar.querySelector('[data-employee-filter]');
      if (employeeFilter) employeeFilter.value = '';
      applySearch();
    });

    toolbar.querySelector('[data-clear-range]')?.addEventListener('click', () => {
      toolbar.querySelector('[data-date-from]').value = '';
      toolbar.querySelector('[data-date-to]').value = '';
      applySearch();
    });

    toolbar.querySelector('[data-drive-folder]')?.addEventListener('click', async () => {
      const row = state.filteredRows[0];
      if (!row) {
        alert('No record selected. Search or filter to the part/order you want first.');
        return;
      }

      const entityType = config.sheet === 'Parts' ? 'Part' : 'Order';
      const entityID = row[config.idField];
      const result = await apiPost('createDriveFolders', { entityType, entityID });
      if (result.folderUrl && confirm(`Drive folder is ready for ${entityID}. Open it now?`)) {
        window.open(result.folderUrl, '_blank');
      }
    });
  }

  function renderTable(rows = state.filteredRows) {
    const visibleFields = config.fields.filter((field) => !field.hidden && !field.tableHidden);
    head.innerHTML = `<tr>${visibleFields.map((field) => `<th>${escapeHtml(field.label)}</th>`).join('')}<th>Actions</th></tr>`;
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="${visibleFields.length + 1}">No records found.</td></tr>`;
      return;
    }
    body.innerHTML = rows.map((row, index) => `
      <tr>
        ${visibleFields.map((field) => {
          const value = row[field.name] ?? '';
          if (field.name.toLowerCase().includes('status')) {
            return `<td><span class="badge ${normalizeStatus(value)}">${escapeHtml(value)}</span></td>`;
          }
          return `<td>${escapeHtml(formatDisplayValue(field, value, row))}</td>`;
        }).join('')}
        <td>
          <div class="actions">
            <button class="btn small" type="button" data-edit="${index}">Edit</button>
            <button class="btn small danger" type="button" data-delete="${index}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function applySearch() {
    const term = search.value.trim().toLowerCase();
    const monthFilter = toolbar?.querySelector('[data-month-filter]')?.value || '';
    const employeeFilter = toolbar?.querySelector('[data-employee-filter]')?.value || '';
    const monthDateField = config.monthField || config.fields.find((field) => field.type === 'date')?.name || '';
    state.filteredRows = state.rows.filter((row) => {
      const textMatches = !term || JSON.stringify(row).toLowerCase().includes(term);
      if (!textMatches) {
        return false;
      }

      if (monthFilter && monthDateField && String(row[monthDateField] || '').slice(0, 7) !== monthFilter) {
        return false;
      }
      if (employeeFilter && String(row.EmployeeID || '') !== employeeFilter) {
        return false;
      }

      return true;
    });
    renderTable();
  }

  async function loadRows() {
    try {
      const rows = await apiGet(`get${config.sheet}`);
      state.rows = Array.isArray(rows) ? rows : [];
    } catch (error) {
      alert(error.message);
      state.rows = [];
    }
    state.filteredRows = [...state.rows];
    populateEmployeeFilter();
    if (config.defaultCurrentMonth) {
      const dateField = config.fields.find((field) => field.name === config.monthField) || config.fields.find((field) => field.type === 'date');
      const currentMonth = formatDateStamp().slice(0, 7);
      if (toolbar?.querySelector('[data-month-filter]')) {
        toolbar.querySelector('[data-month-filter]').value = currentMonth;
      } else if (toolbar?.querySelector('[data-date-from]') && toolbar?.querySelector('[data-date-to]')) {
        toolbar.querySelector('[data-date-from]').value = `${currentMonth}-01`;
        toolbar.querySelector('[data-date-to]').value = `${currentMonth}-31`;
      }
      state.filteredRows = dateField
        ? state.rows.filter((row) => String(row[dateField.name] || '').slice(0, 7) === currentMonth)
        : [...state.rows];
    }
    renderTable();
  }

  function populateEmployeeFilter() {
    const select = toolbar?.querySelector('[data-employee-filter]');
    if (!select) return;
    const employees = lookupCache.Employees || [];
    select.innerHTML = '<option value="">All Employees</option>' + employees.map((employee) => (
      `<option value="${escapeHtml(employee.EmployeeID)}">${escapeHtml(employee.EmployeeName || employee.EmployeeID)}</option>`
    )).join('');
  }

  async function openModal(row = null) {
    await prepareLookups(config);
    const isEdit = Boolean(row);
    const defaults = {};
    if (!isEdit && config.idField && config.idPrefix) {
      defaults[config.idField] = createId(config.idPrefix);
    }

    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <form class="modal" data-record-form>
          <div class="modal-header">
            <h2>${isEdit ? 'Edit' : 'Add'} ${escapeHtml(config.singular)}</h2>
            <button class="btn small" type="button" data-close-modal>Close</button>
          </div>
          <div class="form-grid">
            ${config.fields.map((field) => renderField(field, row?.[field.name] ?? defaults[field.name] ?? field.defaultValue ?? '')).join('')}
          </div>
          <div class="modal-footer">
            <button class="btn" type="button" data-close-modal>Cancel</button>
            <button class="btn primary" type="submit">Save</button>
          </div>
        </form>
      </div>
    `;

    modalRoot.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => {
        modalRoot.innerHTML = '';
      });
    });

    modalRoot.querySelector('[data-record-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const payload = Object.fromEntries(formData.entries());
      config.fields.forEach((field) => {
        if (field.round && payload[field.name] !== '') {
          payload[field.name] = String(Math.round(Number(payload[field.name] || 0)));
        }
      });
      await apiPost(`save${config.sheet}`, payload);
      delete lookupCache[config.sheet];
      modalRoot.innerHTML = '';
      await loadRows();
    });

    applyFormEnhancements(config, modalRoot);
  }

  setupExportButtons();
  section.querySelector('[data-add-record]')?.addEventListener('click', () => openModal());
  search.addEventListener('input', applySearch);
  body.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit]');
    const deleteButton = event.target.closest('[data-delete]');
    if (editButton) {
      openModal(state.filteredRows[Number(editButton.dataset.edit)]);
    }
    if (deleteButton) {
      const row = state.filteredRows[Number(deleteButton.dataset.delete)];
      const idValue = row[config.idField];
      if (confirm(`Delete ${idValue || 'this record'}?`)) {
        await apiPost(`delete${config.sheet}`, { idField: config.idField, idValue });
        delete lookupCache[config.sheet];
        await loadRows();
      }
    }
  });

  loadRows();
  return { loadRows };
}

function getFormField(root, name) {
  return root.querySelector(`[name="${name}"]`);
}

function setFormValue(root, name, value) {
  const field = getFormField(root, name);
  if (field && value !== undefined && value !== null) {
    field.value = value;
  }
}

function findCachedRow(sheetName, fieldName, value) {
  return (lookupCache[sheetName] || []).find((row) => String(row[fieldName]) === String(value));
}

function applyFormEnhancements(config, modalRoot) {
  if (config.sheet === 'Employees') {
    const salary = getFormField(modalRoot, 'MonthlySalary');
    const perDay = getFormField(modalRoot, 'PerDaySalary');
    const otRate = getFormField(modalRoot, 'OTRate');
    const recalcSalary = () => {
      const monthly = Number(salary?.value || 0);
      if (!monthly) return;
      if (perDay) perDay.value = (monthly / 26).toFixed(2);
      if (otRate) otRate.value = (monthly / 26 / 11).toFixed(2);
    };
    salary?.addEventListener('input', recalcSalary);
  }

  if (config.sheet === 'Orders') {
    getFormField(modalRoot, 'PartID')?.addEventListener('change', (event) => {
      const part = findCachedRow('Parts', 'PartID', event.target.value);
      setFormValue(modalRoot, 'ClientCode', part?.ClientCode || '');
    });
  }

  if (config.sheet === 'Invoices') {
    getFormField(modalRoot, 'OrderID')?.addEventListener('change', (event) => {
      const order = findCachedRow('Orders', 'OrderID', event.target.value);
      setFormValue(modalRoot, 'ClientCode', order?.ClientCode || '');
    });
  }

  if (config.sheet === 'CustomerPayments') {
    getFormField(modalRoot, 'InvoiceID')?.addEventListener('change', (event) => {
      const invoice = findCachedRow('Invoices', 'InvoiceID', event.target.value);
      setFormValue(modalRoot, 'ClientCode', invoice?.ClientCode || '');
      setFormValue(modalRoot, 'AmountReceived', invoice?.Amount || '');
    });
  }

  if (config.sheet === 'SalaryRegister') {
    getFormField(modalRoot, 'EmployeeID')?.addEventListener('change', (event) => {
      const employee = findCachedRow('Employees', 'EmployeeID', event.target.value);
      setFormValue(modalRoot, 'EmployeeName', employee?.EmployeeName || '');
    });
    const gross = getFormField(modalRoot, 'GrossSalary');
    const advance = getFormField(modalRoot, 'AdvanceDeducted');
    const other = getFormField(modalRoot, 'OtherDeductions');
    const net = getFormField(modalRoot, 'NetSalaryPayable');
    const recalcNet = () => {
      const value = Number(gross?.value || 0) - Number(advance?.value || 0) - Number(other?.value || 0);
      if (net) net.value = value ? value.toFixed(2) : '';
    };
    [gross, advance, other].forEach((field) => field?.addEventListener('input', recalcNet));

    const month = getFormField(modalRoot, 'Month');
    const employee = getFormField(modalRoot, 'EmployeeID');
    const recalcSalaryFromAttendance = async () => {
      const employeeID = employee?.value;
      const monthValue = month?.value?.slice(0, 7);
      if (!employeeID || !monthValue) return;

      const [attendanceRows, advanceRows] = await Promise.all([
        loadLookupRows('Attendance'),
        loadLookupRows('Advances'),
      ]);
      const employeeRow = findCachedRow('Employees', 'EmployeeID', employeeID);
      const otRateValue = Number(employeeRow?.OTRate || 0);
      const monthAttendance = attendanceRows.filter((row) => String(row.EmployeeID) === String(employeeID) && String(row.Date || '').slice(0, 7) === monthValue);
      const totalHours = monthAttendance.reduce((sum, row) => sum + (Number(row.WorkMinutes || 0) / 60) + Number(row.OTHours || 0), 0);
      const grossValue = totalHours * otRateValue;
      const advanceValue = advanceRows
        .filter((row) => String(row.EmployeeID) === String(employeeID) && String(row.Date || '').slice(0, 7) === monthValue && String(row.Status || '').toLowerCase() !== 'cancelled')
        .reduce((sum, row) => sum + Number(row.Amount || 0), 0);

      if (gross && grossValue) gross.value = grossValue.toFixed(2);
      if (advance) advance.value = advanceValue ? advanceValue.toFixed(2) : '';
      recalcNet();
    };
    month?.addEventListener('change', recalcSalaryFromAttendance);
    employee?.addEventListener('change', recalcSalaryFromAttendance);
  }

  if (config.sheet === 'Expenses') {
    const qty = getFormField(modalRoot, 'Qty');
    const rate = getFormField(modalRoot, 'Rate');
    const gst = getFormField(modalRoot, 'GST');
    const amount = getFormField(modalRoot, 'Amount');
    const recalcAmount = () => {
      const base = Number(qty?.value || 0) * Number(rate?.value || 0);
      const total = base + Number(gst?.value || 0);
      if (amount) amount.value = total ? total.toFixed(2) : '';
    };
    [qty, rate, gst].forEach((field) => field?.addEventListener('input', recalcAmount));
  }
}

function setupTabPanels(defaultPanel) {
  const buttons = document.querySelectorAll('[data-tab-target]');
  const panels = document.querySelectorAll('[data-tab-panel]');

  function showPanel(panelName) {
    buttons.forEach((button) => {
      button.classList.toggle('active', button.dataset.tabTarget === panelName);
    });
    panels.forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.tabPanel !== panelName);
    });
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => showPanel(button.dataset.tabTarget));
  });

  showPanel(defaultPanel);
}

async function initMastersPage() {
  await initClientsPage();
  await initPartsPage();
  await initVendorsPage();
  await initMachinesPage();
  await initEmployeesPage();
  setupTabPanels('clients');
}

async function initWorkPage() {
  await initOrdersPage();
  await initProductionPage();
  await initDispatchPage();
  setupTabPanels('orders');
}

async function initAccountsPage() {
  await initInvoicesPage();
  await initExpensesPage();
  await initAdvancesPage();
  await initSalaryRegisterPage();
  await initCustomerPaymentsPage();
  await initVendorPaymentsPage();
  setupTabPanels('invoices');
}

document.addEventListener('DOMContentLoaded', async () => {
  await initLayout();
  startRouter();
});
