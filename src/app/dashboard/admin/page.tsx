import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard - OttoServ",
  description: "Super admin interface for OttoServ client and service management",
};

export default function AdminDashboard() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Super admin controls for OttoServ platform management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Clients</p>
              <p className="text-2xl font-bold text-white">3</p>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white">👥</span>
            </div>
          </div>
          <p className="text-green-400 text-sm mt-2">+1 this month</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Services</p>
              <p className="text-2xl font-bold text-white">27</p>
            </div>
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white">⚡</span>
            </div>
          </div>
          <p className="text-green-400 text-sm mt-2">All operational</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Monthly Revenue</p>
              <p className="text-2xl font-bold text-white">$900</p>
            </div>
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white">💰</span>
            </div>
          </div>
          <p className="text-green-400 text-sm mt-2">Growing</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">System Health</p>
              <p className="text-2xl font-bold text-white">99.8%</p>
            </div>
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white">❤️</span>
            </div>
          </div>
          <p className="text-green-400 text-sm mt-2">Excellent</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <a
          href="/dashboard/admin/clients"
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors">
              <span className="text-white text-xl">👥</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">Manage Clients</h3>
              <p className="text-gray-400 text-sm">View and configure client accounts</p>
            </div>
          </div>
        </a>

        <a
          href="/dashboard/admin/services"
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center group-hover:bg-green-500 transition-colors">
              <span className="text-white text-xl">⚡</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">Service Management</h3>
              <p className="text-gray-400 text-sm">Control service access and features</p>
            </div>
          </div>
        </a>

        <a
          href="/dashboard/admin/analytics"
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-500 transition-colors">
              <span className="text-white text-xl">📊</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">Aggregate Analytics</h3>
              <p className="text-gray-400 text-sm">Platform-wide insights and metrics</p>
            </div>
          </div>
        </a>

        <a
          href="/demo"
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500 transition-colors group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center group-hover:bg-orange-500 transition-colors">
              <span className="text-white text-xl">🎭</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">Demo Environment</h3>
              <p className="text-gray-400 text-sm">Test with mock data</p>
            </div>
          </div>
        </a>

        <a
          href="/dashboard/admin/system"
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center group-hover:bg-red-500 transition-colors">
              <span className="text-white text-xl">⚙️</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">System Settings</h3>
              <p className="text-gray-400 text-sm">Platform configuration and logs</p>
            </div>
          </div>
        </a>

        <a
          href="/dashboard/admin/billing"
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500 transition-colors group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center group-hover:bg-yellow-500 transition-colors">
              <span className="text-white text-xl">💳</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">Billing Management</h3>
              <p className="text-gray-400 text-sm">Revenue, invoicing, and payments</p>
            </div>
          </div>
        </a>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Recent Platform Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <div className="flex-1">
              <p className="text-white">New client onboarded: Brandon Croom Contracting</p>
              <p className="text-gray-400 text-sm">2 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <div className="flex-1">
              <p className="text-white">Service deployment completed: Call AI for Miami Property Management</p>
              <p className="text-gray-400 text-sm">4 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <div className="flex-1">
              <p className="text-white">Revenue milestone: $1,000 MRR achieved</p>
              <p className="text-gray-400 text-sm">1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}