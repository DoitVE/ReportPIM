import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Avviso, AbbacoItem, PdmV5Item, Iw67Item } from '../types';
import {
  MapPin,
  Filter,
  Layers,
  AlertTriangle,
  TrainTrack,
  RefreshCw,
  Database,
  Search,
  CheckSquare,
  Square,
  Crosshair,
  Info,
  Maximize2
} from 'lucide-react';
import L from 'leaflet';
import {
  OPEN_BASEMAPS,
  rfiTracksGeoJson,
  gpsLookupTable,
  lookupGpsCoordinates,
  GpsRecord
} from '../data/gpsService';

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
  
  // Layer groups refs
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const ormOverlayTileLayerRef = useRef<L.TileLayer | null>(null);
  const rfiTracksLayerRef = useRef<L.GeoJSON | null>(null);
  const stationsLayerRef = useRef<L.LayerGroup | null>(null);
  const defectsLayerRef = useRef<L.LayerGroup | null>(null);
  const abbacoLayerRef = useRef<L.LayerGroup | null>(null);

  // Layer toggles
  const [activeBasemap, setActiveBasemap] = useState<keyof typeof OPEN_BASEMAPS>('esriDark');
  const [showRfiTracks, setShowRfiTracks] = useState<boolean>(true);
  const [showStations, setShowStations] = useState<boolean>(true);
  const [showOrmOverlay, setShowOrmOverlay] = useState<boolean>(false);
  const [showDefects, setShowDefects] = useState<boolean>(true);
  const [showAbbaco, setShowAbbaco] = useState<boolean>(true);

  // Filters & Search
  const [selectedLinea, setSelectedLinea] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'V5' | 'V3V4' | 'SCADUTI' | 'ABBACO'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFeature, setSelectedFeature] = useState<{
    title: string;
    type: 'TRATTA' | 'STAZIONE' | 'DIFETTO' | 'ABBACO';
    details: Record<string, any>;
  } | null>(null);

  // Available lines
  const linee = useMemo(() => {
    const s = new Set<string>();
    pdmList.forEach(p => { if (p.linea) s.add(p.linea); });
    abbaco.forEach(a => { if (a.linea) s.add(a.linea); });
    avvisi.forEach(a => { if (a.linea) s.add(a.linea); });
    return Array.from(s).sort();
  }, [pdmList, abbaco, avvisi]);

  // List of RFI stations from GPS reference
  const rfiStations = useMemo(() => {
    const list: GpsRecord[] = [];
    Object.values(gpsLookupTable).forEach(rec => {
      if (rec.type === 'LOCALITA' && rec.lat !== 0 && rec.lng !== 0) {
        if (!list.some(item => item.sete === rec.sete)) {
          list.push(rec);
        }
      }
    });
    return list;
  }, []);

  const totalCount = pdmList.length + avvisi.length + abbaco.length + iw67.length;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // DOIT Venezia center (Veneto railway hub)
      const map = L.map(mapContainerRef.current, {
        center: [45.54, 12.15],
        zoom: 9,
        maxZoom: 18,
        minZoom: 7,
      });

      // 1. Base Tile Layer (Carto Dark by default, 100% open, NO API KEY)
      const baseCfg = OPEN_BASEMAPS[activeBasemap];
      const baseTile = L.tileLayer(baseCfg.url, {
        attribution: baseCfg.attribution,
        subdomains: baseCfg.subdomains as any,
        maxZoom: baseCfg.maxZoom,
      }).addTo(map);
      baseTileLayerRef.current = baseTile;

      // 2. OpenRailwayMap Infrastructure live overlay (optional)
      const ormTile = L.tileLayer(OPEN_BASEMAPS.openRailwayMap.url, {
        attribution: OPEN_BASEMAPS.openRailwayMap.attribution,
        subdomains: OPEN_BASEMAPS.openRailwayMap.subdomains as any,
        maxZoom: OPEN_BASEMAPS.openRailwayMap.maxZoom,
        opacity: 0.85,
      });
      ormOverlayTileLayerRef.current = ormTile;

      // 3. RFI Railway Tracks GeoJSON Layer (from user's GPS file)
      const tracksLayer = L.geoJSON(rfiTracksGeoJson as any, {
        style: (feat) => ({
          color: feat?.properties?.div === 'VEM1' ? '#38bdf8' : '#818cf8',
          weight: 2.8,
          opacity: 0.8,
          dashArray: '5, 4',
        }),
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.bindTooltip(
            `<strong>${props.desc || props.sete}</strong><br/>Sede: ${props.sete} • Reparto: ${props.div || '-'}<br/>Km ${props.km_ini} - ${props.km_fine}`,
            { sticky: true, className: 'leaflet-rfi-tooltip' }
          );
          layer.on('click', () => {
            setSelectedFeature({
              title: props.desc || props.sete,
              type: 'TRATTA',
              details: {
                'Sede Tecnica': props.sete,
                'Descrizione Tratta': props.desc,
                'Divisione / Reparto': props.div,
                'Km Inizio': props.km_ini,
                'Km Fine': props.km_fine,
              },
            });
          });
        },
      }).addTo(map);
      rfiTracksLayerRef.current = tracksLayer;

      // 4. Stations Group
      const stationsGrp = L.layerGroup().addTo(map);
      stationsLayerRef.current = stationsGrp;

      // 5. Defects Group
      const defectsGrp = L.layerGroup().addTo(map);
      defectsLayerRef.current = defectsGrp;

      // 6. Abbaco Slow Zones Group
      const abbacoGrp = L.layerGroup().addTo(map);
      abbacoLayerRef.current = abbacoGrp;

      const trackBounds = tracksLayer.getBounds();
      if (trackBounds.isValid()) {
        map.fitBounds(trackBounds, { padding: [15, 15] });
      }

      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
        if (trackBounds.isValid()) {
          map.fitBounds(trackBounds, { padding: [15, 15] });
        }
      }, 200);
    }
  }, []);

  // Update Basemap tile
  useEffect(() => {
    if (!mapInstanceRef.current || !baseTileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(baseTileLayerRef.current);
    const cfg = OPEN_BASEMAPS[activeBasemap];
    const newBase = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      subdomains: cfg.subdomains as any,
      maxZoom: cfg.maxZoom,
    }).addTo(mapInstanceRef.current);
    baseTileLayerRef.current = newBase;
    newBase.bringToBack();
  }, [activeBasemap]);

  // Update OpenRailwayMap overlay toggle
  useEffect(() => {
    if (!mapInstanceRef.current || !ormOverlayTileLayerRef.current) return;
    if (showOrmOverlay) {
      if (!mapInstanceRef.current.hasLayer(ormOverlayTileLayerRef.current)) {
        ormOverlayTileLayerRef.current.addTo(mapInstanceRef.current);
      }
    } else {
      if (mapInstanceRef.current.hasLayer(ormOverlayTileLayerRef.current)) {
        mapInstanceRef.current.removeLayer(ormOverlayTileLayerRef.current);
      }
    }
  }, [showOrmOverlay]);

  // Update RFI tracks layer visibility
  useEffect(() => {
    if (!mapInstanceRef.current || !rfiTracksLayerRef.current) return;
    if (showRfiTracks) {
      if (!mapInstanceRef.current.hasLayer(rfiTracksLayerRef.current)) {
        rfiTracksLayerRef.current.addTo(mapInstanceRef.current);
      }
    } else {
      if (mapInstanceRef.current.hasLayer(rfiTracksLayerRef.current)) {
        mapInstanceRef.current.removeLayer(rfiTracksLayerRef.current);
      }
    }
  }, [showRfiTracks]);

  // Render RFI Stations Nodes
  useEffect(() => {
    const grp = stationsLayerRef.current;
    if (!grp || !mapInstanceRef.current) return;
    grp.clearLayers();

    if (!showStations) return;

    rfiStations.forEach(st => {
      const marker = L.circleMarker([st.lat, st.lng], {
        radius: 4,
        fillColor: '#0ea5e9',
        color: '#ffffff',
        weight: 1,
        opacity: 0.9,
        fillOpacity: 0.75,
      });

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 11px; color: #f8fafc; padding: 2px;">
          <div style="font-weight: 700; color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 3px; margin-bottom: 3px;">
            🚉 Stazione / Sede RFI: ${st.sete}
          </div>
          <div><strong>Nome:</strong> ${st.desc}</div>
          <div><strong>Reparto:</strong> ${st.div}</div>
          <div><strong>Progressiva Km:</strong> ${st.km_ini}</div>
          <div><strong>Coordinate GPS:</strong> ${st.lat.toFixed(5)}, ${st.lng.toFixed(5)}</div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedFeature({
          title: st.desc,
          type: 'STAZIONE',
          details: {
            'Sede Tecnica': st.sete,
            'Nome Stazione / Nodo': st.desc,
            'Divisione': st.div,
            'Km': st.km_ini,
            'Latitudine': st.lat,
            'Longitudine': st.lng,
          },
        });
      });

      grp.addLayer(marker);
    });
  }, [showStations, rfiStations]);

  // Render Defect Points (PdM V5 & Avvisi)
  useEffect(() => {
    const grp = defectsLayerRef.current;
    if (!grp || !mapInstanceRef.current) return;
    grp.clearLayers();

    if (!showDefects) return;

    if (filterType === 'ALL' || filterType === 'V5' || filterType === 'SCADUTI') {
      pdmList.forEach(p => {
        if (selectedLinea !== 'ALL' && p.linea !== selectedLinea) return;
        if (filterType === 'SCADUTI' && p.scadenza !== 'SCADUTO') return;

        // Resolve coordinates using real GPS table
        const coords = p.lat && p.lng
          ? { lat: p.lat, lng: p.lng }
          : lookupGpsCoordinates(p.sede_tecnica, p.localita_tratta, p.km_linea, p.linea);

        let color = '#3b82f6';
        let radius = 6;
        if (p.classe === 'A' || p.scadenza === 'SCADUTO') {
          color = '#ef4444';
          radius = 8;
        } else if (p.classe === 'B') {
          color = '#f59e0b';
          radius = 7;
        } else if (p.classe?.startsWith('C')) {
          color = '#eab308';
          radius = 6;
        } else if (p.scadenza === 'COMPLETATO' || p.tolto_dop === 'S') {
          color = '#10b981';
          radius = 5;
        }

        const marker = L.circleMarker([coords.lat, coords.lng], {
          radius,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 0.95,
          fillOpacity: 0.85,
        });

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 11px; color: #f8fafc; padding: 2px; min-width: 210px;">
            <div style="font-weight: 700; font-size: 12px; color: #fbbf24; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 4px;">
              🔍 PdM ${p.pdm} • Classe ${p.classe}
            </div>
            <div><strong>Linea:</strong> <span style="color: #38bdf8;">${p.linea}</span></div>
            <div><strong>Località/Tratta:</strong> ${p.localita_tratta}</div>
            <div><strong>Sede Tecnica:</strong> <span style="font-family: monospace;">${p.sede_tecnica}</span></div>
            <div><strong>Km Progressiva:</strong> ${p.km_linea}</div>
            <div><strong>Difetto:</strong> ${p.tipo_difetto} (${p.pos_difetto})</div>
            <div><strong>Avviso SAP:</strong> <span style="color: #67e8f9; font-family: monospace;">${p.avviso || '-'}</span></div>
            <div><strong>Scadenza:</strong> <span style="font-weight: bold; color: ${p.scadenza === 'SCADUTO' ? '#f87171' : '#4ade80'};">${p.scadenza}</span></div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedFeature({
            title: `PdM ${p.pdm} (${p.classe})`,
            type: 'DIFETTO',
            details: {
              'PdM': p.pdm,
              'Classe': p.classe,
              'Linea': p.linea,
              'Località / Tratta': p.localita_tratta,
              'Sede Tecnica': p.sede_tecnica,
              'Km': p.km_linea,
              'Tipo Difetto': p.tipo_difetto,
              'Posizione': p.pos_difetto,
              'Avviso SAP': p.avviso || 'Mancante',
              'Stato Scadenza': p.scadenza,
              'Coordinate GPS': `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
            },
          });
        });

        grp.addLayer(marker);
      });
    }
  }, [showDefects, filterType, pdmList, selectedLinea]);

  // Render ABBA.CO Slow Zones
  useEffect(() => {
    const grp = abbacoLayerRef.current;
    if (!grp || !mapInstanceRef.current) return;
    grp.clearLayers();

    if (!showAbbaco) return;

    if (filterType === 'ALL' || filterType === 'ABBACO') {
      abbaco.forEach(ab => {
        if (selectedLinea !== 'ALL' && ab.linea !== selectedLinea) return;

        // Geocode via Tratta & Linea from GPS table
        const coords = lookupGpsCoordinates(undefined, ab.tratta, ab.km_inizio, ab.linea);

        const halo = L.circleMarker([coords.lat, coords.lng], {
          radius: 12,
          fillColor: '#f59e0b',
          color: '#d97706',
          weight: 1.5,
          opacity: 0.7,
          fillOpacity: 0.25,
        });

        const marker = L.circleMarker([coords.lat, coords.lng], {
          radius: 6,
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
            <div><strong>Velocità Imposta:</strong> <span style="font-weight: 700; color: #f87171;">${ab.rid_vel}</span></div>
            <div><strong>Motivo:</strong> ${ab.motivo}</div>
            <div><strong>Titolare:</strong> <span style="color: #4ade80;">${ab.titolare}</span></div>
          </div>
        `;

        halo.bindPopup(popupContent);
        marker.bindPopup(popupContent);

        marker.on('click', () => {
          setSelectedFeature({
            title: `Rallentamento ABBA.CO ${ab.chiave_rl}`,
            type: 'ABBACO',
            details: {
              'Chiave RL': ab.chiave_rl,
              'Linea': ab.linea,
              'Tratta': ab.tratta,
              'Progressiva Km': `${ab.km_inizio} - ${ab.km_fine}`,
              'Velocità': ab.rid_vel,
              'Motivo': ab.motivo,
              'Titolare': ab.titolare,
              'Coordinate': `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
            },
          });
        });

        grp.addLayer(halo);
        grp.addLayer(marker);
      });
    }
  }, [showAbbaco, filterType, abbaco, selectedLinea]);

  // Handle Search for Sede Tecnica or Station
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    const q = searchQuery.trim().toUpperCase();
    
    // Check in GPS table
    const matched = gpsLookupTable[q] || Object.values(gpsLookupTable).find(r => 
      r.sete.toUpperCase().includes(q) || r.desc.toUpperCase().includes(q)
    );

    if (matched && matched.lat !== 0 && matched.lng !== 0) {
      mapInstanceRef.current.flyTo([matched.lat, matched.lng], 13, { duration: 1.2 });
      setSelectedFeature({
        title: matched.desc,
        type: matched.type === 'TRATTA' ? 'TRATTA' : 'STAZIONE',
        details: {
          'Sede Tecnica': matched.sete,
          'Descrizione': matched.desc,
          'Divisione': matched.div,
          'Km Inizio': matched.km_ini,
          'Km Fine': matched.km_fine,
          'Latitudine': matched.lat,
          'Longitudine': matched.lng,
        },
      });
    }
  };

  const handleResetZoom = () => {
    mapInstanceRef.current?.flyTo([45.54, 12.15], 9, { duration: 1 });
  };

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
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                Open GIS • No API Key
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Doppio layer integrato: Mappa base Open + Layer infrastruttura ferroviaria vettoriale RFI (Tratte, Sedi Tecniche e GPS DOIT Venezia)
            </p>
          </div>
        </div>

        {/* Search Bar & Quick Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Sede Tecnica Search */}
          <form onSubmit={handleSearch} className="relative flex items-center">
            <input
              type="text"
              placeholder="Cerca Sede Tecnica (es. LO3002, TR0148, Mestre)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#14161a] border border-[#3b4252] rounded-l px-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-52 md:w-64"
            />
            <button
              type="submit"
              className="bg-cyan-700 hover:bg-cyan-600 text-white px-2.5 py-1 rounded-r border border-cyan-600 flex items-center justify-center cursor-pointer"
              title="Cerca sulla mappa"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

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

          <button
            onClick={handleResetZoom}
            className="bg-[#232730] hover:bg-[#2c323f] border border-[#374151] px-2 py-1 rounded text-slate-300 hover:text-white flex items-center space-x-1"
            title="Centra vista su DOIT Venezia"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset Zoom</span>
          </button>
        </div>
      </div>

      {/* Layer Control Strip */}
      <div className="bg-[#1f2229] border border-[#2d323d] rounded px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Basemap Selection */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-semibold flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Mappa Base (Open):</span>
          </span>
          <div className="flex items-center space-x-1 bg-[#14161a] p-0.5 rounded border border-[#323846]">
            {(Object.keys(OPEN_BASEMAPS) as (keyof typeof OPEN_BASEMAPS)[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveBasemap(key)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  activeBasemap === key
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {key === 'esriDark' && 'ESRI Dark (No API Key)'}
                {key === 'openRailwayMap' && 'OpenRailwayMap'}
                {key === 'osmStandard' && 'OpenStreetMap'}
                {key === 'esriLight' && 'ESRI Chiara'}
              </button>
            ))}
          </div>
        </div>

        {/* Overlay Layers Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400 font-semibold">Layer Sovrapposti:</span>
          
          <button
            onClick={() => setShowRfiTracks(!showRfiTracks)}
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
              showRfiTracks
                ? 'bg-blue-950/70 border-blue-600 text-blue-300 font-medium'
                : 'bg-black/20 border-slate-700 text-slate-500 line-through'
            }`}
          >
            <TrainTrack className="w-3.5 h-3.5" />
            <span>Tracciato RFI DOIT VE (163 Tratte)</span>
          </button>

          <button
            onClick={() => setShowStations(!showStations)}
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
              showStations
                ? 'bg-cyan-950/70 border-cyan-600 text-cyan-300 font-medium'
                : 'bg-black/20 border-slate-700 text-slate-500 line-through'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Stazioni & Nodi LO (140+ Sedi)</span>
          </button>

          <button
            onClick={() => setShowOrmOverlay(!showOrmOverlay)}
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
              showOrmOverlay
                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300 font-medium'
                : 'bg-black/20 border-slate-700 text-slate-500'
            }`}
            title="Sovrapposizione binari e segnali ferroviari mondiali"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overlay Segnalamento ORM</span>
          </button>

          <button
            onClick={() => setShowDefects(!showDefects)}
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
              showDefects
                ? 'bg-red-950/70 border-red-600 text-red-300 font-medium'
                : 'bg-black/20 border-slate-700 text-slate-500 line-through'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Punti Difetti PdM ({pdmList.length})</span>
          </button>

          <button
            onClick={() => setShowAbbaco(!showAbbaco)}
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
              showAbbaco
                ? 'bg-amber-950/70 border-amber-600 text-amber-300 font-medium'
                : 'bg-black/20 border-slate-700 text-slate-500 line-through'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Rallentamenti ABBA.CO ({abbaco.length})</span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="relative bg-[#20232a] border border-[#2d323d] rounded shadow-xl h-[650px] overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Selected Feature Card Inspector (Floating right) */}
        {selectedFeature && (
          <div className="absolute top-4 right-4 z-400 bg-[#16181f]/95 backdrop-blur-md border border-cyan-800/60 rounded-lg p-3.5 shadow-2xl w-80 text-xs space-y-2 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-[#2d323d] pb-2">
              <div className="flex items-center space-x-1.5">
                {selectedFeature.type === 'TRATTA' && <TrainTrack className="w-4 h-4 text-cyan-400" />}
                {selectedFeature.type === 'STAZIONE' && <MapPin className="w-4 h-4 text-emerald-400" />}
                {selectedFeature.type === 'DIFETTO' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                {selectedFeature.type === 'ABBACO' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                <h4 className="font-bold text-white text-xs truncate max-w-[200px]">
                  {selectedFeature.title}
                </h4>
              </div>
              <button
                onClick={() => setSelectedFeature(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto text-[11px] pr-1">
              {Object.entries(selectedFeature.details).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-white/5 py-0.5">
                  <span className="text-slate-400">{k}:</span>
                  <span className="text-white font-medium text-right max-w-[150px] truncate">{String(v || '-')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State Banner if 0 records */}
        {totalCount === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-400 bg-black/85 backdrop-blur-md border border-amber-500/40 rounded-lg px-4 py-2.5 shadow-2xl flex items-center space-x-3 pointer-events-auto max-w-xl">
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-white">Mappa RFI DOIT VE Pronta: </span>
              <span className="text-slate-300">
                Visualizzazione binari e sedi tecniche attiva. Alimenta con i file SAP o carica la demo per georeferenziare i difetti.
              </span>
            </div>
            <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-700">
              {onOpenFileLoader && (
                <button
                  onClick={onOpenFileLoader}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded shadow cursor-pointer whitespace-nowrap"
                >
                  Alimenta SAP
                </button>
              )}
              {onLoadDemoData && (
                <button
                  onClick={onLoadDemoData}
                  className="px-2 py-1 bg-[#25282e] hover:bg-[#2f333a] border border-[#3f4553] text-amber-300 font-semibold text-[11px] rounded cursor-pointer whitespace-nowrap flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Demo</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floating Legend */}
        <div className="absolute bottom-4 left-4 z-400 bg-[#16181f]/90 backdrop-blur-md border border-[#2d323d] rounded p-2.5 shadow-lg text-xs space-y-1.5 pointer-events-auto">
          <div className="font-bold text-white text-[11px] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Legenda Mappa Georeferenziata</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500 border border-white"></span>
            <span className="text-slate-300 text-[11px]">Classe A / Scaduto (Alta Priorità)</span>
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
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-white"></span>
            <span className="text-slate-300 text-[11px]">Stazione / Nodo RFI (LOxxxx)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-6 h-0.5 bg-sky-400 inline-block border-t border-dashed border-sky-300"></span>
            <span className="text-slate-300 text-[11px]">Tratta RFI VEM1 (Mestre/Padova)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-6 h-0.5 bg-indigo-400 inline-block border-t border-dashed border-indigo-300"></span>
            <span className="text-slate-300 text-[11px]">Tratta RFI VEM2 (Treviso/Belluno)</span>
          </div>
          <div className="pt-1 border-t border-[#2d323d] text-[10px] text-slate-400 font-mono">
            Riferimento coordinate GPS: {dataAggiornamento}
          </div>
        </div>
      </div>
    </div>
  );
};
