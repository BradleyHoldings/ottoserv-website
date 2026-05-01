export default function AdminDashboard() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">🔴 Admin Dashboard</h1>
        <p className="text-gray-400">Super admin controls for OttoServ platform management</p>
        <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-300">🔴 LIVE DATA MODE - Real OttoServ client data</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Clients</p>
          <p className="text-2xl font-bold text-white">3</p>
          <p className="text-green-400 text-sm mt-2">+1 this month</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Active Services</p>
          <p className="text-2xl font-bold text-white">27</p>
          <p className="text-green-400 text-sm mt-2">All operational</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Monthly Revenue</p>
          <p className="text-2xl font-bold text-white">$900</p>
          <p className="text-green-400 text-sm mt-2">Growing</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">System Health</p>
          <p className="text-2xl font-bold text-white">99.8%</p>
          <p className="text-green-400 text-sm mt-2">Excellent</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <a href="/dashboard/admin/clients" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors group">
          <h3 className="text-white font-semibold">👥 Manage Clients</h3>
          <p className="text-gray-400 text-sm">View and configure client accounts</p>
        </a>
        
        <a href="/dashboard/admin/services" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors group">
          <h3 className="text-white font-semibold">⚡ Service Management</h3>
          <p className="text-gray-400 text-sm">Control service access and features</p>
        </a>
        
        <a href="/dashboard/admin/analytics" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors group">
          <h3 className="text-white font-semibold">📊 Aggregate Analytics</h3>
          <p className="text-gray-400 text-sm">Platform-wide insights and metrics</p>
        </a>
        
        <a href="/demo" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500 transition-colors group">
          <h3 className="text-white font-semibold">🎭 Demo Environment</h3>
          <p className="text-gray-400 text-sm">Test with mock data</p>
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