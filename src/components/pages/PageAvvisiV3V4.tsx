import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Iw67Item, Avviso } from '../../types';
import { RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import L from 'leaflet';

interface PageAvvisiV3V4Props {
  iw67: Iw67Item[];
  avvisi: Avviso[];
  dataAggiornamento: string;
}

export const PageAvvisiV3V4: React.FC<PageAvvisiV3V4Props> = ({
  iw67,
  avvisi,
  dataAggiornamento,
}) => {
  // Slicers
  const [selectedAnno, setSelectedAnno] = useState<string>('ALL');
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>('ALL');
  const [selectedDivisione, setSelectedDivisione] = useState<string>('ALL');
  const [selectedUM, setSelectedUM] = useState<string>('ALL');
  const [selectedTipoAvviso, setSelectedTipoAvviso] = useState<string>('ALL');
  const [selectedLinea, setSelectedLinea] = useState<string>('ALL');
  const [selectedStato, setSelectedStato] = useState<string>('ALL');
  const [activeBarFilter, setActiveBarFilter] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Extract filter options from iw67
  const anni = useMemo(() => {
    const s = new Set<string>();
    iw67.forEach(item => {
      const d = item.Data || '';
      const yr = d.split('.')[2] || (d.length === 4 ? d : '');
      if (yr) s.add(yr);
    });
    return Array.from(s).sort().reverse();
  }, [iw67]);

  const tipiAvviso = ['V3', 'V4'];

  const linee = useMemo(() => {
    const s = new Set<string>();
    iw67.forEach(item => {
      const def = item['Definizione della sede tecnica'] || '';
      if (def) s.add(def.split('  ')[0].trim());
    });
    return Array.from(s).filter(Boolean).sort();
  }, [iw67]);

  const handleResetFilters = () => {
    setSelectedAnno('ALL');
    setSelectedTrimestre('ALL');
    setSelectedDivisione('ALL');
    setSelectedUM('ALL');
    setSelectedTipoAvviso('ALL');
    setSelectedLinea('ALL');
    setSelectedStato('ALL');
    setActiveBarFilter(null);
  };

  // Filtered dataset
  const filtered = useMemo(() => {
    return iw67.filter(item => {
      const yr = (item.Data || '').split('.')[2];
      if (selectedAnno !== 'ALL' && yr !== selectedAnno) return false;
      if (selectedTipoAvviso !== 'ALL' && item['Tp.'] !== selectedTipoAvviso) return false;
      if (selectedUM !== 'ALL' && item.CLavResp !== selectedUM) return false;
      if (selectedLinea !== 'ALL' && !item['Definizione della sede tecnica']?.includes(selectedLinea)) return false;
      if (activeBarFilter && !item['Testo codice per misura']?.includes(activeBarFilter)) return false;
      return true;
    });
  }, [iw67, selectedAnno, selectedTipoAvviso, selectedUM, selectedLinea, activeBarFilter]);

  // Chart data: by Testo codice per misura (e.g. Scartamento, Livello, Sghembo)
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(item => {
      const code = item['Testo codice per misura'] || item.Codice || 'Altro';
      map[code] = (map[code] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filtered]);

  // Map initialization
  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, { center: [45.55, 12.15], zoom: 9 });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, []);

  // Update Map
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // Map stations
    const locMap: Record<string, { lat: number; lng: number; count: number; name: string }> = {};
    filtered.slice(0, 600).forEach(item => {
      const matched = avvisi.find(a => a.sede_tecnica.startsWith(item['Sede tecnica']?.slice(0, 6)));
      const lat = matched ? matched.lat : 45.45 + (parseInt(item.Avviso || '0') % 50) * 0.005;
      const lng = matched ? matched.lng : 12.10 + (parseInt(item.Avviso || '0') % 40) * 0.005;
      const key = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
      if (!locMap[key]) locMap[key] = { lat, lng, count: 0, name: item['Definizione della sede tecnica'] || 'Tratta VEM' };
      locMap[key].count += 1;
    });

    Object.values(locMap).forEach(loc => {
      const radius = Math.min(Math.max(loc.count * 0.4 + 4, 4), 20);
      const marker = L.circleMarker([loc.lat, loc.lng], {
        radius,
        fillColor: '#0284c7',
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.75,
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #1e293b;">
          <strong style="color: #0284c7; font-size: 13px;">${loc.name}</strong><br/>
          <strong>Rilievi Diagnostici:</strong> <span style="font-weight: bold; color: #D90000;">${loc.count}</span>
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
                  Difetti di livello e scartamento - DOIT VE
                </h1>
                <p className="text-xs font-bold text-[#006666]">
                  Avvisi V3 e V4
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

          {/* KPI Cards */}
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
          <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Anno Avviso</label>
              <select
                value={selectedAnno}
                onChange={e => setSelectedAnno(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutti gli anni</option>
                {anni.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tipo Avviso</label>
              <select
                value={selectedTipoAvviso}
                onChange={e => setSelectedTipoAvviso(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutti (V3/V4)</option>
                {tipiAvviso.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">U.M. / CLavResp</label>
              <select
                value={selectedUM}
                onChange={e => setSelectedUM(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutte</option>
                <option value="LVU1">LVU1</option>
                <option value="LVU2">LVU2</option>
                <option value="LVU3">LVU3</option>
                <option value="LVU4">LVU4</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Linea InRete</label>
              <select
                value={selectedLinea}
                onChange={e => setSelectedLinea(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutte le Linee</option>
                {linee.slice(0, 15).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Clustered Bar Chart */}
          <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">Numero Difetti per Tipologia Misura</span>
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
                      <Cell key={`cell-${index}`} fill={activeBarFilter === entry.name ? '#0369a1' : '#0284c7'} />
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
            <span className="text-xs font-bold text-slate-800">Geolocalizzazione diffetti di binario V3 V4</span>
            <span className="text-[10px] text-slate-500 font-mono">Carrelli VEM1 / VEM2</span>
          </div>
          <div className="relative flex-1 min-h-[380px] lg:min-h-[460px] rounded overflow-hidden">
            <div ref={mapRef} className="w-full h-full" />
          </div>
        </div>

      </div>

      {/* TableEx */}
      <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Tabella Avvisi V3 / V4 ({filtered.length.toLocaleString('it-IT')} record)</span>
          <span className="text-[11px] text-slate-500">Visualizzazione prime 50 righe</span>
        </div>
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 text-[11px] uppercase">
              <tr>
                <th className="py-2 px-2.5">Avviso</th>
                <th className="py-2 px-2.5">Tipo</th>
                <th className="py-2 px-2.5">Definizione Sede</th>
                <th className="py-2 px-2.5">Codice Misura</th>
                <th className="py-2 px-2.5">Testo Codice</th>
                <th className="py-2 px-2.5">Testo per Misura</th>
                <th className="py-2 px-2.5">Data Rilievo</th>
                <th className="py-2 px-2.5">Fine Richiesta</th>
                <th className="py-2 px-2.5">CLavResp</th>
                <th className="py-2 px-2.5">Stato Sistema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.slice(0, 50).map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900">{item.Avviso}</td>
                  <td className="py-1.5 px-2.5 font-mono font-semibold text-blue-600">{item['Tp.']}</td>
                  <td className="py-1.5 px-2.5 font-medium text-slate-800 max-w-xs truncate" title={item['Definizione della sede tecnica']}>
                    {item['Definizione della sede tecnica']}
                  </td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item.Codice}</td>
                  <td className="py-1.5 px-2.5 font-medium text-slate-900">{item['Testo codice per misura']}</td>
                  <td className="py-1.5 px-2.5 text-slate-600 font-mono text-[11px]">{item['Testo per la misura']}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item.Data}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item['FineRich.'] || '-'}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item.CLavResp}</td>
                  <td className="py-1.5 px-2.5 font-mono text-[10px] text-slate-700">{item['St.sist.'] || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
