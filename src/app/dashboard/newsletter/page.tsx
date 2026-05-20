'use client';

import { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  UsersIcon, 
  PaperAirplaneIcon,
  EyeIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline';

interface NewsletterStats {
  totalSubscribers: number;
  newSubscribersThisWeek: number;
  growthRate: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalAuditRequests: number;
  recentIssues: Array<{
    id: string;
    title: string;
    publishDate: string;
    stats: {
      sent: number;
      opened: number;
      clicked: number;
      openRate: number;
      clickRate: number;
      auditRequests: number;
    };
  }>;
  topSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  recentSubscribers: Array<{
    email: string;
    source: string;
    signupDate: string;
    engagementLevel: 'cold' | 'warm' | 'hot';
  }>;
  pendingAuditRequests: Array<{
    id: string;
    email: string;
    companyName: string;
    businessType: string;
    priority: 'low' | 'medium' | 'high';
    requestDate: string;
    estimatedValue: number;
  }>;
}

interface NewsletterDraft {
  title: string;
  content: string;
  scheduledDate?: string;
  status: 'draft' | 'scheduled' | 'published';
}

export default function NewsletterDashboard() {
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscribers' | 'compose' | 'analytics'>('overview');
  const [draft, setDraft] = useState<NewsletterDraft>({
    title: '',
    content: '',
    status: 'draft'
  });
  const [aiTopic, setAiTopic] = useState('');
  const [aiDrafting, setAiDrafting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const response = await fetch('/api/newsletter/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const syncWithBeehiiv = async () => {
    try {
      const response = await fetch('/api/newsletter/sync', { method: 'POST' });
      if (response.ok) {
        await loadDashboardData();
        alert('Successfully synced with Beehiiv');
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync with Beehiiv');
    }
  };

  const generateWeeklyReport = async () => {
    try {
      const response = await fetch('/api/newsletter/weekly-report', { method: 'POST' });
      if (response.ok) {
        const report = await response.blob();
        const url = window.URL.createObjectURL(report);
        const a = document.createElement('a');
        a.href = url;
        a.download = `newsletter-report-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const publishDraft = async () => {
    try {
      const response = await fetch('/api/newsletter/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (response.ok) {
        alert('Newsletter scheduled for publishing');
        setDraft({ title: '', content: '', status: 'draft' });
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to publish:', error);
      alert('Failed to schedule newsletter');
    }
  };

  const generateAiDraft = () => {
    setAiDrafting(true);
    const topic = aiTopic.trim() || 'missed calls and slow follow-up';
    const nextTitle = `What ${topic} is really costing your team`;
    const nextContent = `Opening:\nA short real-world scenario about ${topic} showing up in daily operations.\n\nThe Waste:\nExplain how slow response, dropped calls, or manual follow-up create quiet revenue leakage.\n\nThe Fix:\nShow the immediate, better, and best path for fixing the workflow with OttoServ.\n\nThe ROI:\nFrame the value carefully around recovered opportunities, faster response, and cleaner handoff.\n\nThe Implementation:\nList the first practical workflow to deploy.\n\nOperator Question:\nWhere does your team currently lose the handoff after first contact?\n\nCTA:\nReply for a free process audit.`;
    setDraft((prev) => ({ ...prev, title: prev.title || nextTitle, content: prev.content || nextContent }));
    setTimeout(() => setAiDrafting(false), 400);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            The Operational Waste Report Dashboard
          </h1>
          <div className="flex gap-4">
            <button
              onClick={syncWithBeehiiv}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sync with Beehiiv
            </button>
            <button
              onClick={generateWeeklyReport}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Generate Report
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-gray-700">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'subscribers', label: 'Subscribers' },
            { key: 'compose', label: 'Compose' },
            { key: 'analytics', label: 'Analytics' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'overview' | 'subscribers' | 'compose' | 'analytics')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#111111] border border-[#222222] rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Total Subscribers</p>
                    <p className="text-3xl font-bold text-white">{stats.totalSubscribers.toLocaleString()}</p>
                    <p className="text-sm text-green-400">+{stats.newSubscribersThisWeek} this week</p>
                  </div>
                  <UsersIcon className="h-8 w-8 text-blue-400" />
                </div>
              </div>

              <div className="bg-[#111111] border border-[#222222] rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Avg Open Rate</p>
                    <p className="text-3xl font-bold text-white">{stats.avgOpenRate}%</p>
                    <p className="text-sm text-gray-400">Industry: 21%</p>
                  </div>
                  <EyeIcon className="h-8 w-8 text-green-400" />
                </div>
              </div>

              <div className="bg-[#111111] border border-[#222222] rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Avg Click Rate</p>
                    <p className="text-3xl font-bold text-white">{stats.avgClickRate}%</p>
                    <p className="text-sm text-gray-400">Industry: 2.6%</p>
                  </div>
                  <CursorArrowRaysIcon className="h-8 w-8 text-purple-400" />
                </div>
              </div>

              <div className="bg-[#111111] border border-[#222222] rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Audit Requests</p>
                    <p className="text-3xl font-bold text-white">{stats.totalAuditRequests}</p>
                    <p className="text-sm text-yellow-400">Pipeline Value: ${(stats.totalAuditRequests * 3000).toLocaleString()}</p>
                  </div>
                  <ChartBarIcon className="h-8 w-8 text-yellow-400" />
                </div>
              </div>
            </div>

            {/* Recent Issues Performance */}
            <div className="bg-[#111111] border border-[#222222] rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Recent Issues Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-gray-400 font-medium py-3">Issue</th>
                      <th className="text-gray-400 font-medium py-3">Sent</th>
                      <th className="text-gray-400 font-medium py-3">Open Rate</th>
                      <th className="text-gray-400 font-medium py-3">Click Rate</th>
                      <th className="text-gray-400 font-medium py-3">Audit Requests</th>
                      <th className="text-gray-400 font-medium py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentIssues.map(issue => (
                      <tr key={issue.id} className="border-b border-gray-800">
                        <td className="py-3 text-white font-medium">{issue.title}</td>
                        <td className="py-3 text-gray-300">{issue.stats.sent.toLocaleString()}</td>
                        <td className="py-3 text-gray-300">{issue.stats.openRate}%</td>
                        <td className="py-3 text-gray-300">{issue.stats.clickRate}%</td>
                        <td className="py-3">
                          <span className="bg-yellow-600 text-yellow-100 px-2 py-1 rounded text-sm">
                            {issue.stats.auditRequests}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400">{issue.publishDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pending Audit Requests */}
            <div className="bg-[#111111] border border-[#222222] rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Pending Audit Requests</h3>
              <div className="space-y-4">
                {stats.pendingAuditRequests.map(request => (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-gray-700">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        request.priority === 'high' ? 'bg-red-400' :
                        request.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                      }`}></div>
                      <div>
                        <p className="text-white font-medium">{request.companyName || request.email}</p>
                        <p className="text-gray-400 text-sm">
                          {request.businessType} • Requested {request.requestDate}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">${request.estimatedValue.toLocaleString()}</p>
                      <p className="text-gray-400 text-sm">{request.priority} priority</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === 'subscribers' && stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Subscriber Sources */}
              <div className="bg-[#111111] border border-[#222222] rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">Subscriber Sources</h3>
                <div className="space-y-4">
                  {stats.topSources.map(source => (
                    <div key={source.source} className="flex items-center justify-between">
                      <span className="text-gray-300 capitalize">{source.source}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">{source.count}</span>
                        <span className="text-gray-400">({source.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Subscribers */}
              <div className="bg-[#111111] border border-[#222222] rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">Recent Subscribers</h3>
                <div className="space-y-3">
                  {stats.recentSubscribers.map((subscriber, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded border border-gray-700">
                      <div>
                        <p className="text-white text-sm font-medium">{subscriber.email}</p>
                        <p className="text-gray-400 text-xs">
                          {subscriber.source} • {subscriber.signupDate}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        subscriber.engagementLevel === 'hot' ? 'bg-red-600 text-red-100' :
                        subscriber.engagementLevel === 'warm' ? 'bg-yellow-600 text-yellow-100' :
                        'bg-blue-600 text-blue-100'
                      }`}>
                        {subscriber.engagementLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="space-y-8">
            <div className="bg-[#111111] border border-[#222222] rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Compose Newsletter Issue</h3>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] mb-5">
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0a] p-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    AI Draft Topic
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g., after-hours leasing inquiries"
                    className="w-full px-3 py-2 bg-[#050505] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    onClick={generateAiDraft}
                    disabled={aiDrafting}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    {aiDrafting ? 'Drafting...' : 'Generate Draft'}
                  </button>
                </div>
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0a] p-4 text-sm text-gray-400">
                  Use this to seed a solid first draft, then edit it into a publishable issue. It is meant to reduce blank-page time, not replace review.
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Issue Title
                  </label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., The $5,000/Month Missed Call Problem"
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Newsletter Content
                  </label>
                  <textarea
                    value={draft.content}
                    onChange={(e) => setDraft(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Write your newsletter content here..."
                    rows={16}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={publishDraft}
                    disabled={!draft.title || !draft.content}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    Schedule for Next Tuesday
                  </button>
                  <button
                    onClick={() => setDraft({ title: '', content: '', status: 'draft' })}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Clear Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Template Helper */}
            <div className="bg-[#111111] border border-[#222222] rounded-lg p-6">
              <h4 className="text-lg font-bold text-white mb-3">Newsletter Template Structure</h4>
              <div className="text-gray-300 text-sm space-y-2">
                <p><strong>Opening:</strong> Real example or story from a customer</p>
                <p><strong>The Waste:</strong> Quantify the problem ($ lost, time wasted, opportunities missed)</p>
                <p><strong>The Fix:</strong> 3-level solution (Immediate, Better, Best)</p>
                <p><strong>The ROI:</strong> Cost vs value of implementing the solution</p>
                <p><strong>The Implementation:</strong> Practical next steps</p>
                <p><strong>The Operator Question:</strong> Diagnostic question for readers to ask themselves</p>
                <p><strong>CTA:</strong> Reply for audit request</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
