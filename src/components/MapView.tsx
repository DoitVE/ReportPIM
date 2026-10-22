import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Avviso, AbbacoItem } from '../types';
import { MapPin, Filter, Layers, AlertTriangle, GitCommit, Activity } from 'lucide-react';
import L from 'leaflet';

interface MapViewProps {
  avvisi: Avviso[];
  abbaco: AbbacoItem[];
}

export const MapView: React.FC<MapViewProps> = ({ avvisi, abbaco }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Filters
  const [selectedLinea, setSelectedLinea] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'V5' | 'V3V4' | 'SCADUTI' | 'ABBACO'>('ALL');

  const linee = useMemo(() => {
    const s = new Set<string>();
    avvisi.forEach(a => { if (a.linea) s.add(a.linea); });
    return Array.from(s).sort();
  }, [avvisi]);

  // Filtered points to render
  const points = useMemo(() => {
    return avvisi.filter(a => {
      if (!a.lat || !a.lng) return false;
      if (selectedLinea !== 'ALL' && a.linea !== selectedLinea) return false;
      if (filterType === 'V5' && a.tipo !== 'V5') return false;
      if (filterType === 'V3V4' && a.tipo !== 'V3' && a.tipo !== 'V4') return false;
      if (filterType === 'SCADUTI' && a.stato_scadenza !== 'Scaduto') return false;
      return true;
    }).slice(0, 1000); // limit to 1000 for smooth vector canvas rendering
  }, [avvisi, selectedLinea, filterType]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // DOIT Venezia center (around Mestre / Padova: ~45.5N, 12.0E)
      const map = L.map(mapContainerRef.current, {
        center: [45.55, 12.15],
        zoom: 9,
        maxZoom: 18,
        minZoom: 7,
      });

      // CartoDB Dark Matter tile layer for slick engineering appearance
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup if needed
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const layerGroup = layerGroupRef.current;
    if (!layerGroup || !mapInstanceRef.current) return;

    layerGroup.clearLayers();

    // 1. Plot defect markers
    points.forEach(a => {
      let color = '#10b981'; // Green regular
      let radius = 6;
      if (a.stato_scadenza === 'Scaduto') {
        color = '#ef4444'; // Red
        radius = 7;
      } else if (a.stato_scadenza === 'In scadenza') {
        color = '#f59e0b'; // Amber
        radius = 6;
      } else if (a.tipo === 'V3' || a.tipo === 'V4') {
        color = '#06b6d4'; // Cyan
        radius = 5;
      }

      const marker = L.circleMarker([a.lat, a.lng], {
        radius,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.8,
      });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #1e293b; padding: 2px;">
          <div style="font-weight: 700; font-size: 13px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px;">
            ${a.nome_sede} <span style="font-size: 10px; color: #64748b; font-family: monospace;">(${a.sede_tecnica})</span>
          </div>
          <div style="margin-bottom: 4px;"><strong>Avviso SAP:</strong> <span style="font-family: monospace; color: #b91c1c;">${a.avviso} (${a.tipo})</span></div>
          <div style="margin-bottom: 4px;"><strong>Linea:</strong> ${a.linea}</div>
          <div style="margin-bottom: 4px;"><strong>Difetto:</strong> ${a.tipo_difetto}</div>
          <div style="margin-bottom: 4px; font-size: 11px; color: #475569;">${a.descrizione}</div>
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #e2e8f0; display: flex; justify-content: space-between;">
            <span><strong>Scadenza:</strong> ${a.fine_richiesta}</span>
            <span style="color: ${a.stato_scadenza === 'Scaduto' ? '#dc2626' : '#16a34a'}; font-weight: 600;">${a.stato_scadenza}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      layerGroup.addLayer(marker);
    });

    // 2. If ABBACO is selected or ALL, plot ABBA.CO speed restrictions
    if (filterType === 'ALL' || filterType === 'ABBACO') {
      abbaco.forEach(ab => {
        // find matched station coords from points or approximate
        const matched = avvisi.find(a => a.linea === ab.linea);
        if (matched && matched.lat && matched.lng) {
          const abMarker = L.circleMarker([matched.lat + 0.005, matched.lng + 0.005], {
            radius: 8,
            fillColor: '#f59e0b',
            color: '#78350f',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          });

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #1e293b; padding: 2px;">
              <div style="font-weight: 700; color: #b45309; border-bottom: 1px solid #fed7aa; padding-bottom: 4px; margin-bottom: 6px;">
                ⚠️ Rallentamento ABBA.CO: ${ab.chiave_rl}
              </div>
              <div style="margin-bottom: 4px;"><strong>Linea:</strong> ${ab.linea}</div>
              <div style="margin-bottom: 4px;"><strong>Tratta:</strong> ${ab.tratta}</div>
              <div style="margin-bottom: 4px;"><strong>Progressiva Km:</strong> ${ab.km_inizio} - ${ab.km_fine}</div>
              <div style="margin-bottom: 4px;"><strong>Velocità Ammessa:</strong> <span style="font-weight: 700; color: #b45309;">${ab.rid_vel}</span></div>
              <div style="margin-bottom: 4px;"><strong>Motivo:</strong> ${ab.motivo}</div>
              <div style="margin-top: 4px;"><strong>Titolare:</strong> ${ab.titolare}</div>
            </div>
          `;

          abMarker.bindPopup(popupContent);
          layerGroup.addLayer(abMarker);
        }
      });
    }
  }, [points, abbaco, avvisi, filterType]);

  return (
    <div className="space-y-4">
      {/* Header & Controls Bar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-cyan-950 border border-cyan-800 rounded-lg text-cyan-400">
              <MapPin className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Mappa Georeferenziata Difetti di Binario</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visualizzazione geografica delle sedi tecniche, rilievi diagnostici e punti singolari di linea RFI DOIT VE
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Buttons */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-1 flex space-x-1 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterType === 'ALL' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setFilterType('V5')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterType === 'V5' ? 'bg-red-900/80 text-red-200 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              V5 (Binario)
            </button>
            <button
              onClick={() => setFilterType('SCADUTI')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterType === 'SCADUTI' ? 'bg-red-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Scaduti
            </button>
            <button
              onClick={() => setFilterType('V3V4')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterType === 'V3V4' ? 'bg-cyan-900/80 text-cyan-200 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              V3/V4 (Diagn.)
            </button>
            <button
              onClick={() => setFilterType('ABBACO')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterType === 'ABBACO' ? 'bg-amber-900/80 text-amber-200 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Rallentamenti
            </button>
          </div>

          {/* Line Selector */}
          <select
            value={selectedLinea}
            onChange={(e) => setSelectedLinea(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Tutte le Linee ({linee.length})</option>
            {linee.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl h-[620px]">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Legend */}
        <div className="absolute bottom-4 left-4 z-400 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 rounded-xl p-3 shadow-lg text-xs space-y-2 pointer-events-auto">
          <div className="font-bold text-white text-[11px] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Legenda Punti Rete</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500 border border-white"></span>
            <span className="text-slate-300">Difetto Scaduto (Priorità Alta)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white"></span>
            <span className="text-slate-300">In Scadenza (≤ 30 giorni)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></span>
            <span className="text-slate-300">Avviso Regolare</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 border border-white"></span>
            <span className="text-slate-300">Rilievo Diagnostico VEM (V3/V4)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-amber-900"></span>
            <span className="text-slate-300">Rallentamento Linea (ABBA.CO)</span>
          </div>
          <div className="pt-1 border-t border-slate-700/80 text-[10px] text-slate-400 font-mono">
            Elementi visibili: {points.length} su {avvisi.length}
          </div>
        </div>
      </div>
    </div>
  );
};
