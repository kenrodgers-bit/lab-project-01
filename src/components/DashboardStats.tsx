import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Package } from 'lucide-react';

interface DashboardStatsProps {
  totalItems: number;
  lowStockCount: number;
  approvedCount: number;
  pendingCount: number;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({
  totalItems,
  lowStockCount,
  approvedCount,
  pendingCount,
}) => {
  const stats = [
    { name: 'Total Items', value: totalItems, icon: Package, color: 'bg-blue-600 text-blue-700' },
    { name: 'Low-Stock Alerts', value: lowStockCount, icon: AlertTriangle, color: 'bg-amber-500 text-amber-700' },
    { name: 'Approved Requests', value: approvedCount, icon: CheckCircle2, color: 'bg-emerald-600 text-emerald-700' },
    { name: 'Pending Requests', value: pendingCount, icon: Clock3, color: 'bg-slate-600 text-slate-700' },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.name}
          className="relative bg-white pt-5 px-4 pb-10 sm:pt-6 sm:px-6 shadow-sm rounded-lg overflow-hidden border border-gray-200"
        >
          <div className={`absolute rounded-md p-3 ${item.color.split(' ')[0]}`}>
            <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div className="ml-16">
            <p className="text-sm font-medium text-gray-500 truncate">{item.name}</p>
            <p className={`text-2xl font-semibold ${item.color.split(' ')[1]}`}>{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;