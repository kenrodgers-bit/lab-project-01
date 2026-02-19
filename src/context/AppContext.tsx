import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type {
  AuditLog,
  BackgroundTheme,
  Department,
  DepartmentPermission,
  InventoryItem,
  InventoryRequest,
  Priority,
  RequestStatus,
  Role,
  UserAccount,
} from '../types';

interface CreateUserPayload {
  name: string;
  email: string;
  role: Role;
  department: Department;
}

interface CreateInventoryPayload {
  name: string;
  category: string;
  department: Department;
  currentStock: number;
  minStock: number;
  unit: string;
}

interface SubmitRequestPayload {
  itemId: string;
  requestedQty: number;
  priority: Priority;
  reviewNote?: string;
}

interface ReviewRequestPayload {
  requestId: string;
  status: Exclude<RequestStatus, 'pending'>;
  approvedQty?: number;
  reviewNote?: string;
}

interface AppContextValue {
  currentUser: UserAccount | null;
  token: string | null;
  isLoadingSession: boolean;
  departments: Department[];
  users: UserAccount[];
  inventory: InventoryItem[];
  requests: InventoryRequest[];
  auditLogs: AuditLog[];
  permissions: DepartmentPermission[];
  lowStockItems: InventoryItem[];
  login: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => void;
  createDepartment: (name: string) => Promise<{ ok: boolean; message: string }>;
  createUser: (payload: CreateUserPayload) => Promise<{ ok: boolean; message: string }>;
  updateUser: (userId: string, patch: Partial<UserAccount>) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;
  updatePermissions: (department: Department, patch: Partial<DepartmentPermission>) => Promise<void>;
  addInventoryItem: (payload: CreateInventoryPayload) => Promise<void>;
  updateInventoryItem: (itemId: string, patch: Partial<InventoryItem>) => Promise<void>;
  submitRequest: (payload: SubmitRequestPayload) => Promise<void>;
  reviewRequest: (payload: ReviewRequestPayload) => Promise<void>;
  exportDataSnapshot: () => Promise<string>;
  importDataSnapshot: (raw: string) => Promise<{ ok: boolean; message: string }>;
  resetToSeedData: () => Promise<void>;
  backgroundTheme: BackgroundTheme;
  setBackgroundTheme: (theme: BackgroundTheme) => void;
}

const SESSION_KEY = 'lab_inventory_session';
const BACKGROUND_THEME_KEY = 'lab_inventory_background_theme';

function readSessionToken(): string | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token || null;
  } catch {
    return null;
  }
}

function isBackgroundTheme(value: string): value is BackgroundTheme {
  return value === 'scan' || value === 'shelf' || value === 'clean';
}

