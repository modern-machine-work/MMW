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
    sessionExpiredHandled = false;
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem('mmwUser', response.username || username);
    localStorage.setItem('mmwToken', response.token || '');
    return true;
  }
  return false;
}

function logout() {
  clearAuthState();
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
  return `${prefix}001`;
}

const ID_RULES = {
  Machines: { prefix: 'M', digits: 2 },
  Employees: { prefix: 'EMP', digits: 3 },
  Vendors: { prefix: 'V', digits: 3 },
  Orders: { prefix: 'ORD', digits: 3 },
  Production: { prefix: 'PROD', digits: 3 },
  Dispatch: { prefix: 'DSP', digits: 3 },
  Invoices: { prefix: 'INV', digits: 3, idField: 'InvoiceID' },
  CustomerPayments: { prefix: 'PAY', digits: 3 },
  VendorPayments: { prefix: 'VPAY', digits: 3 },
  Expenses: { prefix: 'EXP', digits: 3 },
  Attendance: { prefix: 'ATT', digits: 3 },
  Advances: { prefix: 'ADV', digits: 3 },
  Notifications: { prefix: 'NOT', digits: 3 },
  SalaryRegister: { prefix: 'SAL', digits: 3 },
};

function nextSequentialId(rows, sheet, idField) {
  const rule = ID_RULES[sheet];
  if (!rule) return '';
  const targetField = rule.idField || idField;
  const max = (rows || []).reduce((highest, row) => {
    const value = String(row[targetField] || '');
    const match = value.match(new RegExp(`^${rule.prefix}(\\d+)$`, 'i'));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${rule.prefix}${String(max + 1).padStart(rule.digits, '0')}`;
}

function nextPartId(rows, clientCode) {
  if (!clientCode) return '';
  const prefix = `MMW-${clientCode}-`;
  const max = (rows || []).reduce((highest, row) => {
    const value = String(row.PartID || '');
    if (!value.startsWith(prefix)) return highest;
    const number = Number(value.slice(prefix.length));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

function formatDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function financialYearFromDate(value) {
  const dateText = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return '';
  const [yearText, monthText] = dateText.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

function nextInvoiceNoForYear(invoices, financialYear) {
  const maxNo = (invoices || [])
    .filter((invoice) => String(invoice.FinancialYear || financialYearFromDate(invoice.InvoiceDate)) === String(financialYear))
    .map((invoice) => String(invoice.InvoiceNo || '').match(/M-(\d+)/i))
    .filter(Boolean)
    .reduce((max, match) => Math.max(max, Number(match[1] || 0)), 0);
  return `M-${String(maxNo + 1).padStart(3, '0')}`;
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
  const visibleFields = fields;
  const header = visibleFields.map((field) => csvCell(field.label)).join(',');
  const body = rows.map((row) => visibleFields.map((field) => csvCell(formatDisplayValue(field, row[field.name], row))).join(',')).join('\n');
  return [header, body].filter(Boolean).join('\n');
}

function exportRowsToCsv(config, rows) {
  const content = tableRowsToCsv(config.fields, rows);
  downloadBlob(`${safeFileName(config.sheet)}-${formatDateStamp()}.csv`, 'text/csv;charset=utf-8', content);
}

function exportRowsToExcel(config, rows) {
  const visibleFields = config.fields;
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
        <h2>Modern Machine Work - ${escapeHtml(config.sheet)}</h2>
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

  const visibleFields = config.fields;
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
      <h1>Modern Machine Work - ${escapeHtml(config.sheet)}</h1>
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
  const user = localStorage.getItem('mmwUser') || 'Admin';
  const userNode = document.getElementById('loggedInUser');
  if (userNode) userNode.textContent = user.charAt(0).toUpperCase() + user.slice(1);
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
  if (field.storeAsMinutes && value !== '' && value !== null && value !== undefined) {
    value = (Number(value || 0) / 60).toFixed(2);
  }
  if (field.hidden) {
    return `<input type="hidden" name="${field.name}" value="${escapeHtml(value)}">`;
  }
  const id = `field_${field.name}`;
  const required = field.required ? 'required' : '';
  const readonly = field.readonly ? 'readonly' : '';
  const fieldClass = field.type === 'textarea' ? 'form-field full' : 'form-field';
  const options = field.options || [];

  if (field.type === 'select' || field.type === 'lookup') {
    const selectedValues = field.multiple
      ? String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
      : [String(value)];
    const normalizedOptions = options.map((option) => {
      if (typeof option === 'object') {
        return option;
      }
      return { value: option, label: option };
    });
    if (field.type === 'lookup' || field.searchable) {
      const selectedLabels = selectedValues.map((selectedValue) => {
        const option = normalizedOptions.find((item) => String(item.value) === String(selectedValue));
        return option ? option.label : selectedValue;
      }).filter(Boolean).join(', ');
      return `
        <div class="${fieldClass}">
          <label for="${id}_search">${escapeHtml(field.label)}</label>
          <div class="combo" data-combo data-name="${escapeHtml(field.name)}" data-multiple="${field.multiple ? 'true' : 'false'}">
            <input id="${id}_search" class="combo-input" type="text" value="${escapeHtml(selectedLabels)}" placeholder="Search ${escapeHtml(field.label)}" autocomplete="off" ${required} ${field.readonly ? 'readonly' : ''}>
            <div class="combo-list hidden" role="listbox"></div>
            <select class="native-hidden" id="${id}" name="${field.name}" ${field.multiple ? 'multiple' : ''} ${required} ${field.readonly ? 'disabled' : ''}>
              ${field.multiple ? '' : `<option value="">Select ${escapeHtml(field.label)}</option>`}
              ${normalizedOptions.map((option) => `<option value="${escapeHtml(option.value)}" ${selectedValues.includes(String(option.value)) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
            </select>
          </div>
        </div>
      `;
    }
    return `
      <div class="${fieldClass}">
        <label for="${id}">${escapeHtml(field.label)}</label>
        <select id="${id}" name="${field.name}" ${field.multiple ? 'multiple size="6"' : ''} ${required} ${field.readonly ? 'disabled' : ''}>
          ${field.multiple ? '' : `<option value="">Select ${escapeHtml(field.label)}</option>`}
          ${normalizedOptions.map((option) => `<option value="${escapeHtml(option.value)}" ${selectedValues.includes(String(option.value)) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
        </select>
      </div>
    `;
  }

  if (field.type === 'textarea') {
    return `
      <div class="${fieldClass}">
        <label for="${id}">${escapeHtml(field.label)}</label>
        <textarea id="${id}" name="${field.name}" ${required} ${readonly}>${escapeHtml(value)}</textarea>
      </div>
    `;
  }

  const numberStep = field.type === 'number' ? 'step="any"' : '';
  return `
    <div class="${fieldClass}">
      <label for="${id}">${escapeHtml(field.label)}</label>
      <input id="${id}" name="${field.name}" type="${field.type || 'text'}" value="${escapeHtml(value)}" ${numberStep} ${field.min !== undefined ? `min="${escapeHtml(field.min)}"` : ''} ${required} ${readonly}>
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
  if (field.displayAs === 'plainHours') {
    return value === '' || value === null || value === undefined ? '' : `${Number(value || 0).toFixed(2)} hrs`;
  }
  if (field.displayAs === 'minutes') {
    return value === '' || value === null || value === undefined ? '' : `${Number(value || 0).toFixed(2)} min`;
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
  if (lookup.sheet === 'Orders' && row.PartID) {
    const part = findCachedRow('Parts', 'PartID', row.PartID);
    if (part?.PartName) labelParts.push(part.PartName);
  }
  return labelParts.length ? `${value} - ${labelParts.join(' / ')}` : value;
}

function resolveDisplayValue(row, field) {
  if (!field.displayFrom) return row[field.name] ?? '';
  const match = findCachedRow(field.displayFrom.sheet, field.displayFrom.valueField, row[field.name]);
  return match ? (field.displayFrom.labelFields || []).map((key) => match[key]).filter(Boolean).join(' / ') : row[field.name];
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
      if (field.lookup.sheet === 'Orders') {
        await loadLookupRows('Parts').catch(() => []);
      }
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
    } else if (config.financialYearFilter) {
      toolbar.insertAdjacentHTML('beforeend', `
        <select class="range-select" data-fy-filter aria-label="Financial year filter">
          <option value="">All Financial Years</option>
        </select>
        <input class="range-input" type="month" data-month-filter aria-label="Month filter">
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
      ${config.sheet === 'Parts' ? '<button class="btn small" type="button" data-drive-folder>Drive Folder</button>' : ''}
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
    toolbar.querySelector('[data-fy-filter]')?.addEventListener('change', applySearch);

    toolbar.querySelector('[data-clear-month]')?.addEventListener('click', () => {
      toolbar.querySelector('[data-month-filter]').value = '';
      const employeeFilter = toolbar.querySelector('[data-employee-filter]');
      if (employeeFilter) employeeFilter.value = '';
      const fyFilter = toolbar.querySelector('[data-fy-filter]');
      if (fyFilter) fyFilter.value = '';
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
        alert('No record selected. Search or filter to the part you want first.');
        return;
      }

      const entityType = 'Part';
      const entityID = row[config.idField];
      const result = await apiPost('createDriveFolders', { entityType, entityID });
      if (result.folderUrl && confirm(`Drive folder is ready for ${entityID}. Open it now?`)) {
        window.open(result.folderUrl, '_blank');
      }
    });
  }

  function renderTable(rows = state.filteredRows) {
    const visibleFields = (config.tableFields || config.fields.map((field) => field.name))
      .map((name) => config.fields.find((field) => field.name === name))
      .filter(Boolean);
    const detailFields = config.fields.filter((field) => !field.hidden);
    const hasDetails = config.showView !== false && detailFields.length > visibleFields.length;
    head.innerHTML = `<tr>${visibleFields.map((field) => `<th>${escapeHtml(field.label)}</th>`).join('')}<th class="actions-col">Actions</th></tr>`;
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="${visibleFields.length + 1}">No records found.</td></tr>`;
      return;
    }
    body.innerHTML = rows.map((row, index) => `
      <tr>
        ${visibleFields.map((field) => {
          const value = resolveDisplayValue(row, field);
          const displayValue = formatDisplayValue(field, value, row);
          if (field.name.toLowerCase().includes('status')) {
            return `<td><span class="badge ${normalizeStatus(value)}">${escapeHtml(value)}</span></td>`;
          }
          return `<td title="${escapeHtml(displayValue)}">${escapeHtml(displayValue)}</td>`;
        }).join('')}
        <td class="actions-cell">
          <div class="actions">
            ${hasDetails ? `<button class="btn small icon-btn" type="button" title="View" data-view="${index}">View</button>` : ''}
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
    const fyFilter = toolbar?.querySelector('[data-fy-filter]')?.value || '';
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
      if (fyFilter && String(row.FinancialYear || financialYearFromDate(row.InvoiceDate)) !== fyFilter) {
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
      lookupCache[config.sheet] = state.rows;
    } catch (error) {
      alert(error.message);
      state.rows = [];
    }
    state.filteredRows = [...state.rows];
    populateEmployeeFilter();
    populateFinancialYearFilter();
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

  function populateFinancialYearFilter() {
    const select = toolbar?.querySelector('[data-fy-filter]');
    if (!select) return;
    const selected = select.value;
    const years = uniqueValues(state.rows.map((row) => ({
      FinancialYear: row.FinancialYear || financialYearFromDate(row.InvoiceDate),
    })), 'FinancialYear').sort().reverse();
    select.innerHTML = '<option value="">All Financial Years</option>' + years.map((year) => (
      `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`
    )).join('');
    if (years.includes(selected)) select.value = selected;
  }

  async function openModal(row = null) {
    await prepareLookups(config);
    const isEdit = Boolean(row);
    const defaults = {};
    if (!isEdit && config.idField && config.idPrefix) {
      defaults[config.idField] = nextSequentialId(state.rows, config.sheet, config.idField) || createId(config.idPrefix);
    }
    if (!isEdit && config.sheet === 'Invoices') {
      defaults.InvoiceDate = formatDateStamp();
      defaults.FinancialYear = financialYearFromDate(defaults.InvoiceDate);
      defaults.InvoiceNo = nextInvoiceNoForYear(state.rows, defaults.FinancialYear);
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
    modalRoot.dataset.isEdit = isEdit ? 'true' : 'false';
    initSearchableCombos(modalRoot);

    modalRoot.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => {
        modalRoot.innerHTML = '';
      });
    });

    modalRoot.querySelector('[data-record-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      if (config.sheet === 'Invoices' && !validateInvoiceSelection(modalRoot, true)) {
        return;
      }
      const formData = new FormData(event.currentTarget);
      const payload = Object.fromEntries(formData.entries());
      config.fields.forEach((field) => {
        if (field.multiple) {
          payload[field.name] = formData.getAll(field.name).filter(Boolean).join(',');
        } else if (payload[field.name] === undefined) {
          const input = getFormField(modalRoot, field.name);
          if (input) payload[field.name] = input.value;
        }
        if (field.storeAsMinutes && payload[field.name] !== '') {
          payload[field.name] = String(Math.round(Number(payload[field.name] || 0) * 60));
        }
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
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) {
      openViewModal(state.filteredRows[Number(viewButton.dataset.view)]);
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

  function openViewModal(row) {
    const detailFields = config.fields.filter((field) => !field.hidden);
    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal detail-modal">
          <div class="modal-header">
            <h2>${escapeHtml(config.singular)} Details</h2>
            <button class="btn small" type="button" data-close-modal>Close</button>
          </div>
          <div class="detail-grid">
            ${detailFields.map((field) => `
              <div class="detail-item">
                <span>${escapeHtml(field.label)}</span>
                <strong>${escapeHtml(formatDisplayValue(field, resolveDisplayValue(row, field), row) || '-')}</strong>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    modalRoot.querySelector('[data-close-modal]').addEventListener('click', () => {
      modalRoot.innerHTML = '';
    });
  }
}

function initSearchableCombos(root) {
  root.querySelectorAll('[data-combo]').forEach((combo) => {
    const input = combo.querySelector('.combo-input');
    const list = combo.querySelector('.combo-list');
    const select = combo.querySelector('select');
    const multiple = combo.dataset.multiple === 'true';
    let activeIndex = -1;

    const options = () => Array.from(select.options).filter((option) => option.value);
    const selectedOptions = () => options().filter((option) => option.selected);
    const syncInput = () => {
      input.value = selectedOptions().map((option) => option.textContent).join(', ');
    };
    const renderList = () => {
      const query = input.value.toLowerCase();
      const selectedValues = new Set(selectedOptions().map((option) => option.value));
      const matches = options()
        .filter((option) => option.textContent.toLowerCase().includes(query) || option.value.toLowerCase().includes(query))
        .slice(0, 5);
      list.innerHTML = matches.length ? matches.map((option, index) => `
        <button class="combo-option ${selectedValues.has(option.value) ? 'selected' : ''} ${index === activeIndex ? 'active' : ''}" type="button" data-value="${escapeHtml(option.value)}">
          ${escapeHtml(option.textContent)}
        </button>
      `).join('') : '<div class="combo-empty">No matches</div>';
      list.classList.remove('hidden');
    };
    const choose = (value) => {
      const option = options().find((item) => item.value === value);
      if (!option) return;
      if (multiple) {
        option.selected = !option.selected;
      } else {
        options().forEach((item) => { item.selected = item === option; });
        list.classList.add('hidden');
      }
      syncInput();
      select.dispatchEvent(new Event('change', { bubbles: true }));
      if (multiple) renderList();
    };

    input.addEventListener('focus', () => {
      activeIndex = -1;
      renderList();
    });
    input.addEventListener('input', () => {
      activeIndex = -1;
      renderList();
    });
    input.addEventListener('keydown', (event) => {
      const items = Array.from(list.querySelectorAll('.combo-option'));
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeIndex = Math.min(items.length - 1, activeIndex + 1);
        renderList();
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
        renderList();
      }
      if (event.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
        event.preventDefault();
        choose(items[activeIndex].dataset.value);
      }
      if (event.key === 'Escape') {
        list.classList.add('hidden');
      }
    });
    list.addEventListener('click', (event) => {
      const option = event.target.closest('[data-value]');
      if (option) choose(option.dataset.value);
    });
    document.addEventListener('click', (event) => {
      if (!combo.contains(event.target)) list.classList.add('hidden');
    });
    syncInput();
  });
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
  if (config.sheet !== 'Clients') {
    getFormField(modalRoot, config.idField)?.setAttribute('readonly', 'readonly');
  }

  if (config.sheet === 'Parts') {
    const client = getFormField(modalRoot, 'ClientCode');
    const partId = getFormField(modalRoot, 'PartID');
    const syncPartId = () => {
      if (modalRoot.dataset.isEdit === 'true' || !partId || !client?.value) return;
      partId.value = nextPartId(lookupCache.Parts || [], client.value);
    };
    client?.addEventListener('change', syncPartId);
    syncPartId();
  }

  if (config.sheet === 'Employees') {
    const salary = getFormField(modalRoot, 'MonthlySalary');
    const perDay = getFormField(modalRoot, 'PerDaySalary');
    const perHour = getFormField(modalRoot, 'PerHourSalary');
    const recalcSalary = () => {
      const monthly = Number(salary?.value || 0);
      if (!monthly) return;
      if (perDay) perDay.value = (monthly / 26).toFixed(2);
      if (perHour) perHour.value = (monthly / 26 / 11).toFixed(2);
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
    const orderField = getFormField(modalRoot, 'OrderID');
    const invoiceDateField = getFormField(modalRoot, 'InvoiceDate');
    const invoiceNoField = getFormField(modalRoot, 'InvoiceNo');
    const financialYearField = getFormField(modalRoot, 'FinancialYear');
    const syncFinancialYear = async () => {
      const fy = financialYearFromDate(invoiceDateField?.value);
      if (financialYearField) financialYearField.value = fy;
      if (invoiceNoField && modalRoot.dataset.isEdit !== 'true') {
        const invoices = await loadLookupRows('Invoices').catch(() => []);
        invoiceNoField.value = nextInvoiceNoForYear(invoices, fy);
      }
    };
    const syncInvoiceClient = () => {
      return validateInvoiceSelection(modalRoot, true);
    };
    orderField?.addEventListener('change', syncInvoiceClient);
    invoiceDateField?.addEventListener('change', syncFinancialYear);
    syncFinancialYear();
    syncInvoiceClient();
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
      const perHourValue = Number(employeeRow?.PerHourSalary || employeeRow?.OTRate || 0);
      const monthAttendance = attendanceRows.filter((row) => String(row.EmployeeID) === String(employeeID) && String(row.Date || '').slice(0, 7) === monthValue);
      const totalHours = monthAttendance.reduce((sum, row) => sum + (Number(row.WorkMinutes || 0) / 60) + Number(row.OTHours || 0), 0);
      const grossValue = totalHours * perHourValue;
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

  if (config.sheet === 'Attendance') {
    const checkIn = getFormField(modalRoot, 'CheckIn');
    const breakStart = getFormField(modalRoot, 'BreakStart');
    const breakEnd = getFormField(modalRoot, 'BreakEnd');
    const checkOut = getFormField(modalRoot, 'CheckOut');
    const workMinutes = getFormField(modalRoot, 'WorkMinutes');
    const otHours = getFormField(modalRoot, 'OTHours');
    const toMinutes = (value) => {
      if (!value) return null;
      const [h, m] = value.split(':').map(Number);
      return h * 60 + m;
    };
    const diff = (start, end) => {
      if (start === null || end === null) return 0;
      return end < start ? end + 1440 - start : end - start;
    };
    const recalc = () => {
      const inTime = toMinutes(checkIn?.value);
      const outTime = toMinutes(checkOut?.value);
      if (inTime === null || outTime === null) return;
      const breakMinutes = diff(toMinutes(breakStart?.value), toMinutes(breakEnd?.value));
      const total = Math.max(0, diff(inTime, outTime) - breakMinutes);
      const hours = total / 60;
      if (workMinutes) workMinutes.value = hours.toFixed(2);
      if (otHours) otHours.value = (Math.max(0, hours - 10) || 0).toFixed(2);
    };
    [checkIn, breakStart, breakEnd, checkOut].forEach((field) => field?.addEventListener('change', recalc));
  }
}

function validateInvoiceSelection(modalRoot, report = false) {
  const orderField = getFormField(modalRoot, 'OrderID');
  const clientField = getFormField(modalRoot, 'ClientCode');
  const selectedOrderIDs = Array.from(orderField?.selectedOptions || []).map((option) => option.value).filter(Boolean);
  if (!selectedOrderIDs.length) {
    if (clientField) {
      clientField.disabled = false;
      clientField.setCustomValidity('');
    }
    if (orderField) orderField.setCustomValidity('');
    return true;
  }

  const selectedOrders = selectedOrderIDs.map((orderID) => findCachedRow('Orders', 'OrderID', orderID)).filter(Boolean);
  const clients = [...new Set(selectedOrders.map((order) => String(order.ClientCode || '')).filter(Boolean))];
  if (clients.length > 1) {
    orderField.setCustomValidity('Selected orders must belong to the same client.');
    if (report) orderField.reportValidity();
    if (clientField) {
      clientField.disabled = false;
      clientField.value = '';
    }
    return false;
  }

  orderField.setCustomValidity('');
  if (clientField) {
    clientField.value = clients[0] || '';
    clientField.disabled = Boolean(clients[0]);
  }
  return true;
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
