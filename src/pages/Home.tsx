import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Header from '../components/Header';
import Footer from '../components/Footer';
import DashboardStats from '../components/DashboardStats';
import RecentActivity from '../components/RecentActivity';
import { useAppState } from '../context/AppContext';

const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

const Home: React.FC = () => {
  const { currentUser, inventory, requests, auditLogs } = useAppState();

  const visibleInventory =
    currentUser?.role === 'admin'
      ? inventory
      : inventory.filter((item) => item.department === currentUser?.department);

  const visibleRequests =
    currentUser?.role === 'admin'
      ? requests
      : requests.filter((request) => request.requesterId === currentUser?.id);

  const requestByDept = useMemo(() => {
    const counts = requests.reduce<Record<string, number>>((acc, request) => {
      acc[request.department] = (acc[request.department] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: chartColors[index % chartColors.length],
    }));
  }, [requests]);

  const monthlySummary = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month) => {
      const monthRequests = requests.filter((request) =>
        new Date(request.requestDate).toLocaleDateString('en-US', { month: 'short' }) === month,
      );
      return {
        month,
        approved: monthRequests.filter((request) => request.status === 'approved' || request.status === 'partially_approved').length,
        rejected: monthRequests.filter((request) => request.status === 'rejected').length,
      };
    });
  }, [requests]);

  const approvedCount = visibleRequests.filter((request) => request.status !== 'pending' && request.status !== 'rejected').length;
  const pendingCount = visibleRequests.filter((request) => request.status === 'pending').length;
  const lowStockCount = visibleInventory.filter((item) => item.currentStock <= item.minStock).length;

  return (
    <div className="hospital-scene-page min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{currentUser?.role === 'admin' ? 'Admin Dashboard' : 'Staff Dashboard'}</h1>
            <p className="mt-2 text-gray-600">
              {currentUser?.role === 'admin'
                ? 'System-wide inventory visibility, approvals, and accountability overview.'
                : `Department-level snapshot for ${currentUser?.department} inventory and requests.`}
            </p>
          </div>

          <div className="mb-8">
            <DashboardStats
              totalItems={visibleInventory.length}
              lowStockCount={lowStockCount}
              approvedCount={approvedCount}
              pendingCount={pendingCount}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Request Outcomes</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlySummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="approved" fill="#10b981" name="Approved" />
                  <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Requests by Department</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={requestByDept}
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {requestByDept.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <RecentActivity logs={auditLogs} />
            </div>

            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link className="block w-full bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-full text-sm text-center" to="/inventory">
                    Update Inventory
                  </Link>
                  <Link className="block w-full bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-full text-sm text-center" to="/requests">
                    {currentUser?.role === 'admin' ? 'Review Pending Requests' : 'Submit New Request'}
                  </Link>
                  <Link className="block w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-full text-sm text-center" to="/reports">
                    Export Reports
                  </Link>
                  {currentUser?.role === 'admin' && (
                    <Link className="block w-full bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-full text-sm text-center" to="/admin">
                      Manage Staff & Permissions
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
