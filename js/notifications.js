async function initNotificationsPage() {
  const body = document.getElementById('notificationsBody');
  const search = document.getElementById('notificationsSearch');
  const month = document.getElementById('notificationsMonth');
  const clear = document.getElementById('notificationsClear');
  let reminders = [];

  const today = formatDateStamp();

  function money(value) {
    return Math.round(Number(value || 0)).toLocaleString('en-IN');
  }

  function addReminder(list, item) {
    list.push({
      status: item.dueDate && item.dueDate < today ? 'Overdue' : 'Pending',
      ...item,
    });
  }

  async function buildReminders() {
    const [invoices, expenses, advances, salary, vendorPayments, vendors] = await Promise.all([
      apiGet('getInvoices').catch(() => []),
      apiGet('getExpenses').catch(() => []),
      apiGet('getAdvances').catch(() => []),
      apiGet('getSalaryRegister').catch(() => []),
      apiGet('getVendorPayments').catch(() => []),
      apiGet('getVendors').catch(() => []),
    ]);

    const list = [];
    invoices.filter((invoice) => String(invoice.IncludeInReports || 'Yes') !== 'No').forEach((invoice) => {
      if (!['paid', 'done'].includes(String(invoice.PaymentStatus || '').toLowerCase())) {
        addReminder(list, {
          type: 'Customer Payment',
          reference: invoice.InvoiceNo || invoice.InvoiceID,
          dueDate: invoice.DueDate || invoice.InvoiceDate,
          amount: invoice.Amount,
          note: `${invoice.ClientCode || ''} invoice payment pending`,
        });
      }
    });

    vendorPayments.forEach((payment) => {
      if (String(payment.PaymentStatus || '').toLowerCase() === 'paid') return;
      const vendor = vendors.find((item) => String(item.VendorID) === String(payment.VendorID));
      const vendorName = vendor?.VendorName || payment.VendorID || 'Vendor';
      const dueDate = parseDateValue(payment.DueDate);
      const todayDate = parseDateValue(today);
      const dayDiff = dueDate && todayDate ? Math.round((dueDate - todayDate) / 86400000) : null;
      if (dayDiff !== null && ![7, 3, 0].includes(dayDiff) && dayDiff >= 0) return;
      let note = `Payment of Rs. ${money(payment.AmountPaid)} to ${vendorName} is pending.`;
      if (dayDiff === 7 || dayDiff === 3) note = `Payment of Rs. ${money(payment.AmountPaid)} to ${vendorName} is due in ${dayDiff} days.`;
      if (dayDiff === 0) note = `Payment of Rs. ${money(payment.AmountPaid)} to ${vendorName} is due today.`;
      if (dayDiff < 0) note = `Payment of Rs. ${money(payment.AmountPaid)} to ${vendorName} is overdue by ${Math.abs(dayDiff)} days.`;
      addReminder(list, {
        type: 'Vendor Payment',
        reference: payment.ReferenceNo || payment.PaymentID,
        dueDate: payment.DueDate,
        amount: payment.AmountPaid,
        note,
      });
    });

    expenses.forEach((expense) => {
      if (!['paid', 'done'].includes(String(expense.PaymentStatus || '').toLowerCase())) {
        addReminder(list, {
          type: 'Expense Payment',
          reference: expense.ExpenseID,
          dueDate: expense.Date,
          amount: expense.Amount,
          note: expense.Description || expense.Category || 'Expense payment pending',
        });
      }
    });

    advances.forEach((advance) => {
      if (String(advance.Status || '').toLowerCase() === 'pending') {
        addReminder(list, {
          type: 'Employee Advance',
          reference: advance.EmployeeID,
          dueDate: advance.Date,
          amount: advance.Amount,
          note: 'Advance not deducted yet',
        });
      }
    });

    salary.forEach((entry) => {
      if (!String(entry.PaymentStatus || '').toLowerCase().startsWith('paid')) {
        addReminder(list, {
          type: 'Salary',
          reference: entry.EmployeeName || entry.EmployeeID,
          dueDate: entry.Month,
          amount: entry.NetSalaryPayable,
          note: 'Salary payment pending',
        });
      }
    });

    reminders = list.sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  }

  function render() {
    const term = search.value.trim().toLowerCase();
    const selectedMonth = month.value;
    const rows = reminders.filter((item) => {
      const matchesMonth = !selectedMonth || String(item.dueDate || '').slice(0, 7) === selectedMonth;
      const matchesSearch = !term || JSON.stringify(item).toLowerCase().includes(term);
      return matchesMonth && matchesSearch;
    });

    body.innerHTML = rows.length ? rows.map((item) => `
      <tr>
        <td>${escapeHtml(item.type)}</td>
        <td>${escapeHtml(item.reference)}</td>
        <td>${escapeHtml(formatDateDisplay(item.dueDate) || '')}</td>
        <td>${item.amount ? `Rs. ${escapeHtml(money(item.amount))}` : ''}</td>
        <td>${escapeHtml(item.note || '')}</td>
        <td><span class="badge ${normalizeStatus(item.status)}">${escapeHtml(item.status)}</span></td>
      </tr>
    `).join('') : '<tr><td colspan="6">No pending reminders.</td></tr>';
  }

  search.addEventListener('input', render);
  month.addEventListener('input', render);
  month.addEventListener('change', render);
  clear.addEventListener('click', () => {
    search.value = '';
    month.value = '';
    render();
  });

  await buildReminders();
  render();
}
