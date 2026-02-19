import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAppState } from '../context/AppContext';
import type { Department, Role } from '../types';

export default function Admin(): React.ReactElement {
  const {
    departments,
    users,
    permissions,
    lowStockItems,
    auditLogs,
    createDepartment,
    createUser,
    updateUser,
    toggleUserStatus,
    updatePermissions,
    exportDataSnapshot,
    importDataSnapshot,
    resetToSeedData,
  } = useAppState();

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'staff' as Role,
    department: '' as Department,
  });
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [profileDraft, setProfileDraft] = useState<Record<string, { name: string; department: Department }>>({});

  useEffect(() => {
    if (!newUser.department && departments.length > 0) {
      setNewUser((prev) => ({ ...prev, department: departments[0] }));
    }
  }, [departments, newUser.department]);

  return (
    <div className="hospital-scene-page min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Control Center</h1>
            <p className="mt-2 text-gray-600">Staff accounts, permissions, request accountability, and low-stock oversight.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Department Management</h2>
              <div className="flex gap-3 mb-4">
                <input
                  className="flex-1 rounded-full border border-slate-300 px-4 py-2"
                  placeholder="New department name"
                  value={newDepartmentName}
                  onChange={(event) => setNewDepartmentName(event.target.value)}
                />
                <button
                  type="button"
                  className="rounded-full bg-blue-700 text-white px-4 py-2"
                  onClick={async () => {
                    const departmentName = newDepartmentName.trim();
                    if (!departmentName) {
                      toast.error('Department name is required.');
                      return;
                    }
                    const result = await createDepartment(departmentName);
                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }
                    setNewDepartmentName('');
                    toast.success(result.message);
                  }}
                >
                  Add Department
                </button>
              </div>
              <div className="text-sm text-slate-700">
                Active departments: {departments.join(', ') || 'None'}
              </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Staff Account Management</h2>

              <div className="grid md:grid-cols-2 gap-3 mb-4">
                <input
                  className="rounded-full border border-slate-300 px-4 py-2"
                  placeholder="Full name"
                  value={newUser.name}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
                />
                <input
                  className="rounded-full border border-slate-300 px-4 py-2"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                />
                <select
                  className="rounded-full border border-slate-300 px-4 py-2"
                  value={newUser.role}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value as Role }))}
                >
                  <option value="staff">staff</option>
                  <option value="admin">admin</option>
                </select>
                <select
                  className="rounded-full border border-slate-300 px-4 py-2"
                  value={newUser.department}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, department: event.target.value as Department }))}
                >
                  {departments.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="rounded-full bg-blue-700 text-white px-5 py-2 hover:bg-blue-800"
                onClick={async () => {
                  if (!newUser.name.trim() || !newUser.email.trim()) {
                    toast.error('Name and email are required.');
                    return;
                  }
                  if (!newUser.department) {
                    toast.error('Select a department first.');
                    return;
                  }
                  const result = await createUser(newUser);
                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }
                  setNewUser({ name: '', email: '', role: 'staff', department: departments[0] ?? '' });
                  toast.success(result.message);
                }}
              >
                Create Account
              </button>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">User</th>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Role</th>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Department</th>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Status</th>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => {
                      const draft = profileDraft[user.id] ?? { name: user.name, department: user.department };
                      return (
                        <tr key={user.id}>
                          <td className="px-3 py-2 text-sm">
                            <input
                              className="w-full rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-900"
                              value={draft.name}
                              onChange={(event) =>
                                setProfileDraft((prev) => ({
                                  ...prev,
                                  [user.id]: {
                                    ...draft,
                                    name: event.target.value,
                                  },
                                }))
                              }
                            />
                            <div className="text-xs text-slate-500 mt-1">{user.email}</div>
                          </td>
                          <td className="px-3 py-2 text-sm uppercase">{user.role}</td>
                          <td className="px-3 py-2 text-sm">
                            <select
                              className="rounded-full border border-slate-300 px-3 py-1 text-xs"
                              value={draft.department}
                              onChange={(event) =>
                                setProfileDraft((prev) => ({
                                  ...prev,
                                  [user.id]: {
                                    ...draft,
                                    department: event.target.value as Department,
                                  },
                                }))
                              }
                            >
                              {departments.map((department) => (
                                <option key={department} value={department}>{department}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {user.isActive ? 'active' : 'inactive'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="rounded-full bg-blue-700 text-white px-3 py-1 text-xs"
                                onClick={async () => {
                                  if (!draft.name.trim()) {
                                    toast.error('Name cannot be empty.');
                                    return;
                                  }
                                  try {
                                    await updateUser(user.id, { name: draft.name.trim(), department: draft.department });
                                    toast.success('Staff details updated.');
                                  } catch (error) {
                                    toast.error(error instanceof Error ? error.message : 'Unable to update user.');
                                  }
                                }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="rounded-full bg-slate-800 text-white px-3 py-1 text-xs"
                                onClick={async () => {
                                  try {
                                    await toggleUserStatus(user.id);
                                    toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}.`);
                                  } catch (error) {
                                    toast.error(error instanceof Error ? error.message : 'Unable to change status.');
                                  }
                                }}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Departments & Permissions</h2>
              <div className="space-y-3">
                {permissions.map((permission) => (
                  <div key={permission.department} className="rounded-lg border border-slate-200 p-3">
                    <h3 className="font-medium text-slate-900 mb-2">{permission.department}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permission.canRequest}
                          onChange={async (event) => {
                            try {
                              await updatePermissions(permission.department, { canRequest: event.target.checked });
                              toast.success('Request permission updated.');
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : 'Unable to update permissions.');
                            }
                          }}
                        />
                        Request
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permission.canApprove}
                          onChange={async (event) => {
                            try {
                              await updatePermissions(permission.department, { canApprove: event.target.checked });
                              toast.success('Approve permission updated.');
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : 'Unable to update permissions.');
                            }
                          }}
                        />
                        Approve
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permission.canEditInventory}
                          onChange={async (event) => {
                            try {
                              await updatePermissions(permission.department, { canEditInventory: event.target.checked });
                              toast.success('Inventory permission updated.');
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : 'Unable to update permissions.');
                            }
                          }}
                        />
                        Edit inventory
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Low-Stock Alerts</h2>
              <ul className="space-y-2">
                {lowStockItems.map((item) => (
                  <li key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="font-medium text-amber-900">{item.name}</p>
                    <p className="text-sm text-amber-800">
                      {item.department} - {item.currentStock} / min {item.minStock} {item.unit}
                    </p>
                  </li>
                ))}
                {lowStockItems.length === 0 && <li className="text-sm text-slate-500">No active low-stock alerts.</li>}
              </ul>
            </section>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Audit Logs</h2>
              <div className="max-h-80 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">When</th>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Actor</th>
                      <th className="px-3 py-2 text-left text-xs uppercase text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-3 py-2 text-xs text-slate-600">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2 text-xs text-slate-800">{log.actorName}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Deployment Readiness Tools</h2>
              <p className="text-sm text-slate-600 mb-4">
                Backup and restore operational records for workplace continuity.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-blue-700 text-white px-4 py-2 text-sm"
                  onClick={async () => {
                    const raw = await exportDataSnapshot();
                    const blob = new Blob([raw], { type: 'application/json;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = `lab-inventory-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    anchor.click();
                    URL.revokeObjectURL(url);
                    toast.success('Backup exported.');
                  }}
                >
                  Export Backup
                </button>

                <label className="rounded-full bg-slate-700 text-white px-4 py-2 text-sm cursor-pointer">
                  Import Backup
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }
                      const raw = await file.text();
                      const result = await importDataSnapshot(raw);
                      if (result.ok) {
                        toast.success(result.message);
                      } else {
                        toast.error(result.message);
                      }
                      event.target.value = '';
                    }}
                  />
                </label>

                <button
                  type="button"
                  className="rounded-full bg-red-700 text-white px-4 py-2 text-sm"
                  onClick={async () => {
                    const shouldReset = window.confirm('Reset all system data to baseline records?');
                    if (!shouldReset) {
                      return;
                    }
                    try {
                      await resetToSeedData();
                      toast.success('System data reset completed.');
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Unable to reset baseline data.');
                    }
                  }}
                >
                  Reset to Baseline
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

