import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Iw67Item, Avviso, PowerBiSectionId } from '../../types';
import { RotateCcw, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import L from 'leaflet';
import { rfiTracksGeoJson } from '../../data/gpsService';

interface PageAnalisiFrequenzaProps {
  iw67: Iw67Item[];
  avvisi: Avviso[];
  dataAggiornamento: string;
  onNavigateToDrill: () => void;
}

export const PageAnalisiFrequenza: React.FC<PageAnalisiFrequenzaProps> = ({
  iw67,
  avvisi,
  dataAggiornamento,
  onNavigateToDrill,
}) => {
  const [selectedAnno, setSelectedAnno] = useState<string>('ALL');
  const [selectedTipo, setSelectedTipo] = useState<string>('ALL');
  const [selectedLinea, setSelectedLinea] = useState<string>('ALL');
  const [selectedUM, setSelectedUM] = useState<string>('ALL');
  const [activeBinFilter, setActiveBinFilter] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

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
    setSelectedTipo('ALL');
    setSelectedLinea('ALL');
    setSelectedUM('ALL');
    setActiveBinFilter(null);
  };

  const filtered = useMemo(() => {
    return iw67.filter(item => {
      const yr = (item.Data || '').split('.')[2];
      if (selectedAnno !== 'ALL' && yr !== selectedAnno) return false;
      if (selectedTipo !== 'ALL' && item['Tp.'] !== selectedTipo) return false;
      if (selectedUM !== 'ALL' && item.CLavResp !== selectedUM) return false;
      if (selectedLinea !== 'ALL' && !item['Definizione della sede tecnica']?.includes(selectedLinea)) return false;
      if (activeBinFilter && !item['Definizione della sede tecnica']?.includes(activeBinFilter)) return false;
      return true;
    });
  }, [iw67, selectedAnno, selectedTipo, selectedUM, selectedLinea, activeBinFilter]);

  // Chart data: Distribution by Binario (Pari / Dispari / Unico)
  const chartData = useMemo(() => {
    let pCount = 0;
    let dCount = 0;
    let otherCount = 0;
    filtered.forEach(item => {
      const def = (item['Definizione della sede tecnica'] || '').toLowerCase();
      if (def.includes('pari')) pCount++;
      else if (def.includes('dispari')) dCount++;
      else otherCount++;
    });
    return [
      { name: 'Binario Pari', count: pCount },
      { name: 'Binario Dispari', count: dCount },
      { name: 'Binario Unico / Altro', count: otherCount }
    ];
  }, [filtered]);

  // Map
  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, { center: [45.55, 12.15], zoom: 9 });
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
      }).addTo(map);

      let trackBounds: L.LatLngBounds | null = null;
      try {
        const geoLayer = L.geoJSON(rfiTracksGeoJson as any, {
          style: () => ({ color: '#cbd5e1', weight: 1.8, opacity: 0.8 }),
        }).addTo(map);
        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
          trackBounds = bounds;
          map.fitBounds(bounds, { padding: [12, 12] });
        }
      } catch (e) {
        console.warn('GeoJSON render error:', e);
      }

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
        if (trackBounds && trackBounds.isValid()) {
          map.fitBounds(trackBounds, { padding: [12, 12] });
        }
      }, 200);
    }
  }, []);

  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    const locMap: Record<string, { lat: number; lng: number; count: number; name: string }> = {};
    filtered.slice(0, 500).forEach(item => {
      const matched = avvisi.find(a => a.sede_tecnica.startsWith(item['Sede tecnica']?.slice(0, 6)));
      const lat = matched ? matched.lat : 45.45 + (parseInt(item.Avviso || '0') % 50) * 0.005;
      const lng = matched ? matched.lng : 12.10 + (parseInt(item.Avviso || '0') % 40) * 0.005;
      const key = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
      if (!locMap[key]) locMap[key] = { lat, lng, count: 0, name: item['Definizione della sede tecnica'] || 'Tratta VEM' };
      locMap[key].count += 1;
    });

    Object.values(locMap).forEach(loc => {
      const radius = Math.min(Math.max(loc.count * 0.5 + 4, 4), 22);
      const marker = L.circleMarker([loc.lat, loc.lng], {
        radius,
        fillColor: '#9333ea',
        color: '#581c87',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.75,
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #1e293b;">
          <strong style="color: #9333ea; font-size: 13px;">${loc.name}</strong><br/>
          <strong>Densità Difetti:</strong> <span style="font-weight: bold; color: #D90000;">${loc.count}</span>
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
                  Frequenza V3 e V4 - DOIT VE
                </h1>
                <p className="text-xs font-bold text-[#006666]">
                  Difetti di Livello e Difetti Scartamento
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleResetFilters}
                title="Cancella tutti i filtri dei dati in questa pagina"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Ripristina Filtri</span>
              </button>
              <button
                onClick={onNavigateToDrill}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded text-xs font-semibold shadow-2xs transition-colors"
              >
                <span>Drill Frequenza</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs text-center flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Dati aggiornati al:</span>
              <span className="text-sm font-bold text-slate-800 font-mono mt-0.5">{dataAggiornamento}</span>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs text-center flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">N. difetti</span>
              <span className="text-2xl font-bold text-[#9333ea] font-mono leading-tight">
                {filtered.length.toLocaleString('it-IT')}
              </span>
            </div>
          </div>

          {/* Slicers */}
          <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Anno Avviso</label>
              <select
                value={selectedAnno}
                onChange={e => setSelectedAnno(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutti</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tipo Avviso</label>
              <select
                value={selectedTipo}
                onChange={e => setSelectedTipo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">Tutti (V3/V4)</option>
                <option value="V3">V3</option>
                <option value="V4">V4</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">U.M. / Reparto</label>
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

          {/* Chart: Numero Difetti per Binario */}
          <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">Numero Difetti per Binario</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 15, left: -10, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '11px', borderRadius: '4px' }} />
                  <Bar dataKey="count" fill="#9333ea" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column: Map */}
        <div className="col-span-12 lg:col-span-6 bg-white p-2 rounded border border-slate-300 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-1.5 px-2 border-b border-slate-200 mb-1">
            <span className="text-xs font-bold text-slate-800">Geolocalizzazione Frequenza e Punti Caldi</span>
            <span className="text-[10px] text-purple-700 font-mono font-semibold">Densità Segnalazioni</span>
          </div>
          <div className="relative flex-1 min-h-[380px] lg:min-h-[460px] rounded overflow-hidden">
            <div ref={mapRef} className="w-full h-full" />
          </div>
        </div>

      </div>

      {/* TableEx */}
      <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Elenco Frequenza Difetti ({filtered.length.toLocaleString('it-IT')} record)</span>
        </div>
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 text-[11px] uppercase">
              <tr>
                <th className="py-2 px-2.5">Sede Tecnica</th>
                <th className="py-2 px-2.5">Definizione Tratta</th>
                <th className="py-2 px-2.5">Tp.</th>
                <th className="py-2 px-2.5">Codice Misura</th>
                <th className="py-2 px-2.5">Descrizione</th>
                <th className="py-2 px-2.5">Data Rilievo</th>
                <th className="py-2 px-2.5">CLavResp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.slice(0, 50).map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2.5 font-mono text-slate-900 font-bold">{item['Sede tecnica']}</td>
                  <td className="py-1.5 px-2.5 font-medium text-slate-800 max-w-sm truncate">{item['Definizione della sede tecnica']}</td>
                  <td className="py-1.5 px-2.5 font-mono text-purple-700 font-semibold">{item['Tp.']}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item.Codice}</td>
                  <td className="py-1.5 px-2.5 text-slate-800 max-w-xs truncate">{item['Testo codice per misura']}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item.Data}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{item.CLavResp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
