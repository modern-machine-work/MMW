async function initInvoicesPage() {
  setupCrudModule({
    page: 'invoices',
    sheet: 'Invoices',
    singular: 'Invoice',
    idField: 'InvoiceID',
    idPrefix: 'IN',
    fields: [
      { name: 'InvoiceID', label: 'Invoice ID', required: true },
      { name: 'InvoiceNo', label: 'Invoice No', required: true },
      { name: 'OrderID', label: 'Order', required: true, lookup: { sheet: 'Orders', valueField: 'OrderID', labelFields: ['PartID', 'ClientCode'] } },
      { name: 'ClientCode', label: 'Client', required: true, lookup: { sheet: 'Clients', valueField: 'ClientCode', labelFields: ['ClientName'] } },
      { name: 'InvoiceDate', label: 'Invoice Date', type: 'date' },
      { name: 'Amount', label: 'Amount', type: 'number' },
      { name: 'DueDate', label: 'Due Date', type: 'date' },
      { name: 'PaymentStatus', label: 'Payment Status', type: 'select', options: ['Unpaid', 'Partial', 'Paid', 'Overdue'], defaultValue: 'Unpaid' },
      { name: 'PaymentDate', label: 'Payment Date', type: 'date' },
    ],
  });
}
