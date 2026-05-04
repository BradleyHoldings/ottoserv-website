"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/userAuth';
import { DemoSessionManager, DemoCommand } from '@/lib/demoSystem';
import JarvisDemoAssistant from './JarvisDemoAssistant';
import GuidanceOverlay from './GuidanceOverlay';

interface DemoModeContextType {
  isDemoUser: boolean;
  isDemoActive: boolean;
  startDemo: () => void;
  stopDemo: () => void;
  executeCommand: (command: DemoCommand) => void;
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemoUser: false,
  isDemoActive: false,
  startDemo: () => {},
  stopDemo: () => {},
  executeCommand: () => {}
});

export const useDemoMode = () => useContext(DemoModeContext);

interface DemoModeProviderProps {
  children: React.ReactNode;
}

export default function DemoModeProvider({ children }: DemoModeProviderProps) {
  const router = useRouter();
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<DemoCommand | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    const isDemo = DemoSessionManager.isDemo(user);
    setIsDemoUser(isDemo);
  }, []);

  // Detect clicks on data-demo-target elements and broadcast to JarvisDemoAssistant
  useEffect(() => {
    if (!isDemoActive) return;

    const handleClick = (e: MouseEvent) => {
      const el = (e.target as Element).closest('[data-demo-target]');
      if (!el) return;
      const target = el.getAttribute('data-demo-target');
      if (!target) return;
      window.dispatchEvent(new CustomEvent('jarvis:section-click', { detail: { target } }));
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [isDemoActive]);

  const startDemo = () => {
    setIsDemoActive(true);
    setShowAssistant(true);
    setBannerDismissed(true);
  };

  const stopDemo = () => {
    setIsDemoActive(false);
    setCurrentCommand({ action: 'clear_guidance', session_id: '' });
    setTimeout(() => setCurrentCommand(null), 100);
  };

  const executeCommand = (command: DemoCommand) => {
    if (command.action === 'navigate_to' && command.target) {
      // Clear guidance first, then navigate
      setCurrentCommand({ action: 'clear_guidance', session_id: command.session_id });
      setTimeout(() => {
        router.push(command.target!);
        setTimeout(() => setCurrentCommand(null), 100);
      }, 200);
      return;
    }
    setCurrentCommand(command);
  };

  const handleCommandComplete = () => {
    setCurrentCommand(null);
  };

  const handleAssistantClose = () => {
    setShowAssistant(false);
    stopDemo();
  };

  const contextValue: DemoModeContextType = {
    isDemoUser,
    isDemoActive,
    startDemo,
    stopDemo,
    executeCommand
  };

  const showBanner = isDemoUser && !bannerDismissed && !isDemoActive;

  return (
    <DemoModeContext.Provider value={contextValue}>
      <div className="flex flex-col" style={{ minHeight: '100vh' }}>
        {/* Demo welcome banner — sits above the sidebar/content row */}
        {showBanner && (
          <div
            style={{
              height: '48px',
              background: 'linear-gradient(90deg, #c2410c, #ea580c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              flexShrink: 0,
              zIndex: 50,
            }}
          >
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
              Welcome to OttoServ — Demo Mode, guided by Jarvis
            </span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={startDemo}
                style={{
                  background: 'white',
                  color: '#c2410c',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>&#9654;</span> Start Guided Tour
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Explore freely
              </button>
            </div>
          </div>
        )}

        {/* Main layout: sidebar + content */}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>

      {/* Jarvis Demo Assistant panel */}
      {isDemoUser && showAssistant && (
        <JarvisDemoAssistant
          isVisible={showAssistant}
          onCommand={executeCommand}
          onClose={handleAssistantClose}
          autoStart
        />
      )}

      {/* Guidance Overlay */}
      {isDemoActive && (
        <GuidanceOverlay
          command={currentCommand}
          onComplete={handleCommandComplete}
        />
      )}
    </DemoModeContext.Provider>
  );
}
