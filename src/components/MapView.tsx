import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Avviso, AbbacoItem, PdmV5Item, Iw67Item } from '../types';
import { MapPin, Filter, Layers, AlertTriangle, TrainTrack, RefreshCw, Database } from 'lucide-react';
import L from 'leaflet';
import railwayGeoJson from '../data/railway_map.json';

interface MapViewProps {
  pdmList: PdmV5Item[];
  avvisi: Avviso[];
  abbaco: AbbacoItem[];
  iw67: Iw67Item[];
  dataAggiornamento: string;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  pdmList,
  avvisi,
  abbaco,
  iw67,
  dataAggiornamento,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Filters
  const [selectedLinea, setSelectedLinea] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'V5' | 'V3V4' | 'SCADUTI' | 'ABBACO'>('ALL');

  // Available lines
  const linee = useMemo(() => {
    const s = new Set<string>();
    pdmList.forEach(p => { if (p.linea) s.add(p.linea); });
    abbaco.forEach(a => { if (a.linea) s.add(a.linea); });
    avvisi.forEach(a => { if (a.linea) s.add(a.linea); });
    return Array.from(s).sort();
  }, [pdmList, abbaco, avvisi]);

  // Total records across categories
  const totalCount = pdmList.length + avvisi.length + abbaco.length + iw67.length;

  // Initialize Map with dark tiles and railway tracks
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // DOIT Venezia center (Mestre / Padova territory)
      const map = L.map(mapContainerRef.current, {
        center: [45.48, 12.15],
        zoom: 9,
        maxZoom: 18,
        minZoom: 7,
      });

      // CartoDB Dark Matter tile layer for Power BI dark theme
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Add Railway Vector Tracks overlay
      try {
        L.geoJSON(railwayGeoJson as any, {
          style: {
            color: '#64748b',
            weight: 2,
            opacity: 0.6,
            dashArray: '3, 4',
          },
        }).addTo(map);
      } catch (e) {
        console.warn('GeoJSON render error:', e);
      }

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;

