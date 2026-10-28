import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PdmV5Item } from '../../types';
import { BarChart, Bar, XAxis, YAxis, LabelList, ResponsiveContainer } from 'recharts';
import L from 'leaflet';
import {
  rfiTracksGeoJson,
  lookupGpsCoordinates,
  DEFAULT_DARK_TILE_URL,
  DEFAULT_DARK_TILE_ATTRIBUTION,
  MASTER_LINEE_INRETE,
} from '../../data/gpsService';
import {
  PbiCanvas,
  PbiBox,
  PbiShape,
  PbiText,
  PbiTileSlicer,
  PbiListSlicer,
  PbiButton,
  PBI_COLORS,
  fontSizePx,
} from '../pbi/primitives';

interface PageAvvisiV5Props {
  pdmList: PdmV5Item[];
  dataAggiornamento: string;
  onNavigateToDrill: (item: PdmV5Item) => void;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

/**
 * Valori di filtro fedeli ai visual `advancedSlicerVisual` / `slicer` del PBIR
 * (pagina "Avvisi V5", id de2fd66484b8de2ad8ed).
 */
const DIVISIONI = ['VEM1', 'VEM2'];
const UNITA_MANUTENTIVE = ['LVU1', 'LVU2', 'LVU3', 'LVU4'];
const CLASSI = ['A', 'B', 'C1', 'C2', 'MANCANTE', 'S1', 'S2'];
const SCADENZE = ['MANCANTE', 'SCAD.<10GG', 'SCAD.<30GG', 'SCAD.<60GG', 'SCAD.>60GG', 'SCADUTO'];
const CLASSIFICAZIONI = [
  'Pdm aperto - Avv. aperto',
  'Pdm aperto - Avv. chiuso',
  'Pdm aperto - Avv. mancante',
  'Pdm chiuso - Avv. aperto',
  'Pdm mancante - Avv. aperto',
];

interface TableColumn {
  key: keyof PdmV5Item;
  label: string;
  width: number;
}

/**
 * Le 20 colonne del `tableEx` nell'ordine del PBIR, con le larghezze esatte
 * estratte da `columnWidth` (PdM e Avviso usano `defaultColumnWidth: 90`).
 */
const TABLE_COLUMNS: TableColumn[] = [
  { key: 'pdm', label: 'PdM', width: 90 },
  { key: 'data_creazione', label: 'Data creazione', width: 68.18181818181819 },
  { key: 'data_scoperta', label: 'Data scoperta', width: 66.69028268559224 },
  { key: 'tolto_dop', label: "Tolto d'op.", width: 38.20606457660532 },
  { key: 'classe', label: 'Classe', width: 24.62934031845992 },
  { key: 'localita_tratta', label: 'Località/Tratta', width: 211.69648874077322 },
  { key: 'osservazioni', label: 'Osservazioni', width: 214.2824374681477 },
  { key: 'avviso', label: 'Avviso', width: 90 },
  { key: 'data_creaz_avviso', label: 'Data creaz. avviso', width: 65.45454545454545 },
  { key: 'km_linea', label: 'Km linea', width: 49.54545454545455 },
  { key: 'tipo_difetto', label: 'Tipo difetto', width: 50 },
  { key: 'pos_difetto', label: 'Pos. difetto', width: 48.02042141495105 },
  { key: 'esegui_to_da', label: 'Eseguito da', width: 43.56279059835603 },
  { key: 'id_sald', label: 'ID sald.', width: 49.13361813367091 },
  { key: 'gara_stato', label: 'Garanz.', width: 32.515144925291125 },
  { key: 'cod_stato', label: 'Cod. stato', width: 33.459567400984156 },
  { key: 'scadenza', label: 'Scadenza', width: 93.26716536321652 },
  { key: 'fine_richiesta', label: 'Fine Rich.', width: 66.79731766615885 },
  { key: 'stato_avviso', label: 'Stato avviso', width: 68.82381500196321 },
  { key: 'classificazione_stato', label: 'Classificazione stato', width: 164.54545454545453 },
];

const TABLE_WIDTH = TABLE_COLUMNS.reduce((sum, c) => sum + c.width, 0);

/** Converte una data "gg/mm/aaaa" in timestamp (le date vuote finiscono in coda). */
const parseDmy = (value?: string): number => {
  if (!value) return Number.POSITIVE_INFINITY;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime() : Number.POSITIVE_INFINITY;
};

/** Conditional formatting del `tableEx` (colori di testo per colonna). */
const cellColor = (key: keyof PdmV5Item, value: string): string | undefined => {
  switch (key) {
    case 'tolto_dop':
      if (value === 'N') return PBI_COLORS.accent;
      if (value === 'S') return PBI_COLORS.good;
      return undefined;
    case 'stato_avviso':
      return value.includes('MECO') ? PBI_COLORS.good : undefined;
    case 'scadenza':
      if (value.includes('<60')) return PBI_COLORS.mid;
      if (value.includes('<30')) return PBI_COLORS.warn;
      if (value.includes('<10')) return PBI_COLORS.accent;
      if (value.includes('MANCANTE')) return PBI_COLORS.accent;
      if (value.includes('SCADUTO')) return PBI_COLORS.accent;
      return undefined;
    case 'classificazione_stato':
      return value.toLowerCase().includes('mancante') ? PBI_COLORS.accent : undefined;
    default:
      return undefined;
  }
};

export const PageAvvisiV5: React.FC<PageAvvisiV5Props> = ({
  pdmList,
  dataAggiornamento,
  onNavigateToDrill,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Stato dei filtri (multi-selezione, come i visual originali)
  const [selectedDivisioni, setSelectedDivisioni] = useState<string[]>([]);
  const [selectedUM, setSelectedUM] = useState<string[]>([]);
  const [selectedClassi, setSelectedClassi] = useState<string[]>([]);
  const [selectedScadenze, setSelectedScadenze] = useState<string[]>([]);
  const [selectedLinee, setSelectedLinee] = useState<string[]>([]);
  const [selectedClassificazioni, setSelectedClassificazioni] = useState<string[]>([]);
  const [selectedMapLocalita, setSelectedMapLocalita] = useState<string | null>(null);

  // Riga selezionata (target del drill-through)
  const [selectedRowId, setSelectedRowId] = useState<string>(pdmList[0]?.pdm ?? '');

  // Contenitore Leaflet
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const trackBoundsRef = useRef<L.LatLngBounds | null>(null);

  // Elenco linee InRete (master Power BI + eventuali valori a dataset)
  const lineeList = useMemo(() => {
    const set = new Set<string>(MASTER_LINEE_INRETE);
    pdmList.forEach((p) => { if (p.linea) set.add(p.linea); });
    return Array.from(set).sort();
  }, [pdmList]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  // Reset Filtri (bookmark "c04aaea21fcfd29747b3" del PBIR)
  const handleResetFilters = () => {
    setSelectedDivisioni([]);
    setSelectedUM([]);
    setSelectedClassi([]);
    setSelectedScadenze([]);
    setSelectedLinee([]);
    setSelectedClassificazioni([]);
    setSelectedMapLocalita(null);

    if (mapInstanceRef.current && trackBoundsRef.current) {
      mapInstanceRef.current.flyToBounds(trackBoundsRef.current, { padding: [12, 12], duration: 0.8 });
    }
  };

  // Helper per estrarre l'anno da un PdmV5Item (da campo anno o parse date)
  const getItemYear = (item: PdmV5Item): number | undefined => {
    if (typeof item.anno === 'number' && !Number.isNaN(item.anno)) return item.anno;
    for (const d of [item.data_scoperta, item.data_creazione, item.data_creaz_avviso]) {
      if (d) {
        const m = /(\d{4})/.exec(d);
        if (m) {
          const y = parseInt(m[1], 10);
          if (y >= 1990 && y <= 2100) return y;
        }
      }
    }
    return undefined;
  };

  /**
   * Filtri a livello di pagina Power BI ("Filtri in questa pagina" / filtri oggetto visivo):
   * 1) Anno: è maggiore di 2020 (> 2020)
   * 2) Classificazione stato: appartiene ai 5 stati aperti/in gestione
   *    (esclude 'Pdm chiuso - Avv. chiuso' e gli stati vuoti).
   */
  const pageBaseItems = useMemo(() => {
    return pdmList.filter((item) => {
      // 1) Anno > 2020: se l'anno è determinabile, deve essere > 2020
      const y = getItemYear(item);
      if (y !== undefined && y <= 2020) return false;

      // 2) Classificazione stato: deve essere uno dei 5 stati aperti
      const c = item.classificazione_stato;
      if (!c || c === 'Pdm chiuso - Avv. chiuso' || !CLASSIFICAZIONI.includes(c)) return false;

      return true;
    });
  }, [pdmList]);

  const filtered = useMemo(() => pageBaseItems.filter((item) => {
    if (selectedDivisioni.length > 0 && !selectedDivisioni.includes(item.divisione)) return false;
    if (selectedUM.length > 0 && !selectedUM.includes(item.lvu)) return false;
    if (selectedClassi.length > 0 && !selectedClassi.includes(item.classe)) return false;
    if (selectedScadenze.length > 0 && !selectedScadenze.includes(item.scadenza)) return false;
    if (selectedLinee.length > 0 && !selectedLinee.includes(item.linea)) return false;
    if (selectedClassificazioni.length > 0 && !selectedClassificazioni.includes(item.classificazione_stato)) return false;
    if (selectedMapLocalita && item.localita_tratta !== selectedMapLocalita) return false;
    return true;
  }), [pageBaseItems, selectedDivisioni, selectedUM, selectedClassi, selectedScadenze, selectedLinee, selectedClassificazioni, selectedMapLocalita]);

  const selectedItem = useMemo(
    () => filtered.find((p) => p.pdm === selectedRowId) ?? filtered[0] ?? pageBaseItems[0] ?? pdmList[0],
    [filtered, selectedRowId, pageBaseItems, pdmList],
  );

  // Righe tabella ordinate per "Fine Rich." ascendente (sort del PBIR)
  const tableRows = useMemo(
    () => [...filtered].sort((a, b) => parseDmy(a.fine_richiesta) - parseDmy(b.fine_richiesta)),
    [filtered],
  );

  // Grafico a barre "Classe Provvedimento" (esclude la classe "-")
  const classeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    CLASSI.forEach((c) => { counts[c] = 0; });
    filtered.forEach((item) => {
      const c = item.classe || 'MANCANTE';
      if (c === '-') return;
      counts[c] = (counts[c] ?? 0) + 1;
    });
    return CLASSI.map((name) => ({ name, count: counts[name] ?? 0 }));
  }, [filtered]);

  // Inizializzazione mappa Leaflet (ESRI Dark Gray, referenceLayer geojson DOIT VE)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [45.58628692317441, 12.281390795000107],
      zoom: 7.22,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(DEFAULT_DARK_TILE_URL, {
      attribution: DEFAULT_DARK_TILE_ATTRIBUTION,
      maxZoom: 16,
    }).addTo(map);

    try {
      const geoLayer = L.geoJSON(rfiTracksGeoJson as any, {
        style: () => ({ color: PBI_COLORS.textLight, weight: 2, opacity: 0.85 }),
      }).addTo(map);
      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        trackBoundsRef.current = bounds;
        map.fitBounds(bounds, { padding: [12, 12] });
      }
    } catch (e) {
      console.warn('GeoJSON render error:', e);
    }

