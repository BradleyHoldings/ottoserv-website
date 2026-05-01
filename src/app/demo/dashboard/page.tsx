"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Mock demo data - completely separate from live data
const DEMO_METRICS = {
  revenue: "$24,750",
  leads: 47,
  callsAnswered: 203,
  projectsActive: 8,
  satisfaction: "94%",
  growthRate: "+18%"
};

const DEMO_CLIENTS = [
  {
    id: 'demo-abc-construction',
    name: 'ABC Construction Co',
    industry: 'General Contracting',
    revenue: 8500,
    projects: 3,
    status: 'active'
  },
  {
    id: 'demo-elite-hvac',
    name: 'Elite HVAC Services',
    industry: 'HVAC',
    revenue: 6750,
    projects: 2,
    status: 'active'
  },
  {
    id: 'demo-miami-property',
    name: 'Miami Property Management',
    industry: 'Property Management',
    revenue: 9500,
    projects: 3,
    status: 'active'
  }
];

const DEMO_PROJECTS = [
  { id: 1, name: "Johnson Kitchen Remodel", client: "ABC Construction Co", status: "In Progress", value: "$18,500" },
  { id: 2, name: "Office Building HVAC", client: "Elite HVAC Services", status: "Planning", value: "$32,000" },
  { id: 3, name: "Residential Complex Maintenance", client: "Miami Property Management", status: "In Progress", value: "$12,000" }
];

const DEMO_ALERTS = [
  { type: "success", message: "New lead qualified: Sarah Thompson - Kitchen renovation" },
  { type: "info", message: "Scheduled: Project walkthrough with Johnson family tomorrow 2 PM" },
  { type: "warning", message: "Material delivery delayed: Johnson Kitchen subway tiles (3 days)" }
];

export default function DemoDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    // Update time every second for realistic demo
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ottoserv_current_user');
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      {/* Demo Environment Header */}
      <div className="bg-orange-600 text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🎭</span>
            <div>
              <h1 className="text-xl font-bold">Demo Environment Active</h1>
              <p className="text-orange-100 text-sm">All data shown is simulated - no real client information</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span>{currentTime.toLocaleString()}</span>
            <button
              onClick={handleLogout}
              className="bg-orange-700 hover:bg-orange-800 px-3 py-1 rounded transition-colors"
            >
              Exit Demo
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Demo Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Otto<span className="text-orange-400">Serv</span> Demo Dashboard
          </h1>
          <p className="text-gray-400">Experience the complete OttoServ platform with realistic demo data</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white">💰</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Monthly Revenue</p>
                <p className="text-2xl font-bold text-white">{DEMO_METRICS.revenue}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white">🎯</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">New Leads</p>
                <p className="text-2xl font-bold text-white">{DEMO_METRICS.leads}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white">📞</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Calls Answered</p>
                <p className="text-2xl font-bold text-white">{DEMO_METRICS.callsAnswered}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white">🏗️</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Active Projects</p>
                <p className="text-2xl font-bold text-white">{DEMO_METRICS.projectsActive}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white">😊</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Satisfaction</p>
                <p className="text-2xl font-bold text-white">{DEMO_METRICS.satisfaction}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white">📈</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Growth Rate</p>
                <p className="text-2xl font-bold text-white">{DEMO_METRICS.growthRate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Clients */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Demo Clients</h2>
              <p className="text-gray-400 text-sm">Fictional companies for demonstration</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {DEMO_CLIENTS.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <h3 className="text-white font-medium">{client.name}</h3>
                      <p className="text-gray-400 text-sm">{client.industry}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-semibold">${client.revenue.toLocaleString()}/mo</p>
                      <p className="text-gray-400 text-sm">{client.projects} active projects</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Current Projects</h2>
              <p className="text-gray-400 text-sm">Sample project data</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {DEMO_PROJECTS.map((project) => (
                  <div key={project.id} className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium">{project.name}</h3>
                      <span className="text-green-400 font-semibold">{project.value}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{project.client}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        project.status === 'In Progress' ? 'bg-blue-600 text-blue-100' : 'bg-orange-600 text-orange-100'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-8">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Recent Activity</h2>
            <p className="text-gray-400 text-sm">Live demo notifications</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {DEMO_ALERTS.map((alert, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  alert.type === 'success' ? 'bg-green-900/30 border-green-500' :
                  alert.type === 'info' ? 'bg-blue-900/30 border-blue-500' :
                  'bg-yellow-900/30 border-yellow-500'
                }`}>
                  <p className="text-white">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Demo Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500 transition-colors cursor-pointer">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-white font-semibold mb-2">AI Call Assistant</h3>
            <p className="text-gray-400 text-sm">See how Morgan handles incoming calls and qualifies leads automatically.</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500 transition-colors cursor-pointer">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-white font-semibold mb-2">Business Analytics</h3>
            <p className="text-gray-400 text-sm">Explore revenue tracking, lead conversion rates, and performance insights.</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500 transition-colors cursor-pointer">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-white font-semibold mb-2">Workflow Automation</h3>
            <p className="text-gray-400 text-sm">Test automated follow-ups, scheduling, and task management.</p>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mt-8 bg-orange-900/30 border border-orange-700 rounded-lg p-6 text-center">
          <h3 className="text-orange-200 font-semibold mb-2">🎭 This is a Demo Environment</h3>
          <p className="text-orange-100 text-sm mb-4">
            All data shown is fictional and for demonstration purposes only. 
            No real client information or business data is displayed.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => router.push('/contact')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Get Real Access
            </button>
            <button
              onClick={handleLogout}
              className="border border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-gray-900 px-6 py-2 rounded-lg transition-colors"
            >
              Exit Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}