async function initPartsPage() {
  setupCrudModule({
    page: 'parts',
    sheet: 'Parts',
    singular: 'Part',
    idField: 'PartID',
    idPrefix: 'PT',
    fields: [
      { name: 'PartID', label: 'Part ID', required: true },
      { name: 'PartName', label: 'Part Name', required: true },
      { name: 'ClientCode', label: 'Client', required: true, lookup: { sheet: 'Clients', valueField: 'ClientCode', labelFields: ['ClientName'] } },
      { name: 'DrawingNo', label: 'Drawing No' },
      { name: 'ProgramNo', label: 'Program No' },
      { name: 'CycleTime', label: 'Cycle Time', type: 'number' },
      { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], defaultValue: 'Active' },
    ],
  });
}
