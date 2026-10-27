import React from 'react';
import { PowerBiSectionId } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  FileText,
  X,
  Maximize2,
  ZoomIn
} from 'lucide-react';

interface PowerBiTabsProps {
  activeSection: PowerBiSectionId;
  onChangeSection: (id: PowerBiSectionId) => void;
}

export const PowerBiTabs: React.FC<PowerBiTabsProps> = ({
  activeSection,
  onChangeSection,
}) => {
  const tabs: { id: PowerBiSectionId; label: string }[] = [
    { id: 'avvisi_v5', label: 'Avvisi V5' },
    { id: 'dashboard_v5', label: 'Dashboard V5' },
    { id: 'cerca_sete_v5', label: 'Cerca per SeTe V5' },
    { id: 'avvisi_v3v4', label: 'Avvisi V3 V4' },
    { id: 'frequenza_v3v4', label: 'Frequenza V3 V4' },
    { id: 'drill_frequenza_v3v4', label: 'Drill fequenza V3 V4' },
    { id: 'drill_v5', label: 'Drill V5' },
    { id: 'abbattimento_codici', label: 'Abbattimento Codici' },
    { id: 'quick_user_guide', label: 'Quick User Guide' },
  ];

  const currentIndex = tabs.findIndex(t => t.id === activeSection);

  const handlePrev = () => {
    if (currentIndex > 0) {
      onChangeSection(tabs[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < tabs.length - 1) {
      onChangeSection(tabs[currentIndex + 1].id);
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <footer className="bg-[#e5e7eb] border-t border-[#cbd5e1] text-[#334155] h-9.5 flex items-center justify-between px-2 select-none shrink-0 z-40 text-xs shadow-inner">
      {/* Left Navigation & View Mode Controls */}
      <div className="flex items-center space-x-1 shrink-0 mr-1 text-[#64748b]">
        <button
          className="p-1 hover:text-[#0f172a] hover:bg-[#cbd5e1]/50 rounded cursor-pointer transition-colors"
          title="Layout desktop"
        >
          <Monitor className="w-3.5 h-3.5 text-[#475569]" />
        </button>
        <button
          className="p-1 hover:text-[#0f172a] hover:bg-[#cbd5e1]/50 rounded cursor-pointer transition-colors"
          title="Layout per dispositivi mobili"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#475569]" />
        </button>

        <div className="h-4 w-px bg-[#cbd5e1] mx-0.5" />

        <button
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          className="p-1 hover:text-[#0f172a] hover:bg-[#cbd5e1]/50 rounded disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          title="Pagina precedente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex >= tabs.length - 1}
          className="p-1 hover:text-[#0f172a] hover:bg-[#cbd5e1]/50 rounded disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          title="Pagina successiva"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs List */}
      <div className="flex-1 flex items-center space-x-0.5 overflow-x-auto scrollbar-none py-0.5">
        {tabs.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <div key={tab.id} className="relative group shrink-0">
              <button
                onClick={() => onChangeSection(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1 text-[11.5px] font-medium whitespace-nowrap transition-all rounded-t-xs border-b-2 ${
                  isActive
                    ? 'bg-white text-[#0f172a] font-semibold border-[#107c41] shadow-2xs z-10'
                    : 'bg-transparent hover:bg-[#d1d5db] text-[#475569] border-transparent'
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-[#0f172a]' : 'text-[#64748b]'}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="ml-1 text-[#94a3b8] hover:text-[#0f172a]"
                    title="Scheda attiva"
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>

              {/* Active Pointer Tooltip (matching Power BI desktop screenshot) */}
              {isActive && (
                <div className="hidden lg:block absolute -top-8 left-1/2 -translate-x-1/2 bg-[#323130] text-white text-[11px] px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                  {tab.label}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#323130]" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Zoom & Fullscreen Controls */}
      <div className="flex items-center space-x-2 text-[#64748b] shrink-0 ml-2 text-[11px]">
        <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-white/70 border border-[#cbd5e1] text-[#334155]">
          <ZoomIn className="w-3 h-3 text-[#64748b]" />
          <span className="font-mono text-[10px] font-semibold">100%</span>
        </div>
        <button
          onClick={handleToggleFullscreen}
          className="p-1 hover:text-[#0f172a] hover:bg-[#cbd5e1]/50 rounded cursor-pointer transition-colors"
          title="Schermo intero"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <div className="h-4 w-px bg-[#cbd5e1]" />
      </div>
    </footer>
  );
};
