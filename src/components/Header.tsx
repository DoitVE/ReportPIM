import React from 'react';
import { TabType } from '../types';
import { 
  BarChart3, 
  GitCommit, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  MapPin, 
  Upload,
  Calendar,
  Layers
} from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  totalAvvisi: number;
  dataAggiornamento: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalAvvisi,
  dataAggiornamento,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Panoramica KPI', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'avvisi_v5', label: 'Avvisi V5 (Binario)', icon: <GitCommit className="w-4 h-4" /> },
    { id: 'avvisi_v3v4', label: 'Avvisi V3/V4 (Diagnostica)', icon: <Activity className="w-4 h-4" /> },
    { id: 'abbaco', label: 'ABBA.CO (Rallentamenti)', icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> },
    { id: 'frequenza', label: 'Analisi Frequenza', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'controlli', label: 'Controlli SAP & ODL', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
    { id: 'mappa', label: 'Mappa Georeferenziata', icon: <MapPin className="w-4 h-4 text-cyan-400" /> },
    { id: 'importa', label: 'Importa / Aggiorna', icon: <Upload className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-slate-800/60">
          {/* Logo & Corporate Identity */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-center bg-white p-1 rounded-md shadow-sm">
              <img 
                src="/rfi_logo.jpg" 
                alt="RFI Logo" 
                className="h-7 w-auto object-contain" 
                onError={(e) => {
                  // Fallback to text if image cannot be rendered
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-white font-bold text-base tracking-tight">RFI DOIT VENEZIA</span>
                <span className="bg-red-950/80 text-red-400 text-xs px-2 py-0.5 rounded font-mono border border-red-800/60 font-semibold">
                  PIM ARMAMENTO
                </span>
                <span className="bg-blue-950/80 text-blue-400 text-xs px-2 py-0.5 rounded font-mono border border-blue-800/60">
                  v3.1 Web
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate hidden sm:block">
                Piattaforma di Monitoraggio e Controllo Difetti di Binario & Diagnostica
              </p>
            </div>
          </div>

          {/* SAP Status Indicators */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-xs bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-md">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Dati SAP al:</span>
              <span className="text-slate-200 font-semibold font-mono">{dataAggiornamento}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs bg-emerald-950/50 border border-emerald-800/60 px-3 py-1.5 rounded-md text-emerald-300">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold font-mono">{totalAvvisi.toLocaleString('it-IT')}</span>
              <span className="text-emerald-400 hidden sm:inline">Avvisi Attivi</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-red-700 text-white shadow-md shadow-red-950 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
