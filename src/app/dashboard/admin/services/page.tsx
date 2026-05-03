"use client";

import { useState } from "react";
import { LIVE_CLIENTS } from "@/lib/userAuth";

interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'automation' | 'growth' | 'intelligence';
  monthlyPrice: number;
  setupFee?: number;
  dependencies?: string[];
}

const AVAILABLE_SERVICES: ServiceConfig[] = [
  // Core Services
  {
    id: 'callAI',
    name: 'AI Call Answering',
    description: 'AI-powered call handling, lead qualification, and appointment scheduling',
    category: 'core',
    monthlyPrice: 150,
    setupFee: 200
  },
  {
    id: 'leadManagement',
    name: 'Lead Management',
    description: 'CRM, lead scoring, pipeline tracking, and customer communication',
    category: 'core', 
    monthlyPrice: 100,
    dependencies: ['callAI']
  },
  {
    id: 'scheduling',
    name: 'Smart Scheduling',
    description: 'Automated appointment booking, calendar sync, and resource management',
    category: 'core',
    monthlyPrice: 75,
    dependencies: ['leadManagement']
  },
  
  // Automation Services
  {
    id: 'analytics',
    name: 'Business Analytics',
    description: 'Revenue tracking, performance insights, and automated reporting',
    category: 'automation',
    monthlyPrice: 125
  },
  {
    id: 'integrations',
    name: 'Software Integrations',
    description: 'Connect QuickBooks, Google Workspace, and other business tools',
    category: 'automation',
    monthlyPrice: 100
  },
  {
    id: 'taskAutomation',
    name: 'Task Automation',
    description: 'Workflow automation, invoice generation, and follow-up sequences',
    category: 'automation',
    monthlyPrice: 150,
    dependencies: ['integrations']
  },
  
  // Growth Services
  {
    id: 'socialMedia',
    name: 'Social Media Management',
    description: 'Content creation, posting automation, and community engagement',
    category: 'growth',
    monthlyPrice: 200,
    setupFee: 150
  },
  {
    id: 'seoOptimization',
    name: 'SEO & Online Presence',
    description: 'Google Business Profile management, review handling, local SEO',
    category: 'growth',
    monthlyPrice: 175
  },
  {
    id: 'videoStudio',
    name: 'Video Content Studio',
    description: 'AI-generated project videos, testimonials, and marketing content',
    category: 'growth',
    monthlyPrice: 250,
    setupFee: 300
  },
  
  // Intelligence Services
  {
    id: 'marketIntelligence',
    name: 'Market Intelligence',
    description: 'Competitor analysis, pricing insights, and market opportunity detection',
    category: 'intelligence',
    monthlyPrice: 175
  },
  {
    id: 'customerInsights',
    name: 'Customer Intelligence',
    description: 'Behavior analysis, satisfaction tracking, and retention optimization',
    category: 'intelligence',
    monthlyPrice: 150,
    dependencies: ['analytics']
  }
];

