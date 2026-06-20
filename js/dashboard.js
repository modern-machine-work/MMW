async function initDashboardPage() {
  const statsRoot = document.getElementById('dashboardStats');
  const salesExpenseRoot = document.getElementById('salesExpenseChart');
  const productionRoot = document.getElementById('productionChart');
  const clientSalesRoot = document.getElementById('clientSalesChart');
  const notificationsRoot = document.getElementById('dashboardNotifications');
  const tooltip = document.getElementById('chartTooltip');
  const monthFilter = document.getElementById('dashboardMonth');
  const yearFilter = document.getElementById('dashboardYear');
  const financialYearFilter = document.getElementById('dashboardFinancialYear');
  const periodType = document.getElementById('dashboardPeriod');

  const money = (value) => `Rs. ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
  const amount = (value) => Number(value || 0);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateParts = (value) => {
    const text = String(value || '').slice(0, 10);
    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return { year: match[1], month: match[2], day: match[3] };
    match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) return { year: match[3], month: match[2], day: match[1] };
    return null;
  };
  const monthKey = (value) => {
    const parts = dateParts(value);
    return parts ? `${parts.year}-${parts.month}` : '';
  };
  const yearKey = (value) => dateParts(value)?.year || '';
  const fyKey = (value) => {
    const parts = dateParts(value);
    if (!parts) return '';
    const year = Number(parts.year);
    const month = Number(parts.month);
    const startYear = month >= 4 ? year : year - 1;
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
  };
  const selectedPeriod = () => {
    if (periodType.value === 'year') return /^\d{4}$/.test(yearFilter.value) ? yearFilter.value : '';
    return /^\d{4}-\d{2}$/.test(monthFilter.value) ? monthFilter.value : '';
  };
  const inPeriod = (dateValue) => !selectedPeriod() || (periodType.value === 'year' ? yearKey(dateValue) : monthKey(dateValue)) === selectedPeriod();
  const inFy = (dateValue, row = {}) => !financialYearFilter.value || String(row.FinancialYear || fyKey(dateValue)) === financialYearFilter.value;
  const scoped = (rows, dateField) => rows.filter((row) => inPeriod(row[dateField]) && inFy(row[dateField], row));
  const includedInvoices = (rows) => rows.filter((row) => String(row.IncludeInReports || 'Yes') !== 'No');
  const includedPayments = (payments, invoices) => {
    const excludedInvoiceIds = new Set(invoices
      .filter((invoice) => String(invoice.IncludeInReports || 'Yes') === 'No')
      .map((invoice) => String(invoice.InvoiceID)));
    return payments.filter((payment) => !payment.InvoiceID || !excludedInvoiceIds.has(String(payment.InvoiceID)));
  };

  function showTip(event, text) {
    tooltip.textContent = text;
    tooltip.style.left = `${event.clientX + 12}px`;
    tooltip.style.top = `${event.clientY + 12}px`;
    tooltip.classList.remove('hidden');
  }

  function hideTip() {
    tooltip.classList.add('hidden');
  }

  function groupSum(rows, valueField, dateField) {
    return rows.reduce((totals, row) => {
      const key = monthKey(row[dateField]);
      if (key) totals[key] = (totals[key] || 0) + amount(row[valueField]);
      return totals;
    }, {});
  }

  function renderStats(data) {
    const invoices = includedInvoices(scoped(data.invoices, 'InvoiceDate'));
    const expenses = scoped(data.expenses, 'Date');
    const production = scoped(data.production, 'Date');
    const payments = includedPayments(scoped(data.customerPayments, 'PaymentDate'), data.invoices);
    const sales = payments.reduce((sum, row) => sum + amount(row.AmountReceived), 0);
    const collections = payments.reduce((sum, row) => sum + amount(row.AmountReceived), 0);
    const expenseTotal = expenses.reduce((sum, row) => sum + amount(row.Amount), 0);
    const outstanding = invoices.filter((row) => !String(row.PaymentStatus || '').toLowerCase().startsWith('paid')).reduce((sum, row) => sum + amount(row.Amount), 0);
    const productionQty = production.reduce((sum, row) => sum + amount(row.OKQty), 0);
    const openOrders = data.orders.filter((row) => !['closed', 'dispatched'].includes(String(row.Status || '').toLowerCase())).length;
    const vendorOutstanding = data.vendorPayments
      .filter((row) => String(row.PaymentStatus || '').toLowerCase() === 'unpaid')
      .reduce((sum, row) => sum + amount(row.AmountPaid), 0);
    const cards = [
      ['Sales', money(sales)],
      ['Receivables', money(outstanding)],
      ['Profit / Loss', money(sales - expenseTotal)],
      ['Vendor Outstanding', money(vendorOutstanding)],
      ['Expenses', money(expenseTotal)],
    ];
    statsRoot.innerHTML = cards.map(([label, value]) => `<article class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('');
  }

  function shortMoney(value) {
    const rounded = Math.round(Number(value || 0));
    if (rounded >= 100000) return `\u20B9${(rounded / 100000).toFixed(rounded % 100000 ? 1 : 0)}L`;
    if (rounded >= 1000) return `\u20B9${Math.round(rounded / 1000)}K`;
    return `\u20B9${rounded}`;
  }
  function monthLabel(key) {
    const [, month] = String(key).split('-');
    return monthNames[Number(month) - 1] || key;
  }

  function svgGroupedBarChart(root, months, revenue, expenses) {
    if (!months.length) {
      root.innerHTML = '<div class="empty-chart">No data available</div>';
      return;
    }
    const width = 720;
    const height = 300;
    const padLeft = 62;
    const padRight = 24;
    const padTop = 28;
    const padBottom = 44;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;
    const max = Math.max(1, ...months.flatMap((m) => [revenue[m] || 0, expenses[m] || 0]));
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(max * ratio));
    const groupWidth = plotWidth / months.length;
    const barWidth = Math.min(18, Math.max(7, groupWidth * 0.28));
    const y = (value) => padTop + plotHeight - (value / max) * plotHeight;
    const bar = (value) => Math.max(value > 0 ? 2 : 1, (value / max) * plotHeight);
    root.innerHTML = `<svg viewBox="0 0 ${width} ${height}" class="chart-svg">
      ${ticks.map((tick) => {
        const tickY = y(tick);
        return `<path class="grid-line" d="M${padLeft},${tickY}H${width - padRight}"></path><text x="8" y="${tickY + 4}" class="axis-label">${shortMoney(tick)}</text>`;
      }).join('')}
      <path class="axis-line" d="M${padLeft},${height - padBottom}H${width - padRight}"></path>
      ${months.map((m, i) => {
        const center = padLeft + groupWidth * i + groupWidth / 2;
        const revenueValue = revenue[m] || 0;
        const expenseValue = expenses[m] || 0;
        const revenueHeight = bar(revenueValue);
        const expenseHeight = bar(expenseValue);
        return `
          <rect class="vbar revenue-bar" x="${center - barWidth - 2}" y="${height - padBottom - revenueHeight}" width="${barWidth}" height="${revenueHeight}" rx="5" data-tip="${m} | Revenue: ${money(revenueValue)} | Expenses: ${money(expenseValue)}"></rect>
          <rect class="vbar expense-bar" x="${center + 2}" y="${height - padBottom - expenseHeight}" width="${barWidth}" height="${expenseHeight}" rx="5" data-tip="${m} | Revenue: ${money(revenueValue)} | Expenses: ${money(expenseValue)}"></rect>
          <text x="${center}" y="${height - 13}" text-anchor="middle" class="axis-label">${monthLabel(m)}</text>
        `;
      }).join('')}
    </svg>`;
    bindChartTips(root);
  }

  function renderNotifications(data) {
    const today = formatDateStamp();
    const rows = [];
    includedInvoices(data.invoices).forEach((invoice) => {
      if (!String(invoice.PaymentStatus || '').toLowerCase().startsWith('paid')) {
        rows.push({
          type: 'Customer Payment',
          reference: invoice.InvoiceNo || invoice.InvoiceID,
          dueDate: invoice.DueDate || invoice.InvoiceDate,
          status: invoice.DueDate && invoice.DueDate < today ? 'Overdue' : 'Pending',
        });
      }
    });
    data.vendorPayments.forEach((payment) => {
      if (!String(payment.PaymentStatus || '').toLowerCase().startsWith('paid')) {
        rows.push({
          type: 'Vendor Payment',
          reference: payment.ReferenceNo || payment.PaymentID,
          dueDate: payment.DueDate || payment.BillDate,
          status: payment.DueDate && payment.DueDate < today ? 'Overdue' : 'Pending',
        });
      }
    });
    data.expenses.forEach((expense) => {
      if (!String(expense.PaymentStatus || '').toLowerCase().startsWith('paid')) {
        rows.push({
          type: 'Expense Payment',
          reference: expense.Description || expense.ExpenseID,
          dueDate: expense.Date,
          status: 'Pending',
        });
      }
    });
    notificationsRoot.innerHTML = rows.length ? rows.slice(0, 8).map((item) => `
      <tr>
        <td title="${escapeHtml(item.type)}">${escapeHtml(item.type)}</td>
        <td title="${escapeHtml(item.reference)}">${escapeHtml(item.reference)}</td>
        <td>${escapeHtml(formatDateDisplay(item.dueDate) || '')}</td>
        <td><span class="badge ${normalizeStatus(item.status)}">${escapeHtml(item.status)}</span></td>
      </tr>
    `).join('') : '<tr><td colspan="4">No pending notifications.</td></tr>';
  }

  function svgBarChart(root, labels, values, formatter = (v) => v) {
    if (!labels.length) {
      root.innerHTML = '<div class="empty-chart">No data available</div>';
      return;
    }
    const width = 720;
    const rowHeight = labels.length > 6 ? 34 : 42;
    const height = Math.max(180, labels.length * rowHeight + 40);
    const max = Math.max(1, ...values);
    root.innerHTML = `<svg viewBox="0 0 ${width} ${height}" class="chart-svg">
      ${labels.map((label, i) => {
        const y = 24 + i * rowHeight;
        const barWidth = ((values[i] || 0) / max) * 500;
        return `
          <text x="12" y="${y + 15}" class="axis-label">${escapeHtml(label)}</text>
          <rect class="hbar" x="70" y="${y}" width="${Math.max(3, barWidth)}" height="20" rx="5" data-tip="${escapeHtml(label)}: ${escapeHtml(formatter(values[i] || 0))}"></rect>
          <text x="${80 + barWidth}" y="${y + 15}" class="value-label">${escapeHtml(formatter(values[i] || 0))}</text>
        `;
      }).join('')}
    </svg>`;
    bindChartTips(root);
  }

  function bindChartTips(root) {
    root.querySelectorAll('[data-tip]').forEach((node) => {
      node.addEventListener('mousemove', (event) => showTip(event, node.dataset.tip));
      node.addEventListener('mouseleave', hideTip);
    });
  }

  function renderCharts(data) {
    const paymentRows = includedPayments(scoped(data.customerPayments, 'PaymentDate'), data.invoices);
    const expenseRows = scoped(data.expenses, 'Date');
    const productionRows = scoped(data.production, 'Date');
    const sales = groupSum(paymentRows, 'AmountReceived', 'PaymentDate');
    const expenses = groupSum(expenseRows, 'Amount', 'Date');
    const production = groupSum(productionRows, 'OKQty', 'Date');
    const months = Array.from(new Set([...Object.keys(sales), ...Object.keys(expenses), ...Object.keys(production)])).sort().slice(-12);
    svgGroupedBarChart(salesExpenseRoot, months, sales, expenses);
    svgBarChart(productionRoot, months, months.map((m) => production[m] || 0), (v) => Math.round(v).toLocaleString('en-IN'));

    const clientTotals = {};
    paymentRows.forEach((payment) => {
      const client = payment.ClientCode || 'Unknown';
      clientTotals[client] = (clientTotals[client] || 0) + amount(payment.AmountReceived);
    });
    const clients = Object.entries(clientTotals).sort((a, b) => b[1] - a[1]).slice(0, 8);
    svgBarChart(clientSalesRoot, clients.map(([client]) => client), clients.map(([, value]) => value), money);
  }

  async function loadDashboard() {
    const [clients, orders, production, invoices, expenses, customerPayments, vendorPayments] = await Promise.all([
      apiGet('getClients').catch(() => []),
      apiGet('getOrders').catch(() => []),
      apiGet('getProduction').catch(() => []),
      apiGet('getInvoices').catch(() => []),
      apiGet('getExpenses').catch(() => []),
      apiGet('getCustomerPayments').catch(() => []),
      apiGet('getVendorPayments').catch(() => []),
    ]);
    const data = { clients, orders, production, invoices, expenses, customerPayments, vendorPayments };
    const selectedFy = financialYearFilter.value;
    const years = uniqueValues(invoices.map((invoice) => ({ FinancialYear: invoice.FinancialYear || financialYearFromDate(invoice.InvoiceDate) })), 'FinancialYear').sort().reverse();
    financialYearFilter.innerHTML = '<option value="">All FY</option>' + years.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join('');
    if (years.includes(selectedFy)) financialYearFilter.value = selectedFy;
    renderStats(data);
    renderCharts(data);
    renderNotifications(data);
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
  [periodType, monthFilter, yearFilter, financialYearFilter].forEach((control) => control.addEventListener('change', () => {
    syncPeriodControls();
    loadDashboard();
  }));
  await loadDashboard();
}
