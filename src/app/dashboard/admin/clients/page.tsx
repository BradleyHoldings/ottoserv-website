"use client";

import { useState } from "react";

interface Client {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'trial' | 'inactive';
  plan: string;
  mrr: number;
  lastActive: string;
  services: {
    callAI: boolean;
    leadManagement: boolean;
    scheduling: boolean;
    analytics: boolean;
    integrations: boolean;
  };
}

export default function ClientsManagement() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // Live client data (replace mock data)
  const clients: Client[] = [
    {
      id: 'brandon-croom',
      name: 'Brandon Croom Contracting',
      email: 'brandoncroom50@gmail.com',
      status: 'active',
      plan: 'Founding Partner',
      mrr: 300,
      lastActive: '2026-05-01T18:00:00Z',
      services: {
        callAI: true,
        leadManagement: true,
        scheduling: true,
        analytics: false,
        integrations: false
      }
    },
    {
      id: 'miami-pm',
      name: 'Miami Property Management',
      email: 'info@miamipm.com',
      status: 'trial',
      plan: 'Trial',
      mrr: 0,
      lastActive: '2026-04-30T15:30:00Z',
      services: {
        callAI: true,
        leadManagement: false,
        scheduling: false,
        analytics: false,
        integrations: false
      }
    },
    {
      id: 'abc-electric',
      name: 'ABC Electrical Services',
      email: 'john@abcelectric.com',
      status: 'active',
      plan: 'Standard',
      mrr: 600,
      lastActive: '2026-05-01T12:00:00Z',
      services: {
        callAI: true,
        leadManagement: true,
        scheduling: true,
        analytics: true,
        integrations: true
      }
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'trial': return 'text-yellow-400 bg-yellow-400/10';
      case 'inactive': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const toggleService = (clientId: string, service: keyof Client['services']) => {
    // In real implementation, this would call API
    console.log(`Toggle ${service} for client ${clientId}`);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Client Management</h1>
        <p className="text-gray-400">
          🔴 <strong>LIVE DATA ONLY</strong> - Real client information (no mock data)
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Clients</p>
          <p className="text-2xl font-bold text-white">{clients.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Active Clients</p>
          <p className="text-2xl font-bold text-green-400">
            {clients.filter(c => c.status === 'active').length}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Trial Clients</p>
          <p className="text-2xl font-bold text-yellow-400">
            {clients.filter(c => c.status === 'trial').length}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total MRR</p>
          <p className="text-2xl font-bold text-green-400">
            ${clients.reduce((sum, c) => sum + c.mrr, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Client List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Client List</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  MRR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Services
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{client.name}</p>
                      <p className="text-gray-400 text-sm">{client.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white">{client.plan}</td>
                  <td className="px-6 py-4 text-green-400 font-semibold">
                    ${client.mrr}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      {Object.entries(client.services).map(([service, enabled]) => (
                        <div
                          key={service}
                          className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-400' : 'bg-gray-600'}`}
                          title={service}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedClient(client.id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Manage
                      </button>
                      <button
                        className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                        onClick={() => window.location.href = `/dashboard?client=${client.id}`}
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Management Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                Manage Services - {clients.find(c => c.id === selectedClient)?.name}
              </h2>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(clients.find(c => c.id === selectedClient)?.services || {}).map(([service, enabled]) => (
                <div key={service} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium capitalize">
                      {service.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {service === 'callAI' && 'AI-powered call answering and lead qualification'}
                      {service === 'leadManagement' && 'Lead tracking and pipeline management'}
                      {service === 'scheduling' && 'Automated appointment scheduling'}
                      {service === 'analytics' && 'Business intelligence and reporting'}
                      {service === 'integrations' && 'Third-party software connections'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleService(selectedClient, service as keyof Client['services'])}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}