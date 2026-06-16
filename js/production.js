async function initProductionPage() {
  setupCrudModule({
    page: 'production',
    sheet: 'Production',
    singular: 'Production',
    idField: 'ProductionID',
    idPrefix: 'PR',
    fields: [
      { name: 'ProductionID', label: 'Production ID', required: true, hidden: true },
      { name: 'Date', label: 'Date', type: 'date', required: true },
      { name: 'OrderID', label: 'Order', required: true, lookup: { sheet: 'Orders', valueField: 'OrderID', labelFields: ['PartID', 'ClientCode'] } },
      { name: 'MachineID', label: 'Machine', required: true, lookup: { sheet: 'Machines', valueField: 'MachineID', labelFields: ['MachineName'] } },
      { name: 'EmployeeID', label: 'Employee', required: true, lookup: { sheet: 'Employees', valueField: 'EmployeeID', labelFields: ['EmployeeName'] } },
      { name: 'Shift', label: 'Shift', type: 'select', options: ['Day', 'Night'], defaultValue: 'Day' },
      { name: 'Code', label: 'Code' },
      { name: 'OKQty', label: 'OK Qty', type: 'number' },
      { name: 'ReworkQty', label: 'Rework Qty', type: 'number' },
      { name: 'RejectQty', label: 'Reject Qty', type: 'number' },
      { name: 'Remarks', label: 'Remarks', type: 'textarea' },
    ],
  });
}
