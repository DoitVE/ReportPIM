import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AbbacoItem, Avviso } from '../../types';
import { RotateCcw, AlertTriangle, Search, Clock, TrainTrack, Database, Upload, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import L from 'leaflet';
import railwayGeoJson from '../../data/railway_map.json';

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
  const [selectedLinea, setSelectedLinea] = useState<string>('ALL');
  const [selectedUM, setSelectedUM] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeBarFilter, setActiveBarFilter] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Linee list
  const lineeList = useMemo(() => {
    const s = new Set<string>();
    abbaco.forEach(item => { if (item.linea) s.add(item.linea); });
    return Array.from(s).sort();
  }, [abbaco]);

  const ums = ['LVU1', 'LVU2', 'LVU3', 'LVU4'];

  const handleResetFilters = () => {
    setSelectedLinea('ALL');
    setSelectedUM('ALL');
    setSearchTerm('');
    setActiveBarFilter(null);
  };

  // Filtered dataset
  const filtered = useMemo(() => {
    return abbaco.filter(item => {
      if (selectedLinea !== 'ALL' && item.linea !== selectedLinea) return false;
      if (selectedUM !== 'ALL' && item.titolare !== selectedUM) return false;
      if (activeBarFilter && item.linea !== activeBarFilter) return false;
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const text = `${item.linea} ${item.tratta} ${item.chiave_rl} ${item.motivo} ${item.titolare}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [abbaco, selectedLinea, selectedUM, activeBarFilter, searchTerm]);

  // Bar chart: Numero Chiavi per Linea
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    // Calculate from the current subset or all abbaco based on other filters
    const baseItems = abbaco.filter(item => {
      if (selectedUM !== 'ALL' && item.titolare !== selectedUM) return false;
      return true;
    });
    baseItems.forEach(item => {
      map[item.linea] = (map[item.linea] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [abbaco, selectedUM]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [45.45, 12.05],
        zoom: 9,
        zoomControl: true,
      });

      // Power BI Dark Theme Carto tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; CartoDB &copy; OpenStreetMap',
      }).addTo(map);

      // Add Railway vector line track overlay
      try {
        L.geoJSON(railwayGeoJson as any, {
          style: {
            color: '#475569',
            weight: 2,
            opacity: 0.6,
            dashArray: '4, 4',
          },
        }).addTo(map);
      } catch (e) {
        console.warn('Could not load railway geojson', e);
      }

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Keep instance for performance
    };
  }, []);

  // Update map markers when filtered items change
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    // Map locations for lines
    const lineCoordMap: Record<string, [number, number]> = {
      'Bologna-Padova': [45.28, 11.78],
      'Milano-Venezia SL': [45.48, 12.22],
      'Mestre-Treviso': [45.54, 12.24],
    };

    filtered.forEach((item, index) => {
      // Find matching coordinate from avvisi on this line or fallback
      const matched = avvisi.find(a => a.linea.includes(item.linea) || item.linea.includes(a.linea));
      const baseCoord = lineCoordMap[item.linea] || [45.42, 12.05];

      // Disperse markers along track
      const latOffset = (index % 5) * 0.02 - 0.04;
      const lngOffset = Math.floor(index / 5) * 0.025 - 0.02;

      const lat = matched ? matched.lat + (index % 3) * 0.005 : baseCoord[0] + latOffset;
      const lng = matched ? matched.lng + (index % 3) * 0.005 : baseCoord[1] + lngOffset;

      // Glow halo ring
      const halo = L.circleMarker([lat, lng], {
        radius: 13,
        fillColor: '#eab308',
        color: '#ca8a04',
        weight: 1,
        opacity: 0.6,
        fillOpacity: 0.25,
      });

      // Inner amber dot
      const marker = L.circleMarker([lat, lng], {
        radius: 7,
        fillColor: '#facc15',
        color: '#ffffff',
        weight: 2,
        opacity: 0.95,
        fillOpacity: 0.9,
      });

      const popupHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto; font-size: 11px; color: #f8fafc; min-width: 200px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #facc15; font-size: 12px;">⚠️ ABBA.CO</span>
            <span style="background: #eab30822; color: #facc15; border: 1px solid #eab308; padding: 1px 4px; border-radius: 2px; font-weight: bold; font-size: 10px;">${item.rid_vel}</span>
          </div>
          <div style="line-height: 1.5;">
            <div><strong>Linea:</strong> <span style="color: #38bdf8;">${item.linea}</span></div>
            <div><strong>Chiave RL:</strong> <span style="font-family: monospace; font-weight: bold; color: #fbbf24;">${item.chiave_rl}</span></div>
            <div><strong>Tratta:</strong> ${item.tratta}</div>
            <div><strong>Km:</strong> ${item.km_inizio} - ${item.km_fine} (Bin: ${item.binario})</div>
            <div><strong>Motivo:</strong> ${item.motivo}</div>
            <div><strong>Titolare:</strong> <span style="color: #4ade80; font-weight: bold;">${item.titolare}</span></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      markersLayerRef.current?.addLayer(halo);
      markersLayerRef.current?.addLayer(marker);
    });
  }, [filtered, avvisi]);

  return (
    <div className="bg-[#18191c] text-[#e2e8f0] min-h-[calc(100vh-6rem)] p-2.5 space-y-2.5 font-sans select-none">
      {/* Top Header Card */}
      <div className="bg-[#20232a] border border-[#2d323d] rounded p-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3.5">
          <img
            src="/rfi_logo.jpg"
            alt="RFI"
            className="h-9 w-auto object-contain rounded bg-white/5 p-0.5"
          />
          <div className="border-l border-[#374151] pl-3.5">
            <h1 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2">
              <span className="text-[#facc15]">ABBA.CO</span>
              <span className="text-slate-400 font-normal">|</span>
              <span className="text-white">Abbattimento Codici</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-[#facc15] border border-amber-500/20">
                DOIT VE
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Monitoraggio rallentamenti temporanei di linea per anomalie di armamento ferroviario
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick Search */}
          <div className="relative w-56">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cerca chiave, tratta o motivo..."
              className="w-full bg-[#18191c] border border-[#374151] text-xs text-white rounded pl-7 pr-2 py-1 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          </div>

          <button
            onClick={handleResetFilters}
            title="Ripristina tutti i filtri"
            className="flex items-center space-x-1.5 px-3 py-1 bg-[#282c35] hover:bg-[#323742] border border-[#3b4250] rounded text-xs font-medium text-slate-200 transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Ripristina Filtri</span>
          </button>
        </div>
      </div>

      {/* Compact Status Banner if Not Populated */}
      {abbaco.length === 0 && (
        <div className="bg-[#202227] border-l-4 border-amber-400 p-2.5 rounded border border-[#2e323b] flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded">
              <span className="font-mono font-black text-sm">20</span>
            </div>
            <div>
              <span className="font-bold text-white text-xs block">Visualizzazione ABBA.CO in attesa di alimentazione</span>
              <span className="text-[11px] text-slate-400">
                La mappa delle limitazioni di velocità è attiva sulla rete DOIT VE. Carica il file <strong className="text-amber-400 font-mono">ABBA.CO</strong> o avvia la demo.
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
                className="px-3 py-1 bg-[#25282e] hover:bg-[#2f333a] text-amber-300 border border-[#3f4553] font-semibold text-xs rounded transition-colors cursor-pointer"
              >
                Carica Demo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Left Filters/KPIs/Chart & Right Map */}
      <div className="grid grid-cols-12 gap-2.5">
        
        {/* Left Column (5 Cols) */}
        <div className="col-span-12 lg:col-span-5 space-y-2.5 flex flex-col">
          
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Dati aggiornati */}
            <div className="bg-[#20232a] border border-[#2d323d] rounded p-2 text-center flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-center space-x-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Dati aggiornati al:</span>
              </span>
              <span className="text-sm font-bold text-white font-mono mt-0.5">
                {dataAggiornamento}
              </span>
            </div>

            {/* N. chiavi - Exact Amber 20 KPI from Screenshot 9 */}
            <div className="bg-[#20232a] border border-[#2d323d] rounded p-2 text-center flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                N. chiavi
              </span>
              <span className="text-2xl font-black text-[#facc15] font-mono leading-tight tracking-tight">
                {filtered.length}
              </span>
            </div>
          </div>

          {/* Slicers Row */}
          <div className="bg-[#20232a] border border-[#2d323d] rounded p-2.5 space-y-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Filtri Rapidi
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">
                  U.M. Titolare
                </label>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedUM('ALL')}
                    className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                      selectedUM === 'ALL'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-[#18191c] text-slate-300 border border-[#374151] hover:border-slate-400'
                    }`}
                  >
                    Tutte
                  </button>
                  {ums.map(u => (
                    <button
                      key={u}
                      onClick={() => setSelectedUM(selectedUM === u ? 'ALL' : u)}
                      className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                        selectedUM === u
                          ? 'bg-amber-500 text-black font-bold'
                          : 'bg-[#18191c] text-slate-300 border border-[#374151] hover:border-slate-400'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">
                  Linea
                </label>
                <select
                  value={selectedLinea}
                  onChange={e => setSelectedLinea(e.target.value)}
                  className="w-full bg-[#18191c] border border-[#374151] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">Tutte le Linee ({lineeList.length})</option>
                  {lineeList.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bar Chart: Numero Chiavi per Linea (Screenshot 9) */}
          <div className="bg-[#20232a] border border-[#2d323d] rounded p-2.5 flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <TrainTrack className="w-3.5 h-3.5 text-amber-400" />
                <span>Numero Chiavi per Linea</span>
              </span>
              {activeBarFilter && (
                <button
                  onClick={() => setActiveBarFilter(null)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline"
                >
                  Rimuovi filtro linea
                </button>
              )}
            </div>
            
            <div className="flex-1 w-full min-h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 35, left: 15, bottom: 5 }}
                >
                  <XAxis type="number" stroke="#64748b" fontSize={10} domain={[0, 16]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    width={130}
                    tick={{ fill: '#cbd5e1' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e222b',
                      borderColor: '#374151',
                      fontSize: '11px',
                      borderRadius: '4px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: number) => [`${val} chiavi`, 'Totale']}
                  />
                  <Bar
                    dataKey="count"
                    cursor="pointer"
                    radius={[0, 3, 3, 0]}
                    onClick={(entry) =>
                      setActiveBarFilter(activeBarFilter === entry.name ? null : entry.name)
                    }
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={activeBarFilter === entry.name ? '#f59e0b' : '#eab308'}
                        opacity={activeBarFilter && activeBarFilter !== entry.name ? 0.4 : 1}
                      />
                    ))}
                    <LabelList dataKey="count" position="right" fill="#facc15" fontSize={11} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column: Leaflet Dark Map (7 Cols) */}
        <div className="col-span-12 lg:col-span-7 bg-[#20232a] border border-[#2d323d] rounded p-2 flex flex-col">
          <div className="flex items-center justify-between pb-1.5 px-2 border-b border-[#2d323d] mb-1">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200">
                Geolocalizzazione Rallentamenti ABBA.CO
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>Limitazione di Velocità</span>
              </span>
              <span>•</span>
              <span className="text-amber-400 font-mono font-semibold">{filtered.length} punti attivi</span>
            </div>
          </div>

          <div className="relative flex-1 min-h-[320px] lg:min-h-[400px] rounded overflow-hidden border border-[#2d323d]">
            <div ref={mapRef} className="w-full h-full" />

            {/* Empty indicator overlay on map */}
            {filtered.length === 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-[#18191c]/90 backdrop-blur-xs border border-[#3f4553] px-3 py-1.5 rounded text-[11px] text-slate-300 pointer-events-none text-center">
                <span>Tracciato Rete DOIT VE • In attesa di rallentamenti</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Table: Elenco Rallentamenti (Screenshot 9) */}
      <div className="bg-[#20232a] border border-[#2d323d] rounded shadow-md overflow-hidden">
        <div className="px-3 py-2 bg-[#1b1e25] border-b border-[#2d323d] flex items-center justify-between text-xs font-bold text-slate-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Elenco Rallentamenti ({filtered.length} record)</span>
          </div>
          <span className="text-[11px] font-normal text-slate-400">
            Ordinati per tratta e chilometrica
          </span>
        </div>

        <div className="overflow-x-auto max-h-72 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#181a20] sticky top-0 border-b border-[#2d323d] text-slate-400 text-[10.5px] uppercase tracking-wider font-semibold z-10">
              <tr>
                <th className="py-2 px-2.5">Linea</th>
                <th className="py-2 px-2.5">Tratta</th>
                <th className="py-2 px-2.5">Chiave RL</th>
                <th className="py-2 px-2.5">Rid. Vel.</th>
                <th className="py-2 px-2.5 text-center">Bin.</th>
                <th className="py-2 px-2.5">Inizio</th>
                <th className="py-2 px-2.5">Fine</th>
                <th className="py-2 px-2.5">Motivo</th>
                <th className="py-2 px-2.5">Data Inizio</th>
                <th className="py-2 px-2.5">Titolare</th>
                <th className="py-2 px-2.5">Data Pianificata</th>
                <th className="py-2 px-2.5">Data Fine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#282c35] text-slate-300">
              {filtered.map((item, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-[#282d38] transition-colors ${
                    idx % 2 === 0 ? 'bg-[#20232a]' : 'bg-[#1d2027]'
                  }`}
                >
                  <td className="py-1.5 px-2.5 font-bold text-white whitespace-nowrap">
                    {item.linea}
                  </td>
                  <td className="py-1.5 px-2.5 font-medium text-slate-200 whitespace-nowrap">
                    {item.tratta}
                  </td>
                  <td className="py-1.5 px-2.5 font-mono font-bold text-[#facc15] whitespace-nowrap">
                    {item.chiave_rl}
                  </td>
                  <td className="py-1.5 px-2.5 font-mono font-bold text-red-400 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/50">
                      {item.rid_vel}
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5 font-mono text-center font-bold text-slate-300">
                    {item.binario}
                  </td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-400 whitespace-nowrap">
                    {item.km_inizio}
                  </td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-400 whitespace-nowrap">
                    {item.km_fine}
                  </td>
                  <td className="py-1.5 px-2.5 max-w-xs truncate text-slate-300" title={item.motivo}>
                    {item.motivo}
                  </td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-400 whitespace-nowrap">
                    {item.data_inizio || '01/01/2024'}
                  </td>
                  <td className="py-1.5 px-2.5 font-mono text-emerald-400 font-bold">
                    {item.titolare}
                  </td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-400 whitespace-nowrap">
                    {item.data_fine || '30/06/2024'}
                  </td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-400 whitespace-nowrap">
                    {'-'}
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
