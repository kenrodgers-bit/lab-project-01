import React from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-10">
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <FlaskConical className="h-7 w-7 text-blue-700" />
              <span className="text-lg font-semibold text-gray-900">LabInventory</span>
            </div>
            <p className="text-gray-600 text-sm">
              Hospital-grade, role-based stock control with approvals and audit accountability.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-gray-600 hover:text-gray-900">Dashboard</Link></li>
              <li><Link to="/inventory" className="text-gray-600 hover:text-gray-900">Inventory</Link></li>
              <li><Link to="/requests" className="text-gray-600 hover:text-gray-900">Requests</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase mb-3">Compliance</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Audit-ready activity history</li>
              <li>Role-based access control</li>
              <li>Low-stock alerting workflow</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-gray-500 text-sm">(c) {new Date().getFullYear()} LabInventory System</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;