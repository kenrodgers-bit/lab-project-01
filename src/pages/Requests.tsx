import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAppState } from '../context/AppContext';
import type { Priority, RequestStatus } from '../types';

const statusOrder: RequestStatus[] = ['pending', 'approved', 'partially_approved', 'rejected'];

function parsePositiveInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseNonNegativeInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export default function Requests(): React.ReactElement {
  const { currentUser, requests, inventory, permissions, submitRequest, reviewRequest } = useAppState();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
  const myDepartmentInventory = useMemo(() => {
    if (currentUser?.role === 'admin') {
      return inventory;
    }
    return inventory.filter((item) => item.department === currentUser?.department);
  }, [currentUser, inventory]);

  const [newRequest, setNewRequest] = useState({
    itemId: '',
    requestedQty: 1,
    priority: 'medium' as Priority,
    reviewNote: '',
  });
  const [decisionDraft, setDecisionDraft] = useState<Record<string, { approvedQty: number; reviewNote: string }>>({});

  const canRequest = currentUser?.role === 'staff'
    ? permissions.find((permission) => permission.department === currentUser.department)?.canRequest ?? false
    : false;

  useEffect(() => {
    if (myDepartmentInventory.length === 0) {
      if (newRequest.itemId) {
        setNewRequest((prev) => ({ ...prev, itemId: '' }));
      }
      return;
    }
    const validSelected = myDepartmentInventory.some((item) => item.id === newRequest.itemId);
    if (!validSelected) {
      setNewRequest((prev) => ({ ...prev, itemId: myDepartmentInventory[0].id }));
    }
  }, [myDepartmentInventory, newRequest.itemId]);

  const visibleRequests = useMemo(() => {
    const base = currentUser?.role === 'admin'
      ? requests
      : requests.filter((request) => request.requesterId === currentUser?.id);

    return base.filter((request) => {
      const matchesSearch =
        request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requesterName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [currentUser, requests, searchTerm, statusFilter]);

  const getBadgeClass = (status: RequestStatus): string => {
    if (status === 'approved') {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (status === 'partially_approved') {
      return 'bg-blue-100 text-blue-700';
    }
    if (status === 'rejected') {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-amber-100 text-amber-700';
  };

  return (
    <div className="hospital-scene-page min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Request Workflow</h1>
            <p className="mt-2 text-gray-600">
              {currentUser?.role === 'admin'
                ? 'Approve, reject, or partially release requested quantities with full accountability.'
                : 'Submit lab commodity requests and track approval status.'}
            </p>
          </div>

          {currentUser?.role === 'staff' && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Submit New Request</h2>
              <div className="grid md:grid-cols-4 gap-3">
                <select
                  className="rounded-full border border-slate-300 px-4 py-2"
                  value={newRequest.itemId}
                  onChange={(event) => setNewRequest((prev) => ({ ...prev, itemId: event.target.value }))}
                >
                  {myDepartmentInventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.currentStock} {item.unit} available)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="rounded-full border border-slate-300 px-4 py-2"
                  value={newRequest.requestedQty}
                  onChange={(event) =>
                    setNewRequest((prev) => ({ ...prev, requestedQty: parsePositiveInt(event.target.value) }))
                  }
                />
                <select
                  className="rounded-full border border-slate-300 px-4 py-2"
                  value={newRequest.priority}
                  onChange={(event) => setNewRequest((prev) => ({ ...prev, priority: event.target.value as Priority }))}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <input
                  className="rounded-full border border-slate-300 px-4 py-2"
                  placeholder="Optional note"
                  value={newRequest.reviewNote}
                  onChange={(event) => setNewRequest((prev) => ({ ...prev, reviewNote: event.target.value }))}
                />
              </div>
              <button
                type="button"
                className="mt-3 rounded-full bg-blue-700 text-white px-5 py-2 hover:bg-blue-800 disabled:opacity-50"
                disabled={!canRequest || myDepartmentInventory.length === 0 || !newRequest.itemId || newRequest.requestedQty < 1}
                onClick={async () => {
                  try {
                    await submitRequest(newRequest);
                    setNewRequest((prev) => ({ ...prev, requestedQty: 1, reviewNote: '' }));
                    toast.success('Request submitted.');
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Unable to submit request.');
                  }
                }}
              >
                Submit Request
              </button>
              {myDepartmentInventory.length === 0 && (
                <p className="mt-2 text-xs text-red-700">No inventory items available in your department.</p>
              )}
              {!canRequest && <p className="mt-2 text-xs text-red-700">Request permission is disabled for your department.</p>}
            </div>
          )}

          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <input
                className="flex-1 rounded-full border border-slate-300 px-4 py-2"
                placeholder="Search by request ID, requester, or item"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <select
                className="rounded-full border border-slate-300 px-4 py-2"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | RequestStatus)}
              >
                <option value="all">All statuses</option>
                {statusOrder.map((status) => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase text-slate-600">Request</th>
                    <th className="px-4 py-3 text-left text-xs uppercase text-slate-600">Requester</th>
                    <th className="px-4 py-3 text-left text-xs uppercase text-slate-600">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs uppercase text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs uppercase text-slate-600">Date</th>
                    {currentUser?.role === 'admin' && <th className="px-4 py-3 text-left text-xs uppercase text-slate-600">Decision</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleRequests.map((request) => {
                    const decision = decisionDraft[request.id] ?? { approvedQty: request.requestedQty, reviewNote: '' };
                    const canReview =
                      currentUser?.role === 'admin' &&
                      request.status === 'pending' &&
                      request.requesterId !== currentUser.id;

                    return (
                      <tr key={request.id}>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-semibold text-slate-900">{request.id}</div>
                          <div className="text-slate-600">{request.itemName}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {request.requesterName}
                          <div className="text-xs text-slate-500">{request.department}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          Requested: {request.requestedQty} {request.unit}
                          {request.approvedQty !== null && (
                            <div className="text-xs text-emerald-700">Released: {request.approvedQty} {request.unit}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`text-xs px-2 py-1 rounded-full ${getBadgeClass(request.status)}`}>
                            {request.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{new Date(request.requestDate).toLocaleString()}</td>
                        {currentUser?.role === 'admin' && (
                          <td className="px-4 py-3 text-sm">
                            {canReview ? (
                              <div className="flex flex-col gap-2 min-w-[220px]">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  max={request.requestedQty}
                                  className="rounded-full border border-slate-300 px-3 py-1"
                                  value={decision.approvedQty}
                                  onChange={(event) =>
                                    setDecisionDraft((prev) => ({
                                      ...prev,
                                      [request.id]: {
                                        ...decision,
                                        approvedQty: parseNonNegativeInt(event.target.value),
                                      },
                                    }))
                                  }
                                />
                                <input
                                  className="rounded-full border border-slate-300 px-3 py-1"
                                  placeholder="Review note"
                                  value={decision.reviewNote}
                                  onChange={(event) =>
                                    setDecisionDraft((prev) => ({
                                      ...prev,
                                      [request.id]: {
                                        ...decision,
                                        reviewNote: event.target.value,
                                      },
                                    }))
                                  }
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="rounded-full bg-emerald-700 text-white px-3 py-1 text-xs"
                                    onClick={async () => {
                                      try {
                                        const approvedQty = Math.min(decision.approvedQty, request.requestedQty);
                                        await reviewRequest({
                                          requestId: request.id,
                                          status: approvedQty < request.requestedQty ? 'partially_approved' : 'approved',
                                          approvedQty,
                                          reviewNote: decision.reviewNote,
                                        });
                                        toast.success('Request reviewed.');
                                      } catch (error) {
                                        toast.error(error instanceof Error ? error.message : 'Unable to review request.');
                                      }
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full bg-red-700 text-white px-3 py-1 text-xs"
                                    onClick={async () => {
                                      try {
                                        await reviewRequest({
                                          requestId: request.id,
                                          status: 'rejected',
                                          reviewNote: decision.reviewNote || 'Rejected by admin',
                                        });
                                        toast.success('Request rejected.');
                                      } catch (error) {
                                        toast.error(error instanceof Error ? error.message : 'Unable to reject request.');
                                      }
                                    }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">No action</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

