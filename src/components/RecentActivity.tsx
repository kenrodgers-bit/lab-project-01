import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, Clock, FileWarning, UserRound } from 'lucide-react';
import type { AuditLog } from '../types';

interface RecentActivityProps {
  logs: AuditLog[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({ logs }) => {
  const topLogs = logs.slice(0, 6);

  const iconForAction = (action: string) => {
    if (action.includes('approved')) {
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    }
    if (action.includes('rejected') || action.includes('alert')) {
      return <FileWarning className="h-4 w-4 text-amber-600" />;
    }
    if (action.includes('login') || action.includes('user')) {
      return <UserRound className="h-4 w-4 text-blue-600" />;
    }
    return <Clock className="h-4 w-4 text-slate-500" />;
  };

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <ul className="space-y-4">
          {topLogs.map((log) => (
            <li key={log.id} className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-slate-100 p-2">{iconForAction(log.action)}</div>
              <div className="min-w-0">
                <p className="text-sm text-gray-800">{log.details}</p>
                <p className="text-xs text-gray-500">
                  {log.actorName} · {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RecentActivity;

