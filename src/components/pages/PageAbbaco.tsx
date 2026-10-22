import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AbbacoItem, Avviso } from '../../types';
import { RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import L from 'leaflet';

interface PageAbbacoProps {
  abbaco: AbbacoItem[];
  avvisi: Avviso[];
  dataAggiornamento: string;
}

export const PageAbbaco: React.FC<PageAbbacoProps> = ({
  abbaco,
  avvisi,
  dataAggiornamento,
}) => {
  const [selectedLinea, setSelectedLinea] = useState<string>('ALL');
  const [selectedUM, setSelectedUM] = useState<string>('ALL');
  const [activeBarFilter, setActiveBarFilter] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const linee = useMemo(() => {
    const s = new Set<string>();
    abbaco.forEach(item => { if (item.linea) s.add(item.linea); });
    return Array.from(s).sort();
  }, [abbaco]);

  const ums = ['LVU1', 'LVU2', 'LVU3', 'LVU4'];

  const handleResetFilters = () => {
    setSelectedLinea('ALL');
    setSelectedUM('ALL');
    setActiveBarFilter(null);
  };

  const filtered = useMemo(() => {
    return abbaco.filter(item => {
      if (selectedLinea !== 'ALL' && item.linea !== selectedLinea) return false;
      if (selectedUM !== 'ALL' && item.titolare !== selectedUM) return false;
      if (activeBarFilter && item.linea !== activeBarFilter) return false;
      return true;
    });
  }, [abbaco, selectedLinea, selectedUM, activeBarFilter]);

  // Chart data
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(item => {
      map[item.linea] = (map[item.linea] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [filtered]);

  // Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, { center: [45.55, 12.15], zoom: 9 });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, []);

  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    filtered.forEach(item => {
      // Find matching coordinate from avvisi on this line
      const matched = avvisi.find(a => a.linea.includes(item.linea) || item.linea.includes(a.linea));
      const lat = matched ? matched.lat : 45.45 + (item.linea.length % 5) * 0.05;
      const lng = matched ? matched.lng : 12.10 + (item.linea.length % 7) * 0.05;

      const marker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: '#d97706',
        color: '#78350f',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.85,
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #1e293b;">
          <strong style="color: #d97706; font-size: 13px;">⚠️ Rallentamento ABBA.CO</strong><br/>
          <strong>Linea:</strong> ${item.linea}<br/>
          <strong>Chiave RL:</strong> <span style="font-weight: bold; font-family: monospace;">${item.chiave_rl}</span><br/>
          <strong>Riduzione:</strong> <span style="color: #b91c1c; font-weight: bold;">${item.rid_vel}</span><br/>
          <strong>Tratta:</strong> ${item.tratta}<br/>
          <strong>Km:</strong> ${item.km_inizio} - ${item.km_fine}<br/>
          <strong>Motivo:</strong> ${item.motivo}<br/>
          <strong>Titolare:</strong> ${item.titolare}
        </div>
      `);
      markersLayerRef.current?.addLayer(marker);
    });
  }, [filtered, avvisi]);

  return (
    <div className="bg-[#f0f2f5] p-3 text-slate-800 space-y-3 font-sans">
      <div className="grid grid-cols-12 gap-2.5">
        
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-6 space-y-2">
          
          {/* Header Title */}
          <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/rfi_logo.jpg" alt="RFI" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="text-xl font-bold text-[#D90000] tracking-tight leading-tight">
                  ABBA.CO - DOIT VE
                </h1>
                <p className="text-xs font-bold text-[#006666]">
                  Abbatimento Codici
                </p>
              </div>
            </div>

            <button
              onClick={handleResetFilters}
              title="Cancella tutti i filtri dei dati in questa pagina"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Ripristina Filtri</span>
            </button>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs text-center flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Dati aggiornati al:</span>
              <span className="text-sm font-bold text-slate-800 font-mono mt-0.5">{dataAggiornamento}</span>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs text-center flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">N. chiavi</span>
              <span className="text-2xl font-bold text-[#d97706] font-mono leading-tight">
                {filtered.length}
              </span>
            </div>
          </div>

          {/* Slicers */}
          <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Linee</label>
              <select
                value={selectedLinea}
                onChange={e => setSelectedLinea(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutte le Linee ({linee.length})</option>
                {linee.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">U.M. Titolare</label>
              <select
                value={selectedUM}
                onChange={e => setSelectedUM(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutte</option>
                {ums.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Clustered Bar Chart: Numero Chiavi per Linea */}
          <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">Numero Chiavi per Linea</span>
              {activeBarFilter && (
                <button onClick={() => setActiveBarFilter(null)} className="text-[10px] text-red-600 underline">
                  Rimuovi filtro barra
                </button>
              )}
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 15, left: -10, bottom: 25 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '11px', borderRadius: '4px' }} />
                  <Bar
                    dataKey="count"
                    cursor="pointer"
                    onClick={(d) => setActiveBarFilter(activeBarFilter === d.name ? null : d.name)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={activeBarFilter === entry.name ? '#b45309' : '#d97706'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column: Map */}
        <div className="col-span-12 lg:col-span-6 bg-white p-2 rounded border border-slate-300 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-1.5 px-2 border-b border-slate-200 mb-1">
            <span className="text-xs font-bold text-slate-800">Geolocalizzazione Rallentamenti ABBA.CO</span>
            <span className="text-[10px] text-amber-700 font-mono font-semibold">Limitazioni di Velocità</span>
          </div>
          <div className="relative flex-1 min-h-[380px] lg:min-h-[460px] rounded overflow-hidden">
            <div ref={mapRef} className="w-full h-full" />
          </div>
        </div>

      </div>

      {/* TableEx */}
      <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Elenco Rallentamenti di Linea ({filtered.length} record)</span>
        </div>
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 text-[11px] uppercase">
              <tr>
                <th className="py-2 px-2.5">Linea</th>
                <th className="py-2 px-2.5">Tratta Descrizione</th>
                <th className="py-2 px-2.5">Chiave RL</th>
                <th className="py-2 px-2.5">Rid. Vel.</th>
                <th className="py-2 px-2.5">Bin.</th>
                <th className="py-2 px-2.5">Inizio</th>
                <th className="py-2 px-2.5">Fine</th>
                <th className="py-2 px-2.5">Motivo</th>
                <th className="py-2 px-2.5">Titolare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2.5 font-bold text-slate-900">{item.linea}</td>
                  <td className="py-1.5 px-2.5 font-medium text-slate-800">{item.tratta}</td>
                  <td className="py-1.5 px-2.5 font-mono font-bold text-amber-700">{item.chiave_rl}</td>
                  <td className="py-1.5 px-2.5 font-mono font-bold text-red-600">{item.rid_vel}</td>
                  <td className="py-1.5 px-2.5 font-mono text-center font-bold text-slate-800">{item.binario}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item.km_inizio}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item.km_fine}</td>
                  <td className="py-1.5 px-2.5 max-w-sm truncate" title={item.motivo}>{item.motivo}</td>
                  <td className="py-1.5 px-2.5 font-mono text-emerald-700 font-semibold">{item.titolare}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
