import React, { useState, useMemo } from 'react';
import { PdmV5Item, AvvisoV5Detail } from '../../types';
import { initialAvvisiV5Details } from '../../data/v5Dataset';
import { RotateCcw, ArrowLeft, Search, Database, Upload, RefreshCw } from 'lucide-react';

interface PageCercaSeTeProps {
  pdmList: PdmV5Item[];
  dataAggiornamento: string;
  onNavigateToDrill: (item: PdmV5Item) => void;
  onBack: () => void;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

export const PageCercaSeTe: React.FC<PageCercaSeTeProps> = ({
  pdmList,
  dataAggiornamento,
  onNavigateToDrill,
  onBack,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Slicers
  const [selectedSeTe, setSelectedSeTe] = useState<string>('LO3002-BC-BC42-DEV-I02');
  const [searchSeTeInput, setSearchSeTeInput] = useState<string>('');
  const [searchAvviso, setSearchAvviso] = useState<string>('');
  const [searchPdm, setSearchPdm] = useState<string>('');
  const [annoRange, setAnnoRange] = useState<[number, number]>([2000, 2226]);

  // List of all unique Sede Tecnica
  const seteList = useMemo(() => {
    const s = new Set<string>();
    s.add('LO3002-BC-BC42-DEV-I02');
    s.add('LO0378-AB-AB01-DEV-D02');
    s.add('LO3002-BC-BC24-DEV-D16');
    pdmList.forEach(p => { if (p.sede_tecnica) s.add(p.sede_tecnica); });
    return Array.from(s).sort();
  }, [pdmList]);

  const filteredSeteList = useMemo(() => {
    if (!searchSeTeInput) return seteList.slice(0, 8);
    return seteList.filter(st => st.toLowerCase().includes(searchSeTeInput.toLowerCase())).slice(0, 8);
  }, [seteList, searchSeTeInput]);

  const handleResetFilters = () => {
    setSelectedSeTe('LO3002-BC-BC42-DEV-I02');
    setSearchSeTeInput('');
    setSearchAvviso('');
    setSearchPdm('');
    setAnnoRange([2000, 2226]);
  };

  // PdM linked to Sede Tecnica
  const pdmFiltered = useMemo(() => {
    return pdmList.filter(p => {
      if (selectedSeTe && p.sede_tecnica !== selectedSeTe) return false;
      if (searchPdm && !p.pdm.includes(searchPdm)) return false;
      if (searchAvviso && p.avviso && !p.avviso.includes(searchAvviso)) return false;
      return true;
    });
  }, [pdmList, selectedSeTe, searchPdm, searchAvviso]);

  // Avvisi linked to Sede Tecnica
  const avvisiFiltered = useMemo(() => {
    return initialAvvisiV5Details.filter(a => {
      if (selectedSeTe && a.sede_tecnica !== selectedSeTe) return false;
      if (searchAvviso && !a.avviso.includes(searchAvviso)) return false;
      if (searchPdm && a.pdm && !a.pdm.includes(searchPdm)) return false;
      return true;
    });
  }, [selectedSeTe, searchAvviso, searchPdm]);

  return (
    <div className="bg-[#18191c] text-[#e2e8f0] min-h-screen p-2.5 flex flex-col space-y-2.5 font-sans">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#2d3139] pb-2">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-[#25282e] hover:bg-[#323640] border border-[#3f4553] flex items-center justify-center cursor-pointer transition-colors shadow-sm"
            title="Torna indietro"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="h-9 px-2 bg-white rounded flex items-center justify-center">
            <span className="text-[#008542] font-black tracking-tighter text-base">RFI</span>
            <span className="text-[#dc2626] font-bold text-[10px] ml-1 uppercase">FS</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-[#e11d48] tracking-tight">
              Difetti di binario - DOIT VE
            </h1>
            <div className="flex items-center space-x-4 text-xs">
              <span className="text-white font-bold text-sm">Cerca per SeTe V5</span>
              <span className="text-[#94a3b8]">Dati al: <strong className="text-white font-mono">{dataAggiornamento}</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={handleResetFilters}
          className="flex items-center space-x-1 px-3 py-1 bg-[#25282e] hover:bg-[#2f333a] border border-[#3f4553] rounded text-xs font-semibold text-slate-200 transition-colors cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Filtri</span>
        </button>
      </div>

      {/* Empty State Banner if Not Populated */}
      {pdmList.length === 0 ? (
        <div className="bg-[#202227] border border-[#2e323b] rounded-lg p-10 flex flex-col items-center justify-center text-center space-y-4 my-6 shadow-xl">
          <div className="p-4 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
            <Database className="w-9 h-9" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-base font-bold text-white">Ricerca per Sede Tecnica Non Alimentata</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Questa vista collega le Sedi Tecniche con i flussi <strong className="text-amber-400 font-mono">ZSTMAIA</strong> e <strong className="text-cyan-400 font-mono">IW29</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onOpenFileLoader && (
              <button
                onClick={onOpenFileLoader}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded shadow transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Alimenta con File SAP</span>
              </button>
            )}
            {onLoadDemoData && (
              <button
                onClick={onLoadDemoData}
                className="px-4 py-2 bg-[#2a2f3a] hover:bg-[#343b49] text-amber-300 border border-[#3f4553] text-xs font-semibold rounded transition-all flex items-center space-x-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Carica Dataset Dimostrativo (Demo)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
      {/* Top Search Controls Bar matching Screenshot 5 */}
      <div className="grid grid-cols-12 gap-2 text-xs">
        {/* Cerca Sede tecnica */}
        <div className="col-span-12 sm:col-span-6 md:col-span-4 bg-[#202227] p-2 rounded border border-[#2e323b]">
          <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">Cerca Sede tecnica</span>
          <div className="relative mb-1">
            <Search className="w-3.5 h-3.5 absolute left-1.5 top-1.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca"
              value={searchSeTeInput}
              onChange={e => setSearchSeTeInput(e.target.value)}
              className="w-full bg-[#18191c] border border-[#3f4553] rounded pl-6 pr-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>
          <div className="space-y-0.5 max-h-20 overflow-y-auto">
            {filteredSeteList.map(st => (
              <label key={st} className="flex items-center space-x-1.5 cursor-pointer py-0.5 hover:bg-[#252830] px-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedSeTe === st}
                  onChange={() => setSelectedSeTe(st)}
                  className="w-3 h-3 text-amber-500 bg-[#18191c]"
                />
                <span className={`text-[11px] font-mono truncate ${selectedSeTe === st ? 'text-amber-300 font-bold' : 'text-[#cbd5e1]'}`}>
                  {st}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Cerca Avviso */}
        <div className="col-span-12 sm:col-span-6 md:col-span-3 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">Cerca Avviso</span>
            <div className="relative mb-1">
              <Search className="w-3.5 h-3.5 absolute left-1.5 top-1.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca"
                value={searchAvviso}
                onChange={e => setSearchAvviso(e.target.value)}
                className="w-full bg-[#18191c] border border-[#3f4553] rounded pl-6 pr-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>
          <span className="text-[10px] text-[#94a3b8]">(Vuoto)</span>
        </div>

        {/* Cerca PdM */}
        <div className="col-span-12 sm:col-span-6 md:col-span-2 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">Cerca PdM</span>
            <div className="relative mb-1">
              <Search className="w-3.5 h-3.5 absolute left-1.5 top-1.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca"
                value={searchPdm}
                onChange={e => setSearchPdm(e.target.value)}
                className="w-full bg-[#18191c] border border-[#3f4553] rounded pl-6 pr-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>
          <span className="text-[10px] text-[#94a3b8]">(Vuoto)</span>
        </div>

        {/* Anno Slider */}
        <div className="col-span-12 sm:col-span-6 md:col-span-3 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">Anno</span>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={annoRange[0]}
              onChange={e => setAnnoRange([parseInt(e.target.value) || 2000, annoRange[1]])}
              className="w-14 bg-[#18191c] border border-[#3f4553] text-center font-mono py-0.5 text-xs text-white rounded"
            />
            <input
              type="range"
              min="2000"
              max="2226"
              value={annoRange[1]}
              onChange={e => setAnnoRange([annoRange[0], parseInt(e.target.value)])}
              className="flex-1 accent-amber-400"
            />
            <input
              type="number"
              value={annoRange[1]}
              onChange={e => setAnnoRange([annoRange[0], parseInt(e.target.value) || 2226])}
              className="w-14 bg-[#18191c] border border-[#3f4553] text-center font-mono py-0.5 text-xs text-white rounded"
            />
          </div>
        </div>
      </div>

      {/* Top Table: PdM collegati alla SeTe filtrata */}
      <div className="bg-[#202227] rounded border border-[#2e323b] overflow-hidden flex flex-col">
        <div className="px-3 py-1.5 bg-[#18191c] border-b border-[#2e323b] flex items-center justify-between text-xs">
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            PdM collegati alla Sede Tecnica: <span className="text-amber-400 font-mono">{selectedSeTe}</span> ({pdmFiltered.length} righe)
          </span>
          <span className="text-[11px] text-[#94a3b8]">Doppio click su una riga per aprire Drill V5</span>
        </div>

        <div className="overflow-x-auto max-h-56 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141518] sticky top-0 border-b border-[#2e323b] text-[#94a3b8] text-[10.5px] uppercase font-semibold">
              <tr>
                <th className="py-2 px-2">PdM</th>
                <th className="py-2 px-2">Avviso</th>
                <th className="py-2 px-2">Classe</th>
                <th className="py-2 px-2">Osservazioni</th>
                <th className="py-2 px-2">Linea InRete</th>
                <th className="py-2 px-2">Km linea</th>
                <th className="py-2 px-2">Sede Tecnica</th>
                <th className="py-2 px-2">Data scoperta</th>
                <th className="py-2 px-2">Fine Rich.</th>
                <th className="py-2 px-2">Tolto d'op.</th>
                <th className="py-2 px-2">Data tolto d'op.</th>
                <th className="py-2 px-2">Scadenza</th>
                <th className="py-2 px-2">Ritardo PdM</th>
                <th className="py-2 px-2">Data Tolto &lt; Data scoperta</th>
                <th className="py-2 px-2">PdM non visibile ZSTMAIA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#282b34] text-[11.5px] text-[#cbd5e1]">
              {pdmFiltered.map(p => (
                <tr
                  key={p.pdm}
                  onDoubleClick={() => onNavigateToDrill(p)}
                  className="hover:bg-[#252830] cursor-pointer transition-colors"
                >
                  <td className="py-1.5 px-2 font-mono font-bold text-amber-300">{p.pdm}</td>
                  <td className="py-1.5 px-2 font-mono text-cyan-300">{p.avviso || '-'}</td>
                  <td className="py-1.5 px-2 font-bold text-center">{p.classe || '-'}</td>
                  <td className="py-1.5 px-2 text-[#94a3b8] truncate max-w-[200px]" title={p.osservazioni}>{p.osservazioni}</td>
                  <td className="py-1.5 px-2 font-medium text-white">{p.linea}</td>
                  <td className="py-1.5 px-2 font-mono">{p.km_linea}</td>
                  <td className="py-1.5 px-2 font-mono text-[11px] text-[#94a3b8]">{p.sede_tecnica}</td>
                  <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{p.data_scoperta || '-'}</td>
                  <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{p.fine_richiesta || '-'}</td>
                  <td className="py-1.5 px-2 text-center font-bold">
                    <span className={p.tolto_dop === 'S' ? 'text-emerald-400' : 'text-red-400'}>
                      {p.tolto_dop}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{p.data_tolto_dop || '-'}</td>
                  <td className="py-1.5 px-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      p.scadenza === 'COMPLETATO' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800' :
                      p.scadenza === 'MANCANTE' ? 'text-amber-400 bg-amber-950/40 border border-amber-800' :
                      'text-red-400 bg-red-950/40 border border-red-800'
                    }`}>
                      {p.scadenza}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 font-mono text-red-400">{p.ritardo_pdm || ''}</td>
                  <td className="py-1.5 px-2 font-mono text-center">{p.data_tolto_minore_scoperta ? 'SI' : '-'}</td>
                  <td className="py-1.5 px-2 font-mono text-center">{p.non_visibile_zstmaia ? 'SI' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Table: Avvisi collegati alla SeTe filtrata */}
      <div className="bg-[#202227] rounded border border-[#2e323b] overflow-hidden flex flex-col">
        <div className="px-3 py-1.5 bg-[#18191c] border-b border-[#2e323b] flex items-center justify-between text-xs">
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Avvisi collegati alla Sede Tecnica: <span className="text-amber-400 font-mono">{selectedSeTe}</span> ({avvisiFiltered.length} righe)
          </span>
        </div>

        <div className="overflow-x-auto max-h-64 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141518] sticky top-0 border-b border-[#2e323b] text-[#94a3b8] text-[10.5px] uppercase font-semibold">
              <tr>
                <th className="py-2 px-2">PdM</th>
                <th className="py-2 px-2">Avviso</th>
                <th className="py-2 px-2">Testo esteso</th>
                <th className="py-2 px-2">Sede tecnica</th>
                <th className="py-2 px-2">Inizio richiesta</th>
                <th className="py-2 px-2">Fine richiesta</th>
                <th className="py-2 px-2">Stato sistema</th>
                <th className="py-2 px-2">Data chiusura</th>
                <th className="py-2 px-2">Ritardo Avv.</th>
                <th className="py-2 px-2">Data chiusura &lt; Inizio</th>
                <th className="py-2 px-2">Data chiusura futura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#282b34] text-[11.5px] text-[#cbd5e1]">
              {avvisiFiltered.map(a => (
                <tr key={a.avviso} className="hover:bg-[#252830] transition-colors">
                  <td className="py-1.5 px-2 font-mono font-bold text-amber-300">{a.pdm || '-'}</td>
                  <td className="py-1.5 px-2 font-mono font-bold text-cyan-300">{a.avviso}</td>
                  <td className="py-1.5 px-2 text-[#94a3b8] truncate max-w-[280px]" title={a.testo_esteso}>
                    {a.testo_esteso}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-[11px] text-[#94a3b8]">{a.sede_tecnica}</td>
                  <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{a.inizio_richiesta || '-'}</td>
                  <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{a.fine_richiesta || '-'}</td>
                  <td className="py-1.5 px-2 font-mono text-emerald-400 font-semibold">{a.stato_sistema}</td>
                  <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{a.data_chiusura || '-'}</td>
                  <td className="py-1.5 px-2 font-mono text-red-400">{a.ritardo_avv || ''}</td>
                  <td className="py-1.5 px-2 font-mono text-center">{a.chiusura_minore_inizio ? 'SI' : '-'}</td>
                  <td className="py-1.5 px-2 font-mono text-center">{a.chiusura_futura ? 'SI' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
