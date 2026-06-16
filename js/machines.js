async function initMachinesPage() {
  setupCrudModule({
    page: 'machines',
    sheet: 'Machines',
    singular: 'Machine',
    idField: 'MachineID',
    idPrefix: 'MC',
    fields: [
      { name: 'MachineID', label: 'Machine ID', required: true },
      { name: 'MachineName', label: 'Machine Name', required: true },
      { name: 'MachineType', label: 'Machine Type' },
      { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'Maintenance'], defaultValue: 'Active' },
    ],
  });
}
