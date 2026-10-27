import React, { useState, useMemo } from 'react';
import { Avviso } from '../types';
import { 
  Search, 
  Download, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  MapPin,
  X,
  Layers,
  Wrench
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface AvvisiV5Props {
  avvisi: Avviso[];
  onSelectAvvisoMap?: (avviso: Avviso) => void;
}

export const AvvisiV5View: React.FC<AvvisiV5Props> = ({ avvisi, onSelectAvvisoMap }) => {
  // Only V5 notifications
  const v5List = useMemo(() => avvisi.filter(a => a.tipo === 'V5'), [avvisi]);

  // Filter States
  const [selectedLinea, setSelectedLinea] = useState<string>('ALL');
  const [selectedUM, setSelectedUM] = useState<string>('ALL');
  const [selectedTipo, setSelectedTipo] = useState<string>('ALL');
  const [selectedStato, setSelectedStato] = useState<string>('ALL');
  const [selectedScadenza, setSelectedScadenza] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  // Selected for Modal Drill-down
  const [drillAvviso, setDrillAvviso] = useState<Avviso | null>(null);

  // Filter options
  const lineeOptions = useMemo(() => {
    const s = new Set<string>();
    v5List.forEach(a => { if (a.linea) s.add(a.linea); });
    return Array.from(s).sort();
  }, [v5List]);

  const umOptions = useMemo(() => {
    const s = new Set<string>();
    v5List.forEach(a => { 
      if (a.lvu) s.add(a.lvu);
      else if (a.divisione) s.add(a.divisione);
    });
    return Array.from(s).sort();
  }, [v5List]);

  const tipiOptions = useMemo(() => {
    const s = new Set<string>();
    v5List.forEach(a => { if (a.tipo_difetto) s.add(a.tipo_difetto); });
    return Array.from(s).sort();
  }, [v5List]);

  const statiOptions = useMemo(() => {
    const s = new Set<string>();
    v5List.forEach(a => {
      // Split space separated codes e.g. "FCAN MECO"
      a.stato_sistema.split(' ').forEach(st => {
        if (st.trim()) s.add(st.trim());
      });
    });
    return Array.from(s).sort();
  }, [v5List]);

  // Filtered List
  const filtered = useMemo(() => {
    return v5List.filter(a => {
      if (selectedLinea !== 'ALL' && a.linea !== selectedLinea) return false;
      if (selectedUM !== 'ALL' && a.lvu !== selectedUM && a.divisione !== selectedUM) return false;
      if (selectedTipo !== 'ALL' && a.tipo_difetto !== selectedTipo) return false;
      if (selectedStato !== 'ALL' && !a.stato_sistema.includes(selectedStato)) return false;
      if (selectedScadenza !== 'ALL' && a.stato_scadenza !== selectedScadenza) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.avviso.toLowerCase().includes(q) ||
          a.sede_tecnica.toLowerCase().includes(q) ||
          a.nome_sede.toLowerCase().includes(q) ||
          a.descrizione.toLowerCase().includes(q) ||
          a.ordine.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [v5List, selectedLinea, selectedUM, selectedTipo, selectedStato, selectedScadenza, searchQuery]);

  // Chart data for current filtered set
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(a => {
      const k = selectedLinea === 'ALL' ? a.linea : a.tipo_difetto;
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered, selectedLinea]);

  // Page slice
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  // Export to Excel
  const handleExport = () => {
    const dataToExport = filtered.map(a => ({
      'Tipo Avviso': a.tipo,
      'N. Avviso': a.avviso,
      'Descrizione': a.descrizione,
      'Sede Tecnica': a.sede_tecnica,
      'Località / Tratta': a.nome_sede,
      'Linea InRete': a.linea,
      'U.M. / LVU': a.lvu,
      'Divisione': a.divisione,
      'Tipo Difetto': a.tipo_difetto,
      'Stato Sistema': a.stato_sistema,
      'Stato Scadenza': a.stato_scadenza,
      'Data Fine Richiesta': a.fine_richiesta,
      'Data Inizio Richiesta': a.inizio_richiesto,
      'N. Ordine ODL': a.ordine,
      'Network': a.network,
      'Operazione': a.operazione,
      'Data Creazione': a.data_creazione,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Avvisi_V5');
    XLSX.writeFile(wb, `Report_Avvisi_V5_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const resetFilters = () => {
    setSelectedLinea('ALL');
    setSelectedUM('ALL');
    setSelectedTipo('ALL');
    setSelectedStato('ALL');
    setSelectedScadenza('ALL');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-red-950 border border-red-800 rounded-lg text-red-400">
              <Wrench className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Avvisi V5 - Difetti di Binario</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestione operativa e monitoraggio interventi di armamento (eliminazione difetti, verifiche US, rotaie, scambi)
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={resetFilters}
            className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/80 transition-colors"
          >
            Reimposta Filtri
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Esporta Excel ({filtered.length})</span>
          </button>
        </div>
      </div>

      {/* Slicer / Filters Bar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Ricerca Testo */}
        <div className="lg:col-span-2">
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Cerca Avviso / Sede / Testo
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Es. 50207396, LO2000, scambio..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Filtro Linea */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Linea InRete
          </label>
          <select
            value={selectedLinea}
            onChange={(e) => { setSelectedLinea(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
          >
            <option value="ALL">Tutte le Linee ({lineeOptions.length})</option>
            {lineeOptions.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* Filtro U.M. */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            U.M. / Reparto
          </label>
          <select
            value={selectedUM}
            onChange={(e) => { setSelectedUM(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
          >
            <option value="ALL">Tutte ({umOptions.length})</option>
            {umOptions.map(um => (
              <option key={um} value={um}>{um}</option>
            ))}
          </select>
        </div>

        {/* Filtro Tipo Difetto */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Tipo Difetto
          </label>
          <select
            value={selectedTipo}
            onChange={(e) => { setSelectedTipo(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
          >
            <option value="ALL">Tutti i Tipi ({tipiOptions.length})</option>
            {tipiOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Filtro Scadenza */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Stato Scadenza
          </label>
          <select
            value={selectedScadenza}
            onChange={(e) => { setSelectedScadenza(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
          >
            <option value="ALL">Tutti gli stati</option>
            <option value="Scaduto">Scaduto</option>
            <option value="In scadenza">In scadenza (≤ 30gg)</option>
            <option value="Regolare">Regolare</option>
          </select>
        </div>
      </div>

      {/* KPI Mini-Cards & Interactive Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Avvisi Filtrati</span>
            <div className="text-xl font-bold text-white font-mono mt-0.5">{filtered.length.toLocaleString('it-IT')}</div>
          </div>
          <div className="bg-slate-800/80 border border-red-900/60 rounded-xl p-3 bg-red-950/20">
            <span className="text-[11px] text-red-300 uppercase font-medium">Scaduti</span>
            <div className="text-xl font-bold text-red-400 font-mono mt-0.5">
              {filtered.filter(a => a.stato_scadenza === 'Scaduto').length.toLocaleString('it-IT')}
            </div>
          </div>
          <div className="bg-slate-800/80 border border-amber-900/60 rounded-xl p-3 bg-amber-950/20">
            <span className="text-[11px] text-amber-300 uppercase font-medium">In Scadenza (≤30gg)</span>
            <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">
              {filtered.filter(a => a.stato_scadenza === 'In scadenza').length.toLocaleString('it-IT')}
            </div>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Con OdL / ODL Emesso</span>
            <div className="text-xl font-bold text-blue-400 font-mono mt-0.5">
              {filtered.filter(a => a.ordine).length.toLocaleString('it-IT')}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-3 bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {selectedLinea === 'ALL' ? 'Distribuzione per Linea Ferroviaria' : `Difetti su ${selectedLinea} per Tipologia`}
            </h4>
            <span className="text-[11px] text-slate-400">Primi 8 elementi</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 25 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Numero Avvisi" />
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
                <th className="py-3 px-3">Avviso SAP</th>
                <th className="py-3 px-3">Descrizione</th>
                <th className="py-3 px-3">Sede Tecnica</th>
                <th className="py-3 px-3">Linea / Tratta</th>
                <th className="py-3 px-3">U.M.</th>
                <th className="py-3 px-3">Scadenza</th>
                <th className="py-3 px-3">Stato Sistema</th>
                <th className="py-3 px-3">OdL / Network</th>
                <th className="py-3 px-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 font-sans">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nessun avviso corrisponde ai criteri di filtro selezionati.
                  </td>
                </tr>
              ) : (
                paginated.map((a) => {
                  let scadenzaBadge = (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{a.fine_richiesta || 'N/D'}</span>
                    </span>
                  );
                  if (a.stato_scadenza === 'Scaduto') {
                    scadenzaBadge = (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950 text-red-400 border border-red-800/80">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>{a.fine_richiesta} (Scaduto)</span>
                      </span>
                    );
                  } else if (a.stato_scadenza === 'In scadenza') {
                    scadenzaBadge = (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800/80">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{a.fine_richiesta}</span>
                      </span>
                    );
                  }

                  return (
                    <tr key={a.avviso} className="hover:bg-slate-750/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {a.avviso}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-medium max-w-xs truncate" title={a.descrizione}>
                        {a.descrizione}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {a.tipo_difetto}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        <span className="text-white font-semibold">{a.nome_sede}</span>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{a.sede_tecnica}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {a.linea}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono">
                          {a.lvu || a.divisione}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {scadenzaBadge}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded ${
                          a.stato_sistema.includes('MECO') ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                          a.stato_sistema.includes('MELA') ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {a.stato_sistema}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                        {a.ordine ? (
                          <span className="text-emerald-400 font-semibold">{a.ordine}</span>
                        ) : (
                          <span className="text-slate-500 italic">Nessun OdL</span>
                        )}
                        {a.network && <div className="text-[10px] text-slate-400">Net: {a.network}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setDrillAvviso(a)}
                          className="p-1.5 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                          title="Visualizza Scheda Dettaglio"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div>
            Visualizzati da <strong className="text-white">{(page - 1) * pageSize + 1}</strong> a{' '}
            <strong className="text-white">{Math.min(page * pageSize, filtered.length)}</strong> di{' '}
            <strong className="text-white">{filtered.length.toLocaleString('it-IT')}</strong> avvisi
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white px-2">
              Pagina {page} di {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drill-down Modal (Scheda V5) */}
      {drillAvviso && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 bg-slate-850 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="p-2 bg-red-950 border border-red-800 text-red-400 rounded-lg">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Scheda Avviso SAP: {drillAvviso.avviso}</span>
                    <span className="text-xs bg-red-900/60 text-red-300 px-2 py-0.5 rounded font-mono">
                      {drillAvviso.tipo}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Dettaglio metadati tecnici e operativi</p>
                </div>
              </div>
              <button
                onClick={() => setDrillAvviso(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Descrizione Segnalazione</span>
                <p className="text-sm font-semibold text-white mt-1">{drillAvviso.descrizione}</p>
                <div className="mt-2 inline-block bg-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded">
                  Categoria: <strong>{drillAvviso.tipo_difetto}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Sede Tecnica</span>
                  <div className="text-xs font-mono text-white font-bold mt-1">{drillAvviso.sede_tecnica}</div>
                  <div className="text-xs text-slate-300 mt-0.5">{drillAvviso.nome_sede}</div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Direttrice Ferroviaria</span>
                  <div className="text-xs font-bold text-white mt-1">{drillAvviso.linea}</div>
                  <div className="text-xs text-slate-400 mt-0.5">U.M.: {drillAvviso.lvu || drillAvviso.divisione}</div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Date Richieste</span>
                  <div className="text-xs text-slate-300 mt-1">Inizio: <strong className="text-white font-mono">{drillAvviso.inizio_richiesto || 'N/D'}</strong></div>
                  <div className="text-xs text-slate-300">Fine: <strong className="text-white font-mono">{drillAvviso.fine_richiesta || 'N/D'}</strong></div>
                  <div className="text-xs text-slate-300 mt-1">Stato: <strong className="text-amber-400">{drillAvviso.stato_scadenza}</strong></div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Stati SAP</span>
                  <div className="text-xs text-slate-300 mt-1">Sistema: <strong className="text-blue-400 font-mono">{drillAvviso.stato_sistema}</strong></div>
                  <div className="text-xs text-slate-300">Utente: <strong className="text-slate-200 font-mono">{drillAvviso.stato_utente || 'Nessuno'}</strong></div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Ordine di Lavoro (ODL)</span>
                  <div className="text-xs font-bold text-white font-mono mt-1">
                    {drillAvviso.ordine || 'Nessun ODL associato'}
                  </div>
                  {drillAvviso.network && (
                    <div className="text-xs text-slate-400 mt-0.5">Network: {drillAvviso.network}</div>
                  )}
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Geolocalizzazione</span>
                  <div className="text-xs text-slate-300 font-mono mt-1">
                    Lat: {drillAvviso.lat} | Lng: {drillAvviso.lng}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-850 border-t border-slate-700 flex items-center justify-end space-x-3">
              <button
                onClick={() => setDrillAvviso(null)}
                className="px-4 py-2 text-xs text-slate-300 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
