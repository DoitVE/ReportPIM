import React, { useState, useMemo } from 'react';
import { Iw67Item } from '../../types';
import { ArrowLeft, Search, Filter } from 'lucide-react';

interface PageDrillFrequenzaProps {
  iw67: Iw67Item[];
  dataAggiornamento: string;
  onBack: () => void;
}

export const PageDrillFrequenza: React.FC<PageDrillFrequenzaProps> = ({
  iw67,
  dataAggiornamento,
  onBack,
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<Iw67Item | null>(iw67[0] || null);

  const filtered = useMemo(() => {
    if (!search.trim()) return iw67;
    const q = search.toLowerCase();
    return iw67.filter(item => 
      item.Avviso?.toLowerCase().includes(q) ||
      item['Definizione della sede tecnica']?.toLowerCase().includes(q) ||
      item['Sede tecnica']?.toLowerCase().includes(q) ||
      item['Testo codice per misura']?.toLowerCase().includes(q)
    );
  }, [iw67, search]);

  const active = selectedItem || iw67[0] || {} as any;

  return (
    <div className="bg-[#f0f2f5] p-3 text-slate-800 space-y-3 font-sans">
      {/* Top Header */}
      <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            title="Torna alla pagina Analisi Frequenza"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Indietro</span>
          </button>
          <img src="/rfi_logo.jpg" alt="RFI" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-bold text-[#D90000] tracking-tight leading-tight">
              Drill frequenza V3 e V4
            </h1>
            <p className="text-xs font-bold text-[#006666]">
              Difetti di Livello e Difetti Scartamento
            </p>
          </div>
        </div>

        <div className="bg-slate-50 px-3 py-1.5 rounded border border-slate-200 text-right">
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Dati aggiornati al:</span>
          <span className="text-xs font-bold text-slate-800 font-mono">{dataAggiornamento}</span>
        </div>
      </div>

      {/* Multi-Row Cards (Power BI Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Multi-Row Card 1 */}
        <div className="bg-white p-3.5 rounded border border-slate-300 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1">
            Inquadramento Tratta & Linea
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Linea InRete</span>
              <div className="font-bold text-slate-900 mt-0.5">
                {active['Definizione della sede tecnica']?.split('  ')[0] || 'Direttrice VE'}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">SeTe Livello 1</span>
              <div className="font-mono font-bold text-slate-900 mt-0.5">
                {active['Sede tecnica']?.slice(0, 6) || 'LO-TR'}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Località / Tratta</span>
              <div className="font-semibold text-slate-900 mt-0.5 max-w-[120px] truncate" title={active['Definizione della sede tecnica']}>
                {active['Definizione della sede tecnica'] || 'Tratta'}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Reparto LVU</span>
              <div className="font-mono font-bold text-emerald-700 mt-0.5">
                {active.CLavResp || 'LVU1'}
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Row Card 2 */}
        <div className="bg-white p-3.5 rounded border border-slate-300 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1">
            Dettaglio Tecnico Punto di Misura
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Sede Tecnica</span>
              <div className="font-mono font-bold text-slate-900 mt-0.5">
                {active['Sede tecnica']}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Binario</span>
              <div className="font-bold text-slate-900 mt-0.5">
                {active['Definizione della sede tecnica']?.includes('Pari') ? 'Pari' : 'Dispari'}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Codice Misura</span>
              <div className="font-mono font-bold text-purple-700 mt-0.5">
                {active.Codice}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Valore / Testo</span>
              <div className="font-bold text-[#D90000] mt-0.5 truncate" title={active['Testo per la misura']}>
                {active['Testo per la misura'] || '9,500 mm'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs flex items-center justify-between text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per avviso, sede tecnica, parametro..."
            className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-3 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
          />
        </div>
        <div className="text-slate-500 font-medium">
          Elementi filtrati: <strong className="text-slate-900">{filtered.length}</strong>
        </div>
      </div>

      {/* Detailed Drill Table */}
      <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Tabella Dettaglio Misure e Rilievi ({filtered.length} record)</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 text-[11px] uppercase">
              <tr>
                <th className="py-2 px-2.5">Avviso</th>
                <th className="py-2 px-2.5">Data Avviso</th>
                <th className="py-2 px-2.5">Tp.</th>
                <th className="py-2 px-2.5">Codice</th>
                <th className="py-2 px-2.5">Valore Rilevato</th>
                <th className="py-2 px-2.5">Parametro</th>
                <th className="py-2 px-2.5">Descrizione</th>
                <th className="py-2 px-2.5">Fine Richiesta</th>
                <th className="py-2 px-2.5">CLavResp</th>
                <th className="py-2 px-2.5">Stato Sistema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.slice(0, 100).map((item, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => setSelectedItem(item)}
                  className={`hover:bg-purple-50 cursor-pointer ${selectedItem === item ? 'bg-purple-100/60 font-medium' : ''}`}
                >
                  <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900">{item.Avviso}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item.Data}</td>
                  <td className="py-1.5 px-2.5 font-mono font-semibold text-blue-700">{item['Tp.']}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item.Codice}</td>
                  <td className="py-1.5 px-2.5 font-mono font-bold text-[#D90000]">{item['Testo per la misura']}</td>
                  <td className="py-1.5 px-2.5 font-semibold text-slate-900">{item['Testo codice per misura']}</td>
                  <td className="py-1.5 px-2.5 text-slate-600 max-w-xs truncate">{item.Descrizione}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item['FineRich.'] || '-'}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item.CLavResp}</td>
                  <td className="py-1.5 px-2.5 font-mono text-[10px] text-slate-700">{item['St.sist.'] || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
