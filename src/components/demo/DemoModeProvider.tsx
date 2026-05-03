"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<DemoCommand | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);

  useEffect(() => {
    // Check if current user is demo user
    const user = getCurrentUser();
    const isDemo = DemoSessionManager.isDemo(user);
    setIsDemoUser(isDemo);

    if (isDemo) {
      // Auto-show demo assistant for demo users
      setTimeout(() => {
        setShowAssistant(true);
      }, 1000);
    }
  }, []);

  useEffect(() => {
    // Add Jarvis target attributes to dashboard elements
    if (isDemoUser) {
      addJarvisTargets();
    }
  }, [isDemoUser]);

  const addJarvisTargets = () => {
    // Add data-jarvis-target attributes to key dashboard elements
    const targetMappings = {
      // Main dashboard areas
      'dashboard_overview': '[class*="grid"]:first-of-type, .dashboard-grid, .kpi-grid',
      'jarvis_activity': '[class*="jarvis"], [data-testid="jarvis-activity"]',
      
      // Lead management
      'lead_pipeline': '[class*="pipeline"], [data-testid="lead-pipeline"], .lead-pipeline',
      'new_leads': '[class*="new-lead"], [data-testid="new-leads"], .new-leads',
      'qualified_leads': '[class*="qualified"], [data-testid="qualified-leads"]',
      'missed_calls': '[class*="missed"], [class*="call"], [data-testid="missed-calls"]',
      'appointments': '[class*="appointment"], [data-testid="appointments"]',
      
      // Task management
      'follow_up_tasks': '[class*="follow-up"], [class*="task"], [data-testid="follow-up-tasks"]',
      'client_tasks': '[class*="client-task"], [data-testid="client-tasks"]',
      
      // Automation
      'automation_activity': '[class*="automation"], [data-testid="automation-activity"]',
      'field_updates': '[class*="field"], [class*="update"], [data-testid="field-updates"]',
      
      // Projects
      'project_timeline': '[class*="timeline"], [class*="project"], [data-testid="project-timeline"]',
      'kanban_board': '[class*="kanban"], [class*="board"], [data-testid="kanban-board"]',
      
      // Communication
      'messages': '[class*="message"], [data-testid="messages"]',
      
      // Reports and Analytics
      'reports': '[class*="report"], [class*="analytic"], [data-testid="reports"]',
      'billing': '[class*="billing"], [class*="invoice"], [data-testid="billing"]',
      
      // Settings
      'integrations': '[class*="integration"], [data-testid="integrations"]',
      'settings': '[class*="setting"], [data-testid="settings"]'
    };

    // Apply target attributes
    Object.entries(targetMappings).forEach(([targetId, selectors]) => {
      const selectorList = selectors.split(', ');
      
      for (const selector of selectorList) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // Use the first matching element
          elements[0].setAttribute('data-jarvis-target', targetId);
          break;
        }
      }
    });

    // Fallback: Add targets to common elements by content or aria-labels
    addTargetsByContent();
  };

  const addTargetsByContent = () => {
    // Find elements by text content for reliable targeting
    const contentMappings = {
      'dashboard_overview': ['Dashboard', 'Overview', 'Command Center'],
      'lead_pipeline': ['Pipeline', 'Leads', 'Lead Management'],
      'new_leads': ['New Leads', 'Recent Leads'],
      'appointments': ['Appointments', 'Calendar', 'Scheduled'],
      'automation_activity': ['Automation', 'AI Activity', 'Smart Actions'],
      'reports': ['Reports', 'Analytics', 'Insights'],
      'billing': ['Billing', 'Invoices', 'Revenue']
    };

    Object.entries(contentMappings).forEach(([targetId, keywords]) => {
      keywords.forEach(keyword => {
        const xpath = `//h1[contains(text(),'${keyword}')] | //h2[contains(text(),'${keyword}')] | //h3[contains(text(),'${keyword}')] | //*[@aria-label='${keyword}'] | //*[contains(@title,'${keyword}')]`;
        
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        
        if (result.singleNodeValue && !(result.singleNodeValue as Element).getAttribute('data-jarvis-target')) {
          (result.singleNodeValue as Element).setAttribute('data-jarvis-target', targetId);
        }
      });
    });
  };

  const startDemo = () => {
    setIsDemoActive(true);
    setShowAssistant(true);
  };

  const stopDemo = () => {
    setIsDemoActive(false);
    setCurrentCommand({ action: 'clear_guidance', session_id: '' });
    setTimeout(() => setCurrentCommand(null), 100);
  };

  const executeCommand = (command: DemoCommand) => {
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

  return (
    <DemoModeContext.Provider value={contextValue}>
      {children}
      
      {/* Demo Assistant Panel */}
      {isDemoUser && (
        <JarvisDemoAssistant
          isVisible={showAssistant}
          onCommand={executeCommand}
          onClose={handleAssistantClose}
        />
      )}
      
      {/* Guidance Overlay */}
      {isDemoActive && (
        <GuidanceOverlay
          command={currentCommand}
          onComplete={handleCommandComplete}
        />
      )}
      
      {/* Demo Mode Indicator */}
      {isDemoUser && isDemoActive && (
        <div className="demo-mode-indicator">
          <div className="indicator-content">
            <span className="indicator-icon">⚡</span>
            <span className="indicator-text">Jarvis Demo Mode</span>
          </div>
          
          <style jsx>{`
            .demo-mode-indicator {
              position: fixed;
              top: 20px;
              left: 20px;
              z-index: 9999;
            }
            
            .indicator-content {
              background: linear-gradient(135deg, #0084ff, #00a8ff);
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 8px;
              box-shadow: 0 4px 12px rgba(0, 132, 255, 0.3);
              animation: demo-pulse 2s infinite;
            }
            
            @keyframes demo-pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
            
            .indicator-icon {
              font-size: 16px;
            }
          `}</style>
        </div>
      )}
    </DemoModeContext.Provider>
  );
}