import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Iw67Item, Avviso } from '../../types';
import { BarChart, Bar, XAxis, YAxis, LabelList, ResponsiveContainer } from 'recharts';
import L from 'leaflet';
import {
  rfiTracksGeoJson,
  lookupGpsCoordinates,
  extractBaseSede,
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

export interface FrequenzaRow {
  id: string;
  linea: string;
  setePrimoLivello: string;
  localita: string;
  sete: string;
  definizione: string;
  bin: string;
  kmRif: number;
  conteggio: number;
  um: string;
  lat: number;
  lng: number;
}

interface PageFrequenzaV3V4Props {
  iw67: Iw67Item[];
  avvisi: Avviso[];
  dataAggiornamento: string;
  onNavigateToDrill: (row: FrequenzaRow) => void;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

/** Riga arricchita con le dimensioni dei filtri del PBIR (non esportata). */
interface FrequenzaRowExt extends FrequenzaRow {
  anno: string;
  trimestre: string;
  divisione: string;
  tipo: string;
  stato: string;
  scadenza: string;
}

/* -------------------- Domini dei filtri (dai visual PBIR) -------------------- */
const TRIMESTRI = ['1', '2', '3', '4'];
const DIVISIONI = ['VEM1', 'VEM2'];
const UNITA_MANUTENTIVE = ['LVU1', 'LVU2', 'LVU3', 'LVU4'];
const TIPI = ['V3', 'V4'];
const SCADENZE = ['CHIUSO', 'SCAD.<10GG', 'SCAD.<30GG', 'SCAD.<60GG', 'SCAD.>60GG', 'SCADUTO'];
const STATI_MISURA = ['MIAP', 'MISC'];
const BIN_ORDER = ['DISPARI', 'PARI', 'UNICO'];

const ACCENT = PBI_COLORS.accent; // #F26D6D
const BIN_GREEN = '#99BD3C';

/* -------------------- Helper di mapping -------------------- */

/** "15.08.2019" / "15/08/2019" -> { anno, trimestre }. */
const parseDataAvviso = (value?: string): { anno: string; trimestre: string } => {
  const m = /(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(value || '');
  if (!m) return { anno: '', trimestre: '' };
  const month = Number(m[2]);
  return { anno: m[3], trimestre: String(Math.ceil(month / 3)) };
};

/** IH06.Bin. ricavato dalla definizione della sede tecnica ("Binario Pari ..."). */
const parseBin = (definizione: string): string => {
  const m = /Binario\s+([A-Za-zÀ-ÿ]+)/i.exec(definizione);
  const raw = (m?.[1] || '').toUpperCase();
  if (raw === 'PARI') return 'PARI';
  if (raw === 'DISPARI') return 'DISPARI';
  return 'UNICO';
};

/** IW67.Km. rif. ricavato dalla prima coppia chilometrica di "Testo per la misura". */
const parseKmRif = (testo?: string): number => {
  const m = /^(\d{1,4}[.,]\d+)/.exec((testo || '').trim());
  return m ? Math.round(parseItalianNumber(m[1])) : 0;
};

/** LO-TR.Località/Tratta: dal nome sede dell'avviso o dal testo della definizione. */
const parseLocalita = (definizione: string, fallback: string): string => {
  const cleaned = definizione.replace(/^Binario\s+\S+\s+/i, '').trim();
  return cleaned || fallback;
};

/** Scadenza avviso (LO-TR) derivata dallo stato dell'avviso collegato. */
const scadenzaDaAvviso = (a?: Avviso): string => {
  if (!a) return 'SCAD.>60GG';
  if ((a.stato_utente || '').toUpperCase().includes('CHIUSO')) return 'CHIUSO';
  if (a.stato_scadenza === 'Scaduto') return 'SCADUTO';
  if (a.stato_scadenza === 'In scadenza') return 'SCAD.<30GG';
  return 'SCAD.>60GG';
};

/** Formattazione compatta dello stile card Power BI ("12K"). */
const formatCount = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')}K` : String(n);

/* -------------------- Grafico a barre "Numero Difetti Binario" -------------------- */

interface BinDatum {
  name: string;
  count: number;
}

const BinBars: React.FC<{
  x: number; y: number; w: number; h: number; z: number;
  data: BinDatum[];
  onSelect: (bin: string) => void;
}> = ({ x, y, w, h, z, data, onSelect }) => (
  <PbiBox x={x} y={y} w={w} h={h} z={z} style={{ overflow: 'hidden' }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 30, left: 0, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={70}
          tick={{ fill: '#E6E6E6', fontSize: 12 }}
        />
        <Bar
          dataKey="count"
          fill={BIN_GREEN}
          isAnimationActive={false}
          barSize={18}
          cursor="pointer"
          onClick={(d: BinDatum) => onSelect(d.name)}
        >
          <LabelList dataKey="count" position="right" fill="#E6E6E6" fontSize={16} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </PbiBox>
);

/* -------------------- Pagina -------------------- */
export const PageFrequenzaV3V4: React.FC<PageFrequenzaV3V4Props> = ({
  iw67,
  avvisi,
  dataAggiornamento,
  onNavigateToDrill,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Filtri (multi-selezione), come gli slicer del PBIR
  const [selAnni, setSelAnni] = useState<string[]>([]);
  const [selTrimestri, setSelTrimestri] = useState<string[]>([]);
  const [selDivisioni, setSelDivisioni] = useState<string[]>([]);
  const [selUm, setSelUm] = useState<string[]>([]);
  const [selTipi, setSelTipi] = useState<string[]>([]);
  const [selScadenze, setSelScadenze] = useState<string[]>([]);
  const [selStati, setSelStati] = useState<string[]>([]);
  const [selLinee, setSelLinee] = useState<string[]>([]);
  const [selectedMapLocalita, setSelectedMapLocalita] = useState<string | null>(null);

  const [selectedRowId, setSelectedRowId] = useState<string>('');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const trackBoundsRef = useRef<L.LatLngBounds | null>(null);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  const handleResetFilters = () => {
    setSelAnni([]);
    setSelTrimestri([]);
    setSelDivisioni([]);
    setSelUm([]);
    setSelTipi([]);
    setSelScadenze([]);
    setSelStati([]);
    setSelLinee([]);
    setSelectedMapLocalita(null);

    if (mapInstanceRef.current && trackBoundsRef.current) {
      mapInstanceRef.current.flyToBounds(trackBoundsRef.current, { padding: [12, 12], duration: 0.8 });
    }
  };

  // Aggregazione di frequenza: conteggi per Sede tecnica / Linea / Binario / Km
  const baseRows = useMemo<FrequenzaRowExt[]>(() => {
    const groups = new Map<string, {
      row: FrequenzaRowExt;
      count: number;
      kms: number[];
    }>();

    iw67.forEach((item) => {
      const avv = avvisi.find((a) => a.avviso === item.Avviso);
      const definizione = item['Definizione della sede tecnica'] || '';
      const sede = item['Sede tecnica'] || '';
      const setePrimoLivello = extractBaseSede(sede) || sede.split('-')[0] || '';
      const linea = avv?.linea || 'Milano-Venezia';
      const localita = avv?.nome_sede || parseLocalita(definizione, sede);
      const bin = parseBin(definizione);
      const kmRif = parseKmRif(item['Testo per la misura']);
      const um = item.CLavResp || 'LVU1';
      const { anno, trimestre } = parseDataAvviso(item.Data);
      const tipo = item['Tp.'] || 'V3';
      const stato = item['St.sist.'] || 'MISC';
      const divisione = avv?.divisione || 'VEM1';
      const scadenza = scadenzaDaAvviso(avv);
      const coords = lookupGpsCoordinates(sede, localita, kmRif || item.Latit_iniz, linea);

      const key = [linea, setePrimoLivello, localita, sede, definizione, bin, um].join('|');
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        if (kmRif > 0) existing.kms.push(kmRif);
      } else {
        groups.set(key, {
          count: 1,
          kms: kmRif > 0 ? [kmRif] : [],
          row: {
            id: '',
            linea,
            setePrimoLivello,
            localita,
            sete: sede,
            definizione,
            bin,
            kmRif,
            conteggio: 0,
            um,
            lat: coords.lat,
            lng: coords.lng,
            anno,
            trimestre,
            divisione,
            tipo,
            stato,
            scadenza,
          },
        });
      }
    });

    return Array.from(groups.values()).map((g, i) => ({
      ...g.row,
      id: `freq_${i}`,
      kmRif: g.kms.length ? Math.min(...g.kms) : 0,
      conteggio: g.count,
    }));
  }, [iw67, avvisi]);

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
    if (selAnni.length > 0 && !selAnni.includes(r.anno)) return false;
    if (selTrimestri.length > 0 && !selTrimestri.includes(r.trimestre)) return false;
    if (selDivisioni.length > 0 && !selDivisioni.includes(r.divisione)) return false;
    if (selUm.length > 0 && !selUm.includes(r.um)) return false;
    if (selTipi.length > 0 && !selTipi.includes(r.tipo)) return false;
    if (selScadenze.length > 0 && !selScadenze.includes(r.scadenza)) return false;
    if (selStati.length > 0 && !selStati.includes(r.stato)) return false;
    if (selLinee.length > 0 && !selLinee.includes(r.linea)) return false;
    if (selectedMapLocalita && r.localita !== selectedMapLocalita) return false;
    return true;
  }), [baseRows, selAnni, selTrimestri, selDivisioni, selUm, selTipi, selScadenze, selStati, selLinee, selectedMapLocalita]);

  // Tabella ordinata per frequenza (conteggio) decrescente
  const tableRows = useMemo(
    () => [...filtered].sort((a, b) => b.conteggio - a.conteggio),
    [filtered],
  );

  const selectedRow = useMemo(
    () => filtered.find((r) => r.id === selectedRowId) ?? filtered[0],
    [filtered, selectedRowId],
  );

  // KPI "Num. difetti" (card del PBIR): totale conteggi filtrati
  const totalDifetti = useMemo(
    () => filtered.reduce((acc, r) => acc + r.conteggio, 0),
    [filtered],
  );

  // Numero Difetti per Binario (clusteredBarChart)
  const binChartData = useMemo<BinDatum[]>(
    () => BIN_ORDER.map((name) => ({
      name,
      count: filtered.filter((r) => r.bin === name).reduce((acc, r) => acc + r.conteggio, 0),
    })),
    [filtered],
  );

  // Riga rappresentativa di un binario (per il drillthrough dalla barra)
  const rowForBin = (binValue: string): FrequenzaRow | undefined => {
    const rows = filtered.filter((r) => r.bin === binValue);
    if (rows.length === 0) return undefined;
    const first = rows[0];
    return {
      ...first,
      id: `bin_${binValue}`,
      conteggio: rows.reduce((acc, r) => acc + r.conteggio, 0),
      kmRif: Math.min(...rows.map((r) => r.kmRif)),
    };
  };

  /* ---------------- Mappa (azureMap) ---------------- */
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [45.550856133288704, 12.251054367500046],
      zoom: 6.93,
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

  // bubbleLayer: fill #99BD3C, stroke #4E601E, raggio 6..14, cross-filtering al click + zoom
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    const groups: Record<string, { lat: number; lng: number; count: number; name: string; rowId: string }> = {};
    baseRows.forEach((r) => {
      if (selAnni.length > 0 && !selAnni.includes(r.anno)) return;
      if (selTrimestri.length > 0 && !selTrimestri.includes(r.trimestre)) return;
      if (selDivisioni.length > 0 && !selDivisioni.includes(r.divisione)) return;
      if (selUm.length > 0 && !selUm.includes(r.um)) return;
      if (selTipi.length > 0 && !selTipi.includes(r.tipo)) return;
      if (selScadenze.length > 0 && !selScadenze.includes(r.scadenza)) return;
      if (selStati.length > 0 && !selStati.includes(r.stato)) return;
      if (selLinee.length > 0 && !selLinee.includes(r.linea)) return;

      const key = `${r.lat.toFixed(4)}_${r.lng.toFixed(4)}_${r.localita}`;
      if (!groups[key]) groups[key] = { lat: r.lat, lng: r.lng, count: 0, name: r.localita, rowId: r.id };
      groups[key].count += r.conteggio;
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
            <span style="font-weight: 700; color: #65a30d;">${g.count}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 12px; margin-top: 3px; border-top: 1px solid #e5e7eb; padding-top: 3px;">
            <span style="color: #6b7280; font-size: 10px; white-space: nowrap;">Prime Località/Tratta</span>
            <span style="font-weight: 700; color: #111827; text-align: right;">${g.name || 'Località'}</span>
          </div>
        </div>
      `;

      const marker = L.circleMarker([g.lat, g.lng], {
        radius: isSelected ? radius + 3 : radius,
        fillColor: isSelected ? '#C4E865' : BIN_GREEN,
        fillOpacity: isDimmed ? 0.2 : isSelected ? 0.95 : 0.75,
        color: isSelected ? '#FFFFFF' : '#4E601E',
        weight: isSelected ? 2.5 : 1,
      })
        .bindTooltip(tooltipContent, { direction: 'top', className: 'pbi-azure-tooltip', opacity: 0.98 })
        .on('click', () => {
          setSelectedRowId(g.rowId);
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
  }, [baseRows, selAnni, selTrimestri, selDivisioni, selUm, selTipi, selScadenze, selStati, selLinee, selectedMapLocalita]);

  return (
    <PbiCanvas>
      {/* ================= Sfondi / pannelli ================= */}
      <PbiShape x={15} y={66} w={190} h={68} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={215} y={66} w={140} h={68} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={365} y={66} w={130} h={68} z={0} fill={PBI_COLORS.panel} radius={6} />

      <PbiShape x={15} y={140} w={100} h={64} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={122} y={140} w={180} h={64} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={310} y={140} w={185} h={64} z={0} fill={PBI_COLORS.card} radius={6} />

      <PbiShape x={15} y={210} w={480} h={64} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={15} y={282} w={285} h={125} z={0} fill={PBI_COLORS.panel} radius={6} />
      <PbiShape x={308} y={282} w={187} h={125} z={0} fill={PBI_COLORS.card} radius={6} />

      {/* ================= Intestazione ================= */}
      <PbiBox x={15} y={8} w={140} h={38} z={26000}>
        <img
          src="/assets/logo_ufficiale.png"
          alt="RFI"
          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }}
        />
      </PbiBox>

      <PbiText x={170} y={8} w={330} h={26} z={2000}
        text="Difetti di livello e scartamento - DOIT VE" sizePt={16} bold color={ACCENT} />
      <PbiText x={170} y={34} w={115} h={20} z={28000}
        text="Frequenza V3 e V4" sizePt={12} bold color={PBI_COLORS.textLight} />

      {/* Dati al: + Data aggiornamento + Pulsante Reset Filtri compatto a destra */}
      <PbiBox x={290} y={33} w={230} h={22} z={27000} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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

      {/* ================= Bottoni di navigazione ================= */}
      <PbiButton x={1150} y={672} w={110} h={34} z={41000} variant="light"
        label="Drill V3 V4" sizePt={9} disabled={!selectedRow} onClick={() => selectedRow && onNavigateToDrill(selectedRow)} />

      {/* ================= Etichette dei filtri ================= */}
      <PbiText x={22} y={72} w={175} h={16} z={11000}
        text="Anno avviso" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={222} y={72} w={125} h={16} z={15000}
        text="Trimestre" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={22} y={144} w={85} h={16} z={21000}
        text="Divisione" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={128} y={144} w={165} h={16} z={9000}
        text="Unità Manutentiva" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={315} y={144} w={175} h={16} z={34000}
        text="Tipo Avviso" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={22} y={214} w={465} h={16} z={10000}
        text="Scadenza Avviso" sizePt={8.5} color={PBI_COLORS.textMuted} />
      <PbiText x={22} y={288} w={270} h={16} z={22000}
        text="Numero Difetti Binario" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={315} y={288} w={175} h={16} z={38000}
        text="Tipo Avviso" sizePt={8} color={PBI_COLORS.textMuted} />

      {/* ================= Slicer a tile ================= */}
      <PbiTileSlicer x={20} y={94} w={180} h={28} z={7000}
        options={anniOptions} value={selAnni} onToggle={(v) => toggle(setSelAnni, v)} />
      <PbiTileSlicer x={220} y={94} w={130} h={28} z={13000}
        options={TRIMESTRI} value={selTrimestri} onToggle={(v) => toggle(setSelTrimestri, v)} />
      <PbiTileSlicer x={20} y={166} w={90} h={28} z={19000}
        options={DIVISIONI} value={selDivisioni} onToggle={(v) => toggle(setSelDivisioni, v)} />
      <PbiTileSlicer x={126} y={166} w={172} h={28} z={4000}
        options={UNITA_MANUTENTIVE} value={selUm} onToggle={(v) => toggle(setSelUm, v)} />
      <PbiTileSlicer x={415} y={166} w={75} h={28} z={35000}
        options={TIPI} value={selTipi} onToggle={(v) => toggle(setSelTipi, v)} />
      <PbiTileSlicer x={20} y={236} w={470} h={28} z={6000}
        options={SCADENZE} value={selScadenze} onToggle={(v) => toggle(setSelScadenze, v)} />
      <PbiTileSlicer x={395} y={345} w={95} h={28} z={39000}
        options={STATI_MISURA} value={selStati} onToggle={(v) => toggle(setSelStati, v)} />

      <PbiText x={314} y={162} w={98} h={34} z={36000}
        text={'V3 → Dif. livello\nV4 → Dif. scartamento'} sizePt={7.5} color={PBI_COLORS.textLight} />
      <PbiText x={314} y={335} w={80} h={34} z={40000}
        text={'MISC → Chiusa\nMIAP → Aperta'} sizePt={7.5} color={PBI_COLORS.textLight} />

      {/* ================= KPI Num. difetti ================= */}
      <PbiText x={365} y={72} w={130} h={18} z={30000}
        text="Num. difetti" sizePt={9.5} color={PBI_COLORS.textLight} align="center" />
      <PbiBox x={365} y={88} w={130} h={42} z={29000}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: fontSizePx(30), fontWeight: 700, color: BIN_GREEN, lineHeight: 1 }}>
          {formatCount(totalDifetti)}
        </span>
      </PbiBox>

      {/* ================= Grafico Numero Difetti Binario ================= */}
      <BinBars x={20} y={306} w={275} h={92} z={23000}
        data={binChartData} onSelect={(bin) => { const row = rowForBin(bin); if (row) onNavigateToDrill(row); }} />

      {/* ================= Mappa (azureMap) ================= */}
      <PbiBox x={505} y={10} w={760} h={398} z={20000} style={{ overflow: 'hidden', borderRadius: 4 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </PbiBox>

      {/* ================= Slicer a elenco Linea InRete ================= */}
      <PbiListSlicer x={15} y={415} w={175} h={290} z={24000}
        title="Linea InRete" options={MASTER_LINEE_INRETE} value={selLinee}
        onToggle={(v) => toggle(setSelLinee, v)} itemColor={PBI_COLORS.textLight} />

      {/* ================= Tabella (Punto di Misura) ================= */}
      <PbiBox x={200} y={415} w={1065} h={250} z={32000}
        style={{ border: `2px solid ${ACCENT}`, overflow: 'hidden', background: PBI_COLORS.tableRowSecondary }}>
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
                      borderRight: `1px solid ${BIN_GREEN}`,
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
                const isSelected = row.id === selectedRowId;
                return (
                  <tr
                    key={row.id}
                    onClick={() => { setSelectedRowId(row.id); onNavigateToDrill(row); }}
                    style={{
                      background: isSelected ? '#000000' : (i % 2 === 0 ? PBI_COLORS.tableRowPrimary : PBI_COLORS.tableRowSecondary),
                      cursor: 'pointer',
                    }}
                  >
                    {TABLE_COLUMNS.map((c) => {
                      const value = c.value(row);
                      return (
                        <td
                          key={c.key}
                          title={value}
                          style={{
                            padding: '2px 4px',
                            color: i % 2 === 0 ? PBI_COLORS.textPrimary : PBI_COLORS.textMuted,
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
                );
              })}
            </tbody>
          </table>
        </div>
      </PbiBox>

      {/* ================= Stato vuoto ================= */}
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
                style={{ background: ACCENT, color: '#111', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
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

/* -------------------- Colonne del tableEx ("Punto di Misura") -------------------- */
interface FreqColumn {
  key: string;
  label: string;
  width: number;
  value: (r: FrequenzaRow) => string;
}

const TABLE_COLUMNS: FreqColumn[] = [
  { key: 'linea', label: 'Linea InRete', width: 152.65789809905354, value: (r) => r.linea },
  { key: 'setePrimoLivello', label: 'SeTe primo livello', width: 90, value: (r) => r.setePrimoLivello },
  { key: 'localita', label: 'Località/Tratta', width: 232.1312613672112, value: (r) => r.localita },
  { key: 'sete', label: 'Sede tecnica', width: 95, value: (r) => r.sete },
  { key: 'definizione', label: 'Definizione della sede tecnica', width: 254.5744455240934, value: (r) => r.definizione },
  { key: 'bin', label: 'Bin.', width: 48, value: (r) => r.bin },
  { key: 'kmRif', label: 'Km. rif.', width: 51.620745542949756, value: (r) => String(r.kmRif) },
  { key: 'conteggio', label: 'Conteggio di Val. difetto', width: 90, value: (r) => String(r.conteggio) },
];

const TABLE_WIDTH = TABLE_COLUMNS.reduce((sum, c) => sum + c.width, 0);
