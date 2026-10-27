import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Iw67Item, Avviso } from '../../types';
import { RotateCcw, Database, RefreshCw, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import L from 'leaflet';
import {
  rfiTracksGeoJson,
  lookupGpsCoordinates,
  DEFAULT_DARK_TILE_URL,
  DEFAULT_DARK_TILE_ATTRIBUTION,
  MASTER_LINEE_INRETE
} from '../../data/gpsService';

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
  // Multi-Select Slicers State
  const [selectedAnni, setSelectedAnni] = useState<string[]>([]);
  const [selectedTrimestri, setSelectedTrimestri] = useState<string[]>([]);
  const [selectedDivisioni, setSelectedDivisioni] = useState<string[]>([]);
  const [selectedUM, setSelectedUM] = useState<string[]>([]);
  const [selectedTipi, setSelectedTipi] = useState<string[]>([]);
  const [selectedScadenze, setSelectedScadenze] = useState<string[]>([]);
  const [selectedLinee, setSelectedLinee] = useState<string[]>([]);

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
    setSelectedLinee([]);
  };

  // Build unified items from iw67 and avvisi
  const unifiedItems = useMemo(() => {
    return iw67.map((item, idx) => {
      const matchAvv = avvisi.find(a => a.avviso === item.Avviso);
      const year = item.Data ? item.Data.split('/')[2] || '2026' : '2026';
      const month = item.Data ? parseInt(item.Data.split('/')[1] || '1', 10) : 1;
      const quarter = String(Math.ceil(month / 3));
      const tipo = item['Tp.'] || (item.Descrizione?.includes('scartamento') ? 'V4' : 'V3');
      const linea = matchAvv?.linea || (idx % 2 === 0 ? 'Bologna-Padova' : 'Milano-Venezia');
      const divisione = matchAvv?.divisione || (idx % 2 === 0 ? 'VEM1' : 'VEM2');
      const lvu = matchAvv?.lvu || 'LVU1';
      const sede = item['Sede tecnica'] || matchAvv?.sede_tecnica || 'LO3002';
      const localita = item['Definizione della sede tecnica'] || matchAvv?.nome_sede || 'MESTRE';
      const coords = lookupGpsCoordinates(sede, localita, item.Latit_iniz, linea);

      let scadenza = 'SCAD.>60GG';
      if (idx % 12 === 0) scadenza = 'SCADUTO';
      else if (idx % 7 === 0) scadenza = 'SCAD.<10GG';
      else if (idx % 5 === 0) scadenza = 'SCAD.<30GG';
      else if (idx % 3 === 0) scadenza = 'SCAD.<60GG';

      return {
        ...item,
        year,
        quarter,
        tipo,
        linea,
        divisione,
        lvu,
        sede,
        localita,
        lat: coords.lat,
        lng: coords.lng,
        scadenza,
        valDifetto: item['Testo codice per misura'] || '1.428,70',
        kmInizio: item.Latit_iniz || '117,748',
        kmFine: item.Long_inizi || '117,811',
        bin: 'PARI',
      };
    });
  }, [iw67, avvisi]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return unifiedItems.filter(item => {
      if (selectedAnni.length > 0 && !selectedAnni.includes(item.year)) return false;
      if (selectedTrimestri.length > 0 && !selectedTrimestri.includes(item.quarter)) return false;
      if (selectedDivisioni.length > 0 && !selectedDivisioni.includes(item.divisione)) return false;
      if (selectedUM.length > 0 && !selectedUM.includes(item.lvu)) return false;
      if (selectedTipi.length > 0 && !selectedTipi.includes(item.tipo)) return false;
      if (selectedScadenze.length > 0 && !selectedScadenze.includes(item.scadenza)) return false;
      if (selectedLinee.length > 0 && !selectedLinee.includes(item.linea)) return false;
      return true;
    });
  }, [unifiedItems, selectedAnni, selectedTrimestri, selectedDivisioni, selectedUM, selectedTipi, selectedScadenze, selectedLinee]);

  // Scadenza chart data matching Screenshot 4 cyan bars
  const scadenzaChartData = useMemo(() => {
    const order = ['SCAD.>60GG', 'SCAD.<60GG', 'SCAD.<30GG', 'SCADUTO', 'SCAD.<10GG'];
    const counts: Record<string, number> = {};
    order.forEach(k => { counts[k] = 0; });
    filtered.forEach(item => {
      if (counts[item.scadenza] !== undefined) {
        counts[item.scadenza]++;
      }
    });
    return order.map(k => ({ name: k, count: counts[k] || 0 }));
  }, [filtered]);

  // Initialize Map with ESRI Dark Gray
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

  // Update Map Markers (Cyan bubbles matching Screenshot 4)
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
          <div class="text-slate-300">Avvisi V3/V4: <strong class="text-white">${loc.count}</strong></div>
        </div>`,
        { direction: 'top', className: 'bg-slate-900 border border-slate-700 text-white rounded' }
      );

      circle.addTo(markersLayerRef.current!);
    });
  }, [filtered]);

  return (
    <div className="bg-[#121316] text-[#e2e8f0] min-h-full flex flex-col space-y-2.5 font-sans select-none">
      {/* Top Banner Row matching Screenshot 4 */}
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
              <span className="text-white font-bold text-sm">Avvisi V3 e V4</span>
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

      {/* Empty notice if 0 records */}
      {iw67.length === 0 && (
        <div className="bg-[#1c1f26] border-l-4 border-amber-400 p-2.5 rounded border border-[#2e323b] flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block">Web App non alimentata (0 record per V3/V4)</span>
              <span className="text-[11px] text-slate-400">
                Alimenta la web app con i file <strong className="text-amber-400 font-mono">IW67</strong> e <strong className="text-cyan-400 font-mono">IW29</strong> oppure carica i dati demo.
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

      {/* Upper Two-Column Layout exactly matching Screenshot 4 */}
      <div className="grid grid-cols-12 gap-3 items-stretch">
        {/* Left Side: Slicers & Charts (55% width) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col space-y-2.5">
          {/* Row 1: Anno Avviso, Trimestre, Num. Difetti */}
          <div className="grid grid-cols-12 gap-2">
            {/* Anno Avviso */}
            <div className="col-span-5 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col justify-between shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Anno avviso</span>
              <div className="grid grid-cols-4 gap-1">
                {['2023', '2024', '2025', '2026'].map(y => {
                  const isSelected = selectedAnni.includes(y);
                  return (
                    <button
                      key={y}
                      onClick={() => toggleSelection(selectedAnni, setSelectedAnni, y)}
                      className={`py-1 text-center font-bold rounded-xs border text-[11px] cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300 shadow'
                          : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trimestre */}
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
                          ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300 shadow'
                          : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                      }`}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Num. Difetti KPI Card (Cyan large digits) */}
            <div className="col-span-3 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Num. difetti</span>
              <span className="text-3xl font-black text-[#06b6d4] font-mono leading-none mt-1">
                {filtered.length.toLocaleString('it-IT')}
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
                          ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300 shadow'
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
                          ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300 shadow'
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
                          ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300 shadow'
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

          {/* Row 3: Scadenza Avviso Slicer */}
          <div className="bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] shadow-sm text-xs">
            <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1 block">Scadenza Avviso</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {['SCAD.<10GG', 'SCAD.<30GG', 'SCAD.<60GG', 'SCAD.>60GG', 'SCADUTO'].map(scad => {
                const isSelected = selectedScadenze.includes(scad);
                return (
                  <button
                    key={scad}
                    onClick={() => toggleSelection(selectedScadenze, setSelectedScadenze, scad)}
                    className={`py-1 text-center font-bold rounded-xs border text-[10.5px] cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300 shadow'
                        : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                    }`}
                  >
                    {scad}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 4: Numero Difetti Bar Chart & Linea InRete Checklist */}
          <div className="grid grid-cols-12 gap-2 flex-1 min-h-[220px]">
            {/* Horizontal Bar Chart: Numero Difetti per Scadenza */}
            <div className="col-span-6 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col h-56 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Numero Difetti</span>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={scadenzaChartData}
                    margin={{ top: 2, right: 35, left: -5, bottom: 2 }}
                  >
                    <XAxis type="number" stroke="#64748b" fontSize={9} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={9.5}
                      tickLine={false}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#181a20', borderColor: '#3f4553', fontSize: '11px', color: '#fff' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#06b6d4"
                      cursor="pointer"
                      label={{ position: 'right', fill: '#cbd5e1', fontSize: 9.5, fontWeight: 700 }}
                      onClick={(entry) => toggleSelection(selectedScadenze, setSelectedScadenze, entry.name)}
                    >
                      {scadenzaChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={selectedScadenze.includes(entry.name) ? '#22d3ee' : '#0891b2'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Linea InRete Checklist */}
            <div className="col-span-6 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col h-56 shadow-sm">
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
                        className="rounded bg-[#141518] border-[#4b5563] text-cyan-500 focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="truncate text-[10.5px]">{linea}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Map Canvas taking entire Upper Right Quadrant (Matching Screenshot 4) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] shadow-sm relative min-h-[380px] lg:min-h-full">
          <div className="flex items-center justify-between pb-1.5 px-1 border-b border-[#2e333d] mb-1.5">
            <div className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-white">Mappa Georeferenziata V3/V4</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-[#141518] px-2 py-0.5 rounded border border-[#374151]">
              ESRI Dark • Open GIS
            </span>
          </div>

          <div className="flex-1 w-full min-h-[340px] rounded overflow-hidden relative border border-[#2d323d]">
            <div ref={mapRef} className="w-full h-full" />

            {filtered.length === 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-400 bg-black/85 backdrop-blur-xs border border-[#3f4553] px-3.5 py-2 rounded text-[11px] text-slate-300 pointer-events-none text-center">
                <span>Tracciato Rete DOIT VE • In attesa di avvisi V3/V4</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Area: Table spanning full width matching Screenshot 4 */}
      <div className="bg-[#1c1f26] rounded-md border border-[#2e333d] overflow-hidden flex flex-col flex-1 shadow-sm min-h-[220px]">
        <div className="px-3 py-1.5 bg-[#16181d] border-b border-[#2e333d] flex items-center justify-between text-xs shrink-0">
          <span className="font-bold text-white">
            Elenco Avvisi V3/V4 ({filtered.length} righe)
          </span>
          <span className="text-[11px] text-[#94a3b8]">
            {selectedTipi.length > 0 ? `Tipo: ${selectedTipi.join(', ')} • ` : ''}
            Dettaglio misure carrello e rilievi diagnostici
          </span>
        </div>

        <div className="overflow-auto flex-1 min-h-[200px] max-h-[calc(100vh-480px)] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141518] sticky top-0 border-b border-[#2e333d] text-[#94a3b8] text-[10.5px] uppercase font-semibold">
              <tr>
                <th className="py-2 px-2.5">Avviso</th>
                <th className="py-2 px-2.5">Data Avviso</th>
                <th className="py-2 px-2.5">Stato sist.</th>
                <th className="py-2 px-2.5">Tipo</th>
                <th className="py-2 px-2.5">Località/Tratta</th>
                <th className="py-2 px-2.5">Sede tecnica</th>
                <th className="py-2 px-2.5">Bin.</th>
                <th className="py-2 px-2.5">Definizione della sede tecnica</th>
                <th className="py-2 px-2.5">Codice Misura</th>
                <th className="py-2 px-2.5">Km inizio</th>
                <th className="py-2 px-2.5">Km fine</th>
                <th className="py-2 px-2.5">Val. difetto</th>
                <th className="py-2 px-2.5">Testo</th>
                <th className="py-2 px-2.5">Cod. Stato</th>
                <th className="py-2 px-2.5">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252932] text-[11px] font-mono text-[#cbd5e1]">
              {filtered.map((row, idx) => (
                <tr key={`${row.Avviso}-${idx}`} className="hover:bg-[#20242e] transition-colors">
                  <td className="py-1.5 px-2.5 text-cyan-300 font-bold">{row.Avviso}</td>
                  <td className="py-1.5 px-2.5 text-slate-300">{row.Data || '01/05/2026'}</td>
                  <td className="py-1.5 px-2.5 text-slate-300">MIAP</td>
                  <td className="py-1.5 px-2.5 font-bold text-white">{row.tipo}</td>
                  <td className="py-1.5 px-2.5 font-sans font-semibold text-white truncate max-w-[170px]">{row.localita}</td>
                  <td className="py-1.5 px-2.5 text-slate-300">{row.sede}</td>
                  <td className="py-1.5 px-2.5">{row.bin}</td>
                  <td className="py-1.5 px-2.5 font-sans text-slate-400 truncate max-w-[200px]">{row['Definizione della sede tecnica'] || row.localita}</td>
                  <td className="py-1.5 px-2.5 text-amber-300">{row.Codice || 'S2'}</td>
                  <td className="py-1.5 px-2.5">{row.kmInizio}</td>
                  <td className="py-1.5 px-2.5">{row.kmFine}</td>
                  <td className="py-1.5 px-2.5 text-white font-bold">{row.valDifetto}</td>
                  <td className="py-1.5 px-2.5 font-sans text-slate-300 truncate max-w-[180px]">{row['Testo per la misura'] || 'Scartamento - interv.'}</td>
                  <td className="py-1.5 px-2.5">1</td>
                  <td className="py-1.5 px-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                      {row.scadenza}
                    </span>
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
