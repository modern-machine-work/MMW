async function initDispatchPage() {
  setupCrudModule({
    page: 'dispatch',
    sheet: 'Dispatch',
    singular: 'Dispatch',
    idField: 'DispatchID',
    idPrefix: 'DP',
    showView: true,
    tableFields: ['DispatchDate', 'PartName', 'QtyDispatched'],
    fields: [
      { name: 'DispatchID', label: 'Dispatch ID', required: true, readonly: true },
      { name: 'PartName', label: 'Part Name', hidden: true, display: (_, row) => {
        const order = findCachedRow('Orders', 'OrderID', row.OrderID);
        if (!order) return '';
        const part = findCachedRow('Parts', 'PartID', order.PartID);
        return part?.PartName || order.PartID || '';
      } },
      { name: 'OrderID', label: 'Order', required: true, lookup: { sheet: 'Orders', valueField: 'OrderID', labelFields: ['PartID', 'ClientCode'] }, displayFrom: { sheet: 'Orders', valueField: 'OrderID', labelFields: ['ClientCode', 'PartID'] } },
      { name: 'DispatchDate', label: 'Dispatch Date', type: 'date', required: true },
      { name: 'QtyDispatched', label: 'Qty Dispatched', type: 'number', required: true },
      { name: 'Remarks', label: 'Remarks', type: 'textarea' },
    ],
  });
}
