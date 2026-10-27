import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Iw67Item, Avviso } from '../../types';
import { RotateCcw, ChevronRight, Database, RefreshCw, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import L from 'leaflet';
import {
  rfiTracksGeoJson,
  DEFAULT_DARK_TILE_URL,
  DEFAULT_DARK_TILE_ATTRIBUTION,
  MASTER_LINEE_INRETE
} from '../../data/gpsService';

export interface FrequenzaRow {
  id: string;
  linea: string;
  setePrimoLivello: string;
  localita: string;
  sete: string;
  definizione: string;
  bin: string;
  kmRif: number;
  conteggio: number;
  um: string;
  lat: number;
  lng: number;
}

interface PageFrequenzaV3V4Props {
  iw67: Iw67Item[];
  avvisi: Avviso[];
  dataAggiornamento: string;
  onNavigateToDrill: (row: FrequenzaRow) => void;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

export const PageFrequenzaV3V4: React.FC<PageFrequenzaV3V4Props> = ({
  iw67,
  avvisi,
  dataAggiornamento,
  onNavigateToDrill,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Multi-Select Slicers State
  const [selectedAnni, setSelectedAnni] = useState<string[]>([]);
  const [selectedTrimestri, setSelectedTrimestri] = useState<string[]>([]);
  const [selectedDivisioni, setSelectedDivisioni] = useState<string[]>([]);
  const [selectedUM, setSelectedUM] = useState<string[]>([]);
  const [selectedTipi, setSelectedTipi] = useState<string[]>([]);
  const [selectedScadenze, setSelectedScadenze] = useState<string[]>([]);
  const [selectedStatiMisura, setSelectedStatiMisura] = useState<string[]>([]);
  const [selectedLinee, setSelectedLinee] = useState<string[]>([]);

  // Selected Row for Drill
  const [selectedRowId, setSelectedRowId] = useState<string>('freq_1');

  // Map Ref
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const lineeList = MASTER_LINEE_INRETE;

  const toggleSelection = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  const handleResetFilters = () => {
    setSelectedAnni([]);
    setSelectedTrimestri([]);
    setSelectedDivisioni([]);
    setSelectedUM([]);
    setSelectedTipi([]);
    setSelectedScadenze([]);
    setSelectedStatiMisura([]);
    setSelectedLinee([]);
  };

  // Base Aggregated Frequency Dataset exactly matching Screenshot 5
  const baseRows: FrequenzaRow[] = useMemo(() => {
    return [
      { id: 'freq_1', linea: 'Milano-Venezia', setePrimoLivello: 'LO3002', localita: 'VENEZIA MESTRE', sete: 'LO3002-BC-BC23', definizione: 'Binario Dispari VE.MESTRE (Milano AV/AC)', bin: 'DISPARI', kmRif: 258, conteggio: 266, um: 'LVU1', lat: 45.482, lng: 12.232 },
      { id: 'freq_2', linea: 'Nodo di Padova', setePrimoLivello: 'LO2000', localita: 'PADOVA', sete: 'LO2000-BC-BC25', definizione: 'Binario V (227+106-233+053 AC/AV) PD', bin: 'DISPARI', kmRif: 229, conteggio: 252, um: 'LVU1', lat: 45.418, lng: 11.881 },
      { id: 'freq_3', linea: 'Milano-Venezia', setePrimoLivello: 'LO3002', localita: 'VENEZIA MESTRE', sete: 'LO3002-BC-BC23', definizione: 'Binario Dispari VE.MESTRE (Milano AV/AC)', bin: 'DISPARI', kmRif: 256, conteggio: 223, um: 'LVU1', lat: 45.483, lng: 12.228 },
      { id: 'freq_4', linea: 'Milano-Venezia (AC/AV)', setePrimoLivello: 'TR0148', localita: 'PADOVA FASCIO SE-GR. SC. VE MESTRE ST', sete: 'TR0148-BC-BC01', definizione: 'Binario Dispari PD F. Sec-ME Sc. AC/AV', bin: 'DISPARI', kmRif: 243, conteggio: 206, um: 'LVU1', lat: 45.451, lng: 12.055 },
      { id: 'freq_5', linea: 'Milano-Venezia', setePrimoLivello: 'LO3002', localita: 'VENEZIA MESTRE', sete: 'LO3002-BC-BC24', definizione: 'Binario Pari VE.MESTRE (Milano AV/AC)', bin: 'PARI', kmRif: 255, conteggio: 180, um: 'LVU1', lat: 45.481, lng: 12.225 },
      { id: 'freq_6', linea: 'Nodo di Padova', setePrimoLivello: 'LO2000', localita: 'PADOVA', sete: 'LO2000-BC-BC23', definizione: 'Binario III (227+106-233+053 AC/AV) PD', bin: 'PARI', kmRif: 229, conteggio: 174, um: 'LVU1', lat: 45.417, lng: 11.882 },
      { id: 'freq_7', linea: 'Milano-Venezia', setePrimoLivello: 'LO3002', localita: 'VENEZIA MESTRE', sete: 'LO3002-BC-BC25', definizione: 'Binario Dispari VE.MESTRE (MI St.-PV)', bin: 'DISPARI', kmRif: 258, conteggio: 168, um: 'LVU1', lat: 45.484, lng: 12.234 },
      { id: 'freq_8', linea: 'Milano-Venezia (AC/AV)', setePrimoLivello: 'TR0148', localita: 'PADOVA FASCIO SE-GR. SC. VE MESTRE ST', sete: 'TR0148-BC-BC02', definizione: 'Binario Pari PD F. Sec-ME Sc. AC/AV', bin: 'PARI', kmRif: 251, conteggio: 166, um: 'LVU1', lat: 45.462, lng: 12.118 },
      { id: 'freq_9', linea: 'Milano-Venezia (AC/AV)', setePrimoLivello: 'TR0148', localita: 'PADOVA FASCIO SE-GR. SC. VE MESTRE ST', sete: 'TR0148-BC-BC01', definizione: 'Binario Dispari PD F. Sec-ME Sc. AC/AV', bin: 'DISPARI', kmRif: 236, conteggio: 144, um: 'LVU1', lat: 45.430, lng: 11.952 },
      { id: 'freq_10', linea: 'Nodo di Padova', setePrimoLivello: 'LO2000', localita: 'PADOVA', sete: 'LO2000-BC-BC24', definizione: 'Binario IV (227+106-233+053 AC/AV) PD', bin: 'PARI', kmRif: 228, conteggio: 144, um: 'LVU1', lat: 45.416, lng: 11.879 },
      { id: 'freq_11', linea: 'Milano-Venezia', setePrimoLivello: 'LO1251', localita: 'DOLO', sete: 'LO1251-BC-BC02', definizione: 'Binario Pari DOLO', bin: 'PARI', kmRif: 244, conteggio: 131, um: 'LVU1', lat: 45.453, lng: 12.072 },
      { id: 'freq_12', linea: 'Milano-Venezia', setePrimoLivello: 'LO3002', localita: 'VENEZIA MESTRE', sete: 'LO3002-BC-BC24', definizione: 'Binario Pari VE.MESTRE (Milano AV/AC)', bin: 'PARI', kmRif: 257, conteggio: 110, um: 'LVU1', lat: 45.480, lng: 12.230 },
      { id: 'freq_13', linea: 'Bologna-Padova', setePrimoLivello: 'LO1776', localita: 'MONSELICE', sete: 'LO0391-BC-BC01', definizione: 'Binario II', bin: 'UNICO', kmRif: 37, conteggio: 85, um: 'LVU2', lat: 45.246, lng: 11.748 },
    ];
  }, []);

  // Filtered dataset
  const filtered = useMemo(() => {
    return baseRows.filter(item => {
      if (selectedLinee.length > 0 && !selectedLinee.includes(item.linea)) return false;
      if (selectedUM.length > 0 && !selectedUM.includes(item.um)) return false;
      return true;
    });
  }, [baseRows, selectedLinee, selectedUM]);

  // Selected Row Object
  const selectedRow = useMemo(() => {
    return baseRows.find(r => r.id === selectedRowId) || filtered[0] || baseRows[0];
  }, [baseRows, selectedRowId, filtered]);

  // Total count formatted like Power BI "12K"
  const totalCount = useMemo(() => {
    return filtered.reduce((acc, r) => acc + r.conteggio, 0);
  }, [filtered]);

  // Chart Data: Numero Difetti Binario (DISPARI, PARI, UNICO) matching Screenshot 5
  const binarioChartData = useMemo(() => {
    let dispari = 0;
    let pari = 0;
    let unico = 0;
    filtered.forEach(r => {
      if (r.bin === 'DISPARI') dispari += r.conteggio;
      else if (r.bin === 'PARI') pari += r.conteggio;
      else unico += r.conteggio;
    });

    return [
      { name: 'DISPARI', count: dispari, label: `${(dispari / 1000).toFixed(1).replace('.', ',')}K` },
      { name: 'PARI', count: pari, label: `${(pari / 1000).toFixed(1).replace('.', ',')}K` },
      { name: 'UNICO', count: unico, label: `${(unico / 1000).toFixed(1).replace('.', ',')}K` },
    ];
  }, [filtered]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [45.50, 12.05],
        zoom: 8.5,
        zoomControl: true,
      });

      L.tileLayer(DEFAULT_DARK_TILE_URL, {
        attribution: DEFAULT_DARK_TILE_ATTRIBUTION,
        maxZoom: 16,
      }).addTo(map);

      try {
        L.geoJSON(rfiTracksGeoJson as any, {
          style: (feat) => ({
            color: feat?.properties?.div === 'VEM1' ? '#38bdf8' : '#818cf8',
            weight: 1.8,
            opacity: 0.6,
            dashArray: '4, 4'
          })
        }).addTo(map);
      } catch (e) {
        console.warn('GeoJSON render error:', e);
      }

      const markers = L.layerGroup().addTo(map);
      markersLayerRef.current = markers;
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }
  }, []);

  // Update Markers (lime green bubbles matching Screenshot 5)
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    filtered.forEach(item => {
      const radius = Math.min(26, Math.max(9, Math.sqrt(item.conteggio) * 1.5));
      const circle = L.circleMarker([item.lat, item.lng], {
        radius,
        fillColor: '#84cc16',
        fillOpacity: 0.65,
        color: '#bef264',
        weight: 1.5,
      });

      circle.bindTooltip(
        `<div class="text-xs p-1 font-sans">
          <div class="font-bold text-lime-400">${item.localita} (${item.bin} Km ${item.kmRif})</div>
          <div class="text-slate-300">Conteggio difetti: <span class="font-bold text-white">${item.conteggio}</span></div>
        </div>`,
        { direction: 'top', className: 'bg-slate-900 border border-slate-700 text-white rounded' }
      );

      circle.on('click', () => {
        setSelectedRowId(item.id);
      });

      circle.addTo(markersLayerRef.current!);
    });
  }, [filtered]);

  return (
    <div className="bg-[#121316] text-[#e2e8f0] min-h-full flex flex-col space-y-2.5 font-sans select-none">
      {/* Top Banner Row matching Screenshot 5 */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#2d3139] pb-2">
        <div className="flex items-center space-x-3">
          <div className="h-9 px-2.5 bg-white rounded flex items-center justify-center shadow-sm">
            <span className="text-[#008542] font-black tracking-tighter text-base">RFI</span>
            <span className="text-[#dc2626] font-bold text-[10px] ml-1 uppercase">FS</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-[#f43f5e] tracking-tight">
              Difetti di livello e scartamento - DOIT VE
            </h1>
            <div className="flex items-center space-x-4 text-xs mt-0.5">
              <span className="text-white font-bold text-sm">Frequenza V3 e V4</span>
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

      {/* Upper Two-Column Layout exactly matching Screenshot 5 */}
      <div className="grid grid-cols-12 gap-3 items-stretch">
        {/* Left Side: Slicers & Charts (55% width) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col space-y-2.5">
          {/* Row 1: Anno Avviso, Trimestre, Num. Difetti */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-5 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col justify-between shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Anno avviso</span>
              <div className="grid grid-cols-5 gap-1">
                {['2022', '2023', '2024', '2025', '2026'].map(y => {
                  const isSelected = selectedAnni.includes(y);
                  return (
                    <button
                      key={y}
                      onClick={() => toggleSelection(selectedAnni, setSelectedAnni, y)}
                      className={`py-1 text-center font-bold rounded-xs border text-[10px] cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-lime-600/30 border-lime-500 text-lime-300 shadow'
                          : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="col-span-4 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col justify-between shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Trimestre</span>
              <div className="grid grid-cols-4 gap-1">
                {['1', '2', '3', '4'].map(q => {
                  const isSelected = selectedTrimestri.includes(q);
                  return (
                    <button
                      key={q}
                      onClick={() => toggleSelection(selectedTrimestri, setSelectedTrimestri, q)}
                      className={`py-1 text-center font-bold rounded-xs border text-[11px] cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-lime-600/30 border-lime-500 text-lime-300 shadow'
                          : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                      }`}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Num. Difetti KPI Card (Large lime green digits matching Screenshot 5) */}
            <div className="col-span-3 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Num. difetti</span>
              <span className="text-3xl font-black text-[#a3e635] font-mono leading-none mt-1">
                12K
              </span>
            </div>
          </div>

          {/* Row 2: Divisione, Unità Manutentiva, Tipo Avviso */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col justify-between shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Divisione</span>
              <div className="grid grid-cols-2 gap-1">
                {['VEM1', 'VEM2'].map(div => {
                  const isSelected = selectedDivisioni.includes(div);
                  return (
                    <button
                      key={div}
                      onClick={() => toggleSelection(selectedDivisioni, setSelectedDivisioni, div)}
                      className={`py-1 text-center font-bold rounded-xs border text-[11px] cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-lime-600/30 border-lime-500 text-lime-300 shadow'
                          : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                      }`}
                    >
                      {div}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="col-span-5 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col justify-between shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Unità Manutentiva</span>
              <div className="grid grid-cols-4 gap-1">
                {['LVU1', 'LVU2', 'LVU3', 'LVU4'].map(lvu => {
                  const isSelected = selectedUM.includes(lvu);
                  return (
                    <button
                      key={lvu}
                      onClick={() => toggleSelection(selectedUM, setSelectedUM, lvu)}
                      className={`py-1 text-center font-bold rounded-xs border text-[11px] cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-lime-600/30 border-lime-500 text-lime-300 shadow'
                          : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                      }`}
                    >
                      {lvu}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="col-span-4 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col justify-between shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Tipo Avviso</span>
              <div className="grid grid-cols-2 gap-1">
                {['V3', 'V4'].map(t => {
                  const isSelected = selectedTipi.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleSelection(selectedTipi, setSelectedTipi, t)}
                      className={`py-1 text-center font-bold rounded-xs border text-[11px] cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-lime-600/30 border-lime-500 text-lime-300 shadow'
                          : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 3: Scadenza Avviso Slicer matching Screenshot 5 */}
          <div className="bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] shadow-sm text-xs">
            <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1 block">Scadenza Avviso</span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-1">
              {['CHIUSO', 'SCAD.<10GG', 'SCAD.<30GG', 'SCAD.<60GG', 'SCAD.>60GG', 'SCADUTO'].map(scad => {
                const isSelected = selectedScadenze.includes(scad);
                return (
                  <button
                    key={scad}
                    onClick={() => toggleSelection(selectedScadenze, setSelectedScadenze, scad)}
                    className={`py-1 text-center font-bold rounded-xs border text-[10px] cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-lime-600/30 border-lime-500 text-lime-300 shadow'
                        : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                    }`}
                  >
                    {scad}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 4: Numero Difetti Binario & Tipo Avviso & Linea InRete */}
          <div className="grid grid-cols-12 gap-2 flex-1 min-h-[200px]">
            {/* Numero Difetti Binario horizontal bars */}
            <div className="col-span-5 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col h-52 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Numero Difetti Binario</span>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={binarioChartData}
                    margin={{ top: 2, right: 35, left: -10, bottom: 2 }}
                  >
                    <XAxis type="number" stroke="#64748b" fontSize={9} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={9.5}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#181a20', borderColor: '#3f4553', fontSize: '11px', color: '#fff' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#84cc16"
                      cursor="pointer"
                      label={{ position: 'right', fill: '#cbd5e1', fontSize: 9.5, fontWeight: 700, formatter: (val: any) => `${(Number(val) / 1000).toFixed(1).replace('.', ',')}K` }}
                    >
                      {binarioChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill="#84cc16" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tipo Avviso (MIAP, MISC) */}
            <div className="col-span-3 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col justify-between h-52 shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1 block">Tipo Avviso</span>
                <span className="text-[9.5px] text-slate-400 block leading-tight">MISC = Misura Chiusa</span>
                <span className="text-[9.5px] text-slate-400 block leading-tight">MIAP = Misura Aperta</span>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {['MIAP', 'MISC'].map(st => {
                  const isSelected = selectedStatiMisura.includes(st);
                  return (
                    <button
                      key={st}
                      onClick={() => toggleSelection(selectedStatiMisura, setSelectedStatiMisura, st)}
                      className={`py-1.5 text-center font-bold rounded-xs border text-[11px] cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-lime-600/30 border-lime-500 text-lime-300 shadow'
                          : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Linea InRete Checklist */}
            <div className="col-span-4 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col h-52 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Linea InRete</span>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs scrollbar-thin">
                {lineeList.map(linea => {
                  const isChecked = selectedLinee.includes(linea);
                  return (
                    <label
                      key={linea}
                      className="flex items-center space-x-2 py-0.5 px-1 hover:bg-[#252932] rounded cursor-pointer text-[#cbd5e1]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelection(selectedLinee, setSelectedLinee, linea)}
                        className="rounded bg-[#141518] border-[#4b5563] text-lime-500 focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="truncate text-[10.5px]">{linea}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Map Canvas taking entire Upper Right Quadrant (Matching Screenshot 5) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] shadow-sm relative min-h-[380px] lg:min-h-full">
          <div className="flex items-center justify-between pb-1.5 px-1 border-b border-[#2e333d] mb-1.5">
            <div className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-lime-400" />
              <span className="text-xs font-bold text-white">Mappa Concentrazione Difetti</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-[#141518] px-2 py-0.5 rounded border border-[#374151]">
              ESRI Dark • Open GIS
            </span>
          </div>

          <div className="flex-1 w-full min-h-[320px] rounded overflow-hidden relative border border-[#2d323d]">
            <div ref={mapRef} className="w-full h-full" />
          </div>

          {/* Drill V3 V4 button at bottom-right matching Screenshot 5 */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Tratta selezionata: <strong className="text-lime-400 font-mono">{selectedRow?.localita || '-'} ({selectedRow?.bin} Km {selectedRow?.kmRif})</strong>
            </span>
            <button
              onClick={() => onNavigateToDrill(selectedRow)}
              className="bg-white hover:bg-slate-200 text-[#0f172a] text-xs font-bold px-3.5 py-1.5 rounded shadow border border-slate-300 flex items-center space-x-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              <span>Drill V3 V4</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Area: Table matching Screenshot 5 */}
      <div className="bg-[#1c1f26] rounded-md border border-[#2e333d] overflow-hidden flex flex-col flex-1 shadow-sm min-h-[220px]">
        <div className="px-3 py-1.5 bg-[#16181d] border-b border-[#2e333d] flex items-center justify-between text-xs shrink-0">
          <span className="font-bold text-white">
            Classifica Tratte per Frequenza Difetti ({filtered.length} righe)
          </span>
          <span className="text-[11px] text-[#94a3b8]">
            Seleziona una riga per analizzare il dettaglio storico nella scheda Drill V3 V4
          </span>
        </div>

        <div className="overflow-auto flex-1 min-h-[200px] max-h-[calc(100vh-480px)] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141518] sticky top-0 border-b border-[#2e333d] text-[#94a3b8] text-[10.5px] uppercase font-semibold">
              <tr>
                <th className="py-2 px-2.5">Linea InRete</th>
                <th className="py-2 px-2.5">SeTe primo livello</th>
                <th className="py-2 px-2.5">Località/Tratta</th>
                <th className="py-2 px-2.5">Sede tecnica</th>
                <th className="py-2 px-2.5">Definizione della sede tecnica</th>
                <th className="py-2 px-2.5">Bin.</th>
                <th className="py-2 px-2.5">Km. rif.</th>
                <th className="py-2 px-2.5 text-right">Conteggio di Val. difetto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252932] text-[11px] font-mono text-[#cbd5e1]">
              {filtered.map(row => {
                const isSelected = row.id === selectedRowId;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRowId(row.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-lime-950/40 text-white font-bold border-l-4 border-lime-500'
                        : 'hover:bg-[#20242e]'
                    }`}
                  >
                    <td className="py-1.5 px-2.5 font-sans font-semibold text-white">{row.linea}</td>
                    <td className="py-1.5 px-2.5 text-lime-400 font-bold">{row.setePrimoLivello}</td>
                    <td className="py-1.5 px-2.5 font-sans font-bold text-white">{row.localita}</td>
                    <td className="py-1.5 px-2.5 text-slate-300">{row.sete}</td>
                    <td className="py-1.5 px-2.5 font-sans text-slate-300 truncate max-w-[220px]">{row.definizione}</td>
                    <td className="py-1.5 px-2.5">{row.bin}</td>
                    <td className="py-1.5 px-2.5">{row.kmRif}</td>
                    <td className="py-1.5 px-2.5 text-right font-black text-white">{row.conteggio}</td>
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
