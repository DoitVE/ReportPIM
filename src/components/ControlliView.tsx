import React, { useState, useMemo } from 'react';
import { Avviso, OdlItem } from '../types';
import { 
  ShieldCheck, 
  AlertOctagon, 
  AlertTriangle, 
  Clock, 
  Search, 
  Download, 
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ControlliProps {
  avvisi: Avviso[];
  odl: OdlItem[];
}

export const ControlliView: React.FC<ControlliProps> = ({ avvisi, odl }) => {
  const [activeSubTab, setActiveSubTab] = useState<'mela_scaduti' | 'meco_senza_odl' | 'ordini_sap'>('mela_scaduti');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Controllo: Avvisi in stato MELA con data fine richiesta scaduta
  const melaScaduti = useMemo(() => {
    return avvisi.filter(a => {
      const isMela = a.stato_sistema.includes('MELA');
      const isScaduto = a.stato_scadenza === 'Scaduto';
      return isMela && isScaduto;
    });
  }, [avvisi]);

  // 2. Controllo: Avvisi in stato MECO senza OdL / Network
  const mecoSenzaOdl = useMemo(() => {
    return avvisi.filter(a => {
      const isMeco = a.stato_sistema.includes('MECO');
      const noOdl = !a.ordine || a.ordine.trim() === '';
      const noNetwork = !a.network || a.network.trim() === '';
      return isMeco && (noOdl && noNetwork);
    });
  }, [avvisi]);

  // Filtered views based on search
  const filteredMela = useMemo(() => {
    if (!searchQuery.trim()) return melaScaduti;
    const q = searchQuery.toLowerCase();
    return melaScaduti.filter(a => 
      a.avviso.toLowerCase().includes(q) ||
      a.descrizione.toLowerCase().includes(q) ||
      a.sede_tecnica.toLowerCase().includes(q) ||
      a.nome_sede.toLowerCase().includes(q) ||
      a.linea.toLowerCase().includes(q)
    );
  }, [melaScaduti, searchQuery]);

  const filteredMeco = useMemo(() => {
    if (!searchQuery.trim()) return mecoSenzaOdl;
    const q = searchQuery.toLowerCase();
    return mecoSenzaOdl.filter(a => 
      a.avviso.toLowerCase().includes(q) ||
      a.descrizione.toLowerCase().includes(q) ||
      a.sede_tecnica.toLowerCase().includes(q) ||
      a.nome_sede.toLowerCase().includes(q) ||
      a.linea.toLowerCase().includes(q)
    );
  }, [mecoSenzaOdl, searchQuery]);

  const filteredOdl = useMemo(() => {
    if (!searchQuery.trim()) return odl.slice(0, 100);
    const q = searchQuery.toLowerCase();
    return odl.filter(o => 
      o.ordine.toLowerCase().includes(q) ||
      o.descrizione.toLowerCase().includes(q) ||
      o.centro_lavoro.toLowerCase().includes(q) ||
      o.stato_sistema.toLowerCase().includes(q)
    ).slice(0, 100);
  }, [odl, searchQuery]);

  // Export non-conformities
  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    const melaData = melaScaduti.map(a => ({
      'Avviso': a.avviso,
      'Tipo': a.tipo,
      'Descrizione': a.descrizione,
      'Sede Tecnica': a.sede_tecnica,
      'Località': a.nome_sede,
      'Linea': a.linea,
      'U.M.': a.lvu || a.divisione,
      'Data Fine Richiesta': a.fine_richiesta,
      'Stato Sistema': a.stato_sistema,
      'OdL': a.ordine || 'ASSENTE'
    }));
    const ws1 = XLSX.utils.json_to_sheet(melaData);
    XLSX.utils.book_append_sheet(wb, ws1, 'MELA_Scaduti');

    const mecoData = mecoSenzaOdl.map(a => ({
      'Avviso': a.avviso,
      'Tipo': a.tipo,
      'Descrizione': a.descrizione,
      'Sede Tecnica': a.sede_tecnica,
      'Località': a.nome_sede,
      'Linea': a.linea,
      'U.M.': a.lvu || a.divisione,
      'Stato Sistema': a.stato_sistema,
      'Anomalia': 'MECO senza OdL o Network'
    }));
    const ws2 = XLSX.utils.json_to_sheet(mecoData);
    XLSX.utils.book_append_sheet(wb, ws2, 'MECO_Senza_ODL');

    XLSX.writeFile(wb, `Audit_NonConformita_SAP_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-emerald-950 border border-emerald-800 rounded-lg text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Audit e Controllo Qualità Flussi SAP</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Verifica congruenza procedurale: avvisi in lavorazione scaduti e chiusure tecniche senza ordine di lavoro
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Esporta Report Non Conformità</span>
        </button>
      </div>

      {/* KPI Audit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div 
          onClick={() => setActiveSubTab('mela_scaduti')}
          className={`border rounded-xl p-4 cursor-pointer transition-all ${
            activeSubTab === 'mela_scaduti'
              ? 'bg-red-950/40 border-red-500 shadow-md ring-1 ring-red-500'
              : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Controllo 1: MELA Scaduti
            </span>
            <AlertOctagon className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">
            {melaScaduti.length.toLocaleString('it-IT')}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Avvisi in lavorazione con data fine già oltrepassata
          </p>
        </div>

        {/* Card 2 */}
        <div 
          onClick={() => setActiveSubTab('meco_senza_odl')}
          className={`border rounded-xl p-4 cursor-pointer transition-all ${
            activeSubTab === 'meco_senza_odl'
              ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500'
              : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Controllo 2: MECO senza OdL / Net
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono">
            {mecoSenzaOdl.length.toLocaleString('it-IT')}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Avvisi chiusi tecnicamente senza documento di consuntivo
          </p>
        </div>

        {/* Card 3 */}
        <div 
          onClick={() => setActiveSubTab('ordini_sap')}
          className={`border rounded-xl p-4 cursor-pointer transition-all ${
            activeSubTab === 'ordini_sap'
              ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500'
              : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Registro Ordini IW39
            </span>
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-300 font-mono">
            {odl.length.toLocaleString('it-IT')}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ordini di manutenzione armamento registrati nel sistema
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtra tabella attiva per avviso, sede, linea, descrizione..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-400 hidden sm:block">
          Mostrando: <strong className="text-white">
            {activeSubTab === 'mela_scaduti' ? `${filteredMela.length} avvisi` :
             activeSubTab === 'meco_senza_odl' ? `${filteredMeco.length} avvisi` :
             `${filteredOdl.length} ordini`}
          </strong>
        </div>
      </div>

      {/* Tab 1 Table: MELA Scaduti */}
      {activeSubTab === 'mela_scaduti' && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl shadow overflow-hidden">
          <div className="p-3 bg-red-950/30 border-b border-red-900/50 flex items-center justify-between">
            <span className="text-xs font-bold text-red-300">
              Elenco Avvisi MELA (Messa in Lavorazione) Scaduti rispetto alla Data Fine
            </span>
            <span className="text-[11px] text-red-400 font-mono">
              Priorità di sollecito alle squadre operative
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-700 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Avviso SAP</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Descrizione</th>
                  <th className="py-3 px-3">Sede Tecnica</th>
                  <th className="py-3 px-3">Linea</th>
                  <th className="py-3 px-3">U.M.</th>
                  <th className="py-3 px-3">Data Fine Richiesta</th>
                  <th className="py-3 px-3">Stato Sistema</th>
                  <th className="py-3 px-3">OdL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-sans">
                {filteredMela.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Nessun avviso in stato MELA scaduto trovato.
                    </td>
                  </tr>
                ) : (
                  filteredMela.map((a) => (
                    <tr key={a.avviso} className="hover:bg-slate-750/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {a.avviso}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-red-400 font-semibold">
                        {a.tipo}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-medium max-w-xs truncate" title={a.descrizione}>
                        {a.descrizione}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        <span className="text-white font-semibold">{a.nome_sede}</span>
                        <div className="text-[10px] text-slate-400">{a.sede_tecnica}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {a.linea}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {a.lvu || a.divisione}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-red-400">
                        {a.fine_richiesta}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-amber-300">
                        {a.stato_sistema}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                        {a.ordine || <span className="text-slate-500 italic">Mancante</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2 Table: MECO senza ODL */}
      {activeSubTab === 'meco_senza_odl' && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl shadow overflow-hidden">
          <div className="p-3 bg-amber-950/30 border-b border-amber-900/50 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">
              Elenco Avvisi MECO (Chiusura Tecnica) Privi di OdL / Network
            </span>
            <span className="text-[11px] text-amber-400 font-mono">
              Incongruenza di chiusura contabile SAP
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-700 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Avviso SAP</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Descrizione</th>
                  <th className="py-3 px-3">Sede Tecnica</th>
                  <th className="py-3 px-3">Linea</th>
                  <th className="py-3 px-3">U.M.</th>
                  <th className="py-3 px-3">Stato Sistema</th>
                  <th className="py-3 px-3">Anomalia Rilevata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-sans">
                {filteredMeco.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Nessun avviso MECO senza OdL trovato.
                    </td>
                  </tr>
                ) : (
                  filteredMeco.map((a) => (
                    <tr key={a.avviso} className="hover:bg-slate-750/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {a.avviso}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-white font-semibold">
                        {a.tipo}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-medium max-w-xs truncate" title={a.descrizione}>
                        {a.descrizione}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        <span className="text-white font-semibold">{a.nome_sede}</span>
                        <div className="text-[10px] text-slate-400">{a.sede_tecnica}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {a.linea}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {a.lvu || a.divisione}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-blue-300">
                        {a.stato_sistema}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950 text-amber-400 border border-amber-800">
                          OdL e Network Assenti
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3 Table: Registro OdL IW39 */}
      {activeSubTab === 'ordini_sap' && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl shadow overflow-hidden">
          <div className="p-3 bg-blue-950/30 border-b border-blue-900/50 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300">
              Registro Ordini di Lavoro (Estratto IW39 SAP)
            </span>
            <span className="text-[11px] text-blue-400 font-mono">
              Primi 100 ordini filtrati
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-700 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Ordine</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Descrizione</th>
                  <th className="py-3 px-3">Centro Lavoro</th>
                  <th className="py-3 px-3">Divisione</th>
                  <th className="py-3 px-3">Stato Sistema</th>
                  <th className="py-3 px-3 text-right">Costo Effettivo (€)</th>
                  <th className="py-3 px-3 text-right">Costo Pianificato (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-sans">
                {filteredOdl.map((o) => (
                  <tr key={o.ordine} className="hover:bg-slate-750/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                      {o.ordine}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {o.tipo_ordine}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-medium max-w-sm truncate" title={o.descrizione}>
                      {o.descrizione}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {o.centro_lavoro}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {o.divisione}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-blue-300 max-w-xs truncate" title={o.stato_sistema}>
                      {o.stato_sistema}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-slate-200">
                      {parseFloat(o.costo_eff || '0').toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-slate-400">
                      {parseFloat(o.costo_pian || '0').toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
