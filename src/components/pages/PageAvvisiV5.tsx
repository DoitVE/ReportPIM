import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Avviso } from '../../types';
import { RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import L from 'leaflet';

interface PageAvvisiV5Props {
  avvisi: Avviso[];
  dataAggiornamento: string;
}

export const PageAvvisiV5: React.FC<PageAvvisiV5Props> = ({
  avvisi,
  dataAggiornamento,
}) => {
  // Only V5 notifications
  const v5Avvisi = useMemo(() => avvisi.filter(a => a.tipo === 'V5'), [avvisi]);

  // Slicer States
  const [selectedDivisione, setSelectedDivisione] = useState<string>('ALL');
  const [selectedUM, setSelectedUM] = useState<string>('ALL');
  const [selectedTipo, setSelectedTipo] = useState<string>('ALL');
  const [selectedStato, setSelectedStato] = useState<string>('ALL');
  const [selectedScadenza, setSelectedScadenza] = useState<string>('ALL');
  const [selectedLinea, setSelectedLinea] = useState<string>('ALL');

  // Chart Cross-Filtering State
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  // Map Container Ref
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Options
  const divisioni = useMemo(() => {
    const s = new Set<string>();
    v5Avvisi.forEach(a => { if (a.divisione) s.add(a.divisione); });
    return Array.from(s).sort();
  }, [v5Avvisi]);

  const ums = useMemo(() => {
    const s = new Set<string>();
    v5Avvisi.forEach(a => { if (a.lvu) s.add(a.lvu); });
    return Array.from(s).sort();
  }, [v5Avvisi]);

  const tipi = useMemo(() => {
    const s = new Set<string>();
    v5Avvisi.forEach(a => { if (a.tipo_difetto) s.add(a.tipo_difetto); });
    return Array.from(s).sort();
  }, [v5Avvisi]);

  const stati = useMemo(() => {
    const s = new Set<string>();
    v5Avvisi.forEach(a => {
      a.stato_sistema.split(' ').forEach(st => { if (st.trim()) s.add(st.trim()); });
    });
    return Array.from(s).sort();
  }, [v5Avvisi]);

  const scadenze = ['Regolare', 'In scadenza', 'Scaduto'];

  const linee = useMemo(() => {
    const s = new Set<string>();
    v5Avvisi.forEach(a => { if (a.linea) s.add(a.linea); });
    return Array.from(s).sort();
  }, [v5Avvisi]);

  // Reset all filters button
  const handleResetFilters = () => {
    setSelectedDivisione('ALL');
    setSelectedUM('ALL');
    setSelectedTipo('ALL');
    setSelectedStato('ALL');
    setSelectedScadenza('ALL');
    setSelectedLinea('ALL');
    setActiveCategoryFilter(null);
  };

  // Filtered dataset
  const filtered = useMemo(() => {
    return v5Avvisi.filter(a => {
      if (selectedDivisione !== 'ALL' && a.divisione !== selectedDivisione) return false;
      if (selectedUM !== 'ALL' && a.lvu !== selectedUM) return false;
      if (selectedTipo !== 'ALL' && a.tipo_difetto !== selectedTipo) return false;
      if (selectedStato !== 'ALL' && !a.stato_sistema.includes(selectedStato)) return false;
      if (selectedScadenza !== 'ALL' && a.stato_scadenza !== selectedScadenza) return false;
      if (selectedLinea !== 'ALL' && a.linea !== selectedLinea) return false;
      if (activeCategoryFilter && a.tipo_difetto !== activeCategoryFilter) return false;
      return true;
    });
  }, [v5Avvisi, selectedDivisione, selectedUM, selectedTipo, selectedStato, selectedScadenza, selectedLinea, activeCategoryFilter]);

  // Chart data: by Tipo Difetto
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(a => {
      const k = a.tipo_difetto || 'Altro';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [filtered]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [45.55, 12.15],
        zoom: 9,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      const markers = L.layerGroup().addTo(map);
      markersLayerRef.current = markers;
      mapInstanceRef.current = map;
    }
  }, []);

  // Update Map Markers
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // Group by location to size circles like AzureMap in Power BI
    const locMap: Record<string, { lat: number; lng: number; count: number; name: string; sede: string }> = {};
    filtered.slice(0, 1000).forEach(a => {
      const key = `${a.lat.toFixed(3)}_${a.lng.toFixed(3)}`;
      if (!locMap[key]) {
        locMap[key] = { lat: a.lat, lng: a.lng, count: 0, name: a.nome_sede, sede: a.sede_tecnica };
      }
      locMap[key].count += 1;
    });

    Object.values(locMap).forEach(loc => {
      const radius = Math.min(Math.max(loc.count * 0.4 + 4, 4), 22);
      const marker = L.circleMarker([loc.lat, loc.lng], {
        radius,
        fillColor: '#006666',
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.75,
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #1e293b;">
          <strong style="color: #D90000; font-size: 13px;">${loc.name}</strong><br/>
          <span style="font-size: 10px; color: #64748b;">${loc.sede}</span><br/>
          <hr style="margin: 4px 0; border: none; border-top: 1px solid #e2e8f0;"/>
          <strong>N. Difetti:</strong> <span style="font-size: 13px; font-weight: bold; color: #006666;">${loc.count}</span>
        </div>
      `);
      markersLayerRef.current?.addLayer(marker);
    });
  }, [filtered]);

  return (
    <div className="bg-[#f0f2f5] p-3 text-slate-800 space-y-3 font-sans">
      {/* Top Section: Header, Slicers, KPI Cards, Map */}
      <div className="grid grid-cols-12 gap-2.5">
        
        {/* Left Column (Title, Cards, Slicers, Clustered Bar Chart) */}
        <div className="col-span-12 lg:col-span-6 space-y-2">
          
          {/* Top Title Bar + Logo */}
          <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/rfi_logo.jpg" alt="RFI" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="text-xl font-bold text-[#D90000] tracking-tight leading-tight">
                  Difetti di binario - DOIT VE
                </h1>
                <p className="text-xs font-bold text-[#006666]">
                  Avvisi V5 (A, B, S1, S2, C1, C2, C3, D)
                </p>
              </div>
            </div>

            {/* Action Button: Reset Filters Bookmark */}
            <button
              onClick={handleResetFilters}
              title="Cancella tutti i filtri dei dati in questa pagina"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Ripristina Filtri</span>
            </button>
          </div>

          {/* Cards Row: Dati aggiornati al: & N. difetti */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs text-center flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Dati aggiornati al:</span>
              <span className="text-sm font-bold text-slate-800 font-mono mt-0.5">{dataAggiornamento}</span>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs text-center flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">N. difetti</span>
              <span className="text-2xl font-bold text-[#D90000] font-mono leading-tight">
                {filtered.length.toLocaleString('it-IT')}
              </span>
            </div>
          </div>

          {/* Slicers Grid */}
          <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {/* Slicer Divisione */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Divisione</label>
              <select
                value={selectedDivisione}
                onChange={e => setSelectedDivisione(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutte</option>
                {divisioni.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Slicer U.M. */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">U.M.</label>
              <select
                value={selectedUM}
                onChange={e => setSelectedUM(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutte</option>
                {ums.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Slicer Tipo Difetto */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tipo Difetto</label>
              <select
                value={selectedTipo}
                onChange={e => setSelectedTipo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutti</option>
                {tipi.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Slicer Stato Sistema Avviso */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Stato Sistema</label>
              <select
                value={selectedStato}
                onChange={e => setSelectedStato(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutti</option>
                {stati.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>

            {/* Slicer Stato Scadenza */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Stato Scadenza</label>
              <select
                value={selectedScadenza}
                onChange={e => setSelectedScadenza(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutti</option>
                {scadenze.map(sc => <option key={sc} value={sc}>{sc}</option>)}
              </select>
            </div>

            {/* Slicer Linea InRete */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Linea InRete</label>
              <select
                value={selectedLinea}
                onChange={e => setSelectedLinea(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutte le Linee</option>
                {linee.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Clustered Bar Chart: Numero Difetti */}
          <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">Numero Difetti (Filtro Interattivo)</span>
              {activeCategoryFilter && (
                <button
                  onClick={() => setActiveCategoryFilter(null)}
                  className="text-[10px] text-red-600 font-semibold underline"
                >
                  Rimuovi filtro barra ({activeCategoryFilter})
                </button>
              )}
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 15, left: -10, bottom: 25 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" fontSize={9} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '11px', borderRadius: '4px' }}
                  />
                  <Bar
                    dataKey="count"
                    cursor="pointer"
                    onClick={(data) => {
                      if (activeCategoryFilter === data.name) setActiveCategoryFilter(null);
                      else setActiveCategoryFilter(data.name);
                    }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={activeCategoryFilter === entry.name ? '#b91c1c' : '#D90000'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column: Geolocalizzazione diffetti di binario Map */}
        <div className="col-span-12 lg:col-span-6 bg-white p-2 rounded border border-slate-300 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-1.5 px-2 border-b border-slate-200 mb-1">
            <span className="text-xs font-bold text-slate-800">Geolocalizzazione diffetti di binario</span>
            <span className="text-[10px] text-slate-500 font-mono">Territorio RFI Venezia</span>
          </div>
          <div className="relative flex-1 min-h-[380px] lg:min-h-[460px] rounded overflow-hidden">
            <div ref={mapRef} className="w-full h-full" />
          </div>
        </div>

      </div>

      {/* Bottom Section: TableEx (Full Width) */}
      <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Tabella Dettaglio Avvisi V5 ({filtered.length.toLocaleString('it-IT')} record)</span>
          <span className="text-[11px] text-slate-500">Visualizzazione prime 50 righe</span>
        </div>
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 text-[11px] uppercase">
              <tr>
                <th className="py-2 px-2.5">N. Avviso</th>
                <th className="py-2 px-2.5">Sede Tecnica</th>
                <th className="py-2 px-2.5">Località / Tratta</th>
                <th className="py-2 px-2.5">Linea</th>
                <th className="py-2 px-2.5">Tipo Difetto</th>
                <th className="py-2 px-2.5">Descrizione</th>
                <th className="py-2 px-2.5">Fine Richiesta</th>
                <th className="py-2 px-2.5">Stato Sistema</th>
                <th className="py-2 px-2.5">Scadenza</th>
                <th className="py-2 px-2.5">OdL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.slice(0, 50).map(a => (
                <tr key={a.avviso} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900">{a.avviso}</td>
                  <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-600">{a.sede_tecnica}</td>
                  <td className="py-1.5 px-2.5 font-semibold text-slate-800">{a.nome_sede}</td>
                  <td className="py-1.5 px-2.5">{a.linea}</td>
                  <td className="py-1.5 px-2.5 font-medium text-slate-800">{a.tipo_difetto}</td>
                  <td className="py-1.5 px-2.5 max-w-xs truncate" title={a.descrizione}>{a.descrizione}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{a.fine_richiesta || 'N/D'}</td>
                  <td className="py-1.5 px-2.5 font-mono text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300">
                      {a.stato_sistema}
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      a.stato_scadenza === 'Scaduto' ? 'bg-red-100 text-red-700' :
                      a.stato_scadenza === 'In scadenza' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {a.stato_scadenza}
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-800">
                    {a.ordine || '-'}
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
