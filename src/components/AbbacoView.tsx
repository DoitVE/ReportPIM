import React, { useState, useMemo } from 'react';
import { AbbacoItem } from '../types';
import { 
  AlertTriangle, 
  Search, 
  Download, 
  TrendingDown, 
  ShieldAlert, 
  ArrowRight,
  Gauge
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface AbbacoProps {
  abbaco: AbbacoItem[];
}

export const AbbacoView: React.FC<AbbacoProps> = ({ abbaco }) => {
  const [selectedLinea, setSelectedLinea] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const linee = useMemo(() => {
    const s = new Set<string>();
    abbaco.forEach(item => { if (item.linea) s.add(item.linea); });
    return Array.from(s).sort();
  }, [abbaco]);

  const filtered = useMemo(() => {
    return abbaco.filter(item => {
      if (selectedLinea !== 'ALL' && item.linea !== selectedLinea) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.linea.toLowerCase().includes(q) ||
          item.tratta.toLowerCase().includes(q) ||
          item.chiave_rl.toLowerCase().includes(q) ||
          item.motivo.toLowerCase().includes(q) ||
          item.km_inizio.toLowerCase().includes(q) ||
          item.titolare.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [abbaco, selectedLinea, searchQuery]);

  // Chart data
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(item => {
      map[item.linea] = (map[item.linea] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [filtered]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ABBACO_Rallentamenti');
    XLSX.writeFile(wb, `Report_ABBACO_Rallentamenti_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-amber-950 border border-amber-800 rounded-lg text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">ABBA.CO - Abbattimento Codici Rallentamento</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestione e monitoraggio dei rallentamenti temporanei di linea istituiti per difetti all'armamento ferroviario
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Esporta ABBA.CO ({filtered.length})</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Totale Rallentamenti</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{filtered.length}</div>
          <div className="text-xs text-slate-400 mt-1">Chiavi RL in esercizio</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Linee Interessate</span>
            <Gauge className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{linee.length}</div>
          <div className="text-xs text-slate-400 mt-1">Direttrici territoriali VE</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Causa Principale</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-base font-bold text-white truncate mt-1">Riflusso Argilloso / Usura</div>
          <div className="text-xs text-slate-400 mt-1">Piattaforma e massicciata</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Unità Responsabili</span>
            <span className="text-xs font-mono text-emerald-400">LVU</span>
          </div>
          <div className="text-base font-bold text-emerald-400 font-mono mt-1">LVU1 • LVU2 • LVU3</div>
          <div className="text-xs text-slate-400 mt-1">Lavori Armamento Territoriale</div>
        </div>
      </div>

      {/* Slicers & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Slicer box */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Filtra Rallentamenti</h4>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Cerca Tratta / Chiave / Motivo
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Es. riflusso, 11d, Mestre..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Linea Ferroviaria
            </label>
            <select
              value={selectedLinea}
              onChange={(e) => setSelectedLinea(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Tutte le Linee ({linee.length})</option>
              {linee.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="pt-2 text-xs text-slate-400">
            I rallentamenti comportano perdita di regolarità oraria e richiedono priorità assoluta di risanamento o rinnovo.
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
            Rallentamenti per Linea Ferroviaria
          </h4>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 25 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Chiavi RL" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-700 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Linea</th>
                <th className="py-3 px-3">Tratta Descrizione</th>
                <th className="py-3 px-3">Cod. Tratta INRETE</th>
                <th className="py-3 px-3">Binario</th>
                <th className="py-3 px-3">Chilometrica (Inizio - Fine)</th>
                <th className="py-3 px-3">Chiave RL</th>
                <th className="py-3 px-3">Riduzione Vel.</th>
                <th className="py-3 px-3">Motivo Rallentamento</th>
                <th className="py-3 px-3">Titolare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nessun rallentamento presente per i criteri selezionati.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-750/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {item.linea}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-medium">
                      {item.tratta || 'Tratta Principale'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {item.tratta_codice || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">
                        {item.binario || 'P'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-cyan-300 font-semibold">
                      {item.km_inizio} - {item.km_fine}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                      {item.chiave_rl}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-amber-950 text-amber-400 border border-amber-800">
                        {item.rid_vel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate" title={item.motivo}>
                      {item.motivo}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-emerald-400">
                      {item.titolare || 'LVU1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
