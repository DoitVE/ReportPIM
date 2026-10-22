import React from 'react';
import { PowerBiSectionId } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    { id: 'avvisi_v3v4', label: 'Avvisi V3 V4' },
    { id: 'abbaco', label: 'ABBA.CO' },
    { id: 'analisi_frequenza', label: 'Analisi frequenza V3 V4' },
    { id: 'drill_frequenza', label: 'Drill fequenza avvisi V3 V4' },
    { id: 'controlli_avvisi', label: 'Controlli Avvisi' },
    { id: 'controlli_avvisi_2', label: 'Controlli Avvisi 2' },
    { id: 'pagina_1', label: 'Pagina 1' },
  ];

  return (
    <div className="bg-slate-200 border-t border-slate-300 text-slate-700 h-9 flex items-center px-2 select-none shrink-0 overflow-x-auto shadow-inner">
      <div className="flex items-center space-x-1 mr-2 text-slate-500">
        <button 
          onClick={() => {
            const idx = tabs.findIndex(t => t.id === activeSection);
            if (idx > 0) onChangeSection(tabs[idx - 1].id);
          }}
          disabled={activeSection === tabs[0].id}
          className="p-1 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Pagina precedente"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => {
            const idx = tabs.findIndex(t => t.id === activeSection);
            if (idx < tabs.length - 1) onChangeSection(tabs[idx + 1].id);
          }}
          disabled={activeSection === tabs[tabs.length - 1].id}
          className="p-1 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Pagina successiva"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex space-x-0.5 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeSection(tab.id)}
              className={`px-3.5 py-1 text-xs font-medium whitespace-nowrap transition-colors border-t-2 relative ${
                isActive
                  ? 'bg-white text-slate-950 font-bold border-yellow-500 shadow-2xs'
                  : 'bg-slate-200 hover:bg-slate-300/80 text-slate-700 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
