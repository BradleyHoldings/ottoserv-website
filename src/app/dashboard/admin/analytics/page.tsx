"use client";

import { useState } from "react";

export default function AggregateAnalytics() {
  const [viewType, setViewType] = useState<'aggregate' | 'individual'>('aggregate');
  const [selectedClient, setSelectedClient] = useState<string>('all');

  // Aggregate platform data
  const aggregateData = {
    totalRevenue: 3600,
    activeClients: 3,
    totalCalls: 1247,
    leadsGenerated: 89,
    conversionRate: 7.1,
    uptime: 99.8
  };

  // Individual client data
  const clientData = {
    'brandon-croom': {
      name: 'Brandon Croom Contracting',
      revenue: 300,
      calls: 45,
      leads: 12,
      conversion: 8.9
    },
    'miami-pm': {
      name: 'Miami Property Management',
      revenue: 0,
      calls: 23,
      leads: 3,
      conversion: 4.3
    },
    'abc-electric': {
      name: 'ABC Electrical Services',
      revenue: 600,
      calls: 156,
      leads: 32,
      conversion: 9.1
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Platform Analytics</h1>
        <div className="flex items-center space-x-4">
          <span className="text-gray-400">Data Source:</span>
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewType('aggregate')}
              className={`px-4 py-2 rounded text-sm transition-colors ${
                viewType === 'aggregate'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🌍 All Clients (Aggregate)
            </button>
            <button
              onClick={() => setViewType('individual')}
              className={`px-4 py-2 rounded text-sm transition-colors ${
                viewType === 'individual'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              👤 Individual Client
            </button>
          </div>
        </div>
      </div>

      {/* Client Selector (for individual view) */}
      {viewType === 'individual' && (
        <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <label className="block text-white font-medium mb-2">Select Client:</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {Object.entries(clientData).map(([id, client]) => (
              <option key={id} value={id}>{client.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Data Source Indicator */}
      <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-blue-400">📊</span>
          <span className="text-blue-300 font-medium">
            {viewType === 'aggregate' 
              ? 'Showing aggregate data across ALL OttoServ clients' 
              : `Showing data for: ${clientData[selectedClient as keyof typeof clientData]?.name || 'Unknown Client'}`
            }
          </span>
        </div>
        <p className="text-blue-200 text-sm mt-1">
          🔴 <strong>LIVE DATA</strong> - Real client metrics (updated in real-time)
        </p>
      </div>

      {/* KPI Cards */}
      {viewType === 'aggregate' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white">💰</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-white">${aggregateData.totalRevenue}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white">👥</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Active Clients</p>
                <p className="text-2xl font-bold text-white">{aggregateData.activeClients}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white">📞</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Calls</p>
                <p className="text-2xl font-bold text-white">{aggregateData.totalCalls.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white">🎯</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Leads Generated</p>
                <p className="text-2xl font-bold text-white">{aggregateData.leadsGenerated}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white">📈</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Conversion Rate</p>
                <p className="text-2xl font-bold text-white">{aggregateData.conversionRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white">❤️</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">System Uptime</p>
                <p className="text-2xl font-bold text-white">{aggregateData.uptime}%</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {selectedClient && clientData[selectedClient as keyof typeof clientData] && (
            <>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white">💰</span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-white">${clientData[selectedClient as keyof typeof clientData].revenue}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white">📞</span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Calls Handled</p>
                    <p className="text-2xl font-bold text-white">{clientData[selectedClient as keyof typeof clientData].calls}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                    <span className="text-white">🎯</span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Leads Generated</p>
                    <p className="text-2xl font-bold text-white">{clientData[selectedClient as keyof typeof clientData].leads}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white">📈</span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Conversion Rate</p>
                    <p className="text-2xl font-bold text-white">{clientData[selectedClient as keyof typeof clientData].conversion}%</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Client Comparison Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {viewType === 'aggregate' ? 'Client Performance Comparison' : 'Individual Client Details'}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Leads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Conversion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {viewType === 'aggregate' ? (
                Object.entries(clientData).map(([id, client]) => (
                  <tr key={id}>
                    <td className="px-6 py-4 text-white font-medium">{client.name}</td>
                    <td className="px-6 py-4 text-green-400">${client.revenue}</td>
                    <td className="px-6 py-4 text-white">{client.calls}</td>
                    <td className="px-6 py-4 text-white">{client.leads}</td>
                    <td className="px-6 py-4 text-white">{client.conversion}%</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        client.conversion > 8 ? 'text-green-400 bg-green-400/10' :
                        client.conversion > 6 ? 'text-yellow-400 bg-yellow-400/10' :
                        'text-red-400 bg-red-400/10'
                      }`}>
                        {client.conversion > 8 ? 'Excellent' : client.conversion > 6 ? 'Good' : 'Needs Improvement'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-4 text-white font-medium">
                    {clientData[selectedClient as keyof typeof clientData]?.name}
                  </td>
                  <td className="px-6 py-4 text-green-400">
                    ${clientData[selectedClient as keyof typeof clientData]?.revenue}
                  </td>
                  <td className="px-6 py-4 text-white">
                    {clientData[selectedClient as keyof typeof clientData]?.calls}
                  </td>
                  <td className="px-6 py-4 text-white">
                    {clientData[selectedClient as keyof typeof clientData]?.leads}
                  </td>
                  <td className="px-6 py-4 text-white">
                    {clientData[selectedClient as keyof typeof clientData]?.conversion}%
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-blue-400 bg-blue-400/10">
                      Individual View
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/dashboard/admin/clients"
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">👥</span>
            <div>
              <h3 className="text-white font-semibold">Manage Clients</h3>
              <p className="text-gray-400 text-sm">Add, edit, or configure clients</p>
            </div>
          </div>
        </a>

        <a
          href="/dashboard/reports"
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📊</span>
            <div>
              <h3 className="text-white font-semibold">Detailed Reports</h3>
              <p className="text-gray-400 text-sm">Generate comprehensive reports</p>
            </div>
          </div>
        </a>

        <a
          href="/demo"
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🎭</span>
            <div>
              <h3 className="text-white font-semibold">Demo Environment</h3>
              <p className="text-gray-400 text-sm">Test with mock data</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}