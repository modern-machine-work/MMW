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
    const [invoices, expenses, advances, salary, orders, dispatches] = await Promise.all([
      apiGet('getInvoices').catch(() => []),
      apiGet('getExpenses').catch(() => []),
      apiGet('getAdvances').catch(() => []),
      apiGet('getSalaryRegister').catch(() => []),
      apiGet('getOrders').catch(() => []),
      apiGet('getDispatch').catch(() => []),
    ]);

    const list = [];
    invoices.forEach((invoice) => {
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

    const dispatchedOrders = new Set(dispatches.map((dispatch) => String(dispatch.OrderID || '')));
    orders.forEach((order) => {
      const status = String(order.Status || '').toLowerCase();
      if (!['closed', 'dispatched'].includes(status) && !dispatchedOrders.has(String(order.OrderID || ''))) {
        addReminder(list, {
          type: 'Order',
          reference: order.OrderID,
          dueDate: order.ReceivedDate,
          amount: Number(order.ReceivedQty || 0) * Number(order.Rate || 0),
          note: `${order.PartID || ''} order is still open`,
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
        <td>${escapeHtml(item.dueDate || '')}</td>
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
