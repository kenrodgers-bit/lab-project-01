import React, { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import { toast } from 'react-toastify';
import Footer from '../components/Footer';
import { useAppState } from '../context/AppContext';
import type { Department, InventoryItem } from '../types';

function parseNonNegativeInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export default function Inventory(): React.ReactElement {
  const { currentUser, departments, inventory, addInventoryItem, updateInventoryItem } = useAppState();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<'all' | Department>('all');
  const [stockDraft, setStockDraft] = useState<Record<string, number>>({});
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Consumables',
    department: '' as Department,
    currentStock: 0,
    minStock: 0,
    unit: 'pieces',
  });

  const canEdit = currentUser?.role === 'admin';
  const departmentFilterOptions: Array<'all' | Department> = useMemo(
    () => ['all', ...departments],
    [departments],
  );

  useEffect(() => {
    if (!newItem.department && departments.length > 0) {
      setNewItem((prev) => ({ ...prev, department: departments[0] }));
    }
  }, [departments, newItem.department]);

  useEffect(() => {
    if (selectedDepartment !== 'all' && !departments.includes(selectedDepartment)) {
      setSelectedDepartment('all');
    }
  }, [departments, selectedDepartment]);

  const visibleInventory = useMemo(() => {
    const base = currentUser?.role === 'admin'
      ? inventory
      : inventory.filter((item) => item.department === currentUser?.department);

    return base.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = selectedDepartment === 'all' || item.department === selectedDepartment;
      return matchesSearch && matchesDepartment;
    });
  }, [currentUser, inventory, searchTerm, selectedDepartment]);

  const getStatus = (item: InventoryItem): { label: string; className: string } => {
    if (item.currentStock === 0) {
      return { label: 'Out of stock', className: 'bg-red-100 text-red-700' };
    }
    if (item.currentStock <= item.minStock) {
      return { label: 'Low stock', className: 'bg-amber-100 text-amber-700' };
    }
    return { label: 'In stock', className: 'bg-emerald-100 text-emerald-700' };
  };

  return (
    <div className="hospital-scene-page min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="mt-2 text-gray-600">
              {currentUser?.role === 'admin'
                ? 'Real-time inventory visibility and stock adjustments across all departments.'
                : `Inventory visibility for ${currentUser?.department}.`}
            </p>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                className="flex-1 rounded-full border border-slate-300 px-4 py-2"
                placeholder="Search commodity or category"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <select
                className="rounded-full border border-slate-300 px-4 py-2"
                value={selectedDepartment}
                onChange={(event) => setSelectedDepartment(event.target.value as 'all' | Department)}
              >
                {departmentFilterOptions.map((department) => (
                  <option key={department} value={department}>
                    {department === 'all' ? 'All departments' : department}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {canEdit && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Add Commodity</h2>
              <div className="grid md:grid-cols-3 gap-3">
                <input
                  className="rounded-full border border-slate-300 px-4 py-2"
                  placeholder="Commodity name"
                  value={newItem.name}
                  onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
                />
                <input
                  className="rounded-full border border-slate-300 px-4 py-2"
                  placeholder="Category"
                  value={newItem.category}
                  onChange={(event) => setNewItem((prev) => ({ ...prev, category: event.target.value }))}
                />
                <select
                  className="rounded-full border border-slate-300 px-4 py-2"
                  value={newItem.department}
                  onChange={(event) => setNewItem((prev) => ({ ...prev, department: event.target.value as Department }))}
                >
                  {departments.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="rounded-full border border-slate-300 px-4 py-2"
                  placeholder="Current stock"
                  value={newItem.currentStock}
                  onChange={(event) =>
                    setNewItem((prev) => ({ ...prev, currentStock: parseNonNegativeInt(event.target.value) }))
                  }
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="rounded-full border border-slate-300 px-4 py-2"
                  placeholder="Minimum stock"
                  value={newItem.minStock}
                  onChange={(event) =>
                    setNewItem((prev) => ({ ...prev, minStock: parseNonNegativeInt(event.target.value) }))
                  }
                />
                <input
                  className="rounded-full border border-slate-300 px-4 py-2"
                  placeholder="Unit"
                  value={newItem.unit}
                  onChange={(event) => setNewItem((prev) => ({ ...prev, unit: event.target.value }))}
                />
              </div>
              <button
                type="button"
                className="mt-3 rounded-full bg-blue-700 text-white px-5 py-2 hover:bg-blue-800 disabled:opacity-50"
                disabled={!newItem.department}
                onClick={async () => {
                  if (!newItem.name.trim()) {
                    toast.error('Commodity name is required.');
                    return;
                  }
                  try {
                    await addInventoryItem(newItem);
                    setNewItem({
                      name: '',
                      category: 'Consumables',
                      department: departments[0] ?? '',
                      currentStock: 0,
                      minStock: 0,
                      unit: 'pieces',
                    });
                    toast.success('Inventory item added.');
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Unable to add inventory item.');
                  }
                }}
              >
                Add Item
              </button>
            </div>
          )}

          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-600">Commodity</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-600">Department</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-600">Stock</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-600">Last Updated</th>
                  {canEdit && <th className="px-4 py-3 text-left text-xs uppercase text-slate-600">Adjust</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleInventory.map((item) => {
                  const status = getStatus(item);
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.category}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.department}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {item.currentStock} {item.unit}
                        <div className="text-xs text-slate-500">Min: {item.minStock}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(item.lastUpdated).toLocaleString()}</td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="w-24 rounded-full border border-slate-300 px-3 py-1 text-sm"
                              placeholder="Stock"
                              value={stockDraft[item.id] ?? item.currentStock}
                              onChange={(event) =>
                                setStockDraft((prev) => ({
                                  ...prev,
                                  [item.id]: parseNonNegativeInt(event.target.value),
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="rounded-full bg-slate-800 text-white px-3 py-1 text-xs"
                              onClick={async () => {
                                const nextStock = stockDraft[item.id];
                                if (typeof nextStock !== 'number' || !Number.isInteger(nextStock) || nextStock < 0) {
                                  toast.error('Enter a valid non-negative integer stock value.');
                                  return;
                                }
                                try {
                                  await updateInventoryItem(item.id, { currentStock: nextStock });
                                  toast.success('Stock updated.');
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : 'Unable to update stock.');
                                }
                              }}
                            >
                              Save
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

