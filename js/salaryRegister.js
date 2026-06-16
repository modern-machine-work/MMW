async function initSalaryRegisterPage() {
  setupCrudModule({
    page: 'salaryRegister',
    sheet: 'SalaryRegister',
    singular: 'Salary Entry',
    idField: 'SalaryID',
    idPrefix: 'SAL',
    fields: [
      { name: 'SalaryID', label: 'Salary ID', required: true, hidden: true },
      { name: 'Month', label: 'Month', type: 'date', required: true },
      { name: 'EmployeeID', label: 'Employee', required: true, lookup: { sheet: 'Employees', valueField: 'EmployeeID', labelFields: ['EmployeeName'] } },
      { name: 'EmployeeName', label: 'Employee Name' },
      { name: 'GrossSalary', label: 'Gross Salary', type: 'number', round: true, displayAs: 'integer' },
      { name: 'AdvanceDeducted', label: 'Advance Deducted', type: 'number', round: true, displayAs: 'integer' },
      { name: 'OtherDeductions', label: 'Other Deductions', type: 'number', round: true, displayAs: 'integer' },
      { name: 'NetSalaryPayable', label: 'Net Salary Payable', type: 'number', round: true, displayAs: 'integer' },
      { name: 'PaymentStatus', label: 'Payment Status', type: 'select', options: ['Pending', 'Paid - Cash', 'Paid - Bank', 'Paid - UPI'], defaultValue: 'Pending' },
      { name: 'PaymentDate', label: 'Payment Date', type: 'date' },
    ],
  });
}
