import React, { useState, useMemo } from 'react';
import { Avviso } from '../types';
import { 
  TrendingUp, 
  MapPin, 
  AlertTriangle, 
  Layers, 
  Search, 
  Download,
  Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface FrequenzaProps {
  avvisi: Avviso[];
}

export const FrequenzaView: React.FC<FrequenzaProps> = ({ avvisi }) => {
  const [selectedLinea, setSelectedLinea] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const linee = useMemo(() => {
    const s = new Set<string>();
    avvisi.forEach(a => { if (a.linea) s.add(a.linea); });
    return Array.from(s).sort();
  }, [avvisi]);

  // Aggregate frequency by station / location / sede
  const freqByLocation = useMemo(() => {
    const map: Record<string, {
      sede: string;
      nome: string;
      linea: string;
      total: number;
      v5Count: number;
      v3v4Count: number;
      scaduti: number;
      lat: number;
      lng: number;
    }> = {};

    avvisi.forEach(a => {
      const base = a.nome_sede || a.sede_tecnica.split('-')[0] || 'Altra';
      if (!map[base]) {
        map[base] = {
          sede: a.sede_tecnica.split('-')[0],
          nome: a.nome_sede,
          linea: a.linea,
          total: 0,
          v5Count: 0,
          v3v4Count: 0,
          scaduti: 0,
          lat: a.lat,
          lng: a.lng
        };
      }
      map[base].total += 1;
      if (a.tipo === 'V5') map[base].v5Count += 1;
      else map[base].v3v4Count += 1;
      if (a.stato_scadenza === 'Scaduto') map[base].scaduti += 1;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [avvisi]);

  const filtered = useMemo(() => {
    return freqByLocation.filter(loc => {
      if (selectedLinea !== 'ALL' && loc.linea !== selectedLinea) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          loc.nome.toLowerCase().includes(q) ||
          loc.sede.toLowerCase().includes(q) ||
          loc.linea.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [freqByLocation, selectedLinea, searchQuery]);

  // Top 10 Hotspots for chart
  const chartData = useMemo(() => {
    return filtered.slice(0, 10).map(loc => ({
      name: loc.nome.length > 18 ? loc.nome.slice(0, 16) + '..' : loc.nome,
      difetti: loc.total,
      scaduti: loc.scaduti,
    }));
  }, [filtered]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Frequenza_Hotspots');
    XLSX.writeFile(wb, `Report_Frequenza_Tratte_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-purple-950 border border-purple-800 rounded-lg text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Analisi Frequenza & Hotspots Difetti</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Individuazione delle tratte e stazioni con più elevata concentrazione e ricorrenza di difetti d'armamento
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Esporta Frequenza ({filtered.length})</span>
        </button>
      </div>

      {/* Slicers & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <span>Parametri di Analisi</span>
          </h4>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Cerca Località / Sede
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Es. Venezia, Treviso, LO..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
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
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">Tutte le Linee ({linee.length})</option>
              {linee.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-purple-950/30 border border-purple-900/50 rounded-lg text-xs text-purple-200">
            <strong>Rilevamento Criticità:</strong> I punti con oltre 50 difetti aggregati necessitano di valutazione per interventi straordinari di rinnovo binario.
          </div>
        </div>

        {/* Chart Top 10 */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
            Top 10 Tratte / Stazioni con Maggiore Densità di Difetti
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
                <Bar dataKey="difetti" fill="#a855f7" radius={[4, 4, 0, 0]} name="Totale Difetti" />
                <Bar dataKey="scaduti" fill="#ef4444" radius={[4, 4, 0, 0]} name="Di cui Scaduti" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-700 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Località / Stazione</th>
                <th className="py-3 px-3">Codice Sede Base</th>
                <th className="py-3 px-3">Linea Ferroviaria</th>
                <th className="py-3 px-3 text-center">Totale Difetti</th>
                <th className="py-3 px-3 text-center">Avvisi V5 (Binario)</th>
                <th className="py-3 px-3 text-center">Avvisi V3/V4 (Diagn.)</th>
                <th className="py-3 px-3 text-center">Scaduti</th>
                <th className="py-3 px-3">Indice Rischio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 font-sans">
              {filtered.map((loc, idx) => {
                let badgeClass = 'bg-slate-700 text-slate-300';
                let label = 'Basso';
                if (loc.total > 100 || loc.scaduti > 20) {
                  badgeClass = 'bg-red-950 text-red-400 border border-red-800';
                  label = 'Critico';
                } else if (loc.total > 40 || loc.scaduti > 5) {
                  badgeClass = 'bg-amber-950 text-amber-300 border border-amber-800';
                  label = 'Medio';
                }

                return (
                  <tr key={idx} className="hover:bg-slate-750/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {loc.nome}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {loc.sede}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {loc.linea}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-center text-white text-sm">
                      {loc.total.toLocaleString('it-IT')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-center text-red-400">
                      {loc.v5Count.toLocaleString('it-IT')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-center text-cyan-400">
                      {loc.v3v4Count.toLocaleString('it-IT')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-center font-bold text-amber-400">
                      {loc.scaduti.toLocaleString('it-IT')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${badgeClass}`}>
                        {label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
