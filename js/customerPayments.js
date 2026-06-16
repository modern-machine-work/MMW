async function initCustomerPaymentsPage() {
  setupCrudModule({
    page: 'customerPayments',
    sheet: 'CustomerPayments',
    singular: 'Customer Payment',
    idField: 'PaymentID',
    idPrefix: 'CP',
    fields: [
      { name: 'PaymentID', label: 'Payment ID', required: true, hidden: true },
      { name: 'InvoiceID', label: 'Invoice', required: true, lookup: { sheet: 'Invoices', valueField: 'InvoiceID', labelFields: ['InvoiceNo', 'Amount'] } },
      { name: 'ClientCode', label: 'Client', required: true, lookup: { sheet: 'Clients', valueField: 'ClientCode', labelFields: ['ClientName'] } },
      { name: 'AmountReceived', label: 'Amount Received', type: 'number', required: true },
      { name: 'PaymentDate', label: 'Payment Date', type: 'date' },
      { name: 'PaymentMode', label: 'Payment Mode', type: 'select', options: ['Cash', 'Bank', 'UPI', 'Cheque'], defaultValue: 'Bank' },
      { name: 'ReferenceNo', label: 'Reference No' },
      { name: 'Remarks', label: 'Remarks', type: 'textarea' },
    ],
  });
}
