async function initClientsPage() {
  setupCrudModule({
    page: 'clients',
    sheet: 'Clients',
    singular: 'Client',
    idField: 'ClientCode',
    idPrefix: 'CL',
    fields: [
      { name: 'ClientCode', label: 'Client Code', required: true },
      { name: 'ClientName', label: 'Client Name', required: true },
      { name: 'GSTIN', label: 'GSTIN' },
      { name: 'Address', label: 'Address', type: 'textarea' },
      { name: 'StateCode', label: 'State Code' },
      { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], defaultValue: 'Active' },
    ],
  });
}
