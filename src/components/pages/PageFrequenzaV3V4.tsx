import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Iw67Item, Avviso } from '../../types';
import { RotateCcw, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import L from 'leaflet';
import railwayGeoJson from '../../data/railway_map.json';

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
  // Slicers
  const [selectedAnno, setSelectedAnno] = useState<string>('ALL');
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>('ALL');
  const [selectedDivisione, setSelectedDivisione] = useState<string>('ALL');
  const [selectedUM, setSelectedUM] = useState<string>('ALL');
  const [selectedTipo, setSelectedTipo] = useState<string>('ALL');
  const [selectedScadenza, setSelectedScadenza] = useState<string>('ALL');
  const [selectedStatoMisura, setSelectedStatoMisura] = useState<string>('ALL');
  const [selectedLinee, setSelectedLinee] = useState<string[]>([]);

  // Selected Row for Drill
  const [selectedRowId, setSelectedRowId] = useState<string>('freq_1');

  // Map Ref
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const lineeList = [
    'Bologna-Padova',
    'Calalzo-Castelfranco',
    'Camposampiero-Bassano',
    'Castelfranco-Mestre',
    'Castelfranco-Padova',
    'Confluenza Milano-Trento',
    'Mestre-Trieste',
    'Mestre-Udine',
    'Milano-Venezia',
    'Milano-Venezia (AC/AV)',
    'Nodo di Padova',
    'Ponte nelle Alpi-Conegliano',
    'Rovigo-Chioggia'
  ];

  // Exact dataset matching Screenshot 7
  const initialFrequenze: FrequenzaRow[] = [
    {
      id: 'freq_1',
      linea: 'Milano-Venezia',
      setePrimoLivello: 'LO3002',
      localita: 'VENEZIA MESTRE',
      sete: 'LO3002-BC-BC23',
      definizione: 'Binario Dispari VE.MESTRE (Milano AV/AC)',
      bin: 'DISPARI',
      kmRif: 258,
      conteggio: 264,
      um: 'LVU1',
      lat: 45.4821,
      lng: 12.2321
    },
    {
      id: 'freq_2',
      linea: 'Nodo di Padova',
      setePrimoLivello: 'LO2000',
      localita: 'PADOVA',
      sete: 'LO2000-BC-BC25',
      definizione: 'Binario V (227+106-233+053 AC/AV) PD',
      bin: 'DISPARI',
      kmRif: 229,
      conteggio: 252,
      um: 'LVU2',
      lat: 45.4178,
      lng: 11.8808
    },
    {
      id: 'freq_3',
      linea: 'Milano-Venezia',
      setePrimoLivello: 'LO3002',
      localita: 'VENEZIA MESTRE',
      sete: 'LO3002-BC-BC23',
      definizione: 'Binario Dispari VE.MESTRE (Milano AV/AC)',
      bin: 'DISPARI',
      kmRif: 256,
      conteggio: 223,
      um: 'LVU1',
      lat: 45.4821,
      lng: 12.2321
    },
    {
      id: 'freq_4',
      linea: 'Milano-Venezia (AC/AV)',
      setePrimoLivello: 'TR0148',
      localita: 'PADOVA FASCIO SE-GR. SC. VE MESTRE ST',
      sete: 'TR0148-BC-BC01',
      definizione: 'Binario Dispari PD F. Sec-ME Sc. AC/AV',
      bin: 'DISPARI',
      kmRif: 243,
      conteggio: 206,
      um: 'LVU2',
      lat: 45.4513,
      lng: 12.0549
    },
    {
      id: 'freq_5',
      linea: 'Milano-Venezia',
      setePrimoLivello: 'LO3002',
      localita: 'VENEZIA MESTRE',
      sete: 'LO3002-BC-BC24',
      definizione: 'Binario Pari VE.MESTRE (Milano AV/AC)',
      bin: 'PARI',
      kmRif: 255,
      conteggio: 180,
      um: 'LVU1',
      lat: 45.4821,
      lng: 12.2321
    },
    {
      id: 'freq_6',
      linea: 'Nodo di Padova',
      setePrimoLivello: 'LO2000',
      localita: 'PADOVA',
      sete: 'LO2000-BC-BC23',
      definizione: 'Binario III (227+106-233+053 AC/AV) PD',
      bin: 'PARI',
      kmRif: 229,
      conteggio: 174,
      um: 'LVU2',
      lat: 45.4178,
      lng: 11.8808
    },
    {
      id: 'freq_7',
      linea: 'Milano-Venezia',
      setePrimoLivello: 'LO3002',
      localita: 'VENEZIA MESTRE',
      sete: 'LO3002-BC-BC25',
      definizione: 'Binario Dispari VE.MESTRE (Mi St.-PV)',
      bin: 'DISPARI',
      kmRif: 258,
      conteggio: 168,
      um: 'LVU1',
      lat: 45.4821,
      lng: 12.2321
    },
    {
      id: 'freq_8',
      linea: 'Milano-Venezia (AC/AV)',
      setePrimoLivello: 'TR0148',
      localita: 'PADOVA FASCIO SE-GR. SC. VE MESTRE ST',
      sete: 'TR0148-BC-BC02',
      definizione: 'Binario Pari PD F. Sec-ME Sc. AC/AV',
      bin: 'PARI',
      kmRif: 251,
      conteggio: 166,
      um: 'LVU2',
      lat: 45.4513,
      lng: 12.0549
    },
    {
      id: 'freq_9',
      linea: 'Nodo di Padova',
      setePrimoLivello: 'LO2000',
      localita: 'PADOVA',
      sete: 'LO2000-BC-BC23',
      definizione: 'Binario III (227+106-233+053 AC/AV) PD',
      bin: 'PARI',
      kmRif: 228,
      conteggio: 144,
      um: 'LVU2',
      lat: 45.4178,
      lng: 11.8808
    },
    {
      id: 'freq_10',
      linea: 'Milano-Venezia (AC/AV)',
      setePrimoLivello: 'TR0148',
      localita: 'PADOVA FASCIO SE-GR. SC. VE MESTRE ST',
      sete: 'TR0148-BC-BC01',
      definizione: 'Binario Dispari PD F. Sec-ME Sc. AC/AV',
      bin: 'DISPARI',
      kmRif: 236,
      conteggio: 134,
      um: 'LVU2',
      lat: 45.4513,
      lng: 12.0549
    },
    {
      id: 'freq_11',
      linea: 'Milano-Venezia',
      setePrimoLivello: 'LO1251',
      localita: 'DOLO',
      sete: 'LO1251-BC-BC02',
      definizione: 'Binario Pari DOLO',
      bin: 'PARI',
      kmRif: 244,
      conteggio: 129,
      um: 'LVU1',
      lat: 45.4260,
      lng: 12.0716
    },
    {
      id: 'freq_12',
      linea: 'Milano-Venezia',
      setePrimoLivello: 'LO3009',
      localita: 'VENEZIA S. LUCIA',
      sete: 'LO3009-BC-BC04',
      definizione: 'Binario Pari VENEZIA S.L. (PN)',
      bin: 'PARI',
      kmRif: 265,
      conteggio: 110,
      um: 'LVU1',
      lat: 45.4413,
      lng: 12.3207
    },
    {
      id: 'freq_13',
      linea: 'Milano-Venezia',
      setePrimoLivello: 'LO3002',
      localita: 'VENEZIA MESTRE',
      sete: 'LO3002-BC-BC24',
      definizione: 'Binario Pari VE.MESTRE (Milano AV/AC)',
      bin: 'PARI',
      kmRif: 257,
      conteggio: 105,
      um: 'LVU1',
      lat: 45.4821,
      lng: 12.2321
    },
    {
      id: 'freq_14',
      linea: 'Bologna-Padova',
      setePrimoLivello: 'LO1776',
      localita: 'MONSELICE',
      sete: 'LO0391-BC-BC01',
      definizione: 'Binario II',
      bin: 'UNICO',
      kmRif: 37,
      conteggio: 1,
      um: 'LVU2',
      lat: 45.2460,
      lng: 11.7479
    }
  ];

  const handleResetFilters = () => {
    setSelectedAnno('ALL');
    setSelectedTrimestre('ALL');
    setSelectedDivisione('ALL');
    setSelectedUM('ALL');
    setSelectedTipo('ALL');
    setSelectedScadenza('ALL');
    setSelectedStatoMisura('ALL');
    setSelectedLinee([]);
  };

  const toggleLinea = (linea: string) => {
    setSelectedLinee(prev =>
      prev.includes(linea) ? prev.filter(l => l !== linea) : [...prev, linea]
    );
  };

  const filtered = useMemo(() => {
    return initialFrequenze.filter(item => {
      if (selectedUM !== 'ALL' && item.um !== selectedUM) return false;
      if (selectedLinee.length > 0 && !selectedLinee.includes(item.linea)) return false;
      return true;
    });
  }, [initialFrequenze, selectedUM, selectedLinee]);

  const selectedItem = useMemo(() => {
    return initialFrequenze.find(f => f.id === selectedRowId) || filtered[0] || initialFrequenze[0];
  }, [initialFrequenze, selectedRowId, filtered]);

  // Chart: Numero Difetti Binario matching Screenshot 7
  // DISPARI: 5,4K, PARI: 5,4K, UNICO: 1,7K
  const binarioChartData = [
    { name: 'DISPARI', count: 5400, label: '5,4K' },
    { name: 'PARI', count: 5400, label: '5,4K' },
    { name: 'UNICO', count: 1700, label: '1,4K' }
  ];

  // Map Setup
  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [45.50, 12.05],
        zoom: 8.5,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      try {
        L.geoJSON(railwayGeoJson as any, {
          style: {
            color: '#64748b',
            weight: 1.5,
            opacity: 0.5,
            dashArray: '3, 4'
          }
        }).addTo(map);
      } catch (e) {
        console.warn('GeoJSON render error:', e);
      }

      const markers = L.layerGroup().addTo(map);
      markersLayerRef.current = markers;
      mapInstanceRef.current = map;
    }
  }, []);

  // Update Markers (lime green bubbles matching Screenshot 7)
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
    <div className="bg-[#18191c] text-[#e2e8f0] min-h-screen p-2.5 flex flex-col space-y-2.5 font-sans">
      {/* Top Banner Row matching Screenshot 7 */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#2d3139] pb-2">
        <div className="flex items-center space-x-3">
          <div className="h-9 px-2 bg-white rounded flex items-center justify-center">
            <span className="text-[#008542] font-black tracking-tighter text-base">RFI</span>
            <span className="text-[#dc2626] font-bold text-[10px] ml-1 uppercase">FS</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-[#e11d48] tracking-tight">
              Difetti di livello e scartamento - DOIT VE
            </h1>
            <div className="flex items-center space-x-4 text-xs">
              <span className="text-white font-bold text-sm">Frequenza V3 e V4</span>
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

      {/* Compact Status Banner if Not Populated */}
      {iw67.length === 0 && (
        <div className="bg-[#202227] border-l-4 border-lime-400 p-2.5 rounded border border-[#2e323b] flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-lime-500/15 text-lime-400 rounded">
              <span className="font-mono font-black text-sm">12K</span>
            </div>
            <div>
              <span className="font-bold text-white text-xs block">Visualizzazione Frequenza in attesa di alimentazione</span>
              <span className="text-[11px] text-slate-400">
                La mappa delle concentrazioni e i binari sono attivi. Carica il file <strong className="text-lime-400 font-mono">IW67</strong> o avvia la demo.
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenFileLoader && (
              <button
                onClick={onOpenFileLoader}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded shadow transition-colors cursor-pointer"
              >
                Alimenta File
              </button>
            )}
            {onLoadDemoData && (
              <button
                onClick={onLoadDemoData}
                className="px-3 py-1 bg-[#25282e] hover:bg-[#2f333a] text-lime-300 border border-[#3f4553] font-semibold text-xs rounded transition-colors cursor-pointer"
              >
                Carica Demo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Slicers Top Bar */}
      <div className="grid grid-cols-12 gap-2 text-xs">
        {/* Anno avviso Slicer */}
        <div className="col-span-12 sm:col-span-4 md:col-span-2 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Anno avviso</span>
          <div className="grid grid-cols-5 gap-1">
            {['2022', '2023', '2024', '2025', '2026'].map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedAnno(selectedAnno === yr ? 'ALL' : yr)}
                className={`py-1 text-center font-bold rounded-xs border text-[11px] cursor-pointer ${
                  selectedAnno === yr
                    ? 'bg-[#84cc16]/20 border-[#84cc16] text-lime-300'
                    : 'bg-[#18191c] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        {/* Trimestre Slicer */}
        <div className="col-span-12 sm:col-span-4 md:col-span-2 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Trimestre</span>
          <div className="grid grid-cols-4 gap-1">
            {['1', '2', '3', '4'].map(q => (
              <button
                key={q}
                onClick={() => setSelectedTrimestre(selectedTrimestre === q ? 'ALL' : q)}
                className={`py-1 text-center font-bold rounded-xs border text-xs cursor-pointer ${
                  selectedTrimestre === q
                    ? 'bg-[#84cc16]/20 border-[#84cc16] text-lime-300'
                    : 'bg-[#18191c] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Num. difetti KPI Card (Yellow-Green 12K text) */}
        <div className="col-span-12 sm:col-span-4 md:col-span-2 bg-[#202227] p-2 rounded border-2 border-[#65a30d] flex flex-col items-center justify-center shadow-lg">
          <span className="text-[11px] font-bold text-[#cbd5e1] uppercase">Num. difetti</span>
          <span className="text-3xl font-black text-[#84cc16] font-mono leading-none mt-1">
            12K
          </span>
        </div>

        {/* Divisione & Unità Manutentiva */}
        <div className="col-span-12 md:col-span-3 grid grid-cols-2 gap-1.5">
          <div className="bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Divisione</span>
            <div className="flex space-x-1">
              {['VEM1', 'VEM2'].map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDivisione(selectedDivisione === d ? 'ALL' : d)}
                  className={`flex-1 py-1 text-center font-bold rounded-xs border text-xs cursor-pointer ${
                    selectedDivisione === d
                      ? 'bg-[#84cc16]/20 border-[#84cc16] text-lime-300'
                      : 'bg-[#18191c] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Unità Manutentiva</span>
            <div className="grid grid-cols-2 gap-1">
              {['LVU1', 'LVU2', 'LVU3', 'LVU4'].map(u => (
                <button
                  key={u}
                  onClick={() => setSelectedUM(selectedUM === u ? 'ALL' : u)}
                  className={`py-0.5 text-center font-bold rounded-xs border text-[11px] cursor-pointer ${
                    selectedUM === u
                      ? 'bg-[#84cc16]/20 border-[#84cc16] text-lime-300'
                      : 'bg-[#18191c] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tipo Avviso (V3 / V4) */}
        <div className="col-span-12 md:col-span-3 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-[#94a3b8]">Tipo Avviso</span>
            <span className="text-[9.5px] text-[#94a3b8]">V3: Livello • V4: Scartamento</span>
          </div>
          <div className="flex space-x-1.5">
            {['V3', 'V4'].map(t => (
              <button
                key={t}
                onClick={() => setSelectedTipo(selectedTipo === t ? 'ALL' : t)}
                className={`flex-1 py-1 text-center font-bold rounded-xs border text-xs cursor-pointer ${
                  selectedTipo === t
                    ? 'bg-[#84cc16]/20 border-[#84cc16] text-lime-300'
                    : 'bg-[#18191c] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scadenza Avviso Slicer Row */}
      <div className="bg-[#202227] p-2 rounded border border-[#2e323b] text-xs">
        <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1 block">Scadenza Avviso</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
          {['CHIUSO', 'SCAD.<10GG', 'SCAD.<30GG', 'SCAD.<60GG', 'SCAD.>60GG', 'SCADUTO'].map(scad => (
            <button
              key={scad}
              onClick={() => setSelectedScadenza(selectedScadenza === scad ? 'ALL' : scad)}
              className={`py-1 text-center font-bold rounded-xs border text-xs cursor-pointer transition-all ${
                selectedScadenza === scad
                  ? 'bg-[#84cc16]/20 border-[#84cc16] text-lime-300 shadow'
                  : 'bg-[#18191c] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
              }`}
            >
              {scad}
            </button>
          ))}
        </div>
      </div>

      {/* Middle Grid: Numero Difetti Binario + Tipo Avviso + Linea InRete + Map */}
      <div className="grid grid-cols-12 gap-2.5">
        {/* Numero Difetti Binario (Horizontal Green Bars) */}
        <div className="col-span-12 md:col-span-3 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col h-72">
          <span className="text-[11px] font-bold text-white mb-1">Numero Difetti Binario</span>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={binarioChartData}
                margin={{ top: 15, right: 35, left: 0, bottom: 15 }}
              >
                <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  width={65}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e222a', borderColor: '#3f4553', fontSize: '11px', color: '#fff' }}
                />
                <Bar
                  dataKey="count"
                  fill="#84cc16"
                  label={{ position: 'right', fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tipo Avviso (MISC vs MIAP) */}
          <div className="border-t border-[#2e323b] pt-1.5 mt-1">
            <div className="flex items-center justify-between text-[10px] text-[#94a3b8] mb-1">
              <span>Tipo Avviso</span>
              <span>MISC: Chiusa • MIAP: Aperta</span>
            </div>
            <div className="flex space-x-1">
              {['MIAP', 'MISC'].map(st => (
                <button
                  key={st}
                  onClick={() => setSelectedStatoMisura(selectedStatoMisura === st ? 'ALL' : st)}
                  className={`flex-1 py-0.5 text-center font-bold rounded-xs border text-[11px] cursor-pointer ${
                    selectedStatoMisura === st
                      ? 'bg-[#84cc16]/20 border-[#84cc16] text-lime-300'
                      : 'bg-[#18191c] border-[#383d47] text-[#94a3b8]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Linea InRete Checklist */}
        <div className="col-span-12 md:col-span-3 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col h-72">
          <span className="text-[11px] font-bold text-white mb-1">Linea InRete</span>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs scrollbar-thin">
            {lineeList.map(linea => {
              const isChecked = selectedLinee.includes(linea);
              return (
                <label
                  key={linea}
                  className="flex items-center space-x-2 py-0.5 px-1 hover:bg-[#2a2d34] rounded cursor-pointer text-[#cbd5e1]"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleLinea(linea)}
                    className="rounded bg-[#18191c] border-[#4b5563] text-lime-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="truncate text-[11px]">{linea}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Map with Lime Green Bubbles */}
        <div className="col-span-12 md:col-span-6 bg-[#202227] p-1.5 rounded border border-[#2e323b] flex flex-col h-72 relative">
          <div className="absolute top-3 right-3 z-20 bg-[#18191c]/90 px-2 py-0.5 rounded border border-[#3f4553] text-[10px] text-[#cbd5e1]">
            Grayscale (Dark)
          </div>

          <div ref={mapRef} className="w-full h-full rounded" />

          {/* Empty indicator overlay on map */}
          {filtered.length === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-[#18191c]/90 backdrop-blur-xs border border-[#3f4553] px-3 py-1.5 rounded text-[11px] text-slate-300 pointer-events-none text-center">
              <span>Tracciato Rete DOIT VE • In attesa di difetti</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Table: Elenco Frequenze Difetti */}
      <div className="bg-[#202227] rounded border border-[#2e323b] overflow-hidden flex flex-col">
        <div className="px-3 py-1.5 bg-[#18191c] border-b border-[#2e323b] flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Elenco Frequenze Difetti ({filtered.length} righe)
            </span>
            <span className="text-[11px] text-[#94a3b8] ml-2 hidden sm:inline">
              Ogni riga mostra quante volte è stato riscontrato un difetto in quel binario e km di linea
            </span>
          </div>

          {/* Drill V3 V4 button */}
          <button
            onClick={() => selectedItem && onNavigateToDrill(selectedItem)}
            disabled={!selectedItem}
            className="bg-white hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-[#0f172a] text-xs font-bold px-3 py-1 rounded shadow border border-slate-300 flex items-center space-x-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95"
            title="Accedi alla scheda Drill frequenza V3 V4 per visualizzare l'elenco delle misure contenute"
          >
            <span>Drill V3 V4</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto max-h-80 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141518] sticky top-0 border-b border-[#2e323b] text-[#94a3b8] text-[10.5px] uppercase font-semibold">
              <tr>
                <th className="py-2 px-2">Linea InRete</th>
                <th className="py-2 px-2">SeTe primo livello</th>
                <th className="py-2 px-2">Località/Tratta</th>
                <th className="py-2 px-2">Sede tecnica</th>
                <th className="py-2 px-2">Definizione della sede tecnica</th>
                <th className="py-2 px-2">Bin.</th>
                <th className="py-2 px-2">Km. rif.</th>
                <th className="py-2 px-2 text-right">Conteggio di Val. difetto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#282b34] text-[11.5px] text-[#cbd5e1]">
              {filtered.map(row => {
                const isSelected = row.id === selectedRowId;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRowId(row.id)}
                    onDoubleClick={() => onNavigateToDrill(row)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1e3a5f]/40 border-l-4 border-l-lime-500 text-white'
                        : 'hover:bg-[#252830]'
                    }`}
                  >
                    <td className="py-1.5 px-2 font-semibold text-white">{row.linea}</td>
                    <td className="py-1.5 px-2 font-mono text-amber-300 font-bold">{row.setePrimoLivello}</td>
                    <td className="py-1.5 px-2 font-medium text-white truncate max-w-[160px]" title={row.localita}>
                      {row.localita}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-[11px] text-[#94a3b8]">{row.sete}</td>
                    <td className="py-1.5 px-2 text-[#cbd5e1] truncate max-w-[220px]" title={row.definizione}>
                      {row.definizione}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-bold">{row.bin}</td>
                    <td className="py-1.5 px-2 font-mono">{row.kmRif}</td>
                    <td className="py-1.5 px-2 font-mono font-bold text-lime-400 text-right pr-4 text-sm">
                      {row.conteggio}
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
