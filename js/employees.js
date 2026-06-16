async function initEmployeesPage() {
  setupCrudModule({
    page: 'employees',
    sheet: 'Employees',
    singular: 'Employee',
    idField: 'EmployeeID',
    idPrefix: 'EM',
    fields: [
      { name: 'EmployeeID', label: 'Employee ID', required: true },
      { name: 'EmployeeName', label: 'Employee Name', required: true },
      { name: 'Contact', label: 'Contact' },
      { name: 'Department', label: 'Department', optionsFrom: { sheet: 'Employees', field: 'Department' } },
      { name: 'Designation', label: 'Designation', optionsFrom: { sheet: 'Employees', field: 'Designation' } },
      { name: 'SalaryType', label: 'Salary Type', type: 'select', options: ['Monthly', 'Daily', 'Hourly'], defaultValue: 'Monthly' },
      { name: 'MonthlySalary', label: 'Monthly Salary', type: 'number' },
      { name: 'PerDaySalary', label: 'Per Day Salary', type: 'number' },
      { name: 'OTRate', label: 'OT Rate', type: 'number' },
      { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], defaultValue: 'Active' },
    ],
  });
}
