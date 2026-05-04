"use client";

import { useEffect, useState } from 'react';

const AGENT_ID = 'agent_0501kqg13ad2ej09zsyxywrb6gsz';

export default function JarvisVoiceClient() {
  const [installable, setInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Detect iOS (Safari doesn't support beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Check if already installed (running as standalone PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
    setInstallable(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050d1a] via-[#0a1628] to-[#0d0d1a] flex flex-col">
      {/* Header */}
      <div className="text-center pt-10 pb-4 px-4">
        <div className="flex items-center justify-center mb-3">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/50">
            <span className="text-3xl">⚡</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Jarvis</h1>
        <p className="text-blue-300 text-sm">OttoServ AI — Voice + Actions</p>
      </div>

      {/* ConvAI Widget container */}
      <div className="flex-1 flex flex-col items-center px-4 pb-4">
        <div className="w-full max-w-lg">
          {/* Status pill */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-2 bg-green-900/30 text-green-300 px-4 py-1.5 rounded-full border border-green-700/60 text-sm font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live — can take actions
            </div>
          </div>

          {/* ElevenLabs ConvAI widget */}
          <div className="bg-gray-900/60 backdrop-blur-md rounded-2xl border border-gray-700/60 shadow-2xl overflow-hidden mb-5">
            <div className="p-6">
              <p className="text-gray-300 text-sm text-center mb-5 leading-relaxed">
                Tap the microphone and speak naturally. Jarvis can answer questions, send emails, schedule posts, manage leads, run reports, and more.
              </p>
              {/* ElevenLabs embed */}
              <div className="flex justify-center">
                {/* @ts-ignore — custom element */}
                <elevenlabs-convai agent-id={AGENT_ID} />
              </div>
            </div>
          </div>

          {/* What Jarvis can do */}
          <div className="bg-gray-900/40 rounded-2xl border border-gray-800/60 p-5 mb-5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">Voice Actions Available</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
              {[
                ["📧", "Send emails"],
                ["📲", "Schedule social posts"],
                ["✅", "Create tasks"],
                ["📋", "Update leads & CRM"],
                ["📊", "Generate reports"],
                ["🤝", "Process deals"],
                ["📞", "Schedule follow-ups"],
                ["⚡", "Start campaigns"],
              ].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <span>{icon}</span>
                  <span className="text-gray-300 text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Install CTA */}
          {!installed && (
            <div className="bg-blue-900/30 rounded-2xl border border-blue-700/50 p-5 mb-4">
              <p className="text-white font-semibold text-sm mb-1">Save to Home Screen</p>
              <p className="text-blue-200 text-xs mb-4">Launch Jarvis instantly, just like a native app — no browser bar, full screen.</p>

              {isIOS ? (
                <>
                  <button
                    onClick={() => setShowIOSInstructions(v => !v)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
                  >
                    📲 How to Install on iPhone / iPad
                  </button>
                  {showIOSInstructions && (
                    <ol className="mt-4 space-y-2 text-blue-100 text-xs list-none">
                      <li className="flex gap-2"><span className="text-blue-400 font-bold">1.</span> Tap the <strong>Share</strong> button at the bottom of Safari</li>
                      <li className="flex gap-2"><span className="text-blue-400 font-bold">2.</span> Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                      <li className="flex gap-2"><span className="text-blue-400 font-bold">3.</span> Tap <strong>Add</strong> — Jarvis appears on your home screen</li>
                    </ol>
                  )}
                </>
              ) : installable ? (
                <button
                  onClick={handleInstall}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
                >
                  ⬇️ Add Jarvis to Home Screen
                </button>
              ) : (
                <p className="text-blue-300 text-xs text-center">
                  Open this page in Chrome on Android or Safari on iPhone to install.
                </p>
              )}
            </div>
          )}

          {installed && (
            <div className="text-center text-green-400 text-sm font-medium mb-4">
              ✅ Jarvis is installed on your home screen
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t border-gray-800/60">
        <a href="/dashboard/command-center" className="text-gray-500 hover:text-gray-300 text-xs transition-colors">
          ← Back to OttoServ Dashboard
        </a>
      </div>

      {/* ElevenLabs ConvAI script */}
      <script src="https://elevenlabs.io/convai-widget/index.js" async />
    </div>
  );
}
