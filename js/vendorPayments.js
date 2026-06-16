async function initVendorPaymentsPage() {
  setupCrudModule({
    page: 'vendorPayments',
    sheet: 'VendorPayments',
    singular: 'Vendor Payment',
    idField: 'PaymentID',
    idPrefix: 'VP',
    fields: [
      { name: 'PaymentID', label: 'Payment ID', required: true, hidden: true },
      { name: 'VendorID', label: 'Vendor', required: true, lookup: { sheet: 'Vendors', valueField: 'VendorID', labelFields: ['VendorName'] } },
      { name: 'AmountPaid', label: 'Amount Paid', type: 'number', required: true },
      { name: 'PaymentDate', label: 'Payment Date', type: 'date' },
      { name: 'PaymentMode', label: 'Payment Mode', type: 'select', options: ['Cash', 'Bank', 'UPI', 'Cheque'], defaultValue: 'Bank' },
      { name: 'ReferenceNo', label: 'Reference No' },
      { name: 'Remarks', label: 'Remarks', type: 'textarea' },
    ],
  });
}
