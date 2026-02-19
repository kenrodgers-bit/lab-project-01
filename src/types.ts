export type Role = 'admin' | 'staff';

export type Department = string;

export type Priority = 'high' | 'medium' | 'low';

export type RequestStatus = 'pending' | 'approved' | 'partially_approved' | 'rejected';
export type BackgroundTheme = 'scan' | 'shelf' | 'clean';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: Department;
  isActive: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  department: Department;
  currentStock: number;
  minStock: number;
  unit: string;
  lastUpdated: string;
}

export interface InventoryRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  department: Department;
  itemId: string;
  itemName: string;
  requestedQty: number;
  approvedQty: number | null;
  unit: string;
  status: RequestStatus;
  priority: Priority;
  requestDate: string;
  reviewedBy: string | null;
  reviewedDate: string | null;
  reviewNote: string | null;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  details: string;
  createdAt: string;
}

export interface DepartmentPermission {
  department: Department;
  canRequest: boolean;
  canApprove: boolean;
  canEditInventory: boolean;
}
