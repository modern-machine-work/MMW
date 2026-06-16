async function initExpensesPage() {
  setupCrudModule({
    page: 'expenses',
    sheet: 'Expenses',
    singular: 'Expense',
    idField: 'ExpenseID',
    idPrefix: 'EX',
    fields: [
      { name: 'ExpenseID', label: 'Expense ID', required: true, hidden: true },
      { name: 'Date', label: 'Date', type: 'date', required: true },
      { name: 'VendorID', label: 'Vendor (Optional)', lookup: { sheet: 'Vendors', valueField: 'VendorID', labelFields: ['VendorName'] } },
      { name: 'Category', label: 'Category', type: 'select', options: ['Material', 'Tools', 'Consumables', 'Office', 'Utility', 'Repair', 'Transport', 'Food', 'General Purchase', 'Other'] },
      { name: 'Description', label: 'Description', type: 'textarea' },
      { name: 'Qty', label: 'Qty', type: 'number' },
      { name: 'Rate', label: 'Rate', type: 'number' },
      { name: 'GST', label: 'GST', type: 'number' },
      { name: 'Amount', label: 'Amount', type: 'number' },
      { name: 'PaymentStatus', label: 'Payment Status', type: 'select', options: ['Unpaid', 'Partial', 'Paid'], defaultValue: 'Unpaid' },
    ],
  });
}
