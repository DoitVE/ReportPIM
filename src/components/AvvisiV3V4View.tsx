import React, { useState, useMemo } from 'react';
import { Avviso, DiagnosticaItem } from '../types';
import { 
  Activity, 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Gauge, 
  Zap, 
  Layers 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface AvvisiV3V4Props {
  avvisi: Avviso[];
  diagnostica: DiagnosticaItem[];
}

export const AvvisiV3V4View: React.FC<AvvisiV3V4Props> = ({ avvisi, diagnostica }) => {
  // Avvisi V3 and V4
  const v3v4Avvisi = useMemo(() => avvisi.filter(a => a.tipo === 'V3' || a.tipo === 'V4'), [avvisi]);

  const [selectedLinea, setSelectedLinea] = useState<string>('ALL');
  const [selectedTipo, setSelectedTipo] = useState<string>('ALL');
  const [selectedClasse, setSelectedClasse] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // Unique options
  const lineeOptions = useMemo(() => {
    const s = new Set<string>();
    v3v4Avvisi.forEach(a => { if (a.linea) s.add(a.linea); });
    diagnostica.forEach(d => { if (d.cod_linea) s.add(d.cod_linea); });
    return Array.from(s).sort();
  }, [v3v4Avvisi, diagnostica]);

  const tipiOptions = useMemo(() => {
    const s = new Set<string>();
    v3v4Avvisi.forEach(a => { if (a.tipo_difetto) s.add(a.tipo_difetto); });
    diagnostica.forEach(d => { if (d.tipo_difetto) s.add(d.tipo_difetto); });
    return Array.from(s).sort();
  }, [v3v4Avvisi, diagnostica]);

  // Combined records for display
  const combinedList = useMemo(() => {
    // Standardize diagnostica items
    const diagMapped = diagnostica.map(d => ({
      id: `DIAG-${d.cod_linea}-${d.km}`,
      tipo: 'V3',
      linea: d.cod_linea,
      sede_tecnica: d.cod_tratta || d.cod_linea,
      descrizione: `Rilievo VEM: ${d.tipo_difetto} (Fila: ${d.fila || 'N/D'}, Binario: ${d.binario || '1'})`,
      tipo_difetto: d.tipo_difetto,
      classe: d.classe || 'B',
      km: d.km,
      data: d.data_scoperta,
      centro_lavoro: d.centro_lavoro || 'VEM1'
    }));

    const avvMapped = v3v4Avvisi.map(a => ({
      id: a.avviso,
      tipo: a.tipo,
      linea: a.linea,
      sede_tecnica: a.sede_tecnica,
      descrizione: a.descrizione,
      tipo_difetto: a.tipo_difetto,
      classe: a.stato_sistema.includes('APER') ? 'A' : 'B',
      km: a.sede_tecnica.split('-')[0],
      data: a.data_creazione || a.inizio_richiesto,
      centro_lavoro: a.divisione || 'VEM'
    }));

    return [...diagMapped, ...avvMapped];
  }, [v3v4Avvisi, diagnostica]);

  const filtered = useMemo(() => {
    return combinedList.filter(item => {
      if (selectedLinea !== 'ALL' && !item.linea.includes(selectedLinea)) return false;
      if (selectedTipo !== 'ALL' && item.tipo_difetto !== selectedTipo) return false;
      if (selectedClasse !== 'ALL' && item.classe !== selectedClasse) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.id.toLowerCase().includes(q) ||
          item.descrizione.toLowerCase().includes(q) ||
          item.sede_tecnica.toLowerCase().includes(q) ||
          item.km.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [combinedList, selectedLinea, selectedTipo, selectedClasse, searchQuery]);

  // Chart data
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(item => {
      const k = item.tipo_difetto || 'Non Definito';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [filtered]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Avvisi_V3_V4_Diagnostica');
    XLSX.writeFile(wb, `Report_Diagnostica_V3V4_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-blue-950 border border-blue-800 rounded-lg text-blue-400">
              <Activity className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Avvisi V3 / V4 - Diagnostica Livello e Scartamento</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Rilievi geometrici automatizzati dei treni diagnostici VEM1 e VEM2 (scartamento, sghembo, freccia, allineamento)
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Esporta Diagnostica ({filtered.length})</span>
        </button>
      </div>

      {/* Slicers */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Cerca Testo / Km
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Es. km 113, scartamento..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Linea Ferroviaria
          </label>
          <select
            value={selectedLinea}
            onChange={(e) => { setSelectedLinea(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Tutte le Linee</option>
            {lineeOptions.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Parametro Geometrico
          </label>
          <select
            value={selectedTipo}
            onChange={(e) => { setSelectedTipo(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Tutti i parametri</option>
            {tipiOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Classe Provvisoria
          </label>
          <select
            value={selectedClasse}
            onChange={(e) => { setSelectedClasse(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Tutte le Classi</option>
            <option value="A">Classe A (Intervento Urgente)</option>
            <option value="B">Classe B (Intervento Programmabile)</option>
            <option value="C">Classe C (Monitoraggio)</option>
          </select>
        </div>
      </div>

      {/* Chart & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Sintesi Diagnostica Rilievi</h4>
            <p className="text-xs text-slate-400 mb-4">Statistiche aggregate dai carrelli di misura</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-900/60 rounded-lg">
                <span className="text-slate-300">Totale Punti Misura Rilevati:</span>
                <span className="font-bold text-cyan-400 font-mono text-sm">{filtered.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-900/60 rounded-lg">
                <span className="text-slate-300">Carrello Principale:</span>
                <span className="font-bold text-white font-mono">VEM1 / VEM2</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-900/60 rounded-lg">
                <span className="text-slate-300">Unità Operative Coinvolte:</span>
                <span className="font-bold text-emerald-400 font-mono">DOIT VE (LVU1-4)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
            Distribuzione Difetti Geometrici per Tipologia
          </h4>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 25 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-10} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Punti di Misura" />
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
                <th className="py-3 px-3">Codice Rilievo / Avviso</th>
                <th className="py-3 px-3">Linea / Tratta</th>
                <th className="py-3 px-3">Progressiva Km</th>
                <th className="py-3 px-3">Parametro Misurato</th>
                <th className="py-3 px-3">Descrizione Dettaglio</th>
                <th className="py-3 px-3">Classe</th>
                <th className="py-3 px-3">Centro Lavoro</th>
                <th className="py-3 px-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 font-sans">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nessun dato diagnostico trovato per i filtri selezionati.
                  </td>
                </tr>
              ) : (
                paginated.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-750/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {item.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      {item.linea}
                      <div className="text-[10px] text-slate-400 font-mono">{item.sede_tecnica}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-cyan-300">
                      km {item.km}
                    </td>
                    <td className="py-2.5 px-3 text-white font-medium">
                      {item.tipo_difetto}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-sm truncate" title={item.descrizione}>
                      {item.descrizione}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        item.classe === 'A' ? 'bg-red-950 text-red-400 border border-red-800' :
                        item.classe === 'B' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        Classe {item.classe}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {item.centro_lavoro}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">
                      {item.data || 'N/D'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div>
            Visualizzati da <strong className="text-white">{(page - 1) * pageSize + 1}</strong> a{' '}
            <strong className="text-white">{Math.min(page * pageSize, filtered.length)}</strong> di{' '}
            <strong className="text-white">{filtered.length}</strong> record
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white px-2">
              Pagina {page} di {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
