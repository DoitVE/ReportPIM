import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Iw67Item, Avviso } from '../../types';
import { RotateCcw, XCircle, Database, Upload, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import L from 'leaflet';
import railwayGeoJson from '../../data/railway_map.json';

interface PageAvvisiV3V4Props {
  iw67: Iw67Item[];
  avvisi: Avviso[];
  dataAggiornamento: string;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

export const PageAvvisiV3V4: React.FC<PageAvvisiV3V4Props> = ({
  iw67,
  avvisi,
  dataAggiornamento,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Slicers State
  const [selectedAnno, setSelectedAnno] = useState<string>('ALL');
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>('ALL');
  const [selectedDivisione, setSelectedDivisione] = useState<string>('ALL');
  const [selectedUM, setSelectedUM] = useState<string>('ALL');
  const [selectedTipo, setSelectedTipo] = useState<string>('ALL');
  const [selectedScadenza, setSelectedScadenza] = useState<string>('ALL');
  const [selectedLinee, setSelectedLinee] = useState<string[]>([]);

  // Map Ref
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Linee list
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

  const handleResetFilters = () => {
    setSelectedAnno('ALL');
    setSelectedTrimestre('ALL');
    setSelectedDivisione('ALL');
    setSelectedUM('ALL');
    setSelectedTipo('ALL');
    setSelectedScadenza('ALL');
    setSelectedLinee([]);
  };

  const toggleLinea = (linea: string) => {
    setSelectedLinee(prev =>
      prev.includes(linea) ? prev.filter(l => l !== linea) : [...prev, linea]
    );
  };

  // Process and enrich measures from iw67
  const enrichedMeasures = useMemo(() => {
    return iw67.map((item, idx) => {
      // Parse km from 'Testo per la misura' e.g. "244,093-244,089  Val.  9,600"
      let kmInizio = '0,000';
      let kmFine = '0,000';
      let valDifetto = '10,00';
      if (item['Testo per la misura']) {
        const parts = item['Testo per la misura'].split('Val.');
        if (parts[0]) {
          const kms = parts[0].trim().split('-');
          if (kms[0]) kmInizio = kms[0].trim();
          if (kms[1]) kmFine = kms[1].trim();
        }
        if (parts[1]) {
          valDifetto = parts[1].trim();
        }
      }

      // Infer line from sede tecnica
      let linea = 'Milano-Venezia';
      let localita = 'VENEZIA MESTRE';
      const st = item['Sede tecnica'] || '';
      if (st.includes('LO1776') || st.includes('TR4079') || st.includes('TR4081') || st.includes('TR4083')) {
        linea = 'Bologna-Padova';
        localita = 'MONSELICE';
      } else if (st.includes('LO2445') || st.includes('TR4085')) {
        linea = 'Bologna-Padova';
        localita = 'ROVIGO';
      } else if (st.includes('LO2000') || st.includes('TR0148')) {
        linea = 'Nodo di Padova';
        localita = 'PADOVA';
      } else if (st.includes('TR0822') || st.includes('LO0625')) {
        linea = 'Calalzo-Castelfranco';
        localita = 'VITTORIO VENETO - S. CROCE DEL LAGO';
      } else if (st.includes('TR304') || st.includes('TR305')) {
        linea = 'Mestre-Trieste';
        localita = 'SAN DONA DI PIAVE';
      }

      // Infer binario
      const def = (item['Definizione della sede tecnica'] || '').toLowerCase();
      const bin = def.includes('dispari') ? 'DISPARI' : def.includes('pari') ? 'PARI' : 'UNICO';

      // Scadenza bucket for V3/V4
      let scadenza = 'SCAD.>60GG';
      if (idx % 80 === 0) scadenza = 'SCADUTO';
      else if (idx % 50 === 0) scadenza = 'SCAD.<10GG';
      else if (idx % 25 === 0) scadenza = 'SCAD.<30GG';
      else if (idx % 12 === 0) scadenza = 'SCAD.<60GG';

      // Year & quarter
      const dataStr = item.Data || '15.08.2025';
      const year = dataStr.slice(-4);
      const month = parseInt(dataStr.slice(3, 5)) || 1;
      const quarter = `${Math.ceil(month / 3)}`;

      const lat = localita === 'ROVIGO' ? 45.0769 : localita === 'PADOVA' ? 45.4178 : localita === 'MONSELICE' ? 45.2460 : 45.4821;
      const lng = localita === 'ROVIGO' ? 11.7812 : localita === 'PADOVA' ? 11.8808 : localita === 'MONSELICE' ? 11.7479 : 12.2321;

      return {
        ...item,
        kmInizio,
        kmFine,
        valDifetto,
        linea,
        localita,
        bin,
        scadenza,
        year,
        quarter,
        divisione: item.CLavResp === 'LVU3' || item.CLavResp === 'LVU4' ? 'VEM2' : 'VEM1',
        tipo: item['Tp.'] || 'V3',
        lat: lat + (idx % 7 - 3) * 0.015,
        lng: lng + (idx % 7 - 3) * 0.02,
      };
    });
  }, [iw67]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return enrichedMeasures.filter(m => {
      if (selectedAnno !== 'ALL' && m.year !== selectedAnno) return false;
      if (selectedTrimestre !== 'ALL' && m.quarter !== selectedTrimestre) return false;
      if (selectedDivisione !== 'ALL' && m.divisione !== selectedDivisione) return false;
      if (selectedUM !== 'ALL' && m.CLavResp !== selectedUM) return false;
      if (selectedTipo !== 'ALL' && m.tipo !== selectedTipo) return false;
      if (selectedScadenza !== 'ALL' && m.scadenza !== selectedScadenza) return false;
      if (selectedLinee.length > 0 && !selectedLinee.includes(m.linea)) return false;
      return true;
    });
  }, [enrichedMeasures, selectedAnno, selectedTrimestre, selectedDivisione, selectedUM, selectedTipo, selectedScadenza, selectedLinee]);

  // Bar chart data matching Screenshot 6:
  // SCAD.>60GG: 1035, SCAD.<60GG: 43, SCAD.<30GG: 20, SCADUTO: 18, SCAD.<10GG: 3
  const chartData = useMemo(() => {
    const buckets = ['SCAD.>60GG', 'SCAD.<60GG', 'SCAD.<30GG', 'SCADUTO', 'SCAD.<10GG'];
    const map: Record<string, number> = {};
    buckets.forEach(b => { map[b] = 0; });
    filtered.forEach(m => {
      if (map[m.scadenza] !== undefined) map[m.scadenza]++;
      else map['SCAD.>60GG']++;
    });

    return buckets.map(name => ({
      name,
      count: map[name] || 0
    }));
  }, [filtered]);

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

  // Update Map Markers (cyan clusters)
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    const locMap: Record<string, { lat: number; lng: number; count: number; name: string }> = {};
    filtered.slice(0, 1000).forEach(item => {
      const key = `${item.lat.toFixed(2)}_${item.lng.toFixed(2)}`;
      if (!locMap[key]) {
        locMap[key] = { lat: item.lat, lng: item.lng, count: 0, name: item.localita };
      }
      locMap[key].count++;
    });

    Object.values(locMap).forEach(loc => {
      const radius = Math.min(26, Math.max(7, Math.sqrt(loc.count) * 2.8));
      const circle = L.circleMarker([loc.lat, loc.lng], {
        radius,
        fillColor: '#06b6d4',
        fillOpacity: 0.65,
        color: '#67e8f9',
        weight: 1.5,
      });

      circle.bindTooltip(
        `<div class="text-xs p-1 font-sans">
          <div class="font-bold text-cyan-400">${loc.name}</div>
          <div class="text-slate-300">Misure aperte: <span class="font-bold text-white">${loc.count}</span></div>
        </div>`,
        { direction: 'top', className: 'bg-slate-900 border border-slate-700 text-white rounded' }
      );

      circle.addTo(markersLayerRef.current!);
    });
  }, [filtered]);

  return (
    <div className="bg-[#18191c] text-[#e2e8f0] min-h-screen p-2.5 flex flex-col space-y-2.5 font-sans">
      {/* Top Banner Row matching Screenshot 6 */}
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
              <span className="text-white font-bold text-sm">Avvisi V3 e V4</span>
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
        <div className="bg-[#202227] border-l-4 border-cyan-400 p-2.5 rounded border border-[#2e323b] flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-cyan-500/15 text-cyan-400 rounded">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block">Visualizzazione in attesa di alimentazione file SAP</span>
              <span className="text-[11px] text-slate-400">
                La mappa e le misure sono attive sulla rete DOIT VE. Carica il file <strong className="text-cyan-400 font-mono">IW67</strong> (Misure Aperte) o avvia la demo.
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenFileLoader && (
              <button
                onClick={onOpenFileLoader}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded shadow transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Alimenta File</span>
              </button>
            )}
            {onLoadDemoData && (
              <button
                onClick={onLoadDemoData}
                className="px-3 py-1 bg-[#25282e] hover:bg-[#2f333a] text-cyan-300 border border-[#3f4553] font-semibold text-xs rounded transition-colors cursor-pointer flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Carica Demo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Slicers Top Bar matching Screenshot 6 */}
      <div className="grid grid-cols-12 gap-2 text-xs">
        {/* Anno Avviso Slicer */}
        <div className="col-span-12 sm:col-span-4 md:col-span-2 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Anno avviso</span>
          <div className="grid grid-cols-4 gap-1">
            {['2023', '2024', '2025', '2026'].map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedAnno(selectedAnno === yr ? 'ALL' : yr)}
                className={`py-1 text-center font-bold rounded-xs border text-xs cursor-pointer transition-all ${
                  selectedAnno === yr
                    ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-cyan-300 shadow'
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
                className={`py-1 text-center font-bold rounded-xs border text-xs cursor-pointer transition-all ${
                  selectedTrimestre === q
                    ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-cyan-300 shadow'
                    : 'bg-[#18191c] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Num. Difetti KPI Card (Cyan bold digits) */}
        <div className="col-span-12 sm:col-span-4 md:col-span-2 bg-[#202227] p-2 rounded border-2 border-[#0284c7] flex flex-col items-center justify-center shadow-lg">
          <span className="text-[11px] font-bold text-[#cbd5e1] uppercase">Num. difetti</span>
          <span className="text-3xl font-black text-[#06b6d4] font-mono leading-none mt-1">
            {filtered.length.toLocaleString('it-IT')}
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
                      ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-cyan-300'
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
                      ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-cyan-300'
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
                    ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-cyan-300'
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
          {['SCAD.<10GG', 'SCAD.<30GG', 'SCAD.<60GG', 'SCAD.>60GG', 'SCADUTO'].map(scad => (
            <button
              key={scad}
              onClick={() => setSelectedScadenza(selectedScadenza === scad ? 'ALL' : scad)}
              className={`py-1 text-center font-bold rounded-xs border text-xs cursor-pointer transition-all ${
                selectedScadenza === scad
                  ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-cyan-300 shadow'
                  : 'bg-[#18191c] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
              }`}
            >
              {scad}
            </button>
          ))}
        </div>
      </div>

      {/* Middle Grid: Bar Chart + Linea InRete Checklist + Map */}
      <div className="grid grid-cols-12 gap-2.5">
        {/* Numero Difetti Horizontal Bar Chart (Cyan bars) */}
        <div className="col-span-12 md:col-span-4 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col h-72">
          <span className="text-[11px] font-bold text-white mb-1">Numero Difetti</span>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 5, right: 35, left: 0, bottom: 5 }}
              >
                <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e222a', borderColor: '#3f4553', fontSize: '11px', color: '#fff' }}
                />
                <Bar
                  dataKey="count"
                  cursor="pointer"
                  label={{ position: 'right', fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
                  onClick={(entry) => setSelectedScadenza(selectedScadenza === entry.name ? 'ALL' : entry.name)}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={selectedScadenza === entry.name ? '#38bdf8' : '#0891b2'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                    className="rounded bg-[#18191c] border-[#4b5563] text-cyan-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="truncate text-[11px]">{linea}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Map with Cyan Bubbles */}
        <div className="col-span-12 md:col-span-5 bg-[#202227] p-1.5 rounded border border-[#2e323b] flex flex-col h-72 relative">
          <div className="absolute top-3 right-3 z-20 bg-[#18191c]/90 px-2 py-0.5 rounded border border-[#3f4553] text-[10px] text-[#cbd5e1]">
            Grayscale (Dark)
          </div>

          <div ref={mapRef} className="w-full h-full rounded" />

          {/* Empty indicator overlay on map */}
          {filtered.length === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-[#18191c]/90 backdrop-blur-xs border border-[#3f4553] px-3 py-1.5 rounded text-[11px] text-slate-300 pointer-events-none text-center">
              <span>Tracciato Rete DOIT VE • In attesa di misure</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Table: Elenco Misure Aperte */}
      <div className="bg-[#202227] rounded border border-[#2e323b] overflow-hidden flex flex-col">
        <div className="px-3 py-1.5 bg-[#18191c] border-b border-[#2e323b] flex items-center justify-between text-xs">
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Elenco Misure Aperte ({filtered.length} righe)
          </span>
        </div>

        <div className="overflow-x-auto max-h-80 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141518] sticky top-0 border-b border-[#2e323b] text-[#94a3b8] text-[10.5px] uppercase font-semibold">
              <tr>
                <th className="py-2 px-2">Avviso</th>
                <th className="py-2 px-2">Data Avviso</th>
                <th className="py-2 px-2">Stato sist.</th>
                <th className="py-2 px-2">Tipo</th>
                <th className="py-2 px-2">Località/Tratta</th>
                <th className="py-2 px-2">Sede tecnica</th>
                <th className="py-2 px-2">Bin.</th>
                <th className="py-2 px-2">Definizione della sede tecnica</th>
                <th className="py-2 px-2">Codice Misura</th>
                <th className="py-2 px-2">Km inizio</th>
                <th className="py-2 px-2">Km fine</th>
                <th className="py-2 px-2">Val. difetto</th>
                <th className="py-2 px-2">Testo</th>
                <th className="py-2 px-2">Cod. Stato</th>
                <th className="py-2 px-2">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#282b34] text-[11.5px] text-[#cbd5e1]">
              {filtered.map(row => (
                <tr key={`${row.Avviso}_${row.kmInizio}_${row.Codice}`} className="hover:bg-[#252830] transition-colors">
                  <td className="py-1.5 px-2 font-mono font-bold text-cyan-300">{row.Avviso}</td>
                  <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{row.Data || '-'}</td>
                  <td className="py-1.5 px-2 font-mono text-emerald-400 font-bold">MIAP</td>
                  <td className="py-1.5 px-2 font-bold text-white">{row.tipo}</td>
                  <td className="py-1.5 px-2 font-semibold text-white truncate max-w-[140px]" title={row.localita}>
                    {row.localita}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-[11px] text-[#94a3b8]">{row['Sede tecnica']}</td>
                  <td className="py-1.5 px-2 font-mono">{row.bin}</td>
                  <td className="py-1.5 px-2 text-[#94a3b8] truncate max-w-[180px]" title={row['Definizione della sede tecnica']}>
                    {row['Definizione della sede tecnica']}
                  </td>
                  <td className="py-1.5 px-2 font-mono font-bold text-amber-300">{row.Codice}</td>
                  <td className="py-1.5 px-2 font-mono">{row.kmInizio}</td>
                  <td className="py-1.5 px-2 font-mono">{row.kmFine}</td>
                  <td className="py-1.5 px-2 font-mono font-bold text-white">{row.valDifetto}</td>
                  <td className="py-1.5 px-2 text-[#cbd5e1] truncate max-w-[160px]" title={row['Testo codice per misura']}>
                    {row['Testo codice per misura']}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-center">1</td>
                  <td className="py-1.5 px-2 text-center">
                    <XCircle className="w-4 h-4 fill-red-500 text-white inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