    const markers = L.layerGroup().addTo(map);
    markersLayerRef.current = markers;
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
      if (trackBoundsRef.current && trackBoundsRef.current.isValid()) {
        map.fitBounds(trackBoundsRef.current, { padding: [12, 12] });
      }
    }, 200);
  }, []);

  // Aggiornamento marker (bubbleLayer: fill #F26D6D, raggio da 6 a 14, cross-filtering al click + zoom)
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    const groups: Record<string, { lat: number; lng: number; count: number; name: string; items: PdmV5Item[] }> = {};
    pageBaseItems.forEach((item) => {
      if (selectedDivisioni.length > 0 && !selectedDivisioni.includes(item.divisione)) return;
      if (selectedUM.length > 0 && !selectedUM.includes(item.lvu)) return;
      if (selectedClassi.length > 0 && !selectedClassi.includes(item.classe)) return;
      if (selectedScadenze.length > 0 && !selectedScadenze.includes(item.scadenza)) return;
      if (selectedLinee.length > 0 && !selectedLinee.includes(item.linea)) return;
      if (selectedClassificazioni.length > 0 && !selectedClassificazioni.includes(item.classificazione_stato)) return;

      const coords = item.lat && item.lng
        ? { lat: item.lat, lng: item.lng }
        : lookupGpsCoordinates(item.sede_tecnica, item.localita_tratta, item.km_linea, item.linea);
      const key = `${coords.lat.toFixed(4)}_${coords.lng.toFixed(4)}_${item.localita_tratta}`;
      if (!groups[key]) groups[key] = { lat: coords.lat, lng: coords.lng, count: 0, name: item.localita_tratta, items: [] };
      groups[key].count++;
      groups[key].items.push(item);
    });

    Object.values(groups).forEach((g) => {
      const isSelected = selectedMapLocalita === g.name;
      const isDimmed = selectedMapLocalita !== null && !isSelected;
      const radius = Math.min(14, Math.max(6, 6 + Math.sqrt(g.count)));

      const latStr = g.lat.toFixed(8).replace('.', ',');
      const lngStr = g.lng.toFixed(8).replace('.', ',');

      const tooltipContent = `
        <div style="font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; color: #111827; background: #ffffff; border-radius: 4px; padding: 6px 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); line-height: 1.5; min-width: 190px;">
          <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 2px;">
            <span style="color: #6b7280; font-size: 10px;">Latitudine</span>
            <span style="font-weight: 600; font-family: monospace; color: #111827;">${latStr}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 2px;">
            <span style="color: #6b7280; font-size: 10px;">Longitudine</span>
            <span style="font-weight: 600; font-family: monospace; color: #111827;">${lngStr}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 2px;">
            <span style="color: #6b7280; font-size: 10px;">PdM/Avviso</span>
            <span style="font-weight: 700; color: #dc2626;">${g.count}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 12px; margin-top: 3px; border-top: 1px solid #e5e7eb; padding-top: 3px;">
            <span style="color: #6b7280; font-size: 10px; white-space: nowrap;">Prime Località/Tratta</span>
            <span style="font-weight: 700; color: #111827; text-align: right;">${g.name || 'Località'}</span>
          </div>
        </div>
      `;

      const marker = L.circleMarker([g.lat, g.lng], {
        radius: isSelected ? radius + 3 : radius,
        fillColor: isSelected ? '#FFA0A0' : PBI_COLORS.accent,
        fillOpacity: isDimmed ? 0.2 : isSelected ? 0.95 : 0.75,
        color: isSelected ? '#FFFFFF' : PBI_COLORS.textPrimary,
        weight: isSelected ? 2.5 : 1,
      })
        .bindTooltip(tooltipContent, { direction: 'top', className: 'pbi-azure-tooltip', opacity: 0.98 })
        .on('click', () => {
          if (g.items[0]) setSelectedRowId(g.items[0].pdm);
          const nextSelected = selectedMapLocalita === g.name ? null : g.name;
          setSelectedMapLocalita(nextSelected);

          if (mapInstanceRef.current) {
            if (nextSelected) {
              mapInstanceRef.current.flyTo([g.lat, g.lng], 13, { animate: true, duration: 0.8 });
            } else if (trackBoundsRef.current) {
              mapInstanceRef.current.flyToBounds(trackBoundsRef.current, { padding: [12, 12], duration: 0.8 });
            }
          }
        });

      marker.addTo(markersLayerRef.current!);
    });
  }, [pageBaseItems, selectedDivisioni, selectedUM, selectedClassi, selectedScadenze, selectedLinee, selectedClassificazioni, selectedMapLocalita]);

  return (
    <PbiCanvas>
      {/* ---------------- Sfondi e pannelli ---------------- */}
      <PbiShape x={15} y={66} w={110} h={68} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={132} y={66} w={220} h={68} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={360} y={66} w={135} h={68} z={0} fill={PBI_COLORS.panel} radius={6} />

      <PbiShape x={15} y={140} w={480} h={64} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={15} y={210} w={480} h={64} z={0} fill={PBI_COLORS.card} radius={6} />

      <PbiShape x={15} y={282} w={145} h={190} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={168} y={282} w={160} h={190} z={0} fill={PBI_COLORS.panel} radius={6} />
      <PbiShape x={336} y={282} w={159} h={152} z={0} fill={PBI_COLORS.card} radius={6} />

      {/* ---------------- Intestazione ---------------- */}
      <PbiBox x={15} y={8} w={140} h={38} z={23000}>
        <img
          src="/assets/logo_ufficiale.png"
          alt="RFI"
          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }}
        />
      </PbiBox>

      <PbiText x={170} y={8} w={325} h={26} z={16000}
        text="Difetti di binario - DOIT VE" sizePt={16} bold color={PBI_COLORS.accent} />
      <PbiText x={170} y={34} w={80} h={20} z={20000} text="Avvisi V5" sizePt={12} bold color={PBI_COLORS.textLight} />

      {/* Dati al: + Data aggiornamento + Pulsante Reset Filtri compatto a destra */}
      <PbiBox x={255} y={33} w={245} h={22} z={25000} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: fontSizePx(9), color: PBI_COLORS.textMuted }}>Dati al:</span>
        <span style={{ fontSize: fontSizePx(9.5), color: PBI_COLORS.textLight }}>{dataAggiornamento}</span>
        <button
          onClick={handleResetFilters}
          style={{
            marginLeft: 4,
            padding: '1px 7px',
            fontSize: fontSizePx(7.5),
            fontWeight: 600,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.08)',
            color: PBI_COLORS.textLight,
            border: `1px solid ${PBI_COLORS.tileBorder}`,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            lineHeight: '16px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.borderColor = PBI_COLORS.textMuted;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = PBI_COLORS.tileBorder;
          }}
          title="Ripristina tutti i filtri della pagina"
        >
          Reset Filtri
        </button>
      </PbiBox>

      {/* ---------------- Etichette dei filtri ---------------- */}
      <PbiText x={20} y={72} w={100} h={16} z={9000}
        text="Divisione" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={138} y={72} w={208} h={16} z={2000}
        text="Unità Manutentiva" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={22} y={144} w={465} h={16} z={5000}
        text="Classe Provvedimento" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={22} y={214} w={465} h={16} z={2000}
        text="Scadenza Avviso" sizePt={8.5} color={PBI_COLORS.textMuted} />

      {/* ---------------- Slicer a tile ---------------- */}
      <PbiTileSlicer x={20} y={94} w={100} h={28} z={7000}
        options={DIVISIONI} value={selectedDivisioni} onToggle={(v) => toggle(setSelectedDivisioni, v)} />
      <PbiTileSlicer x={138} y={94} w={208} h={28} z={1000}
        options={UNITA_MANUTENTIVE} value={selectedUM} onToggle={(v) => toggle(setSelectedUM, v)} />
      <PbiTileSlicer x={20} y={166} w={470} h={28} z={4000}
        options={CLASSI} value={selectedClassi} onToggle={(v) => toggle(setSelectedClassi, v)} />
      <PbiTileSlicer x={20} y={236} w={470} h={28} z={1000}
        options={SCADENZE} value={selectedScadenze} onToggle={(v) => toggle(setSelectedScadenze, v)} />

      {/* ---------------- KPI Num. difetti (uniformato a Avvisi V3 e V4) ---------------- */}
      <PbiText x={360} y={72} w={135} h={18} z={27000}
        text="Num. difetti" sizePt={9.5} color={PBI_COLORS.textLight} align="center" />
      <PbiBox x={360} y={88} w={135} h={42} z={26000}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: fontSizePx(30), fontWeight: 700, color: PBI_COLORS.accent, lineHeight: 1 }}>
          {filtered.length.toLocaleString('it-IT')}
        </span>
      </PbiBox>

      {/* ---------------- Slicer a elenco ---------------- */}
      <PbiListSlicer x={18} y={286} w={139} h={182} z={15000}
        title="Linea InRete" options={lineeList} value={selectedLinee} onToggle={(v) => toggle(setSelectedLinee, v)} />

      {/* ---------------- Grafico a barre Classe Provvedimento ---------------- */}
      <PbiBox x={170} y={286} w={156} h={182} z={11000} style={{ overflow: 'hidden' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={classeChartData} margin={{ top: 5, right: 26, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={48}
              tick={{ fill: PBI_COLORS.textLight, fontSize: 10 }} />
            <Bar dataKey="count" fill={PBI_COLORS.accent} isAnimationActive={false} barSize={12} radius={[0, 2, 2, 0]}>
              <LabelList dataKey="count" position="right" fill={PBI_COLORS.textLight} fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </PbiBox>

      {/* ---------------- Classificazione stato ---------------- */}
      <PbiListSlicer x={340} y={286} w={151} h={144} z={27000}
        title="Classificazione stato" options={CLASSIFICAZIONI} value={selectedClassificazioni}
        onToggle={(v) => toggle(setSelectedClassificazioni, v)} itemColor={PBI_COLORS.textLight} />

      {/* ---------------- Drill PdM/avviso ---------------- */}
      <PbiButton x={336} y={442} w={159} h={30} z={26500} variant="light"
        label="Drill PdM/avviso" disabled={!selectedItem} onClick={() => selectedItem && onNavigateToDrill(selectedItem)} />

      {/* ---------------- Mappa ---------------- */}
      <PbiBox x={505} y={8} w={760} h={464} z={8000} style={{ overflow: 'hidden' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </PbiBox>

      {/* ---------------- Tabella (20 colonne) ---------------- */}
      <PbiBox x={15} y={482} w={1250} h={226} z={24000}
        style={{ border: `2px solid ${PBI_COLORS.accent}`, overflow: 'hidden', background: PBI_COLORS.tableRowSecondary }}>
        <div className="scrollbar-thin" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: TABLE_WIDTH, fontSize: fontSizePx(8) }}>
            <colgroup>
              {TABLE_COLUMNS.map((c) => <col key={c.key} style={{ width: c.width }} />)}
            </colgroup>
            <thead>
              <tr>
                {TABLE_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      background: PBI_COLORS.tableHeader,
                      color: PBI_COLORS.textPrimary,
                      fontWeight: 400,
                      textAlign: 'left',
                      padding: '3px 4px',
                      borderRight: `1px solid ${PBI_COLORS.accent}`,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => {
                const isSelected = row.pdm === selectedRowId;
                return (
                  <tr
                    key={`${row.pdm}-${i}`}
                    onClick={() => setSelectedRowId(row.pdm)}
                    style={{
                      background: isSelected ? '#000000' : (i % 2 === 0 ? PBI_COLORS.tableRowPrimary : PBI_COLORS.tableRowSecondary),
                      cursor: 'pointer',
                    }}
                  >
                    {TABLE_COLUMNS.map((c) => {
                      const raw = row[c.key];
                      const value = raw === undefined || raw === null ? '' : String(raw);
                      const color = cellColor(c.key, value);
                      return (
                        <td
                          key={c.key}
                          title={value}
                          style={{
                            padding: '2px 4px',
                            color: color ?? PBI_COLORS.textPrimary,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            boxShadow: isSelected && c.key === 'pdm' ? `inset 2px 0 0 ${PBI_COLORS.accent}` : undefined,
                          }}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PbiBox>

      {/* ---------------- Stato vuoto (web app non alimentata) ---------------- */}
      {pdmList.length === 0 && (
        <PbiBox x={0} y={0} w={1280} h={720} z={30000}
          style={{ background: 'rgba(0,0,0,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <span style={{ color: PBI_COLORS.textPrimary, fontSize: 15, fontWeight: 700 }}>Web app non alimentata (0 record)</span>
          <span style={{ color: PBI_COLORS.textMuted, fontSize: 12 }}>
            Alimenta la web app con i file SAP (es. ZSTMAIA) oppure carica i dati demo.
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {onOpenFileLoader && (
              <button
                type="button"
                onClick={onOpenFileLoader}
                style={{ background: PBI_COLORS.accent, color: '#111', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Alimenta Web App
              </button>
            )}
            {onLoadDemoData && (
              <button
                type="button"
                onClick={onLoadDemoData}
                style={{ background: PBI_COLORS.button, color: PBI_COLORS.textLight, border: `1px solid ${PBI_COLORS.tileBorder}`, borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Carica Demo
              </button>
            )}
          </div>
        </PbiBox>
      )}
    </PbiCanvas>
  );
};
