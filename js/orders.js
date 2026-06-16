async function initOrdersPage() {
  setupCrudModule({
    page: 'orders',
    sheet: 'Orders',
    singular: 'Order',
    idField: 'OrderID',
    idPrefix: 'OR',
    fields: [
      { name: 'OrderID', label: 'Order ID', required: true },
      { name: 'PartID', label: 'Part', required: true, lookup: { sheet: 'Parts', valueField: 'PartID', labelFields: ['PartName'] } },
      { name: 'ClientCode', label: 'Client', required: true, lookup: { sheet: 'Clients', valueField: 'ClientCode', labelFields: ['ClientName'] } },
      { name: 'ClientChallanNo', label: 'Client Challan No' },
      { name: 'PONo', label: 'PO No' },
      { name: 'WONo', label: 'WO No' },
      { name: 'ReceivedDate', label: 'Received Date', type: 'date' },
      { name: 'ReceivedQty', label: 'Received Qty', type: 'number' },
      { name: 'Rate', label: 'Rate', type: 'number' },
      { name: 'Status', label: 'Status', type: 'select', options: ['Pending', 'In Production', 'Ready', 'Dispatched', 'Closed'], defaultValue: 'Pending' },
      { name: 'Remarks', label: 'Remarks', type: 'textarea' },
    ],
  });
}
