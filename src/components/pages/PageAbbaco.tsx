import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AbbacoItem, Avviso } from '../../types';
import { RotateCcw, AlertTriangle, Layers, Database, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import L from 'leaflet';
import {
  rfiTracksGeoJson,
  lookupGpsCoordinates,
  DEFAULT_DARK_TILE_URL,
  DEFAULT_DARK_TILE_ATTRIBUTION,
  MASTER_LINEE_INRETE
} from '../../data/gpsService';

interface PageAbbacoProps {
  abbaco: AbbacoItem[];
  avvisi: Avviso[];
  dataAggiornamento: string;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

export const PageAbbaco: React.FC<PageAbbacoProps> = ({
  abbaco,
  avvisi,
  dataAggiornamento,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Multi-Select Slicers State
  const [selectedDivisioni, setSelectedDivisioni] = useState<string[]>([]);
  const [selectedUM, setSelectedUM] = useState<string[]>([]);
  const [selectedLinee, setSelectedLinee] = useState<string[]>([]);
  const [selectedBinari, setSelectedBinari] = useState<string[]>([]);

  // Map Ref
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const toggleSelection = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  const handleResetFilters = () => {
    setSelectedDivisioni([]);
    setSelectedUM([]);
    setSelectedLinee([]);
    setSelectedBinari([]);
  };

  // Line list from master list
  const lineeDisponibili = MASTER_LINEE_INRETE;

  // Filtered dataset
  const filtered = useMemo(() => {
    return abbaco.filter(item => {
      if (selectedLinee.length > 0 && !selectedLinee.includes(item.linea)) return false;
      if (selectedBinari.length > 0) {
        const binMatch = selectedBinari.some(b => item.binario?.toUpperCase().includes(b.split(' ')[0]));
        if (!binMatch) return false;
      }
      return true;
    });
  }, [abbaco, selectedLinee, selectedBinari]);

  // Chart data: Numero Rallentamenti per Linea matching Screenshot 8
  const chartData = useMemo(() => {
    const map: Record<string, number> = {
      'Bologna-Padova': 0,
      'Milano-Venezia SL': 0,
      'Mestre-Treviso': 0,
    };
    filtered.forEach(item => {
      if (map[item.linea] !== undefined) {
        map[item.linea]++;
      } else {
        map[item.linea] = (map[item.linea] || 0) + 1;
      }
    });

    return [
      { name: 'Bologna-Padova', count: map['Bologna-Padova'] || 0 },
      { name: 'Milano-Venezia SL', count: map['Milano-Venezia SL'] || 0 },
      { name: 'Mestre-Treviso', count: map['Mestre-Treviso'] || 0 },
    ];
  }, [filtered]);

  // Initialize Map with ESRI Dark Gray
  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [45.45, 12.05],
        zoom: 9,
        zoomControl: true,
      });

      L.tileLayer(DEFAULT_DARK_TILE_URL, {
        maxZoom: 16,
        attribution: DEFAULT_DARK_TILE_ATTRIBUTION,
      }).addTo(map);

      // Add Railway vector line track overlay (163 tratte RFI DOIT VE)
      try {
        L.geoJSON(rfiTracksGeoJson as any, {
          style: (feat) => ({
            color: feat?.properties?.div === 'VEM1' ? '#38bdf8' : '#818cf8',
            weight: 2,
            opacity: 0.65,
            dashArray: '4, 4',
          }),
        }).addTo(map);
      } catch (e) {
        console.warn('Could not load railway geojson', e);
      }

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }
  }, []);

  // Update map markers when filtered items change
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    filtered.forEach((item) => {
      const coords = lookupGpsCoordinates(undefined, item.tratta, item.km_inizio, item.linea);
      const lat = coords.lat;
      const lng = coords.lng;

      // Glow halo ring
      const halo = L.circleMarker([lat, lng], {
        radius: 12,
        fillColor: '#f59e0b',
        color: '#d97706',
        weight: 1,
        opacity: 0.6,
        fillOpacity: 0.25,
      });

      // Center marker
      const marker = L.circleMarker([lat, lng], {
        radius: 5.5,
        fillColor: '#fbbf24',
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.85,
      });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; font-size: 11px; color: #f8fafc; padding: 2px;">
          <div style="font-weight: 700; color: #fbbf24; border-bottom: 1px solid #334155; padding-bottom: 3px; margin-bottom: 3px;">
            ⚠️ Rallentamento ABBA.CO: ${item.chiave_rl}
          </div>
          <div><strong>Linea:</strong> ${item.linea}</div>
          <div><strong>Tratta:</strong> ${item.tratta}</div>
          <div><strong>Prog. Km:</strong> ${item.km_inizio} - ${item.km_fine}</div>
          <div><strong>Velocità:</strong> <span style="font-weight: 700; color: #ef4444;">${item.rid_vel}</span></div>
          <div><strong>Motivo:</strong> ${item.motivo}</div>
          <div><strong>Titolare:</strong> <span style="color: #34d399;">${item.titolare}</span></div>
        </div>
      `;

      halo.bindPopup(popupContent);
      marker.bindPopup(popupContent);

      markersLayerRef.current?.addLayer(halo);
      markersLayerRef.current?.addLayer(marker);
    });
  }, [filtered]);

  return (
    <div className="bg-[#121316] text-[#e2e8f0] min-h-full flex flex-col space-y-2.5 font-sans select-none">
      {/* Top Banner Row matching Screenshot 8 */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#2d3139] pb-2">
        <div className="flex items-center space-x-3">
          <div className="h-9 px-2.5 bg-white rounded flex items-center justify-center shadow-sm">
            <span className="text-[#008542] font-black tracking-tighter text-base">RFI</span>
            <span className="text-[#dc2626] font-bold text-[10px] ml-1 uppercase">FS</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-[#f43f5e] tracking-tight">
              Abbatimento Codici - DOIT VE
            </h1>
            <div className="flex items-center space-x-4 text-xs mt-0.5">
              <span className="text-white font-bold text-sm">ABBA.CO</span>
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

      {/* Empty State Banner if 0 records */}
      {abbaco.length === 0 && (
        <div className="bg-[#1c1f26] border-l-4 border-amber-400 p-2.5 rounded border border-[#2e323b] flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block">Web App non alimentata (0 rallentamenti)</span>
              <span className="text-[11px] text-slate-400">
                Alimenta la web app con il file <strong className="text-amber-400 font-mono">ABBA.CO</strong> oppure carica i dati demo.
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

      {/* Upper Two-Column Layout exactly matching Screenshot 8 */}
      <div className="grid grid-cols-12 gap-3 items-stretch">
        {/* Left Side: Slicers & Charts (55% width) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col space-y-2.5">
          {/* Row 1: Divisione, Unità Manutentiva, Num. Rallentamenti */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col justify-between shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Divisione</span>
              <div className="grid grid-cols-2 gap-1.5">
                {['VEM1', 'VEM2'].map(div => {
                  const isSelected = selectedDivisioni.includes(div);
                  return (
                    <button
                      key={div}
                      onClick={() => toggleSelection(selectedDivisioni, setSelectedDivisioni, div)}
                      className={`py-1 text-center font-bold rounded-xs border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow'
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
                      className={`py-1 text-center font-bold rounded-xs border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow'
                          : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                      }`}
                    >
                      {lvu}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Num. Rallentamenti KPI Card (Large amber number) */}
            <div className="col-span-3 bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Num. Rallentamenti</span>
              <span className="text-3xl font-black text-[#fbbf24] font-mono leading-none mt-1">
                {filtered.length}
              </span>
            </div>
          </div>

          {/* Row 2: Linea Slicer (Multi-Select buttons) */}
          <div className="bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1 block">Linea</span>
            <div className="grid grid-cols-3 gap-1.5">
              {lineeDisponibili.map(linea => {
                const isSelected = selectedLinee.includes(linea);
                return (
                  <button
                    key={linea}
                    onClick={() => toggleSelection(selectedLinee, setSelectedLinee, linea)}
                    className={`py-1 text-center font-bold rounded-xs border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow'
                        : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                    }`}
                  >
                    {linea}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Scadenza Avviso / Binario Slicer matching Screenshot 8 */}
          <div className="bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] shadow-sm text-xs">
            <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1 block">Scadenza Avviso / Tipo Binario</span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
              {['D', 'D (marciaDX)', 'D (marciaSX)', 'P', 'P (marciaDX)', 'P (marciaSX)'].map(bin => {
                const isSelected = selectedBinari.includes(bin);
                return (
                  <button
                    key={bin}
                    onClick={() => toggleSelection(selectedBinari, setSelectedBinari, bin)}
                    className={`py-1 text-center font-bold rounded-xs border text-[10.5px] cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow'
                        : 'bg-[#141518] border-[#383d47] text-[#94a3b8] hover:bg-[#25282e]'
                    }`}
                  >
                    {bin}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 4: Numero Rallentamenti Bar Chart matching Screenshot 8 */}
          <div className="bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] flex flex-col h-48 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[#94a3b8] mb-1">Numero Rallentamenti</span>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" stroke="#64748b" fontSize={9} hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#181a20', borderColor: '#3f4553', fontSize: '11px', color: '#fff' }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#fbbf24"
                    cursor="pointer"
                    label={{ position: 'right', fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
                    onClick={(entry) => toggleSelection(selectedLinee, setSelectedLinee, entry.name)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={selectedLinee.includes(entry.name) ? '#f59e0b' : '#d97706'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Side: Map Canvas taking entire Upper Right Quadrant (Matching Screenshot 8) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col bg-[#1c1f26] p-2 rounded-md border border-[#2e333d] shadow-sm relative min-h-[380px] lg:min-h-full">
          <div className="flex items-center justify-between pb-1.5 px-1 border-b border-[#2e333d] mb-1.5">
            <div className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-white">Mappa Rallentamenti ABBA.CO</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-[#141518] px-2 py-0.5 rounded border border-[#374151]">
              ESRI Dark • Open GIS
            </span>
          </div>

          <div className="flex-1 w-full min-h-[340px] rounded overflow-hidden relative border border-[#2d323d]">
            <div ref={mapRef} className="w-full h-full" />

            {filtered.length === 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-400 bg-black/85 backdrop-blur-xs border border-[#3f4553] px-3.5 py-2 rounded text-[11px] text-slate-300 pointer-events-none text-center">
                <span>Tracciato Rete DOIT VE • In attesa di rallentamenti</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Area: Table spanning full width matching Screenshot 8 */}
      <div className="bg-[#1c1f26] rounded-md border border-[#2e333d] overflow-hidden flex flex-col flex-1 shadow-sm min-h-[220px]">
        <div className="px-3 py-1.5 bg-[#16181d] border-b border-[#2e333d] flex items-center justify-between text-xs shrink-0">
          <span className="font-bold text-white">
            Elenco Rallentamenti ABBA.CO ({filtered.length} righe)
          </span>
          <span className="text-[11px] text-[#94a3b8]">
            {selectedLinee.length > 0 ? `Linee: ${selectedLinee.join(', ')} • ` : ''}
            Tratte con riduzione di velocità attiva o pianificata
          </span>
        </div>

        <div className="overflow-auto flex-1 min-h-[200px] max-h-[calc(100vh-480px)] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141518] sticky top-0 border-b border-[#2e333d] text-[#94a3b8] text-[10.5px] uppercase font-semibold">
              <tr>
                <th className="py-2 px-2.5">Linea</th>
                <th className="py-2 px-2.5">Tratta</th>
                <th className="py-2 px-2.5">Chiave RL</th>
                <th className="py-2 px-2.5">Rid. Vel. (km/h)</th>
                <th className="py-2 px-2.5">Binario (P/D/L)</th>
                <th className="py-2 px-2.5">Inizio</th>
                <th className="py-2 px-2.5">Fine</th>
                <th className="py-2 px-2.5">Motivo</th>
                <th className="py-2 px-2.5">Data inizio</th>
                <th className="py-2 px-2.5">Titolare del rallentamento</th>
                <th className="py-2 px-2.5">Data pianificata</th>
                <th className="py-2 px-2.5">Data fine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252932] text-[11px] font-mono text-[#cbd5e1]">
              {filtered.map((row, idx) => (
                <tr key={`${row.chiave_rl}-${idx}`} className="hover:bg-[#20242e] transition-colors">
                  <td className="py-1.5 px-2.5 font-sans font-bold text-white">{row.linea}</td>
                  <td className="py-1.5 px-2.5 font-sans text-slate-200">{row.tratta}</td>
                  <td className="py-1.5 px-2.5 font-bold text-amber-400">{row.chiave_rl}</td>
                  <td className="py-1.5 px-2.5 text-red-400 font-bold">{row.rid_vel}</td>
                  <td className="py-1.5 px-2.5 text-slate-300">{row.binario}</td>
                  <td className="py-1.5 px-2.5 text-slate-300">{row.km_inizio}</td>
                  <td className="py-1.5 px-2.5 text-slate-300">{row.km_fine}</td>
                  <td className="py-1.5 px-2.5 font-sans text-slate-300 truncate max-w-[180px]">{row.motivo}</td>
                  <td className="py-1.5 px-2.5 text-slate-400">{row.data_inizio || '17/07/2026'}</td>
                  <td className="py-1.5 px-2.5 text-emerald-400 font-sans">{row.titolare}</td>
                  <td className="py-1.5 px-2.5 text-slate-400">{row.data_fine || '31/08/2026'}</td>
                  <td className="py-1.5 px-2.5 text-slate-400">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
