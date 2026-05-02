"use client";

import { useRouter } from "next/navigation";

export default function DemoPage() {
  const router = useRouter();

  const handleStartDemo = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ottoserv_current_user', JSON.stringify({
        id: 'demo-user',
        name: 'Demo User',
        role: 'demo',
        isOttoServEmployee: false
      }));
      router.push('/demo/dashboard');
    }
  };
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      {/* Header */}
      <div className="bg-orange-600 text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🎭</span>
            <div>
              <h1 className="text-xl font-bold">Demo Environment</h1>
              <p className="text-orange-100 text-sm">All data shown is simulated for demonstration purposes</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <a
              href="/dashboard"
              className="bg-orange-700 hover:bg-orange-800 px-4 py-2 rounded transition-colors"
            >
              ← Back to Live Dashboard
            </a>
            <a
              href="/login"
              className="bg-white text-orange-600 hover:bg-orange-50 px-4 py-2 rounded transition-colors"
            >
              Login as Admin
            </a>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-6xl font-bold mb-6">
            OttoServ Demo
            <span className="text-orange-400 block">Full Platform Preview</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Experience the complete OttoServ platform with realistic demo data. 
            Explore all features, dashboards, and tools in a safe sandbox environment.
          </p>
        </div>

        {/* Demo Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Analytics Dashboard</h3>
            <p className="text-gray-300 mb-4">
              Explore comprehensive business analytics with mock client data, revenue tracking, and performance insights.
            </p>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Revenue and growth metrics</li>
              <li>• Client performance analysis</li>
              <li>• Call handling statistics</li>
              <li>• Lead conversion tracking</li>
            </ul>
          </div>

          <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">AI Services</h3>
            <p className="text-gray-300 mb-4">
              Test AI call answering, lead qualification, and automated scheduling with simulated interactions.
            </p>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• AI call handling simulation</li>
              <li>• Lead scoring examples</li>
              <li>• Appointment booking demos</li>
              <li>• Customer interaction logs</li>
            </ul>
          </div>

          <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Automation Tools</h3>
            <p className="text-gray-300 mb-4">
              Experience workflow automation, task management, and integration capabilities with sample data.
            </p>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Workflow designer preview</li>
              <li>• Task automation examples</li>
              <li>• Integration templates</li>
              <li>• Process optimization tools</li>
            </ul>
          </div>

          <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
            <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Client Management</h3>
            <p className="text-gray-300 mb-4">
              Explore client relationship management features with fictional contractor and property management companies.
            </p>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Client profiles and history</li>
              <li>• Service configuration</li>
              <li>• Communication tracking</li>
              <li>• Project management</li>
            </ul>
          </div>

          <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Financial Tools</h3>
            <p className="text-gray-300 mb-4">
              Review financial management capabilities including invoicing, expense tracking, and profitability analysis.
            </p>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Invoice generation examples</li>
              <li>• Expense categorization</li>
              <li>• Profit/loss analysis</li>
              <li>• Budget forecasting</li>
            </ul>
          </div>

          <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🔧</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Operations Hub</h3>
            <p className="text-gray-300 mb-4">
              Test operational features like scheduling, inventory management, and team coordination tools.
            </p>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Calendar and scheduling</li>
              <li>• Inventory tracking</li>
              <li>• Team management</li>
              <li>• Resource allocation</li>
            </ul>
          </div>
        </div>

        {/* Demo Access */}
        <div className="bg-gray-900 rounded-lg p-12 border border-gray-700 text-center">
          <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🚀</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Explore?</h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Access the full demo environment with sample contractor and property management data. 
            No sign-up required - jump right into exploring OttoServ's capabilities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleStartDemo}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg font-semibold transition-colors"
            >
              🎭 Enter Demo Dashboard
            </button>
            <a
              href="/jarvis-voice"
              className="border border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-gray-900 px-8 py-4 rounded-lg font-semibold transition-colors"
            >
              🎙️ Try Voice Assistant
            </a>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div>
              <strong className="text-orange-400">Demo Clients:</strong><br/>
              ABC Contracting<br/>
              Miami Property Mgmt<br/>
              Elite HVAC Services
            </div>
            <div>
              <strong className="text-orange-400">Sample Data:</strong><br/>
              3 months of history<br/>
              500+ call records<br/>
              50+ project examples
            </div>
            <div>
              <strong className="text-orange-400">Full Features:</strong><br/>
              All services enabled<br/>
              Complete workflows<br/>
              Real-time simulations
            </div>
          </div>
        </div>

        {/* Demo vs Live Comparison */}
        <div className="mt-16 bg-gray-800 rounded-lg p-8 border border-gray-600">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Demo vs Live Environment</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-orange-400 mb-4">🎭 Demo Environment</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center">
                  <span className="text-orange-400 mr-2">✓</span>
                  Safe sandbox with mock data
                </li>
                <li className="flex items-center">
                  <span className="text-orange-400 mr-2">✓</span>
                  All features enabled
                </li>
                <li className="flex items-center">
                  <span className="text-orange-400 mr-2">✓</span>
                  No real integrations
                </li>
                <li className="flex items-center">
                  <span className="text-orange-400 mr-2">✓</span>
                  Perfect for testing and exploration
                </li>
                <li className="flex items-center">
                  <span className="text-orange-400 mr-2">✓</span>
                  Realistic but fictional data
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-blue-400 mb-4">🔴 Live Environment</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">✓</span>
                  Real client data only
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">✓</span>
                  Production integrations
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">✓</span>
                  Super admin controls
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">✓</span>
                  Client management tools
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">✓</span>
                  Aggregate analytics
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}