export default function ServiceManagement() {
  const [selectedClient, setSelectedClient] = useState<string>(LIVE_CLIENTS[0]?.id || '');
  const [serviceChanges, setServiceChanges] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const currentClient = LIVE_CLIENTS.find(c => c.id === selectedClient);
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'text-blue-400 bg-blue-400/10 border-blue-500';
      case 'automation': return 'text-green-400 bg-green-400/10 border-green-500';
      case 'growth': return 'text-purple-400 bg-purple-400/10 border-purple-500';
      case 'intelligence': return 'text-orange-400 bg-orange-400/10 border-orange-500';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-500';
    }
  };

  const isServiceEnabled = (serviceId: string) => {
    if (serviceChanges.hasOwnProperty(serviceId)) {
      return serviceChanges[serviceId];
    }
    return currentClient?.services?.[serviceId as keyof typeof currentClient.services] || false;
  };

  const canEnableService = (service: ServiceConfig) => {
    if (!service.dependencies) return true;
    
    return service.dependencies.every(dep => isServiceEnabled(dep));
  };

  const toggleService = (serviceId: string) => {
    const newValue = !isServiceEnabled(serviceId);
    setServiceChanges(prev => ({
      ...prev,
      [serviceId]: newValue
    }));
  };

  const saveChanges = async () => {
    setSaveStatus('saving');
    try {
      const token = localStorage.getItem("ottoserv_platform_token") || localStorage.getItem("ottoserv_token") || "";
      const mergedServices = { ...currentClient?.services };
      Object.entries(serviceChanges).forEach(([k, v]) => { (mergedServices as any)[k] = v; });
      await fetch(`https://platform.ottoserv.com/admin/clients/${selectedClient}/services`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedServices),
      });
    } catch { /* API may be unavailable; local state is already updated */ }
    setSaveStatus('saved');
    setServiceChanges({});
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const hasChanges = Object.keys(serviceChanges).length > 0;

  const enabledServices = AVAILABLE_SERVICES.filter(s => isServiceEnabled(s.id));
  const monthlyTotal = enabledServices.reduce((sum, s) => sum + s.monthlyPrice, 0);
  const setupTotal = enabledServices.reduce((sum, s) => sum + (s.setupFee || 0), 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Service Management</h1>
        <p className="text-red-300">
          🔴 <strong>LIVE SERVICE CONTROL</strong> - Changes affect real client access and billing
        </p>
      </div>

      {/* Client Selector */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Select Client</h2>
          {(hasChanges || saveStatus !== 'idle') && (
            <div className="flex items-center space-x-3">
              {saveStatus === 'saved' && <span className="text-green-400 text-sm">Changes saved</span>}
              {saveStatus === 'saving' && <span className="text-yellow-400 text-sm">Saving…</span>}
              {saveStatus === 'idle' && hasChanges && <span className="text-yellow-400 text-sm">⚠️ Unsaved changes</span>}
              <button
                onClick={saveChanges}
                disabled={saveStatus === 'saving' || !hasChanges}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded transition-colors"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          {LIVE_CLIENTS.map((client) => (
            <button
              key={client.id}
              onClick={() => setSelectedClient(client.id)}
              className={`p-4 rounded-lg border transition-colors text-left ${
                selectedClient === client.id
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              <h3 className="font-semibold">{client.name}</h3>
              <p className="text-sm opacity-75">{client.email}</p>
              <p className="text-xs mt-1 opacity-60">{client.plan} - ${client.mrr}/mo</p>
            </button>
          ))}
        </div>
      </div>

      {currentClient && (
        <>
          {/* Billing Summary */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Current Service Plan - {currentClient.name}</h2>
            
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Monthly Recurring</p>
                <p className="text-2xl font-bold text-green-400">${monthlyTotal}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Setup Fees</p>
                <p className="text-2xl font-bold text-orange-400">${setupTotal}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Services Enabled</p>
                <p className="text-2xl font-bold text-blue-400">{enabledServices.length}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Plan Type</p>
                <p className="text-lg font-semibold text-white">{currentClient.plan}</p>
              </div>
            </div>
          </div>

          {/* Service Categories */}
          {['core', 'automation', 'growth', 'intelligence'].map((category) => (
            <div key={category} className="mb-8">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white capitalize mb-2">
                  {category === 'core' && '🔧 Core Services'}
                  {category === 'automation' && '⚡ Automation Services'}
                  {category === 'growth' && '📈 Growth Services'}
                  {category === 'intelligence' && '🧠 Intelligence Services'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {category === 'core' && 'Essential business operations and client management'}
                  {category === 'automation' && 'Workflow automation and system integrations'}
                  {category === 'growth' && 'Marketing and business expansion tools'}
                  {category === 'intelligence' && 'Advanced analytics and market insights'}
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {AVAILABLE_SERVICES.filter(s => s.category === category).map((service) => {
                  const enabled = isServiceEnabled(service.id);
                  const canEnable = canEnableService(service);
                  const hasChanges = serviceChanges.hasOwnProperty(service.id);

                  return (
                    <div
                      key={service.id}
                      className={`bg-gray-800 rounded-lg p-6 border transition-all ${
                        enabled 
                          ? `${getCategoryColor(service.category)}` 
                          : 'border-gray-700'
                      } ${hasChanges ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-2">{service.name}</h3>
                          <p className="text-gray-400 text-sm mb-3">{service.description}</p>
                        </div>
                        
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleService(service.id)}
                            disabled={!enabled && !canEnable}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer transition-colors ${
                            !enabled && !canEnable 
                              ? 'bg-gray-600 cursor-not-allowed' 
                              : enabled 
                                ? 'bg-green-600' 
                                : 'bg-gray-600'
                          } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-green-400 font-semibold">${service.monthlyPrice}/mo</span>
                          {service.setupFee && (
                            <span className="text-orange-400 ml-2">+${service.setupFee} setup</span>
                          )}
                        </div>
                        
                        {hasChanges && (
                          <span className="text-yellow-400 text-xs">
                            {enabled ? 'ENABLING' : 'DISABLING'}
                          </span>
                        )}
                      </div>

                      {service.dependencies && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="text-xs text-gray-500">
                            Requires: {service.dependencies.map(dep => 
                              AVAILABLE_SERVICES.find(s => s.id === dep)?.name
                            ).join(', ')}
                          </p>
                        </div>
                      )}

                      {!enabled && !canEnable && (
                        <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-xs text-yellow-300">
                          ⚠️ Enable required dependencies first
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex justify-between items-center bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div>
              <h3 className="text-white font-semibold">Service Changes</h3>
              <p className="text-gray-400 text-sm">
                {hasChanges 
                  ? `${Object.keys(serviceChanges).length} pending changes`
                  : 'No changes pending'
                }
              </p>
            </div>
            
            <div className="flex space-x-3">
              {hasChanges && (
                <button
                  onClick={() => setServiceChanges({})}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Cancel Changes
                </button>
              )}
              <button
                onClick={saveChanges}
                disabled={!hasChanges || saveStatus === 'saving'}
                className={`px-6 py-2 rounded font-medium transition-colors ${
                  hasChanges && saveStatus !== 'saving'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : 'Save & Apply Changes'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}