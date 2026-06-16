async function initDashboardPage() {
  const statsRoot = document.getElementById('dashboardStats');
  const chartRoot = document.getElementById('dashboardChart');
  const notificationsRoot = document.getElementById('dashboardNotifications');
  const monthFilter = document.getElementById('dashboardMonth');
  const yearFilter = document.getElementById('dashboardYear');
  const periodType = document.getElementById('dashboardPeriod');

  function amount(value) {
    return Math.round(Number(value || 0));
  }

  function money(value) {
    return `Rs. ${amount(value).toLocaleString('en-IN')}`;
  }

  function periodKey(dateValue) {
    const date = String(dateValue || '');
    return periodType.value === 'year' ? date.slice(0, 4) : date.slice(0, 7);
  }

  function selectedPeriod() {
    return periodType.value === 'year' ? yearFilter.value : monthFilter.value;
  }

  function inPeriod(dateValue) {
    const selected = selectedPeriod();
    return !selected || periodKey(dateValue) === selected;
  }

  function sum(rows, field, dateField) {
    return rows.filter((row) => inPeriod(row[dateField])).reduce((total, row) => total + amount(row[field]), 0);
  }

  function countOpen(rows, statusField, closedStatuses) {
    return rows.filter((row) => !closedStatuses.includes(String(row[statusField] || '').toLowerCase())).length;
  }

  function monthlyTotals(rows, amountField, dateField) {
    const totals = {};
    rows.forEach((row) => {
      const key = String(row[dateField] || '').slice(0, 7);
      if (!key) return;
      totals[key] = (totals[key] || 0) + amount(row[amountField]);
    });
    return totals;
  }

  function buildAutoReminders(data) {
    const today = formatDateStamp();
    const reminders = [];
    data.invoices.forEach((invoice) => {
      if (!['paid', 'done'].includes(String(invoice.PaymentStatus || '').toLowerCase())) {
        reminders.push({
          type: 'Customer Payment',
          reference: invoice.InvoiceNo || invoice.InvoiceID,
          dueDate: invoice.DueDate || invoice.InvoiceDate,
          status: invoice.DueDate && invoice.DueDate < today ? 'Overdue' : 'Pending',
        });
      }
    });
    data.expenses.forEach((expense) => {
      if (!['paid', 'done'].includes(String(expense.PaymentStatus || '').toLowerCase())) {
        reminders.push({
          type: 'Expense Payment',
          reference: expense.Description || expense.ExpenseID,
          dueDate: expense.Date,
          status: 'Pending',
        });
      }
    });
    data.advances.forEach((advance) => {
      if (String(advance.Status || '').toLowerCase() === 'pending') {
        reminders.push({
          type: 'Advance',
          reference: advance.EmployeeID,
          dueDate: advance.Date,
          status: 'Pending',
        });
      }
    });
    data.salary.forEach((entry) => {
      if (!String(entry.PaymentStatus || '').toLowerCase().startsWith('paid')) {
        reminders.push({
          type: 'Salary',
          reference: entry.EmployeeName || entry.EmployeeID,
          dueDate: entry.Month,
          status: 'Pending',
        });
      }
    });
    return reminders.sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || ''))).slice(0, 8);
  }

  async function loadData() {
    const [clients, orders, production, dispatches, invoices, expenses, salary, advances, customerPayments, vendorPayments] = await Promise.all([
      apiGet('getClients').catch(() => []),
      apiGet('getOrders').catch(() => []),
      apiGet('getProduction').catch(() => []),
      apiGet('getDispatch').catch(() => []),
      apiGet('getInvoices').catch(() => []),
      apiGet('getExpenses').catch(() => []),
      apiGet('getSalaryRegister').catch(() => []),
      apiGet('getAdvances').catch(() => []),
      apiGet('getCustomerPayments').catch(() => []),
      apiGet('getVendorPayments').catch(() => []),
    ]);
    return { clients, orders, production, dispatches, invoices, expenses, salary, advances, customerPayments, vendorPayments };
  }

  function renderStats(data) {
    const sales = sum(data.invoices, 'Amount', 'InvoiceDate');
    const collections = sum(data.customerPayments, 'AmountReceived', 'PaymentDate');
    const expenses = sum(data.expenses, 'Amount', 'Date');
    const vendorPaid = sum(data.vendorPayments, 'AmountPaid', 'PaymentDate');
    const salaryCost = sum(data.salary, 'NetSalaryPayable', 'Month');
    const advancePaid = sum(data.advances, 'Amount', 'Date');
    const profit = sales - expenses - salaryCost;
    const receivable = data.invoices
      .filter((row) => !String(row.PaymentStatus || '').toLowerCase().startsWith('paid') && inPeriod(row.InvoiceDate || row.DueDate))
      .reduce((total, row) => total + amount(row.Amount), 0);

    const cards = [
      ['Sales', money(sales)],
      ['Collections', money(collections)],
      ['Expenses', money(expenses)],
      ['Salary', money(salaryCost)],
      ['Profit / Loss', money(profit)],
      ['Receivable', money(receivable)],
      ['Vendor Paid', money(vendorPaid)],
      ['Advance Paid', money(advancePaid)],
      ['Open Orders', countOpen(data.orders, 'Status', ['closed', 'dispatched'])],
      ['Production OK Qty', data.production.filter((row) => inPeriod(row.Date)).reduce((total, row) => total + amount(row.OKQty), 0)],
      ['Dispatch Qty', data.dispatches.filter((row) => inPeriod(row.DispatchDate)).reduce((total, row) => total + amount(row.QtyDispatched), 0)],
      ['Clients', data.clients.length],
    ];

    statsRoot.innerHTML = cards.map(([label, value]) => `
      <article class="stat-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join('');
  }

  function renderChart(data) {
    const sales = monthlyTotals(data.invoices, 'Amount', 'InvoiceDate');
    const expenses = monthlyTotals(data.expenses, 'Amount', 'Date');
    const salary = monthlyTotals(data.salary, 'NetSalaryPayable', 'Month');
    const months = Array.from(new Set([...Object.keys(sales), ...Object.keys(expenses), ...Object.keys(salary)])).sort().slice(-12);
    const max = Math.max(1, ...months.flatMap((month) => [sales[month] || 0, expenses[month] || 0, salary[month] || 0]));

    chartRoot.innerHTML = months.length ? months.map((month) => `
      <div class="chart-row">
        <span>${escapeHtml(month)}</span>
        <div class="chart-bars">
          <i class="bar sales" style="width:${Math.max(4, ((sales[month] || 0) / max) * 100)}%"></i>
          <i class="bar expense" style="width:${Math.max(4, ((expenses[month] || 0) / max) * 100)}%"></i>
          <i class="bar salary" style="width:${Math.max(4, ((salary[month] || 0) / max) * 100)}%"></i>
        </div>
      </div>
    `).join('') : '<p class="muted-text">No dated financial data found.</p>';
  }

  function renderReminders(data) {
    const reminders = buildAutoReminders(data).filter((item) => inPeriod(item.dueDate));
    notificationsRoot.innerHTML = reminders.length
      ? reminders.map((item) => `
          <tr>
            <td>${escapeHtml(item.type)}</td>
            <td>${escapeHtml(item.reference)}</td>
            <td>${escapeHtml(item.dueDate)}</td>
            <td><span class="badge ${normalizeStatus(item.status)}">${escapeHtml(item.status)}</span></td>
          </tr>
        `).join('')
      : '<tr><td colspan="4">No pending reminders.</td></tr>';
  }

  async function loadDashboard() {
    const data = await loadData();
    renderStats(data);
    renderChart(data);
    renderReminders(data);
  }

  function syncPeriodControls() {
    const isYear = periodType.value === 'year';
    monthFilter.classList.toggle('hidden', isYear);
    yearFilter.classList.toggle('hidden', !isYear);
  }

  const currentMonth = formatDateStamp().slice(0, 7);
  monthFilter.value = currentMonth;
  yearFilter.value = currentMonth.slice(0, 4);
  syncPeriodControls();

  document.getElementById('refreshDashboardBtn').addEventListener('click', loadDashboard);
  periodType.addEventListener('change', () => {
    syncPeriodControls();
    loadDashboard();
  });
  monthFilter.addEventListener('change', loadDashboard);
  yearFilter.addEventListener('input', loadDashboard);
  await loadDashboard();
}
