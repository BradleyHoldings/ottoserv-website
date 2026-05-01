"use client";

import JarvisChat from "@/components/dashboard/JarvisChat";

export default function JarvisPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 border border-blue-600/30 rounded-xl flex items-center justify-center text-xl">
            🤖
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ask Jarvis</h1>
            <p className="text-gray-500 text-sm">
              Your AI business assistant — powered by OttoServ
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs">Online</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-[#111827] border border-gray-800 rounded-xl p-6 flex flex-col">
        <JarvisChat />
      </div>
    </div>
  );
}
