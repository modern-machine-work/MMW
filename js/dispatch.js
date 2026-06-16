async function initDispatchPage() {
  setupCrudModule({
    page: 'dispatch',
    sheet: 'Dispatch',
    singular: 'Dispatch',
    idField: 'DispatchID',
    idPrefix: 'DP',
    fields: [
      { name: 'DispatchID', label: 'Dispatch ID', required: true, hidden: true },
      { name: 'OrderID', label: 'Order', required: true, lookup: { sheet: 'Orders', valueField: 'OrderID', labelFields: ['PartID', 'ClientCode'] } },
      { name: 'DispatchDate', label: 'Dispatch Date', type: 'date', required: true },
      { name: 'QtyDispatched', label: 'Qty Dispatched', type: 'number', required: true },
      { name: 'Remarks', label: 'Remarks', type: 'textarea' },
    ],
  });
}
