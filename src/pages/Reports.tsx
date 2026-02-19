import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAppState } from '../context/AppContext';

function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Array<Array<string | number | null>>): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '');
          const escaped = value.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(','),
    )
    .join('\n');
}

export default function Reports(): React.ReactElement {
  const { currentUser, inventory, requests, auditLogs } = useAppState();

  const visibleInventory =
    currentUser?.role === 'admin'
      ? inventory
      : inventory.filter((item) => item.department === currentUser?.department);

  const visibleRequests =
    currentUser?.role === 'admin'
      ? requests
      : requests.filter((request) => request.requesterId === currentUser?.id);

  const visibleLogs =
    currentUser?.role === 'admin'
      ? auditLogs
      : auditLogs.filter((log) => log.actorId === currentUser?.id || log.target.includes(currentUser?.id ?? ''));

  const exportInventoryExcel = () => {
    const header = ['ID', 'Name', 'Category', 'Department', 'Current Stock', 'Min Stock', 'Unit', 'Last Updated'];
    const rows = visibleInventory.map((item) => [
      item.id,
      item.name,
      item.category,
      item.department,
      item.currentStock,
      item.minStock,
      item.unit,
      item.lastUpdated,
    ]);
    const csv = toCsv([header, ...rows]);
    downloadFile('inventory-report.csv', csv, 'text/csv;charset=utf-8');
  };

  const exportAuditExcel = () => {
    const header = ['ID', 'Actor', 'Action', 'Target', 'Details', 'Timestamp'];
    const rows = visibleLogs.map((log) => [log.id, log.actorName, log.action, log.target, log.details, log.createdAt]);
    const csv = toCsv([header, ...rows]);
    downloadFile('audit-log-report.csv', csv, 'text/csv;charset=utf-8');
  };

  const exportPdf = () => {
    const section = document.getElementById('report-print-section');
    if (!section) {
      return;
    }
    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) {
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Lab Inventory Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; }
            h1,h2 { margin: 0 0 12px; }
            table { border-collapse: collapse; width: 100%; margin-top: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>${section.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const approvedCount = visibleRequests.filter((request) => request.status === 'approved' || request.status === 'partially_approved').length;
  const rejectedCount = visibleRequests.filter((request) => request.status === 'rejected').length;
  const pendingCount = visibleRequests.filter((request) => request.status === 'pending').length;

  return (
    <div className="hospital-scene-page min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Compliance</h1>
            <p className="mt-2 text-gray-600">Export inventory and audit evidence in PDF and Excel-ready formats.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm text-slate-500 uppercase">Approved</h3>
              <p className="text-2xl font-bold text-emerald-700">{approvedCount}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm text-slate-500 uppercase">Pending</h3>
              <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm text-slate-500 uppercase">Rejected</h3>
              <p className="text-2xl font-bold text-red-700">{rejectedCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-3">
            <button type="button" className="rounded-full bg-blue-700 text-white px-5 py-2" onClick={exportInventoryExcel}>
              Export Inventory (Excel)
            </button>
            <button type="button" className="rounded-full bg-slate-700 text-white px-5 py-2" onClick={exportAuditExcel}>
              Export Audit Logs (Excel)
            </button>
            <button type="button" className="rounded-full bg-emerald-700 text-white px-5 py-2" onClick={exportPdf}>
              Export Compliance Summary (PDF)
            </button>
          </div>

          <div id="report-print-section" className="bg-white rounded-lg border border-gray-200 p-4 space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Inventory Snapshot</h2>
              <p className="text-sm text-slate-600">Generated on {new Date().toLocaleString()}</p>
              <div className="overflow-x-auto mt-3">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Item</th>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Department</th>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleInventory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm">{item.name}</td>
                        <td className="px-3 py-2 text-sm">{item.department}</td>
                        <td className="px-3 py-2 text-sm">{item.currentStock} / min {item.minStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-900">Audit Log Extract</h2>
              <div className="overflow-x-auto mt-3">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Time</th>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Actor</th>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Action</th>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleLogs.slice(0, 12).map((log) => (
                      <tr key={log.id}>
                        <td className="px-3 py-2 text-sm">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2 text-sm">{log.actorName}</td>
                        <td className="px-3 py-2 text-sm">{log.action}</td>
                        <td className="px-3 py-2 text-sm">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

