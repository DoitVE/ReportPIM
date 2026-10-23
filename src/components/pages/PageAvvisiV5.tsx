import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PdmV5Item } from '../../types';
import { RotateCcw, AlertTriangle, XCircle, CheckCircle2, ChevronRight, Layers, Database, Upload, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import L from 'leaflet';
import railwayGeoJson from '../../data/railway_map.json';

interface PageAvvisiV5Props {
  pdmList: PdmV5Item[];
  dataAggiornamento: string;
  onNavigateToDrill: (item: PdmV5Item) => void;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

export const PageAvvisiV5: React.FC<PageAvvisiV5Props> = ({
  pdmList,
  dataAggiornamento,
  onNavigateToDrill,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Slicers State
  const [selectedDivisione, setSelectedDivisione] = useState<string>('ALL');
  const [selectedUM, setSelectedUM] = useState<string>('ALL');
  const [selectedClasse, setSelectedClasse] = useState<string>('ALL');
  const [selectedScadenza, setSelectedScadenza] = useState<string>('ALL');
  const [selectedLinee, setSelectedLinee] = useState<string[]>([]);
  const [selectedClassificazioni, setSelectedClassificazioni] = useState<string[]>([]);

  // Selected row in table for drill
  const [selectedRowId, setSelectedRowId] = useState<string>(pdmList[0]?.pdm || '1040560');

  // Map Ref
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Available Linee
  const lineeList = useMemo(() => {
    const s = new Set<string>();
    pdmList.forEach(p => { if (p.linea) s.add(p.linea); });
    return Array.from(s).sort();
  }, [pdmList]);

  // Classificazioni stato options
  const classificazioneOptions = [
    'Pdm aperto - Avv. aperto',
    'Pdm aperto - Avv. chiuso',
    'Pdm aperto - Avv. mancante',
    'Pdm chiuso - Avv. aperto',
    'Pdm mancante - Avv. aperto'
  ];

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedDivisione('ALL');
    setSelectedUM('ALL');
    setSelectedClasse('ALL');
    setSelectedScadenza('ALL');
    setSelectedLinee([]);
    setSelectedClassificazioni([]);
  };

  const toggleLinea = (linea: string) => {
    setSelectedLinee(prev =>
      prev.includes(linea) ? prev.filter(l => l !== linea) : [...prev, linea]
    );
  };

  const toggleClassificazione = (c: string) => {
    setSelectedClassificazioni(prev =>
      prev.includes(c) ? prev.filter(item => item !== c) : [...prev, c]
    );
  };

  // Filtered dataset
  const filtered = useMemo(() => {
    return pdmList.filter(item => {
      if (selectedDivisione !== 'ALL' && item.divisione !== selectedDivisione) return false;
      if (selectedUM !== 'ALL' && item.lvu !== selectedUM) return false;
      if (selectedClasse !== 'ALL' && item.classe !== selectedClasse) return false;
      if (selectedScadenza !== 'ALL' && item.scadenza !== selectedScadenza) return false;
      if (selectedLinee.length > 0 && !selectedLinee.includes(item.linea)) return false;
      if (selectedClassificazioni.length > 0 && !selectedClassificazioni.includes(item.classificazione_stato)) return false;
      return true;
    });
  }, [pdmList, selectedDivisione, selectedUM, selectedClasse, selectedScadenza, selectedLinee, selectedClassificazioni]);

  // Selected Item Object
  const selectedItem = useMemo(() => {
    return pdmList.find(p => p.pdm === selectedRowId) || filtered[0] || pdmList[0];
  }, [pdmList, selectedRowId, filtered]);

  // Bar Chart Data: Classe Provvedimento
  const classeChartData = useMemo(() => {
    const classesOrder = ['A', 'B', 'C1', 'C2', 'C3', 'MANCANTE', 'S1', 'S2'];
    const map: Record<string, number> = {};
    classesOrder.forEach(c => { map[c] = 0; });

    filtered.forEach(item => {
      const c = item.classe || 'MANCANTE';
      if (map[c] !== undefined) {
        map[c] = (map[c] || 0) + 1;
      } else {
        map[c] = (map[c] || 0) + 1;
      }
    });

    return classesOrder
      .filter(c => c !== 'C3' || (map[c] && map[c] > 0))
      .map(name => ({
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

      // Dark Basemap (Grayscale Dark)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      // Add Railway Track Lines GeoJSON
      try {
        L.geoJSON(railwayGeoJson as any, {
          style: {
            color: '#94a3b8',
            weight: 1.8,
            opacity: 0.6,
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

  // Update Markers
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    // Group locations
    const locMap: Record<string, { lat: number; lng: number; count: number; name: string; items: PdmV5Item[] }> = {};
    filtered.forEach(item => {
      const lat = item.lat || 45.48;
      const lng = item.lng || 12.23;
      const key = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
      if (!locMap[key]) {
        locMap[key] = { lat, lng, count: 0, name: item.localita_tratta, items: [] };
      }
      locMap[key].count++;
      locMap[key].items.push(item);
    });

    Object.values(locMap).forEach(loc => {
      const radius = Math.min(28, Math.max(7, Math.sqrt(loc.count) * 4.5));
      const circle = L.circleMarker([loc.lat, loc.lng], {
        radius,
        fillColor: '#ef4444',
        fillOpacity: 0.65,
        color: '#fca5a5',
        weight: 1.5,
      });

      circle.bindTooltip(
        `<div class="text-xs p-1 font-sans">
          <div class="font-bold text-red-400">${loc.name}</div>
          <div class="text-slate-300">Punti di misura: <span class="font-bold text-white">${loc.count}</span></div>
        </div>`,
        { direction: 'top', className: 'bg-slate-900 border border-slate-700 text-white rounded' }
      );

      circle.on('click', () => {
        if (loc.items[0]) {
          setSelectedRowId(loc.items[0].pdm);
        }
      });

      circle.addTo(markersLayerRef.current!);
    });
  }, [filtered]);

  return (
    <div className="bg-[#18191c] text-[#e2e8f0] min-h-screen p-2.5 flex flex-col space-y-2.5 font-sans">
      {/* Top Banner Row matching Screenshot 2 */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#2d3139] pb-2">
        <div className="flex items-center space-x-3">
          <div className="h-9 px-2 bg-white rounded flex items-center justify-center">
            <span className="text-[#008542] font-black tracking-tighter text-base">RFI</span>
            <span className="text-[#dc2626] font-bold text-[10px] ml-1 uppercase">FS</span>
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-black text-[#e11d48] tracking-tight">
                Difetti di binario - DOIT VE
              </h1>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <span className="text-white font-bold text-sm">Avvisi V5</span>
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
      {pdmList.length === 0 && (
        <div className="bg-[#202227] border-l-4 border-amber-400 p-2.5 rounded border border-[#2e323b] flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block">Visualizzazione in attesa di alimentazione file SAP</span>
              <span className="text-[11px] text-slate-400">
                La mappa e i visualizzatori sono attivi sulla rete DOIT VE. Carica i file <strong className="text-amber-400 font-mono">ZSTMAIA</strong> e <strong className="text-cyan-400 font-mono">IW29</strong> oppure avvia la demo.
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
                className="px-3 py-1 bg-[#25282e] hover:bg-[#2f333a] text-amber-300 border border-[#3f4553] font-semibold text-xs rounded transition-colors cursor-pointer flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Carica Demo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Slicers & KPI Row */}
      <div className="grid grid-cols-12 gap-2 text-xs">
        {/* Divisione Slicer */}
        <div className="col-span-12 sm:col-span-4 md:col-span-2 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Divisione</span>
          <div className="flex space-x-1">
            {['VEM1', 'VEM2'].map(div => (
              <button
                key={div}
                onClick={() => setSelectedDivisione(selectedDivisione === div ? 'ALL' : div)}
                className={`flex-1 py-1 text-center font-bold rounded-xs border text-xs cursor-pointer transition-all ${
                  selectedDivisione === div
                    ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-white shadow'
                    : 'bg-[#18191c] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </div>

        {/* Unità Manutentiva Slicer */}
        <div className="col-span-12 sm:col-span-8 md:col-span-3 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Unità Manutentiva</span>
          <div className="grid grid-cols-4 gap-1">
            {['LVU1', 'LVU2', 'LVU3', 'LVU4'].map(lvu => (
              <button
                key={lvu}
                onClick={() => setSelectedUM(selectedUM === lvu ? 'ALL' : lvu)}
                className={`py-1 text-center font-bold rounded-xs border text-xs cursor-pointer transition-all ${
                  selectedUM === lvu
                    ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-white shadow'
                    : 'bg-[#18191c] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                }`}
              >
                {lvu}
              </button>
            ))}
          </div>
        </div>

        {/* Num. Difetti KPI Card (in prominent red box with red digits) */}
        <div className="col-span-12 sm:col-span-6 md:col-span-2 bg-[#202227] p-2 rounded border-2 border-[#dc2626] flex flex-col items-center justify-center shadow-lg">
          <span className="text-[11px] font-bold text-[#cbd5e1] uppercase">Num. difetti</span>
          <span className="text-3xl font-black text-[#ef4444] font-mono leading-none mt-1">
            {filtered.length}
          </span>
        </div>

        {/* Classe Provvedimento Slicer Buttons */}
        <div className="col-span-12 md:col-span-5 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Classe Provvedimento</span>
          <div className="grid grid-cols-7 gap-1">
            {['A', 'B', 'C1', 'C2', 'MANCANTE', 'S1', 'S2'].map(cls => (
              <button
                key={cls}
                onClick={() => setSelectedClasse(selectedClasse === cls ? 'ALL' : cls)}
                className={`py-1 text-center font-bold rounded-xs border text-[11px] cursor-pointer transition-all ${
                  selectedClasse === cls
                    ? 'bg-[#ef4444]/20 border-[#ef4444] text-white shadow'
                    : 'bg-[#18191c] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scadenza Avviso Slicer Row */}
      <div className="bg-[#202227] p-2 rounded border border-[#2e323b] text-xs">
        <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1 block">Scadenza Avviso</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
          {['MANCANTE', 'SCAD.<10GG', 'SCAD.<30GG', 'SCAD.<60GG', 'SCAD.>60GG', 'SCADUTO'].map(scad => (
            <button
              key={scad}
              onClick={() => setSelectedScadenza(selectedScadenza === scad ? 'ALL' : scad)}
              className={`py-1 text-center font-bold rounded-xs border text-xs cursor-pointer transition-all ${
                selectedScadenza === scad
                  ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-amber-300 shadow'
                  : 'bg-[#18191c] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
              }`}
            >
              {scad}
            </button>
          ))}
        </div>
      </div>

      {/* Middle Grid: Linea Checklist + Classe Chart + Classificazione + Grayscale Map */}
      <div className="grid grid-cols-12 gap-2.5">
        {/* Left Column: Linea InRete Checklist */}
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
                    className="rounded bg-[#18191c] border-[#4b5563] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="truncate text-[11px]">{linea}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Center-Left Column: Horizontal Bar Chart of Classe Provvedimento */}
        <div className="col-span-12 md:col-span-3 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col h-72">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-white">Classe Provvedimento</span>
            {selectedClasse !== 'ALL' && (
              <span className="text-[10px] text-amber-400 font-mono">Filtro: {selectedClasse}</span>
            )}
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={classeChartData}
                margin={{ top: 5, right: 28, left: 0, bottom: 5 }}
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
                  cursor="pointer"
                  label={{ position: 'right', fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
                  onClick={(entry) => setSelectedClasse(selectedClasse === entry.name ? 'ALL' : entry.name)}
                >
                  {classeChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={selectedClasse === entry.name ? '#f87171' : '#ea585c'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Center-Right Column: Classificazione stato Checklist */}
        <div className="col-span-12 md:col-span-2 bg-[#202227] p-2 rounded border border-[#2e323b] flex flex-col h-72">
          <span className="text-[11px] font-bold text-white mb-1">Classificazione stato</span>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs">
            {classificazioneOptions.map(c => {
              const isChecked = selectedClassificazioni.includes(c);
              return (
                <label
                  key={c}
                  className="flex items-start space-x-2 py-0.5 px-1 hover:bg-[#2a2d34] rounded cursor-pointer text-[#cbd5e1]"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleClassificazione(c)}
                    className="mt-0.5 rounded bg-[#18191c] border-[#4b5563] text-blue-500 focus:ring-0 w-3.5 h-3.5 shrink-0"
                  />
                  <span className="text-[11px] leading-tight">{c}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Right Column: Map with Drill PdM/avviso Button */}
        <div className="col-span-12 md:col-span-4 bg-[#202227] p-1.5 rounded border border-[#2e323b] flex flex-col h-72 relative">
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

          {/* Drill PdM/avviso action button at bottom-left of map */}
          <div className="absolute bottom-3 left-3 z-20">
            <button
              onClick={() => selectedItem && onNavigateToDrill(selectedItem)}
              disabled={!selectedItem}
              className="bg-white hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-[#0f172a] text-xs font-bold px-3 py-1.5 rounded shadow-lg border border-slate-300 flex items-center space-x-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95"
              title="Accedi alla scheda Drill V5 per visualizzare il dettaglio della riga selezionata"
            >
              <span>Drill PdM/avviso</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Table: Elenco Avvisi/PdM */}
      <div className="bg-[#202227] rounded border border-[#2e323b] overflow-hidden flex flex-col">
        <div className="px-3 py-1.5 bg-[#18191c] border-b border-[#2e323b] flex items-center justify-between text-xs">
          <span className="font-bold text-white">
            Elenco Avvisi/PdM ({filtered.length} righe)
          </span>
          <span className="text-[11px] text-[#94a3b8]">
            Riga selezionata per Drill: <strong className="text-amber-400 font-mono">PdM {selectedItem?.pdm}</strong> {selectedItem?.avviso ? `• Avviso ${selectedItem.avviso}` : ''}
          </span>
        </div>

        <div className="overflow-x-auto max-h-80 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141518] sticky top-0 border-b border-[#2e323b] text-[#94a3b8] text-[10.5px] uppercase font-semibold">
              <tr>
                <th className="py-2 px-2">PdM</th>
                <th className="py-2 px-2">Data creazione</th>
                <th className="py-2 px-2">Data scoperta</th>
                <th className="py-2 px-2">Tolto d'op.</th>
                <th className="py-2 px-2">Classe</th>
                <th className="py-2 px-2">Località/Tratta</th>
                <th className="py-2 px-2">Osservazioni</th>
                <th className="py-2 px-2">Avviso</th>
                <th className="py-2 px-2">Data creaz. avviso</th>
                <th className="py-2 px-2">Km linea</th>
                <th className="py-2 px-2">Tipo difetto</th>
                <th className="py-2 px-2">Pos. difetto</th>
                <th className="py-2 px-2">Esegui to da</th>
                <th className="py-2 px-2">ID sald. nz.</th>
                <th className="py-2 px-2">Gara stato</th>
                <th className="py-2 px-2">Cod. stato</th>
                <th className="py-2 px-2">Scadenza</th>
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
                    <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{row.data_creazione || '-'}</td>
                    <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{row.data_scoperta || '-'}</td>
                    <td className="py-1.5 px-2 text-center font-bold">
                      <span className={row.tolto_dop === 'S' ? 'text-emerald-400' : 'text-red-400'}>
                        {row.tolto_dop}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-bold text-center">{row.classe || '-'}</td>
                    <td className="py-1.5 px-2 font-semibold text-white truncate max-w-[140px]" title={row.localita_tratta}>
                      {row.localita_tratta}
                    </td>
                    <td className="py-1.5 px-2 text-[#94a3b8] truncate max-w-[180px]" title={row.osservazioni}>
                      {row.osservazioni}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-bold text-cyan-300">{row.avviso || '-'}</td>
                    <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{row.data_creaz_avviso || '-'}</td>
                    <td className="py-1.5 px-2 font-mono">{row.km_linea || '-'}</td>
                    <td className="py-1.5 px-2 font-semibold">{row.tipo_difetto || '-'}</td>
                    <td className="py-1.5 px-2">{row.pos_difetto || '-'}</td>
                    <td className="py-1.5 px-2">{row.esegui_to_da || '-'}</td>
                    <td className="py-1.5 px-2 font-mono">{row.id_sald || '-'}</td>
                    <td className="py-1.5 px-2 text-center">{row.gara_stato || '-'}</td>
                    <td className="py-1.5 px-2 font-mono text-center">{row.cod_stato || '-'}</td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      {row.scadenza === 'MANCANTE' && (
                        <span className="flex items-center space-x-1 text-amber-400 font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 fill-amber-400 text-slate-900" />
                          <span>MANCANTE</span>
                        </span>
                      )}
                      {row.scadenza === 'SCADUTO' && (
                        <span className="flex items-center space-x-1 text-red-400 font-bold text-[11px]">
                          <XCircle className="w-3.5 h-3.5 fill-red-500 text-white" />
                          <span>SCADUTO</span>
                        </span>
                      )}
                      {row.scadenza === 'COMPLETATO' && (
                        <span className="flex items-center space-x-1 text-emerald-400 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>COMPLETATO</span>
                        </span>
                      )}
                      {!['MANCANTE', 'SCADUTO', 'COMPLETATO'].includes(row.scadenza) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#383d47] text-[#cbd5e1]">
                          {row.scadenza}
                        </span>
                      )}
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
