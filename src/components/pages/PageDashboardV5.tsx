import React, { useState, useMemo } from 'react';
import { PdmV5Item } from '../../types';
import { RotateCcw, ArrowLeft, Search, ChevronRight, Database, Upload, RefreshCw } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface PageDashboardV5Props {
  pdmList: PdmV5Item[];
  dataAggiornamento: string;
  onNavigateToDrill: (item: PdmV5Item) => void;
  onBack: () => void;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

export const PageDashboardV5: React.FC<PageDashboardV5Props> = ({
  pdmList,
  dataAggiornamento,
  onNavigateToDrill,
  onBack,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Slicers
  const [searchPdm, setSearchPdm] = useState('');
  const [searchAvviso, setSearchAvviso] = useState('');
  const [searchSeTe, setSearchSeTe] = useState('');
  const [filterToltoDop, setFilterToltoDop] = useState<'ALL' | 'N' | 'S'>('ALL');
  const [filterAvvisoChiuso, setFilterAvvisoChiuso] = useState<'ALL' | 'N' | 'S'>('ALL');
  const [selectedDivisioni, setSelectedDivisioni] = useState<string[]>([]);
  const [selectedUms, setSelectedUms] = useState<string[]>([]);
  const [selectedClassi, setSelectedClassi] = useState<string[]>([]);
  const [selectedScadenze, setSelectedScadenze] = useState<string[]>([]);
  const [annoRange, setAnnoRange] = useState<[number, number]>([2026, 2026]);

  // Selected row for drill
  const [selectedRowId, setSelectedRowId] = useState<string>(pdmList[0]?.pdm || '1295515');

  const handleResetFilters = () => {
    setSearchPdm('');
    setSearchAvviso('');
    setSearchSeTe('');
    setFilterToltoDop('ALL');
    setFilterAvvisoChiuso('ALL');
    setSelectedDivisioni([]);
    setSelectedUms([]);
    setSelectedClassi([]);
    setSelectedScadenze([]);
    setAnnoRange([2026, 2026]);
  };

  const toggleArrayItem = (item: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  // Filtered dataset
  const filtered = useMemo(() => {
    return pdmList.filter(item => {
      if (searchPdm && !item.pdm.toLowerCase().includes(searchPdm.toLowerCase())) return false;
      if (searchAvviso && !item.avviso.toLowerCase().includes(searchAvviso.toLowerCase())) return false;
      if (searchSeTe && !item.sede_tecnica.toLowerCase().includes(searchSeTe.toLowerCase())) return false;
      if (filterToltoDop !== 'ALL' && item.tolto_dop !== filterToltoDop) return false;
      if (filterAvvisoChiuso === 'S' && !item.avviso_chiuso) return false;
      if (filterAvvisoChiuso === 'N' && item.avviso_chiuso) return false;
      if (selectedDivisioni.length > 0 && !selectedDivisioni.includes(item.divisione)) return false;
      if (selectedUms.length > 0 && !selectedUms.includes(item.lvu)) return false;
      if (selectedClassi.length > 0 && !selectedClassi.includes(item.classe)) return false;
      if (selectedScadenze.length > 0 && !selectedScadenze.includes(item.scadenza)) return false;
      return true;
    });
  }, [pdmList, searchPdm, searchAvviso, searchSeTe, filterToltoDop, filterAvvisoChiuso, selectedDivisioni, selectedUms, selectedClassi, selectedScadenze]);

  const selectedItem = useMemo(() => {
    return pdmList.find(p => p.pdm === selectedRowId) || filtered[0] || pdmList[0];
  }, [pdmList, selectedRowId, filtered]);

  // Donut data helper
  const donutRitardoPdm = [
    { name: 'Ritardo', value: 7, color: '#f87171' },
    { name: 'In tempo', value: 281, color: '#38bdf8' }
  ];
  const donutRitardoAvvisi = [
    { name: 'Ritardo', value: 48, color: '#f87171' },
    { name: 'In tempo', value: 355, color: '#38bdf8' }
  ];
  const donutPrimaScopertaPdm = [
    { name: 'Prima data', value: 4, color: '#f87171' },
    { name: 'Regolare', value: 284, color: '#38bdf8' }
  ];
  const donutPrimaScopertaAvvisi = [
    { name: 'Regolare', value: 403, color: '#38bdf8' }
  ];

  return (
    <div className="bg-[#18191c] text-[#e2e8f0] min-h-screen p-2.5 flex flex-col space-y-2.5 font-sans">
      {/* Top Banner Row matching Screenshot 4 */}
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
              <span className="text-white font-bold text-sm">Dashboard V5</span>
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
            <h3 className="text-base font-bold text-white">Dashboard V5 Non Alimentata</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Questa dashboard di controllo si alimenta con il flusso <strong className="text-amber-400 font-mono">ZSTMAIA</strong> (Punti di Misura) e <strong className="text-cyan-400 font-mono">IW29</strong> (Avvisi SAP chiusi/aperti).
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
      {/* Slicers & Filters Grid matching Screenshot 4 */}
      <div className="grid grid-cols-12 gap-2 text-xs">
        {/* Search PdM & Search Avviso */}
        <div className="col-span-12 md:col-span-2 space-y-1.5">
          <div className="bg-[#202227] p-1.5 rounded border border-[#2e323b]">
            <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">Cerca PdM</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-1.5 top-1.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca"
                value={searchPdm}
                onChange={e => setSearchPdm(e.target.value)}
                className="w-full bg-[#18191c] border border-[#3f4553] rounded pl-6 pr-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="text-[10px] text-[#94a3b8] mt-1">(Vuoto)</div>
          </div>

          <div className="bg-[#202227] p-1.5 rounded border border-[#2e323b]">
            <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">Cerca Avviso</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-1.5 top-1.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca"
                value={searchAvviso}
                onChange={e => setSearchAvviso(e.target.value)}
                className="w-full bg-[#18191c] border border-[#3f4553] rounded pl-6 pr-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="text-[10px] text-[#94a3b8] mt-1">(Vuoto)</div>
          </div>
        </div>

        {/* PdM tolto d'opera & Avviso chiuso */}
        <div className="col-span-12 md:col-span-2 space-y-1.5">
          <div className="bg-[#202227] p-1.5 rounded border border-[#2e323b]">
            <span className="text-[10px] uppercase font-bold text-[#f59e0b] block mb-0.5">PdM tolto d'opera</span>
            <div className="space-y-0.5">
              {(['N', 'S'] as const).map(opt => (
                <label key={opt} className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tolto_dop"
                    checked={filterToltoDop === opt}
                    onChange={() => setFilterToltoDop(filterToltoDop === opt ? 'ALL' : opt)}
                    className="w-3 h-3 text-amber-500 bg-[#18191c]"
                  />
                  <span className="text-[11px] font-mono">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-[#202227] p-1.5 rounded border border-[#2e323b]">
            <span className="text-[10px] uppercase font-bold text-[#f59e0b] block mb-0.5">Avviso chiuso</span>
            <div className="space-y-0.5">
              {(['N', 'S'] as const).map(opt => (
                <label key={opt} className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="avviso_chiuso"
                    checked={filterAvvisoChiuso === opt}
                    onChange={() => setFilterAvvisoChiuso(filterAvvisoChiuso === opt ? 'ALL' : opt)}
                    className="w-3 h-3 text-amber-500 bg-[#18191c]"
                  />
                  <span className="text-[11px] font-mono">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Anno scoperta PdM & Cerca Sede Tecnica */}
        <div className="col-span-12 md:col-span-3 space-y-1.5">
          <div className="bg-[#202227] p-1.5 rounded border border-[#2e323b]">
            <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">Anno scoperta PdM</span>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={annoRange[0]}
                onChange={e => setAnnoRange([parseInt(e.target.value) || 2026, annoRange[1]])}
                className="w-16 bg-[#18191c] border border-[#3f4553] text-center font-mono py-0.5 text-xs text-white rounded"
              />
              <input
                type="range"
                min="2022"
                max="2026"
                value={annoRange[1]}
                onChange={e => setAnnoRange([annoRange[0], parseInt(e.target.value)])}
                className="flex-1 accent-amber-400"
              />
              <input
                type="number"
                value={annoRange[1]}
                onChange={e => setAnnoRange([annoRange[0], parseInt(e.target.value) || 2026])}
                className="w-16 bg-[#18191c] border border-[#3f4553] text-center font-mono py-0.5 text-xs text-white rounded"
              />
            </div>
          </div>

          <div className="bg-[#202227] p-1.5 rounded border border-[#2e323b]">
            <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">Cerca Sede tecnica</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-1.5 top-1.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca"
                value={searchSeTe}
                onChange={e => setSearchSeTe(e.target.value)}
                className="w-full bg-[#18191c] border border-[#3f4553] rounded pl-6 pr-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <div className="text-[10px] text-[#94a3b8] mt-1 font-mono truncate">
              LO0378-AB-AB04-ROT-R04
            </div>
          </div>
        </div>

        {/* Divisione & U.M. */}
        <div className="col-span-12 md:col-span-2 space-y-1.5">
          <div className="bg-[#202227] p-1.5 rounded border border-[#2e323b]">
            <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">Divisione</span>
            <div className="flex space-x-3">
              {['VEM1', 'VEM2'].map(d => (
                <label key={d} className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDivisioni.includes(d)}
                    onChange={() => toggleArrayItem(d, selectedDivisioni, setSelectedDivisioni)}
                    className="w-3 h-3 text-amber-500 bg-[#18191c]"
                  />
                  <span className="text-[11px]">{d}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-[#202227] p-1.5 rounded border border-[#2e323b]">
            <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">U.M.</span>
            <div className="grid grid-cols-2 gap-1">
              {['LVU1', 'LVU2', 'LVU3', 'LVU4'].map(u => (
                <label key={u} className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUms.includes(u)}
                    onChange={() => toggleArrayItem(u, selectedUms, setSelectedUms)}
                    className="w-3 h-3 text-amber-500 bg-[#18191c]"
                  />
                  <span className="text-[11px]">{u}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Classe provv. & Scadenza */}
        <div className="col-span-12 md:col-span-3 grid grid-cols-2 gap-1.5">
          <div className="bg-[#202227] p-1.5 rounded border border-[#2e323b] h-32 overflow-y-auto">
            <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">Classe provv.</span>
            <div className="space-y-0.5">
              {['A', 'B', 'C1', 'C2', 'C3', 'MANCANTE', 'S1', 'S2'].map(c => (
                <label key={c} className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedClassi.includes(c)}
                    onChange={() => toggleArrayItem(c, selectedClassi, setSelectedClassi)}
                    className="w-3 h-3 text-amber-500 bg-[#18191c]"
                  />
                  <span className="text-[10.5px]">{c}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-[#202227] p-1.5 rounded border border-[#2e323b] h-32 overflow-y-auto">
            <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">Scadenza</span>
            <div className="space-y-0.5">
              {['COMPLETATO', 'SCAD.<10GG', 'SCAD.<30GG', 'SCAD.<60GG', 'SCAD.>60GG', 'SCADUTO'].map(s => (
                <label key={s} className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScadenze.includes(s)}
                    onChange={() => toggleArrayItem(s, selectedScadenze, setSelectedScadenze)}
                    className="w-3 h-3 text-amber-500 bg-[#18191c]"
                  />
                  <span className="text-[10.5px] truncate">{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Monitoring Indicators Section (Matches Center & Sides of Screenshot 4) */}
      <div className="grid grid-cols-12 gap-2 text-xs">
        {/* Left Stats: Horizontal bars for PdM tolto d'opera, Avvisi chiusi, Associazione */}
        <div className="col-span-12 md:col-span-3 space-y-2">
          {/* PdM tolto d'opera Bar */}
          <div className="bg-[#202227] p-2 rounded border border-[#2e323b]">
            <span className="text-[11px] font-bold text-white block mb-1">PdM tolto d'opera</span>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="w-3 text-red-400 font-bold">N</span>
                <div className="flex-1 bg-[#18191c] rounded h-4 overflow-hidden">
                  <div className="bg-[#ef4444] h-full" style={{ width: '58%' }} />
                </div>
                <span className="font-mono text-white text-[11px] w-8 text-right">167</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 text-emerald-400 font-bold">S</span>
                <div className="flex-1 bg-[#18191c] rounded h-4 overflow-hidden">
                  <div className="bg-[#10b981] h-full" style={{ width: '42%' }} />
                </div>
                <span className="font-mono text-white text-[11px] w-8 text-right">121</span>
              </div>
            </div>
          </div>

          {/* Avvisi Chiusi Bar */}
          <div className="bg-[#202227] p-2 rounded border border-[#2e323b]">
            <span className="text-[11px] font-bold text-white block mb-1">Avvisi Chiusi</span>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="w-3 text-red-400 font-bold">N</span>
                <div className="flex-1 bg-[#18191c] rounded h-4 overflow-hidden">
                  <div className="bg-[#ef4444] h-full" style={{ width: '44%' }} />
                </div>
                <span className="font-mono text-white text-[11px] w-8 text-right">178</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 text-emerald-400 font-bold">S</span>
                <div className="flex-1 bg-[#18191c] rounded h-4 overflow-hidden">
                  <div className="bg-[#10b981] h-full" style={{ width: '56%' }} />
                </div>
                <span className="font-mono text-white text-[11px] w-8 text-right">225</span>
              </div>
            </div>
          </div>

          {/* Associazione PdM-Avviso */}
          <div className="bg-[#202227] p-2 rounded border border-[#2e323b]">
            <span className="text-[11px] font-bold text-white block mb-1">Associazione PdM-Avviso</span>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                <span className="text-[#94a3b8] text-[10px]">Avviso senza Pdm</span>
                <div className="flex-1 bg-[#18191c] rounded h-3.5 overflow-hidden ml-1">
                  <div className="bg-[#8b5cf6] h-full" style={{ width: '85%' }} />
                </div>
                <span className="font-mono text-white text-[11px] ml-1">116</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f97316]" />
                <span className="text-[#94a3b8] text-[10px]">Pdm senza avviso</span>
                <div className="flex-1 bg-[#18191c] rounded h-3.5 overflow-hidden ml-1">
                  <div className="bg-[#f97316] h-full" style={{ width: '4%' }} />
                </div>
                <span className="font-mono text-white text-[11px] ml-1">1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Donut 1: Chiusi in ritardo (PdM + Avvisi) */}
        <div className="col-span-12 md:col-span-3 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col items-center">
          <span className="text-[11px] font-bold text-white block mb-1">Chiusi in ritardo</span>
          <div className="flex items-center justify-around w-full flex-1">
            {/* PdM Donut */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutRitardoPdm}
                      innerRadius={26}
                      outerRadius={38}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutRitardoPdm.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-white">PdM</span>
                </div>
              </div>
              <div className="text-[10px] text-center font-mono">
                <span className="text-red-400 font-bold block">7 (2,43%)</span>
                <span className="text-sky-400">281 (97,57%)</span>
              </div>
            </div>

            {/* Avvisi Donut */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutRitardoAvvisi}
                      innerRadius={26}
                      outerRadius={38}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutRitardoAvvisi.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-white">Avvisi</span>
                </div>
              </div>
              <div className="text-[10px] text-center font-mono">
                <span className="text-red-400 font-bold block">48 (11,91%)</span>
                <span className="text-sky-400">355 (88,09%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Donut 2: Chiusi prima della data scoperta */}
        <div className="col-span-12 md:col-span-3 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col items-center">
          <span className="text-[11px] font-bold text-white block mb-1">Chiusi prima della data scoperta</span>
          <div className="flex items-center justify-around w-full flex-1">
            {/* PdM Donut */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutPrimaScopertaPdm}
                      innerRadius={26}
                      outerRadius={38}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutPrimaScopertaPdm.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-white">PdM</span>
                </div>
              </div>
              <div className="text-[10px] text-center font-mono">
                <span className="text-red-400 font-bold block">4 (1,39%)</span>
                <span className="text-sky-400">284 (98,61%)</span>
              </div>
            </div>

            {/* Avvisi Donut */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutPrimaScopertaAvvisi}
                      innerRadius={26}
                      outerRadius={38}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutPrimaScopertaAvvisi.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-white">Avvisi</span>
                </div>
              </div>
              <div className="text-[10px] text-center font-mono">
                <span className="text-sky-400 block">403 (100%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Anomalie PdM & Avvisi chiusi con OdL/Network */}
        <div className="col-span-12 md:col-span-3 space-y-2">
          {/* Anomalie PdM */}
          <div className="bg-[#202227] p-2 rounded border border-[#2e323b]">
            <span className="text-[11px] font-bold text-white block mb-1">Anomalie PdM</span>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[#94a3b8]">Non visibile in ZSTMAIA</span>
                <span className="font-mono text-slate-400">-</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94a3b8]">Tolto con data futura</span>
                <div className="flex items-center space-x-1">
                  <div className="w-12 bg-[#ef4444] h-3 rounded" />
                  <span className="font-mono text-white">1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Avvisi chiusi con OdL/Network */}
          <div className="bg-[#202227] p-2 rounded border border-[#2e323b]">
            <span className="text-[11px] font-bold text-white block mb-1">Avvisi chiusi con OdL/Network</span>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center space-x-2">
                <span className="w-3 text-red-400 font-bold">N</span>
                <div className="flex-1 bg-[#18191c] rounded h-3.5 overflow-hidden">
                  <div className="bg-[#ef4444] h-full" style={{ width: '15%' }} />
                </div>
                <span className="font-mono text-white text-[11px] w-6 text-right">29</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 text-emerald-400 font-bold">S</span>
                <div className="flex-1 bg-[#18191c] rounded h-3.5 overflow-hidden">
                  <div className="bg-[#10b981] h-full" style={{ width: '85%' }} />
                </div>
                <span className="font-mono text-white text-[11px] w-6 text-right">196</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button: Drill riga selezionata */}
      <div className="flex justify-center -my-1">
        <button
          onClick={() => selectedItem && onNavigateToDrill(selectedItem)}
          disabled={!selectedItem}
          className="bg-white hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-[#0f172a] text-xs font-bold px-4 py-1.5 rounded shadow-lg border border-slate-300 flex items-center space-x-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title="Accedi alla scheda Drill V5 per visualizzare il dettaglio della riga selezionata"
        >
          <span>Drill riga selezionata</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Table: Elenco PdM-Avvisi */}
      <div className="bg-[#202227] rounded border border-[#2e323b] overflow-hidden flex flex-col">
        <div className="px-3 py-1 bg-[#18191c] border-b border-[#2e323b] flex items-center justify-between text-xs">
          <span className="font-bold text-white">
            Elenco PdM-Avvisi ({filtered.length} righe)
          </span>
          <span className="text-[11px] text-[#94a3b8]">
            Riga selezionata: <strong className="text-amber-400 font-mono">PdM {selectedItem?.pdm}</strong> {selectedItem?.sede_tecnica ? `(${selectedItem.sede_tecnica})` : ''}
          </span>
        </div>

        <div className="overflow-x-auto max-h-80 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141518] sticky top-0 border-b border-[#2e323b] text-[#94a3b8] text-[10.5px] uppercase font-semibold">
              <tr>
                <th className="py-2 px-2">PdM</th>
                <th className="py-2 px-2">Classe</th>
                <th className="py-2 px-2">Osservazioni</th>
                <th className="py-2 px-2">Data creazione</th>
                <th className="py-2 px-2">Linea InRete</th>
                <th className="py-2 px-2">Km linea</th>
                <th className="py-2 px-2">Sede Tecnica</th>
                <th className="py-2 px-2">Data scoperta</th>
                <th className="py-2 px-2">Tolto d'op.</th>
                <th className="py-2 px-2">Data tolto d'op.</th>
                <th className="py-2 px-2">Scadenza</th>
                <th className="py-2 px-2">Ritardo PdM</th>
                <th className="py-2 px-2">Data Tolto d'opera &lt; Data scoperta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#282b34] text-[11.5px] text-[#cbd5e1]">
              {filtered.map(row => {
                const isSelected = row.pdm === selectedRowId;
                return (
                  <tr
                    key={row.pdm}
                    onClick={() => setSelectedRowId(row.pdm)}
                    onDoubleClick={() => onNavigateToDrill(row)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1e3a5f]/40 border-l-4 border-l-blue-500 text-white'
                        : 'hover:bg-[#252830]'
                    }`}
                  >
                    <td className="py-1.5 px-2 font-mono font-bold text-amber-300">{row.pdm}</td>
                    <td className="py-1.5 px-2 font-bold text-center">{row.classe || '-'}</td>
                    <td className="py-1.5 px-2 text-[#94a3b8] truncate max-w-[220px]" title={row.osservazioni}>
                      {row.osservazioni}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{row.data_creazione || '-'}</td>
                    <td className="py-1.5 px-2 font-semibold text-white">{row.linea}</td>
                    <td className="py-1.5 px-2 font-mono">{row.km_linea}</td>
                    <td className="py-1.5 px-2 font-mono text-[11px] text-[#94a3b8]">{row.sede_tecnica}</td>
                    <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{row.data_scoperta || '-'}</td>
                    <td className="py-1.5 px-2 text-center font-bold">
                      <span className={row.tolto_dop === 'S' ? 'text-emerald-400' : 'text-red-400'}>
                        {row.tolto_dop}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{row.data_tolto_dop || '-'}</td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        row.scadenza === 'SCADUTO' ? 'text-red-400 bg-red-950/40 border border-red-800' :
                        row.scadenza === 'MANCANTE' ? 'text-amber-400 bg-amber-950/40 border border-amber-800' :
                        'text-amber-300'
                      }`}>
                        {row.scadenza}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-mono text-red-400">{row.ritardo_pdm || ''}</td>
                    <td className="py-1.5 px-2 font-mono text-center">
                      {row.data_tolto_minore_scoperta ? (
                        <span className="text-red-400 font-bold">SI</span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