function readBackgroundTheme(): BackgroundTheme {
  const raw = localStorage.getItem(BACKGROUND_THEME_KEY);
  if (!raw || !isBackgroundTheme(raw)) {
    return 'scan';
  }
  return raw;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [permissions, setPermissions] = useState<DepartmentPermission[]>([]);
  const [token, setToken] = useState<string | null>(() => readSessionToken());
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(() => Boolean(readSessionToken()));
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [backgroundTheme, setBackgroundThemeState] = useState<BackgroundTheme>(() => readBackgroundTheme());

  const lowStockItems = useMemo(
    () => inventory.filter((item) => item.currentStock <= item.minStock),
    [inventory],
  );
  const departments = useMemo(
    () =>
      permissions
        .map((permission) => permission.department)
        .filter((department): department is Department => Boolean(department)),
    [permissions],
  );

  const refreshSnapshot = async (sessionToken: string) => {
    const [me, snapshot] = await Promise.all([api.me(sessionToken), api.bootstrap(sessionToken)]);
    setCurrentUser(me.user as UserAccount);
    setUsers(snapshot.users as UserAccount[]);
    setInventory(snapshot.inventory as InventoryItem[]);
    setRequests(snapshot.requests as InventoryRequest[]);
    setAuditLogs(snapshot.auditLogs as AuditLog[]);
    setPermissions(snapshot.permissions as DepartmentPermission[]);
  };

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setIsLoadingSession(false);
      return;
    }
    setIsLoadingSession(true);
    refreshSnapshot(token).catch(() => {
      setToken(null);
      setCurrentUser(null);
      localStorage.removeItem(SESSION_KEY);
    }).finally(() => {
      setIsLoadingSession(false);
    });
  }, [token]);

  useEffect(() => {
    document.body.setAttribute('data-bg-theme', backgroundTheme);
    localStorage.setItem(BACKGROUND_THEME_KEY, backgroundTheme);
  }, [backgroundTheme]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      const nextToken = response.token as string;
      setToken(nextToken);
      setIsLoadingSession(true);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ token: nextToken }));
      await refreshSnapshot(nextToken);
      return { ok: true, message: `Welcome ${(response.user as UserAccount).name}` };
    } catch (error) {
      setToken(null);
      setCurrentUser(null);
      setIsLoadingSession(false);
      localStorage.removeItem(SESSION_KEY);
      return { ok: false, message: error instanceof Error ? error.message : 'Login failed.' };
    }
  };

  const withRefresh = async (work: (sessionToken: string) => Promise<void>) => {
    if (!token) {
      throw new Error('Session missing');
    }
    await work(token);
    await refreshSnapshot(token);
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const setBackgroundTheme = (theme: BackgroundTheme) => {
    setBackgroundThemeState(theme);
  };

  const createUser = async (payload: CreateUserPayload) => {
    try {
      await withRefresh(async (sessionToken) => {
        await api.createUser(sessionToken, payload);
      });
      return { ok: true, message: 'User account created.' };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Failed to create user.' };
    }
  };

  const createDepartment = async (name: string) => {
    try {
      await withRefresh(async (sessionToken) => {
        await api.createDepartment(sessionToken, { name });
      });
      return { ok: true, message: 'Department created.' };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Failed to create department.' };
    }
  };

  const updateUser = async (userId: string, patch: Partial<UserAccount>) => {
    await withRefresh(async (sessionToken) => {
      await api.updateUser(sessionToken, userId, patch);
    });
  };

  const toggleUserStatus = async (userId: string) => {
    await withRefresh(async (sessionToken) => {
      await api.toggleUserStatus(sessionToken, userId);
    });
  };

  const updatePermissions = async (department: Department, patch: Partial<DepartmentPermission>) => {
    await withRefresh(async (sessionToken) => {
      await api.updatePermissions(sessionToken, department, patch);
    });
  };

  const addInventoryItem = async (payload: CreateInventoryPayload) => {
    await withRefresh(async (sessionToken) => {
      await api.addInventory(sessionToken, payload);
    });
  };

  const updateInventoryItem = async (itemId: string, patch: Partial<InventoryItem>) => {
    await withRefresh(async (sessionToken) => {
      await api.updateInventory(sessionToken, itemId, patch);
    });
  };

  const submitRequest = async (payload: SubmitRequestPayload) => {
    await withRefresh(async (sessionToken) => {
      await api.submitRequest(sessionToken, payload);
    });
  };

  const reviewRequest = async (payload: ReviewRequestPayload) => {
    await withRefresh(async (sessionToken) => {
      await api.reviewRequest(sessionToken, payload.requestId, payload);
    });
  };

  const exportDataSnapshot = async () => {
    if (!token) {
      return '';
    }
    const snapshot = await api.exportBackup(token);
    return JSON.stringify(snapshot, null, 2);
  };

  const importDataSnapshot = async (raw: string) => {
    if (!token) {
      return { ok: false, message: 'Session missing' };
    }
    try {
      const payload = JSON.parse(raw);
      await api.importBackup(token, payload);
      await refreshSnapshot(token);
      return { ok: true, message: 'Backup restored successfully.' };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Invalid backup data.' };
    }
  };

  const resetToSeedData = async () => {
    await withRefresh(async (sessionToken) => {
      await api.resetData(sessionToken);
    });
  };

  const value: AppContextValue = {
    currentUser,
    token,
    isLoadingSession,
    departments,
    users,
    inventory,
    requests,
    auditLogs,
    permissions,
    lowStockItems,
    login,
    logout,
    createDepartment,
    createUser,
    updateUser,
    toggleUserStatus,
    updatePermissions,
    addInventoryItem,
    updateInventoryItem,
    submitRequest,
    reviewRequest,
    exportDataSnapshot,
    importDataSnapshot,
    resetToSeedData,
    backgroundTheme,
    setBackgroundTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}
