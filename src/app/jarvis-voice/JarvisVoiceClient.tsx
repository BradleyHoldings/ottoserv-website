"use client";

export default function JarvisVoiceClient() {
  return (
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

          {/* ElevenLabs Voice Interface */}
          <div className="mb-8 text-center">
            <div className="bg-gray-900/50 rounded-xl p-8 border border-gray-600">
              <div className="mb-6">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🎤</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Voice Chat Ready</h3>
                <p className="text-gray-300 text-sm mb-6">Click below to start a voice conversation with Jarvis</p>
              </div>
              
              <a
                href="https://elevenlabs.io/app/talk-to?agent_id=agent_0501kqg13ad2ej09zsyxywrb6gsz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                <span className="text-xl">🎙️</span>
                <span>Start Voice Chat</span>
              </a>
              
              <p className="text-gray-400 text-xs mt-4">Opens in ElevenLabs (new tab)</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <a 
              href="tel:4077988172"
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <span>📞</span>
              <span>Call Morgan</span>
            </a>
            <a 
              href="/"
              className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <span>🏠</span>
              <span>Home</span>
            </a>
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
          <a href="/" className="text-blue-400 ml-1">ottoserv.com</a>
        </p>
      </div>
    </div>
  );
}