      // Invalidate size to ensure full tile rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }
  }, []);

  // Update Markers based on datasets & filters
  useEffect(() => {
    const layerGroup = layerGroupRef.current;
    if (!layerGroup || !mapInstanceRef.current) return;
    layerGroup.clearLayers();

    // 1. Plot Pdm V5 points
    if (filterType === 'ALL' || filterType === 'V5' || filterType === 'SCADUTI') {
      pdmList.forEach(p => {
        if (!p.lat || !p.lng) return;
        if (selectedLinea !== 'ALL' && p.linea !== selectedLinea) return false;
        if (filterType === 'SCADUTI' && p.scadenza !== 'SCADUTO') return false;

        let color = '#3b82f6'; // default blue
        let radius = 6;
        if (p.classe === 'A' || p.scadenza === 'SCADUTO') {
          color = '#ef4444'; // Red
          radius = 8;
        } else if (p.classe === 'B') {
          color = '#f59e0b'; // Amber
          radius = 7;
        } else if (p.classe?.startsWith('C')) {
          color = '#eab308'; // Yellow
          radius = 6;
        } else if (p.scadenza === 'COMPLETATO' || p.tolto_dop === 'S') {
          color = '#10b981'; // Green
          radius = 5;
        }

        const marker = L.circleMarker([p.lat, p.lng], {
          radius,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 0.9,
          fillOpacity: 0.85,
        });

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 11px; color: #f8fafc; padding: 2px; min-width: 190px;">
            <div style="font-weight: 700; font-size: 12px; color: #fbbf24; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 4px;">
              🔍 PdM ${p.pdm} • Classe ${p.classe}
            </div>
            <div><strong>Linea:</strong> <span style="color: #38bdf8;">${p.linea}</span></div>
            <div><strong>Località:</strong> ${p.localita_tratta}</div>
            <div><strong>Sede:</strong> <span style="font-family: monospace;">${p.sede_tecnica}</span></div>
            <div><strong>Km:</strong> ${p.km_linea}</div>
            <div><strong>Difetto:</strong> ${p.tipo_difetto} (${p.pos_difetto})</div>
            <div><strong>Avviso:</strong> <span style="color: #67e8f9; font-family: monospace;">${p.avviso || '-'}</span></div>
            <div><strong>Scadenza:</strong> <span style="font-weight: bold; color: ${p.scadenza === 'SCADUTO' ? '#f87171' : '#4ade80'};">${p.scadenza}</span></div>
          </div>
        `);

        layerGroup.addLayer(marker);
      });
    }

    // 2. Plot ABBA.CO speed restrictions
    if (filterType === 'ALL' || filterType === 'ABBACO') {
      abbaco.forEach(ab => {
        if (selectedLinea !== 'ALL' && ab.linea !== selectedLinea) return;

        const matched = pdmList.find(p => p.linea === ab.linea) || avvisi.find(a => a.linea === ab.linea);
        const lat = matched?.lat ? matched.lat + 0.006 : 45.45;
        const lng = matched?.lng ? matched.lng + 0.006 : 12.10;

        const halo = L.circleMarker([lat, lng], {
          radius: 13,
          fillColor: '#f59e0b',
          color: '#d97706',
          weight: 1.5,
          opacity: 0.7,
          fillOpacity: 0.25,
        });

        const abMarker = L.circleMarker([lat, lng], {
          radius: 7,
          fillColor: '#facc15',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.95,
        });

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; font-size: 11px; color: #f8fafc; padding: 2px;">
            <div style="font-weight: 700; color: #facc15; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 4px;">
              ⚠️ Rallentamento ABBA.CO: ${ab.chiave_rl}
            </div>
            <div><strong>Linea:</strong> ${ab.linea}</div>
            <div><strong>Tratta:</strong> ${ab.tratta}</div>
            <div><strong>Progressiva Km:</strong> ${ab.km_inizio} - ${ab.km_fine}</div>
            <div><strong>Velocità:</strong> <span style="font-weight: 700; color: #f87171;">${ab.rid_vel}</span></div>
            <div><strong>Motivo:</strong> ${ab.motivo}</div>
            <div><strong>Titolare:</strong> <span style="color: #4ade80;">${ab.titolare}</span></div>
          </div>
        `;

        halo.bindPopup(popupContent);
        abMarker.bindPopup(popupContent);
        layerGroup.addLayer(halo);
        layerGroup.addLayer(abMarker);
      });
    }

    // Invalidate size once after markers updated
    mapInstanceRef.current?.invalidateSize();
  }, [pdmList, avvisi, abbaco, filterType, selectedLinea]);

  return (
    <div className="bg-[#18191c] text-[#e2e8f0] min-h-[calc(100vh-6rem)] p-3 space-y-2.5 font-sans select-none">
      {/* Header & Controls Bar */}
      <div className="bg-[#20232a] border border-[#2d323d] rounded p-3 shadow flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <img
            src="/rfi_logo.jpg"
            alt="RFI"
            className="h-9 w-auto object-contain rounded bg-white/5 p-0.5"
          />
          <div className="border-l border-[#374151] pl-3">
            <div className="flex items-center space-x-2">
              <span className="p-1 bg-cyan-950 border border-cyan-800 rounded text-cyan-400">
                <MapPin className="w-4 h-4" />
              </span>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Mappa Georeferenziata Difetti di Rete DOIT VE
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-cyan-300 border border-blue-500/20 font-mono">
                GIS Dark Canvas
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Geolocalizzazione satellitare e vettoriale dei difetti di binario, scartamento, misure carrello e rallentamenti
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Quick Filter Buttons */}
          <div className="bg-[#18191c] border border-[#374151] rounded p-0.5 flex space-x-0.5">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterType === 'ALL'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setFilterType('V5')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterType === 'V5'
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              V5 (PdM)
            </button>
            <button
              onClick={() => setFilterType('SCADUTI')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterType === 'SCADUTI'
                  ? 'bg-red-700 text-white font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Scaduti
            </button>
            <button
              onClick={() => setFilterType('ABBACO')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterType === 'ABBACO'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Rallentamenti
            </button>
          </div>

          {/* Line Selector */}
          <select
            value={selectedLinea}
            onChange={(e) => setSelectedLinea(e.target.value)}
            className="bg-[#18191c] border border-[#374151] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">Tutte le Linee ({linee.length})</option>
            {linee.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative bg-[#20232a] border border-[#2d323d] rounded shadow-xl h-[640px] overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Empty State Overlay if 0 Records */}
        {totalCount === 0 && (
          <div className="absolute inset-0 z-400 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3 pointer-events-auto">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
              <Database className="w-8 h-8" />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold text-white">Mappa Pronta in Attesa di Dati</h3>
              <p className="text-xs text-slate-300 mt-1">
                La mappa vettoriale della rete ferroviaria DOIT VE è attiva. Alimenta la web app con i file SAP o carica il dataset dimostrativo per vedere i punti georeferenziati sui binari.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-1">
              {onOpenFileLoader && (
                <button
                  onClick={onOpenFileLoader}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded shadow cursor-pointer"
                >
                  Alimenta con File SAP
                </button>
              )}
              {onLoadDemoData && (
                <button
                  onClick={onLoadDemoData}
                  className="px-3.5 py-1.5 bg-[#25282e] hover:bg-[#2f333a] border border-[#3f4553] text-amber-300 font-semibold text-xs rounded cursor-pointer flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Carica Dati Demo</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floating Legend */}
        <div className="absolute bottom-4 left-4 z-400 bg-[#181a20]/90 backdrop-blur-xs border border-[#2d323d] rounded p-2.5 shadow-lg text-xs space-y-1.5 pointer-events-auto">
          <div className="font-bold text-white text-[11px] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Legenda Mappa Ferroviaria</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500 border border-white"></span>
            <span className="text-slate-300 text-[11px]">Classe A / Scaduto (Priorità Alta)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white"></span>
            <span className="text-slate-300 text-[11px]">Classe B / In scadenza</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-yellow-400 border border-white"></span>
            <span className="text-slate-300 text-[11px]">Classe C1 / C2</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-yellow-200"></span>
            <span className="text-slate-300 text-[11px]">Rallentamento Linea (ABBA.CO)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-6 h-0.5 bg-slate-400 inline-block border-t border-dashed border-slate-300"></span>
            <span className="text-slate-300 text-[11px]">Tracciato Binari Vettoriali</span>
          </div>
          <div className="pt-1 border-t border-[#2d323d] text-[10px] text-slate-400 font-mono">
            Dati aggiornati al: {dataAggiornamento}
          </div>
        </div>
      </div>
    </div>
  );
};
