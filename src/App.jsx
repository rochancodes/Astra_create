import './index.css';
import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import CanvasEditor from './components/CanvasEditor';
import PropertiesPanel from './components/PropertiesPanel';
import Toolbar from './components/Toolbar';
import Onboarding from './components/Onboarding';
import CampaignGenerator from './components/CampaignGenerator';
import QuickCampaignWizard from './components/QuickCampaignWizard';
import MagicWandWizard from './components/MagicWandWizard';
import DemoGallery from './components/DemoGallery';
import TemplateManager from './components/TemplateManager';
import GuidedMode from './components/GuidedMode';
import Dashboard from './components/Dashboard';
import useStore from './store/useStore';

function App() {
  const { showOnboarding, setShowOnboarding, canvas, saveToHistory, complianceErrors, complianceWarnings, zoomLevel } = useStore();
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'editor'

  const [showCampaignGenerator, setShowCampaignGenerator] = useState(false);
  const [showQuickWizard, setShowQuickWizard] = useState(false);
  const [showMagicWand, setShowMagicWand] = useState(false);
  const [showDemoGallery, setShowDemoGallery] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showGuidedMode, setShowGuidedMode] = useState(false);

  // Navigation handler
  const handleNavigate = (target) => {
    if (target === 'magic-wand') {
      setView('editor');
      setShowMagicWand(true);
    } else if (target === 'guided') {
      setView('editor');
      setShowGuidedMode(true);
    } else if (target === 'editor') {
      setView('editor');
    } else if (target === 'gallery') {
      setView('editor');
      setShowDemoGallery(true);
    } else if (target === 'templates') {
      setView('editor');
      setShowTemplateManager(true);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Delete selected object
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvas) {
        const active = canvas.getActiveObject();
        if (active && !active.isEditing) {
          canvas.remove(active);
          canvas.discardActiveObject();
          canvas.renderAll();
          saveToHistory();
        }
      }

      // Undo (Cmd/Ctrl + Z)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useStore.getState().undo();
      }

      // Redo (Cmd/Ctrl + Shift + Z)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        useStore.getState().redo();
      }

      // Export campaign (Cmd/Ctrl + E)
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setShowCampaignGenerator(true);
      }

      // Quick wizard (Cmd/Ctrl + N)
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowQuickWizard(true);
      }

      // Magic Wand (Cmd/Ctrl + M)
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        setShowMagicWand(true);
      }

      // Demo Gallery (Cmd/Ctrl + G)
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        setShowDemoGallery(true);
      }

      // Template Manager (Cmd/Ctrl + T)
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        setShowTemplateManager(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas, saveToHistory]);

  const isCompliant = complianceErrors.length === 0;
  const totalIssues = complianceErrors.length + complianceWarnings.length;

  return (
    <div className="app-container">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}

      {/* Campaign Generator Modal */}
      {showCampaignGenerator && (
        <CampaignGenerator onClose={() => setShowCampaignGenerator(false)} />
      )}

      {/* Quick Campaign Wizard */}
      {showQuickWizard && (
        <QuickCampaignWizard
          onClose={() => setShowQuickWizard(false)}
          onComplete={() => setShowQuickWizard(false)}
        />
      )}

      {/* Magic Wand Wizard - One-click campaign generation */}
      {showMagicWand && (
        <MagicWandWizard
          onClose={() => setShowMagicWand(false)}
          onComplete={(result) => {
            console.log('Magic Wand generated:', result);
            setShowMagicWand(false);
          }}
        />
      )}

      {/* Demo Gallery - AI Creative Showcase */}
      {showDemoGallery && (
        <DemoGallery
          onClose={() => setShowDemoGallery(false)}
          onApply={() => setShowDemoGallery(false)}
        />
      )}

      {/* Template Manager */}
      {showTemplateManager && (
        <TemplateManager
          onClose={() => setShowTemplateManager(false)}
        />
      )}

      {/* Guided Mode - Step-by-step for non-experts */}
      {showGuidedMode && (
        <GuidedMode
          onClose={() => setShowGuidedMode(false)}
          onComplete={() => setShowGuidedMode(false)}
        />
      )}

      {/* Top Toolbar */}
      {view === 'editor' && (
        <Toolbar
          onOpenMagicWand={() => setShowMagicWand(true)}
          onOpenDemoGallery={() => setShowDemoGallery(true)}
          onOpenTemplates={() => setShowTemplateManager(true)}
          onOpenGuidedMode={() => setShowGuidedMode(true)}
          onHome={() => setView('dashboard')}
        />
      )}

      {/* Main Content Area */}
      {view === 'dashboard' ? (
        <Dashboard onNavigate={handleNavigate} />
      ) : (
        <div className="workspace">
          {/* Left Sidebar */}
          <Sidebar />

          {/* Canvas Workspace */}
          <div className="canvas-workspace">
            <CanvasEditor onOpenWizard={() => setShowQuickWizard(true)} />
          </div>

          {/* Right Properties Panel */}
          <PropertiesPanel />
        </div>
      )}

      {/* Status Bar - Only in Editor */}
      {view === 'editor' && (
        <div className="status-bar">
          <div className="flex items-center gap-2">
            <span>Zoom: {zoomLevel}%</span>
          </div>

          <div className="flex-1" />

          <div className={`compliance-indicator ${isCompliant ? 'compliant' : 'has-errors'}`}>
            <span className={`compliance-dot ${isCompliant ? 'success' : 'error'}`} />
            {isCompliant ? 'Compliant' : `${totalIssues} issue${totalIssues !== 1 ? 's' : ''}`}
          </div>

          <div className="flex items-center gap-4 ml-4">
            <span className="text-muted">⌘M Magic</span>
            <span className="text-muted">⌘T Templates</span>
            <span className="text-muted">⌘Z Undo</span>
            <span className="text-muted">⌘E Export</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
