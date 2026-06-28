async function initExpensesPage() {
  setupCrudModule({
    page: 'expenses',
    sheet: 'Expenses',
    singular: 'Expense',
    idField: 'ExpenseID',
    idPrefix: 'EX',
    showView: true,
    tableFields: ['Date', 'Category', 'Description', 'Amount', 'PaymentStatus'],
    fields: [
      { name: 'ExpenseID', label: 'Expense ID', required: true, readonly: true },
      { name: 'Date', label: 'Date', type: 'date', required: true },
      { name: 'VendorID', label: 'Vendor (Optional)', lookup: { sheet: 'Vendors', valueField: 'VendorID', labelFields: ['VendorName'] }, displayFrom: { sheet: 'Vendors', valueField: 'VendorID', labelFields: ['VendorName'] } },
      { name: 'Category', label: 'Category', type: 'select', options: ['Material', 'Rent', 'Electricity bill', 'Tools', 'Maintenance', 'Office', 'Utility', 'Repair', 'Scrap Bill', 'Food', 'Oils & Lubricants', 'General Purchase', 'Other'] },
      { name: 'Description', label: 'Description', type: 'textarea' },
      { name: 'Qty', label: 'Qty', type: 'number' },
      { name: 'Rate', label: 'Rate', type: 'number' },
      { name: 'GST', label: 'GST', type: 'number' },
      { name: 'Amount', label: 'Amount', type: 'number' },
      { name: 'PaymentStatus', label: 'Payment Status', type: 'select', options: ['Unpaid', 'Partial', 'Paid'], defaultValue: 'Unpaid' },
      { name: 'SalaryID', label: 'SalaryID', type: 'text', hidden: true },
    ],
  });
}
