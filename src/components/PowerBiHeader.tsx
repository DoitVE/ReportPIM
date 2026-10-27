import React from 'react';
import { Database, Calendar, RefreshCcw, Layers, Upload, AlertCircle } from 'lucide-react';

interface PowerBiHeaderProps {
  onOpenFileLoader: () => void;
  dataAggiornamento: string;
  totalRecords: number;
}

export const PowerBiHeader: React.FC<PowerBiHeaderProps> = ({
  onOpenFileLoader,
  dataAggiornamento,
  totalRecords,
}) => {
  const isPopulated = totalRecords > 0;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white select-none sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Power BI & RFI Identity */}
        <div className="flex items-center space-x-3">
          {/* Power BI Brand Icon */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-amber-400 rounded flex items-center justify-center font-bold text-slate-950 text-xs shadow-sm">
              Pb
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-tight text-white">
                  Report difetti armamento - v3.0
                </span>
                <span className="bg-red-900/80 border border-red-700 text-red-200 text-[10px] font-semibold px-2 py-0.5 rounded font-mono">
                  RFI DOIT VE
                </span>
                {/* Status Indicator */}
                {isPopulated ? (
                  <span className="bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded font-mono flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Alimentata ({totalRecords.toLocaleString('it-IT')} record)</span>
                  </span>
                ) : (
                  <span className="bg-amber-950/80 border border-amber-600/60 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded font-mono flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span>Non alimentata (0 record)</span>
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 block -mt-0.5">
                Web App • Ingegneria Manutenzione Armamento
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right: Manual File Selector Button & Metadata */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center space-x-2 text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-md">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Data riferimento:</span>
            <span className="text-slate-100 font-mono font-semibold">{dataAggiornamento}</span>
          </div>

          {/* PRIMARY BUTTON: Seleziona i file per alimentare la WebApp */}
          <button
            onClick={onOpenFileLoader}
            className={`flex items-center space-x-2 text-xs font-bold px-3.5 py-1.5 rounded-md shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
              isPopulated
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-300/50 animate-pulse'
            }`}
            title="Clicca per selezionare i file estratti da SAP per alimentare la WebApp"
          >
            <Upload className="w-4 h-4 text-slate-950" />
            <span>Alimenta Web App (Seleziona File)</span>
            <span className="bg-slate-950 text-amber-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {totalRecords.toLocaleString('it-IT')}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
