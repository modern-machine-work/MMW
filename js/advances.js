async function initAdvancesPage() {
  setupCrudModule({
    page: 'advances',
    sheet: 'Advances',
    singular: 'Advance',
    idField: 'AdvanceID',
    idPrefix: 'AD',
    fields: [
      { name: 'AdvanceID', label: 'Advance ID', required: true, hidden: true },
      { name: 'EmployeeID', label: 'Employee', required: true, lookup: { sheet: 'Employees', valueField: 'EmployeeID', labelFields: ['EmployeeName'] } },
      { name: 'Date', label: 'Date', type: 'date', required: true },
      { name: 'Amount', label: 'Amount', type: 'number', required: true },
      { name: 'Status', label: 'Status', type: 'select', options: ['Pending', 'Adjusted', 'Cancelled'], defaultValue: 'Pending' },
      { name: 'Remarks', label: 'Remarks', type: 'textarea' },
    ],
  });
}
