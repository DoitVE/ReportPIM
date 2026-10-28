import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Iw67Item, Avviso } from '../../types';
import { BarChart, Bar, XAxis, YAxis, LabelList, ResponsiveContainer } from 'recharts';
import L from 'leaflet';
import {
  rfiTracksGeoJson,
  lookupGpsCoordinates,
  parseItalianNumber,
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

interface PageAvvisiV3V4Props {
  iw67: Iw67Item[];
  avvisi: Avviso[];
  dataAggiornamento: string;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

/** Colore accento del report (titolo e bordi tabella). */
const RED = PBI_COLORS.accent; // #F26D6D
/** Riempimento del bar chart `IW67.Stato` e dei bubble della mappa. */
const TEAL = '#2F9292';

/* -------------------- Liste di valori degli slicer (PBIR) -------------------- */
const TRIMESTRI = ['1', '2', '3', '4'];
const DIVISIONI = ['VEM1', 'VEM2'];
const UNITA_MANUTENTIVE = ['LVU1', 'LVU2', 'LVU3', 'LVU4'];
const TIPI = ['V3', 'V4'];
/** Bucket attivi di `IW67.Stato` nel visual Power BI (esclude CHIUSO). */
const STATI_SCADENZA = ['SCAD.<10GG', 'SCAD.<30GG', 'SCAD.<60GG', 'SCAD.>60GG', 'SCADUTO'];
const STATI_BAR_ORDER = ['SCAD.>60GG', 'SCAD.<60GG', 'SCAD.<30GG', 'SCADUTO', 'SCAD.<10GG'];

const DAY_MS = 86_400_000;

/* -------------------- Helper di derivazione colonne -------------------- */
interface DateParts {
  d: number;
  m: number;
  y: number;
}

/** Estrae giorno/mese/anno da una data "gg/mm/aaaa" o "aaaa-mm-gg". */
const dateParts = (value?: string): DateParts | null => {
  if (!value) return null;
  const nums = value.split(/[^0-9]+/).filter(Boolean).map(Number);
  if (nums.length < 3) return null;
  const [a, b, c] = nums;
  return a > 1900 ? { y: a, m: b, d: c } : { d: a, m: b, y: c };
};

const dateTime = (value?: string): number => {
  const p = dateParts(value);
  return p ? new Date(p.y, p.m - 1, p.d).getTime() : 0;
};

/** "Testo per la misura" contiene l'intervallo Km. ("inizio - fine"). */
const splitKm = (testo: string): [string, string] => {
  const parts = testo.split('-');
  return [(parts[0] ?? '').trim(), (parts[1] ?? '').trim()];
};

/** Colonna calcolata `Stato` (St.sist. = MISC -> CHIUSO, altrimenti bucket sulla Data Fine Richiesta). */
const computeStato = (stSist: string, fineRichiesta: string): string => {
  if (stSist === 'MISC') return 'CHIUSO';
  const t = dateTime(fineRichiesta);
  if (!t) return 'SCAD.>60GG';
  const now = Date.now();
  if (t < now) return 'SCADUTO';
  if (t < now + 10 * DAY_MS) return 'SCAD.<10GG';
  if (t < now + 30 * DAY_MS) return 'SCAD.<30GG';
  if (t < now + 60 * DAY_MS) return 'SCAD.<60GG';
  return 'SCAD.>60GG';
};

/** Conditional formatting della colonna `Stato` (colori di testo del PBIR). */
const statoColor = (value: string): string | undefined => {
  if (value.includes('<10') || value.includes('SCADUTO') || value.includes('MANCANTE')) return PBI_COLORS.accent;
  if (value.includes('<30')) return PBI_COLORS.warn;
  if (value.includes('<60')) return PBI_COLORS.mid;
  return undefined;
};

/* -------------------- Riga unificata IW67 + LO-TR -------------------- */
interface V34Row {
  avviso: string;
  data: string;
  statoSist: string;
  tipo: string;
  localita: string;
  sede: string;
  bin: string;
  defSede: string;
  codice: string;
  kmInizio: string;
  kmFine: string;
  valDifetto: string;
  testo: string;
  codStato: string;
  stato: string;
  dataFineRichiesta: string;
  dataEsec: string;
  anno: string;
  trimestre: string;
  divisione: string;
  lvu: string;
  linea: string;
  lat: number;
  lng: number;
}

interface V34Column {
  key: string;
  label: string;
  width: number;
  value: (r: V34Row) => string;
  color?: (value: string) => string | undefined;
}

/** Le 17 colonne del `tableEx` nell'ordine del PBIR, con le larghezze esatte. */
const TABLE_COLUMNS: V34Column[] = [
  { key: 'avviso', label: 'Avviso', width: 65, value: (r) => r.avviso },
  { key: 'data', label: 'Data', width: 90, value: (r) => r.data },
  { key: 'statoSist', label: 'Stato sist.', width: 43, value: (r) => r.statoSist },
  { key: 'tipo', label: 'Tipo', width: 25, value: (r) => r.tipo },
  { key: 'localita', label: 'Località/Tratta', width: 205.75567008302394, value: (r) => r.localita },
  { key: 'sede', label: 'Sede tecnica', width: 95, value: (r) => r.sede },
  { key: 'bin', label: 'Bin.', width: 48, value: (r) => r.bin },
  { key: 'defSede', label: 'Definizione della sede tecnica', width: 212, value: (r) => r.defSede },
  { key: 'codice', label: 'Codice', width: 90, value: (r) => r.codice },
  { key: 'kmInizio', label: 'Km inizio', width: 48, value: (r) => r.kmInizio },
  { key: 'kmFine', label: 'Km fine', width: 48, value: (r) => r.kmFine },
  { key: 'valDifetto', label: 'Val. difetto', width: 51, value: (r) => r.valDifetto },
  { key: 'testo', label: 'Testo', width: 150, value: (r) => r.testo },
  { key: 'codStato', label: 'Cod. Stato', width: 36, value: (r) => r.codStato },
  { key: 'stato', label: 'Stato', width: 93, value: (r) => r.stato, color: statoColor },
  { key: 'dataFineRichiesta', label: 'Data Fine Richiesta', width: 90, value: (r) => r.dataFineRichiesta },
  { key: 'dataEsec', label: 'DataEsec.', width: 90, value: (r) => r.dataEsec },
];

const TABLE_WIDTH = TABLE_COLUMNS.reduce((sum, c) => sum + c.width, 0);

/* -------------------- Pagina -------------------- */
export const PageAvvisiV3V4: React.FC<PageAvvisiV3V4Props> = ({
  iw67,
  avvisi,
  dataAggiornamento,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Stato degli slicer (multi-selezione, come i visual originali)
  const [selectedAnni, setSelectedAnni] = useState<string[]>([]);
  const [selectedTrimestri, setSelectedTrimestri] = useState<string[]>([]);
  const [selectedDivisioni, setSelectedDivisioni] = useState<string[]>([]);
  const [selectedUM, setSelectedUM] = useState<string[]>([]);
  const [selectedTipi, setSelectedTipi] = useState<string[]>([]);
  const [selectedStati, setSelectedStati] = useState<string[]>([]);
  const [selectedLinee, setSelectedLinee] = useState<string[]>([]);
  const [selectedMapLocalita, setSelectedMapLocalita] = useState<string | null>(null);

  // Contenitore Leaflet
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  const handleResetFilters = () => {
    setSelectedAnni([]);
    setSelectedTrimestri([]);
    setSelectedDivisioni([]);
    setSelectedUM([]);
    setSelectedTipi([]);
    setSelectedStati([]);
    setSelectedLinee([]);
    setSelectedMapLocalita(null);
  };

  // Join LO-TR su numero avviso
  const avvByAvviso = useMemo(() => {
    const map = new Map<string, Avviso>();
    avvisi.forEach((a) => map.set(a.avviso, a));
    return map;
  }, [avvisi]);

  const rows = useMemo<V34Row[]>(() => iw67.map((item) => {
    const match = avvByAvviso.get(item.Avviso);
    const [kmInizio, kmFine] = splitKm(item['Testo per la misura'] ?? '');
    const dt = dateParts(item.Data);
    const fineRichiesta = item['FineRich.'] ?? '';
    const coords = match && match.lat && match.lng
      ? { lat: match.lat, lng: match.lng }
      : lookupGpsCoordinates(item['Sede tecnica'], item['Definizione della sede tecnica'], kmInizio, match?.linea);

    return {
      avviso: item.Avviso,
      data: item.Data || '',
      statoSist: item['St.sist.'] || '',
      tipo: item['Tp.'] || '',
      localita: match?.nome_sede || item['Definizione della sede tecnica'] || '',
      sede: item['Sede tecnica'] || '',
      bin: '',
      defSede: item['Definizione della sede tecnica'] || '',
      codice: item.Codice || '',
      kmInizio,
      kmFine,
      valDifetto: '',
      testo: item['Testo codice per misura'] || '',
      codStato: '',
      stato: computeStato(item['St.sist.'] ?? '', fineRichiesta),
      dataFineRichiesta: fineRichiesta,
      dataEsec: item.DataEsec || '',
      anno: dt ? String(dt.y) : '',
      trimestre: dt ? String(Math.ceil(dt.m / 3)) : '',
      divisione: match?.divisione || '',
      lvu: match?.lvu || '',
      linea: match?.linea || '',
      lat: coords.lat,
      lng: coords.lng,
    };
  }), [iw67, avvByAvviso]);

  // Filtro a livello di pagina Power BI: Difetti aperti/attivi (esclude CHIUSO / MISC)
  const baseRows = useMemo(() => rows.filter((r) => r.stato !== 'CHIUSO' && r.statoSist !== 'MISC'), [rows]);

  // Anni disponibili: dinamici per mostrare sempre gli ultimi 5 anni dalla data più recente nei dati
  const anniOptions = useMemo(() => {
    const set = new Set<number>();
    baseRows.forEach((r) => {
      const y = parseInt(r.anno, 10);
      if (!isNaN(y) && y >= 1990 && y <= 2100) set.add(y);
    });
    const sorted = Array.from(set).sort((a, b) => a - b);
    if (sorted.length === 0) return ['2023', '2024', '2025', '2026', '2027'];
    const maxYear = sorted[sorted.length - 1];
    const last5 = [maxYear - 4, maxYear - 3, maxYear - 2, maxYear - 1, maxYear];
    return last5.map(String);
  }, [baseRows]);

  const filtered = useMemo(() => baseRows.filter((r) => {
    if (selectedAnni.length > 0 && !selectedAnni.includes(r.anno)) return false;
    if (selectedTrimestri.length > 0 && !selectedTrimestri.includes(r.trimestre)) return false;
    if (selectedDivisioni.length > 0 && !selectedDivisioni.includes(r.divisione)) return false;
    if (selectedUM.length > 0 && !selectedUM.includes(r.lvu)) return false;
    if (selectedTipi.length > 0 && !selectedTipi.includes(r.tipo)) return false;
    if (selectedStati.length > 0 && !selectedStati.includes(r.stato)) return false;
    if (selectedLinee.length > 0 && !selectedLinee.includes(r.linea)) return false;
    if (selectedMapLocalita && r.localita !== selectedMapLocalita) return false;
    return true;
  }), [baseRows, selectedAnni, selectedTrimestri, selectedDivisioni, selectedUM, selectedTipi, selectedStati, selectedLinee, selectedMapLocalita]);

  // Bar chart: CountNonNull(IW67.Avviso) per IW67.Stato nell'ordine Power BI
  const barData = useMemo(() => {
    const counts: Record<string, number> = {};
    STATI_BAR_ORDER.forEach((s) => { counts[s] = 0; });
    filtered.forEach((r) => { if (r.stato && counts[r.stato] !== undefined) counts[r.stato] = (counts[r.stato] ?? 0) + 1; });
    return STATI_BAR_ORDER.map((name) => ({ name, count: counts[name] ?? 0 }));
  }, [filtered]);

  // cardVisual: Min(IW67.Km.)
  const minKm = useMemo(() => {
    const vals = filtered.map((r) => parseItalianNumber(r.kmInizio)).filter((v) => v > 0);
    return vals.length ? Math.min(...vals) : 0;
  }, [filtered]);

  // Inizializzazione mappa Leaflet (stile grayscale_dark, referenceLayer DOIT VE)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [45.5450182383847, 12.249062892875827],
      zoom: 6.08,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(DEFAULT_DARK_TILE_URL, {
      attribution: DEFAULT_DARK_TILE_ATTRIBUTION,
      maxZoom: 16,
    }).addTo(map);

    let trackBounds: L.LatLngBounds | null = null;
    try {
      const geoLayer = L.geoJSON(rfiTracksGeoJson as any, {
        style: () => ({ color: PBI_COLORS.textLight, weight: 2, opacity: 0.85 }),
      }).addTo(map);
      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        trackBounds = bounds;
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
      if (trackBounds && trackBounds.isValid()) {
        map.fitBounds(trackBounds, { padding: [12, 12] });
      }
    }, 200);
  }, []);

  // Aggiornamento bubble (CountNonNull(Avviso) per località, fill #2F9292, cross-filtering al click)
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // Raggruppa i dati per punto/località
    const groups: Record<string, { lat: number; lng: number; count: number; name: string }> = {};
    baseRows.forEach((r) => {
      if (selectedAnni.length > 0 && !selectedAnni.includes(r.anno)) return;
      if (selectedTrimestri.length > 0 && !selectedTrimestri.includes(r.trimestre)) return;
      if (selectedDivisioni.length > 0 && !selectedDivisioni.includes(r.divisione)) return;
      if (selectedUM.length > 0 && !selectedUM.includes(r.lvu)) return;
      if (selectedTipi.length > 0 && !selectedTipi.includes(r.tipo)) return;
      if (selectedStati.length > 0 && !selectedStati.includes(r.stato)) return;
      if (selectedLinee.length > 0 && !selectedLinee.includes(r.linea)) return;

      const key = `${r.lat.toFixed(3)}_${r.lng.toFixed(3)}_${r.localita}`;
      if (!groups[key]) groups[key] = { lat: r.lat, lng: r.lng, count: 0, name: r.localita };
      groups[key].count++;
    });

    Object.values(groups).forEach((g) => {
      const isSelected = selectedMapLocalita === g.name;
      const isDimmed = selectedMapLocalita !== null && !isSelected;
      const radius = Math.min(14, Math.max(6, 6 + Math.sqrt(g.count)));

      L.circleMarker([g.lat, g.lng], {
        radius: isSelected ? radius + 2 : radius,
        fillColor: isSelected ? '#5CE5E5' : TEAL,
        fillOpacity: isDimmed ? 0.25 : isSelected ? 0.95 : 0.75,
        color: isSelected ? '#FFFFFF' : '#154141',
        weight: isSelected ? 2.5 : 1,
      })
        .bindTooltip(
          `<div style="font-family:Segoe UI, sans-serif; font-size:11px; line-height:1.45; color:#FFF; min-width:145px; padding:2px;">
            <div style="font-weight:700; color:#5CE5E5; margin-bottom:4px; font-size:12px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:3px;">
              ${g.name || 'Località/Tratta'}
            </div>
            <div><span style="color:#B3B3B3">Latitudine:</span> <b>${g.lat.toFixed(5)}</b></div>
            <div><span style="color:#B3B3B3">Longitudine:</span> <b>${g.lng.toFixed(5)}</b></div>
            <div><span style="color:#B3B3B3">Num. difetti / avvisi:</span> <b style="color:#5CE5E5">${g.count}</b></div>
            <div style="margin-top:5px; font-size:9px; color:#A0AEC0; font-style:italic;">
              ${isSelected ? '✓ Filtro attivo (clicca per rimuovere)' : '👆 Clicca sul punto per filtrare la pagina'}
            </div>
          </div>`,
          { direction: 'top' },
        )
        .on('click', () => {
          setSelectedMapLocalita((prev) => (prev === g.name ? null : g.name));
        })
        .addTo(markersLayerRef.current!);
    });
  }, [rows, selectedAnni, selectedTrimestri, selectedDivisioni, selectedUM, selectedTipi, selectedStati, selectedLinee, selectedMapLocalita]);

  return (
    <PbiCanvas>
      {/* ================= Pannelli / sfondi ================= */}
      <PbiShape x={15} y={66} w={190} h={68} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={215} y={66} w={140} h={68} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={365} y={66} w={130} h={68} z={0} fill={PBI_COLORS.panel} radius={6} />

      <PbiShape x={15} y={140} w={100} h={64} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={122} y={140} w={180} h={64} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={310} y={140} w={185} h={64} z={0} fill={PBI_COLORS.card} radius={6} />

      <PbiShape x={15} y={210} w={480} h={64} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={15} y={282} w={335} h={190} z={0} fill={PBI_COLORS.panel} radius={6} />
      <PbiShape x={358} y={282} w={137} h={190} z={0} fill={PBI_COLORS.card} radius={6} />

      {/* ================= Intestazione ================= */}
      <PbiBox x={15} y={8} w={140} h={38} z={23000}>
        <img
          src="/assets/logo_ufficiale.png"
          alt="RFI"
          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }}
        />
      </PbiBox>

      <PbiText x={170} y={8} w={330} h={26} z={2000}
        text="Difetti di livello e scartamento - DOIT VE" sizePt={16} bold color={RED} />
      <PbiText x={170} y={34} w={95} h={20} z={25000}
        text="Avvisi V3 e V4" sizePt={12} bold color={PBI_COLORS.textLight} />

      {/* Dati al: + Data aggiornamento + Pulsante Reset Filtri compatto a destra */}
      <PbiBox x={270} y={33} w={235} h={22} z={24000} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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

      {/* ================= Etichette dei filtri ================= */}
      <PbiText x={22} y={72} w={175} h={16} z={2000}
        text="Anno avviso" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={222} y={72} w={125} h={16} z={12000}
        text="Trimestre" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={22} y={144} w={85} h={16} z={18000}
        text="Divisione" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={128} y={144} w={165} h={16} z={8000}
        text="Unità Manutentiva" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={315} y={144} w={175} h={16} z={31000}
        text="Tipo Avviso" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={22} y={214} w={465} h={16} z={5000}
        text="Scadenza Avviso" sizePt={8.5} color={PBI_COLORS.textMuted} />
      <PbiText x={22} y={288} w={320} h={16} z={19000}
        text="Numero Difetti" sizePt={8} color={PBI_COLORS.textMuted} />

      {/* ================= Slicer a tile ================= */}
      <PbiTileSlicer x={20} y={94} w={180} h={28} z={1000}
        options={anniOptions} value={selectedAnni} onToggle={(v) => toggle(setSelectedAnni, v)} />
      <PbiTileSlicer x={220} y={94} w={130} h={28} z={10000}
        options={TRIMESTRI} value={selectedTrimestri} onToggle={(v) => toggle(setSelectedTrimestri, v)} />
      <PbiTileSlicer x={20} y={166} w={90} h={28} z={16000}
        options={DIVISIONI} value={selectedDivisioni} onToggle={(v) => toggle(setSelectedDivisioni, v)} />
      <PbiTileSlicer x={126} y={166} w={172} h={28} z={4000}
        options={UNITA_MANUTENTIVE} value={selectedUM} onToggle={(v) => toggle(setSelectedUM, v)} />
      <PbiTileSlicer x={415} y={166} w={75} h={28} z={32000}
        options={TIPI} value={selectedTipi} onToggle={(v) => toggle(setSelectedTipi, v)} />
      <PbiTileSlicer x={20} y={236} w={470} h={28} z={3000}
        options={STATI_SCADENZA} value={selectedStati} onToggle={(v) => toggle(setSelectedStati, v)} />
      <PbiText x={314} y={162} w={98} h={34} z={33000}
        text={'V3 → Dif. livello\nV4 → Dif. scartamento'} sizePt={7.5} color={PBI_COLORS.textLight} />

      {/* ================= KPI Num. difetti (conteggio difetti) ================= */}
      <PbiText x={365} y={72} w={130} h={18} z={27000}
        text="Num. difetti" sizePt={9.5} color={PBI_COLORS.textLight} align="center" />
      <PbiBox x={365} y={88} w={130} h={42} z={26000}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: fontSizePx(30), fontWeight: 700, color: TEAL, lineHeight: 1 }}>
          {filtered.length.toLocaleString('it-IT')}
        </span>
      </PbiBox>

      {/* ================= Bar chart IW67.Stato ================= */}
      <PbiBox x={20} y={306} w={325} h={160} z={20000} style={{ overflow: 'hidden' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={barData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={85} tickLine={false} axisLine={false}
              interval={0} tick={{ fill: PBI_COLORS.textLight, fontSize: 10 }} />
            <Bar dataKey="count" fill={TEAL} isAnimationActive={false} barSize={12} radius={[0, 2, 2, 0]}>
              <LabelList dataKey="count" position="right" fill={PBI_COLORS.textLight} fontSize={fontSizePx(9.5)} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </PbiBox>

      {/* ================= Slicer a elenco Linea InRete ================= */}
      <PbiListSlicer x={358} y={282} w={137} h={190} z={21000}
        title="Linea InRete" options={MASTER_LINEE_INRETE} value={selectedLinee}
        onToggle={(v) => toggle(setSelectedLinee, v)} itemColor={PBI_COLORS.textLight} itemSizePt={8} />

      {/* ================= Mappa bubble ================= */}
      <PbiBox x={505} y={10} w={760} h={462} z={17000}
        style={{ overflow: 'hidden', borderRadius: 4 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </PbiBox>

      {/* ================= Tabella (17 colonne) ================= */}
      <PbiBox x={15} y={482} w={1250} h={228} z={29000}
        style={{ border: `2px solid ${RED}`, overflow: 'hidden', background: PBI_COLORS.band }}>
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
                      borderRight: `1px solid ${RED}`,
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
              {filtered.map((row, i) => (
                <tr
                  key={`${row.avviso}-${i}`}
                  style={{ background: i % 2 === 0 ? PBI_COLORS.tableRowPrimary : PBI_COLORS.tableRowSecondary }}
                >
                  {TABLE_COLUMNS.map((c) => {
                    const value = c.value(row);
                    const color = c.color ? c.color(value) : undefined;
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
                        }}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PbiBox>

      {/* ================= Stato vuoto (web app non alimentata) ================= */}
      {iw67.length === 0 && (
        <PbiBox x={0} y={0} w={1280} h={720} z={65000}
          style={{ background: 'rgba(0,0,0,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <span style={{ color: PBI_COLORS.textPrimary, fontSize: 15, fontWeight: 700 }}>Web app non alimentata (0 record)</span>
          <span style={{ color: PBI_COLORS.textMuted, fontSize: 12 }}>
            Alimenta la web app con i file SAP (es. IW67, IW29) oppure carica i dati demo.
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {onOpenFileLoader && (
              <button
                type="button"
                onClick={onOpenFileLoader}
                style={{ background: RED, color: '#111', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
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
