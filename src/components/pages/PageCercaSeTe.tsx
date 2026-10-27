import React, { useState, useMemo } from 'react';
import { PdmV5Item, AvvisoV5Detail } from '../../types';
import { initialAvvisiV5Details } from '../../data/v5Dataset';
import { RotateCcw, Search, Database, RefreshCw } from 'lucide-react';

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
  const [selectedSeTe, setSelectedSeTe] = useState<string>('LO0378-AB-AB01-DEV-D02');
  const [searchSeTeInput, setSearchSeTeInput] = useState<string>('');
  const [searchAvviso, setSearchAvviso] = useState<string>('');
  const [searchPdm, setSearchPdm] = useState<string>('');
  const [annoRange, setAnnoRange] = useState<[number, number]>([2000, 2226]);

  // List of all unique Sede Tecnica
  const seteList = useMemo(() => {
    const s = new Set<string>();
    s.add('LO0378-AB-AB01-DEV-D02');
    s.add('LO3002-BC-BC42-DEV-I02');
    s.add('LO3002-BC-BC24-DEV-D16');
    s.add('TR3040-BC-BC02-ROT-R01');
    s.add('TR7645-BC-BC02-ROT-R02');
    s.add('LO1776-BC-BC01-ROT-R02');
    s.add('TR4143-BC-BC01-ROT-R01');
    s.add('LO1044-BC-BC01-ROT-R02');
    pdmList.forEach(p => { if (p.sede_tecnica) s.add(p.sede_tecnica); });
    return Array.from(s).sort();
  }, [pdmList]);

  const filteredSeteList = useMemo(() => {
    if (!searchSeTeInput) return seteList.slice(0, 8);
    return seteList.filter(st => st.toLowerCase().includes(searchSeTeInput.toLowerCase())).slice(0, 8);
  }, [seteList, searchSeTeInput]);

  const handleResetFilters = () => {
    setSelectedSeTe('LO0378-AB-AB01-DEV-D02');
    setSearchSeTeInput('');
    setSearchAvviso('');
    setSearchPdm('');
    setAnnoRange([2000, 2226]);
  };

  // Filtered PdM list
  const filteredPdm = useMemo(() => {
    return pdmList.filter(p => {
      if (selectedSeTe && p.sede_tecnica !== selectedSeTe) return false;
      if (searchPdm && !p.pdm.includes(searchPdm)) return false;
      if (searchAvviso && p.avviso && !p.avviso.includes(searchAvviso)) return false;
      return true;
    });
  }, [pdmList, selectedSeTe, searchPdm, searchAvviso]);

  // Avvisi details corresponding to selected Sede
  const filteredAvvisiDetails = useMemo(() => {
    return initialAvvisiV5Details.filter(a => {
      if (selectedSeTe && a.sede_tecnica !== selectedSeTe) return false;
      if (searchAvviso && !a.avviso.includes(searchAvviso)) return false;
      if (searchPdm && a.pdm && !a.pdm.includes(searchPdm)) return false;
      return true;
    });
  }, [selectedSeTe, searchAvviso, searchPdm]);

  return (
    <div className="bg-[#121316] text-[#e2e8f0] min-h-full flex flex-col space-y-2.5 font-sans select-none">
      {/* Top Banner Row matching Screenshot 3 */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#2d3139] pb-2">
        <div className="flex items-center space-x-3">
          <div className="h-9 px-2.5 bg-white rounded flex items-center justify-center shadow-sm">
            <span className="text-[#008542] font-black tracking-tighter text-base">RFI</span>
            <span className="text-[#dc2626] font-bold text-[10px] ml-1 uppercase">FS</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-[#f43f5e] tracking-tight">
              Difetti di binario - DOIT VE
            </h1>
            <div className="flex items-center space-x-4 text-xs mt-0.5">
              <span className="text-white font-bold text-sm">Cerca per SeTe V5</span>
              <span className="text-[#94a3b8]">Dati al: <strong className="text-white font-mono">{dataAggiornamento}</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={handleResetFilters}
          className="flex items-center space-x-1 px-3 py-1 bg-[#1e222a] hover:bg-[#282d38] border border-[#3f4553] rounded text-xs font-semibold text-slate-200 transition-colors cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Filtri</span>
        </button>
      </div>

      {/* Top Notice if Unpopulated */}
      {pdmList.length === 0 && (
        <div className="bg-[#1c1f26] border-l-4 border-amber-400 p-2.5 rounded border border-[#2e323b] flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block">Vista Ricerca per Sede Tecnica pronta</span>
              <span className="text-[11px] text-slate-400">
                Alimenta la web app con i file SAP o carica la demo per consultare i Punti di Misura e gli Avvisi associati a ciascuna Sede Tecnica.
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenFileLoader && (
              <button
                onClick={onOpenFileLoader}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded cursor-pointer shadow"
              >
                Alimenta Web App
              </button>
            )}
            {onLoadDemoData && (
              <button
                onClick={onLoadDemoData}
                className="px-3 py-1 bg-[#25282e] hover:bg-[#2f333a] border border-[#3f4553] text-amber-300 font-semibold text-xs rounded cursor-pointer flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Carica Demo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Search Controls Bar matching Screenshot 3 */}
      <div className="grid grid-cols-12 gap-2 text-xs">
        {/* Cerca Sede tecnica */}
        <div className="col-span-12 sm:col-span-6 md:col-span-4 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">Cerca Sede tecnica</span>
          <div className="relative mb-1">
            <Search className="w-3.5 h-3.5 absolute left-1.5 top-1.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca"
              value={searchSeTeInput}
              onChange={e => setSearchSeTeInput(e.target.value)}
              className="w-full bg-[#141518] border border-[#3f4553] rounded pl-6 pr-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>
          <div className="space-y-0.5 max-h-20 overflow-y-auto">
            {filteredSeteList.map(st => (
              <label key={st} className="flex items-center space-x-1.5 cursor-pointer py-0.5 hover:bg-[#252830] px-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedSeTe === st}
                  onChange={() => setSelectedSeTe(selectedSeTe === st ? '' : st)}
                  className="w-3 h-3 text-amber-500 bg-[#141518]"
                />
                <span className={`text-[11px] font-mono truncate ${selectedSeTe === st ? 'text-amber-300 font-bold' : 'text-[#cbd5e1]'}`}>
                  {st}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Cerca Avviso */}
        <div className="col-span-12 sm:col-span-6 md:col-span-3 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">Cerca Avviso</span>
            <div className="relative mb-1">
              <Search className="w-3.5 h-3.5 absolute left-1.5 top-1.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca"
                value={searchAvviso}
                onChange={e => setSearchAvviso(e.target.value)}
                className="w-full bg-[#141518] border border-[#3f4553] rounded pl-6 pr-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <label className="flex items-center space-x-1.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={!searchAvviso}
                onChange={() => setSearchAvviso('')}
                className="w-3 h-3 text-amber-500 bg-[#141518]"
              />
              <span className="text-[11px] text-slate-300">(Vuoto)</span>
            </label>
          </div>
        </div>

        {/* Cerca PdM */}
        <div className="col-span-12 sm:col-span-6 md:col-span-3 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">Cerca PdM</span>
            <div className="relative mb-1">
              <Search className="w-3.5 h-3.5 absolute left-1.5 top-1.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca"
                value={searchPdm}
                onChange={e => setSearchPdm(e.target.value)}
                className="w-full bg-[#141518] border border-[#3f4553] rounded pl-6 pr-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <label className="flex items-center space-x-1.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={!searchPdm}
                onChange={() => setSearchPdm('')}
                className="w-3 h-3 text-amber-500 bg-[#141518]"
              />
              <span className="text-[11px] text-slate-300">(Vuoto)</span>
            </label>
          </div>
        </div>

        {/* Anno Slider matching Screenshot 3 */}
        <div className="col-span-12 sm:col-span-6 md:col-span-2 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">Anno</span>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={annoRange[0]}
              onChange={e => setAnnoRange([parseInt(e.target.value) || 2000, annoRange[1]])}
              className="w-14 bg-[#141518] border border-[#3f4553] text-center font-mono py-0.5 text-xs text-white rounded"
            />
            <input
              type="number"
              value={annoRange[1]}
              onChange={e => setAnnoRange([annoRange[0], parseInt(e.target.value) || 2226])}
              className="w-14 bg-[#141518] border border-[#3f4553] text-center font-mono py-0.5 text-xs text-white rounded"
            />
          </div>
          <div className="pt-2 px-1">
            <input
              type="range"
              min="2000"
              max="2226"
              value={annoRange[1]}
              onChange={e => setAnnoRange([annoRange[0], parseInt(e.target.value)])}
              className="w-full accent-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Two Tables vertically stacked matching Screenshot 3 */}
      {/* 1. Upper Table: PdM */}
      <div className="bg-[#1c1f26] rounded-md border border-[#2e333d] overflow-hidden flex flex-col flex-1 shadow-sm min-h-[180px]">
        <div className="px-3 py-1.5 bg-[#16181d] border-b border-[#2e333d] flex items-center justify-between text-xs shrink-0">
          <span className="font-bold text-white uppercase text-[11px] tracking-wide">PdM ({filteredPdm.length} righe)</span>
          <span className="text-[10.5px] text-[#94a3b8]">Sede: <strong className="text-amber-400 font-mono">{selectedSeTe || 'Tutte'}</strong></span>
        </div>
        <div className="overflow-auto flex-1 max-h-[calc(35vh)] min-h-[150px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141518] sticky top-0 border-b border-[#2e333d] text-[#94a3b8] text-[10.5px] uppercase font-semibold">
              <tr>
                <th className="py-1.5 px-2">PdM</th>
                <th className="py-1.5 px-2">Avviso</th>
                <th className="py-1.5 px-2">Classe</th>
                <th className="py-1.5 px-2">Osservazioni</th>
                <th className="py-1.5 px-2">Linea InRete</th>
                <th className="py-1.5 px-2">Km linea</th>
                <th className="py-1.5 px-2">Sede Tecnica</th>
                <th className="py-1.5 px-2">Data scoperta</th>
                <th className="py-1.5 px-2">Fine Rich.</th>
                <th className="py-1.5 px-2">Tolto d'op.</th>
                <th className="py-1.5 px-2">Data tolto d'op.</th>
                <th className="py-1.5 px-2">Scadenza</th>
                <th className="py-1.5 px-2">Ritardo PdM</th>
                <th className="py-1.5 px-2">Data Tolto d'opera &lt; Data scoperta</th>
                <th className="py-1.5 px-2">PdM non visibile in ZSTMAIA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252932] text-[11px] font-mono text-[#cbd5e1]">
              {filteredPdm.map(row => (
                <tr key={row.pdm} className="hover:bg-[#20242e] transition-colors">
                  <td className="py-1 px-2 font-bold text-white">{row.pdm}</td>
                  <td className="py-1 px-2 text-cyan-300">{row.avviso || '-'}</td>
                  <td className="py-1 px-2 font-bold text-rose-400">{row.classe}</td>
                  <td className="py-1 px-2 font-sans text-slate-300 truncate max-w-[200px]">{row.osservazioni}</td>
                  <td className="py-1 px-2 font-sans">{row.linea}</td>
                  <td className="py-1 px-2">{row.km_linea}</td>
                  <td className="py-1 px-2 text-slate-300">{row.sede_tecnica}</td>
                  <td className="py-1 px-2 text-slate-400">{row.data_scoperta || '03/02/2020'}</td>
                  <td className="py-1 px-2 text-slate-400">03/10/2020</td>
                  <td className="py-1 px-2 text-emerald-400 font-bold">{row.tolto_dop}</td>
                  <td className="py-1 px-2 text-slate-400">{row.data_tolto_dop || '08/04/2020'}</td>
                  <td className="py-1 px-2 text-emerald-300">COMPLETATO</td>
                  <td className="py-1 px-2 text-slate-400">-</td>
                  <td className="py-1 px-2 text-slate-400">-</td>
                  <td className="py-1 px-2 text-slate-400">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Lower Table: Avvisi */}
      <div className="bg-[#1c1f26] rounded-md border border-[#2e333d] overflow-hidden flex flex-col flex-1 shadow-sm min-h-[180px]">
        <div className="px-3 py-1.5 bg-[#16181d] border-b border-[#2e333d] flex items-center justify-between text-xs shrink-0">
          <span className="font-bold text-white uppercase text-[11px] tracking-wide">Avvisi ({filteredAvvisiDetails.length} righe)</span>
          <span className="text-[10.5px] text-[#94a3b8]">Dettaglio ordini di manutenzione associati</span>
        </div>
        <div className="overflow-auto flex-1 max-h-[calc(35vh)] min-h-[150px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141518] sticky top-0 border-b border-[#2e333d] text-[#94a3b8] text-[10.5px] uppercase font-semibold">
              <tr>
                <th className="py-1.5 px-2">PdM</th>
                <th className="py-1.5 px-2">Avviso</th>
                <th className="py-1.5 px-2">Testo esteso</th>
                <th className="py-1.5 px-2">Sede tecnica</th>
                <th className="py-1.5 px-2">Inizio richiesta</th>
                <th className="py-1.5 px-2">Fine richiesta</th>
                <th className="py-1.5 px-2">Stato sistema</th>
                <th className="py-1.5 px-2">Data chiusura</th>
                <th className="py-1.5 px-2">Ritardo Avv.</th>
                <th className="py-1.5 px-2">Data chiusura avv. &lt; Data inizio avv.</th>
                <th className="py-1.5 px-2">Data chiusura avv. futura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252932] text-[11px] font-mono text-[#cbd5e1]">
              {filteredAvvisiDetails.map((row, idx) => (
                <tr key={`${row.avviso}-${idx}`} className="hover:bg-[#20242e] transition-colors">
                  <td className="py-1 px-2 text-white font-bold">{row.pdm}</td>
                  <td className="py-1 px-2 text-cyan-300 font-bold">{row.avviso}</td>
                  <td className="py-1 px-2 font-sans text-slate-300 truncate max-w-[280px]">{row.testo_esteso}</td>
                  <td className="py-1 px-2 text-slate-300">{row.sede_tecnica}</td>
                  <td className="py-1 px-2 text-slate-400">{row.inizio_richiesta}</td>
                  <td className="py-1 px-2 text-slate-400">{row.fine_richiesta}</td>
                  <td className="py-1 px-2 text-emerald-400 font-bold">MECO</td>
                  <td className="py-1 px-2 text-slate-400">{row.data_chiusura}</td>
                  <td className="py-1 px-2 text-red-400 font-bold">(Ritardo 34 gg)</td>
                  <td className="py-1 px-2 text-slate-400">-</td>
                  <td className="py-1 px-2 text-slate-400">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
