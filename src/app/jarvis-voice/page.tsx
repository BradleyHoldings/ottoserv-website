import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Talk to Jarvis - OttoServ AI Assistant",
  description: "Voice conversation with Jarvis, your OttoServ AI assistant. Get instant help with business automation.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
};

export default function JarvisVoice() {
  return (
    <>
      {/* PWA Meta Tags for App-like Experience */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Jarvis Voice" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="theme-color" content="#0066cc" />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-black flex flex-col">
        {/* Header */}
        <div className="text-center pt-8 pb-6 px-4">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Jarvis AI</h1>
          <p className="text-blue-300 text-lg">Your OttoServ Assistant</p>
        </div>

        {/* Voice Interface */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md border border-gray-700">
            
            {/* Status Indicator */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-2 bg-green-900/30 text-green-300 px-4 py-2 rounded-full border border-green-700">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Jarvis Online</span>
              </div>
            </div>

            {/* ElevenLabs Voice Widget */}
            <div className="mb-8">
              <iframe
                src="https://elevenlabs.io/app/talk-to?agent_id=agent_0501kqg13ad2ej09zsyxywrb6gsz&embed=true"
                width="100%"
                height="400"
                style={{
                  border: 'none',
                  borderRadius: '12px',
                  backgroundColor: '#1f2937'
                }}
                allow="microphone"
                title="Talk to Jarvis"
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={() => window.location.href = 'tel:4077988172'}
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <span>📞</span>
                <span>Call Morgan</span>
              </button>
              <button 
                onClick={() => window.location.href = 'https://ottoserv.com'}
                className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <span>🏠</span>
                <span>Home</span>
              </button>
            </div>

            {/* Instructions */}
            <div className="text-center">
              <p className="text-gray-300 text-sm leading-relaxed">
                Tap the microphone above and speak naturally with Jarvis. 
                Ask about business automation, OttoServ features, or get help with your account.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 text-center text-gray-400 text-sm max-w-sm">
            <p className="mb-2">✅ Natural voice conversation</p>
            <p className="mb-2">✅ Instant business insights</p>
            <p>✅ 24/7 availability</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 px-4 border-t border-gray-800">
          <p className="text-gray-400 text-sm">
            OttoServ AI Assistant | 
            <a href="https://ottoserv.com" className="text-blue-400 ml-1">ottoserv.com</a>
          </p>
        </div>
      </div>

      {/* PWA Service Worker Registration */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Add to home screen functionality
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js');
              });
            }

            // Enhanced mobile experience
            document.addEventListener('DOMContentLoaded', function() {
              // Prevent zoom on input focus for better mobile UX
              const meta = document.createElement('meta');
              meta.name = 'viewport';
              meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
              document.head.appendChild(meta);

              // Request microphone permissions on load for smoother experience
              if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ audio: true })
                  .then(function(stream) {
                    // Permission granted, close stream
                    stream.getTracks().forEach(track => track.stop());
                  })
                  .catch(function(err) {
                    console.log('Microphone access requested');
                  });
              }
            });
          `
        }}
      />
    </>
  );
}