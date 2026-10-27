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
/** Bucket di `IW67.Stato` (derivati da St.sist. + Data Fine Richiesta, come la query PBIR). */
const STATI_SCADENZA = ['SCAD.>60GG', 'SCAD.<60GG', 'SCAD.<30GG', 'SCAD.<10GG', 'SCADUTO', 'CHIUSO'];

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

  // Anni disponibili (dal dataset, per lo slicer "Anno avviso")
  const anniOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.anno) set.add(r.anno); });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (selectedAnni.length > 0 && !selectedAnni.includes(r.anno)) return false;
    if (selectedTrimestri.length > 0 && !selectedTrimestri.includes(r.trimestre)) return false;
    if (selectedDivisioni.length > 0 && !selectedDivisioni.includes(r.divisione)) return false;
    if (selectedUM.length > 0 && !selectedUM.includes(r.lvu)) return false;
    if (selectedTipi.length > 0 && !selectedTipi.includes(r.tipo)) return false;
    if (selectedStati.length > 0 && !selectedStati.includes(r.stato)) return false;
    if (selectedLinee.length > 0 && !selectedLinee.includes(r.linea)) return false;
    return true;
  }), [rows, selectedAnni, selectedTrimestri, selectedDivisioni, selectedUM, selectedTipi, selectedStati, selectedLinee]);

  // Bar chart: CountNonNull(IW67.Avviso) per IW67.Stato
  const barData = useMemo(() => {
    const counts: Record<string, number> = {};
    STATI_SCADENZA.forEach((s) => { counts[s] = 0; });
    filtered.forEach((r) => { if (r.stato) counts[r.stato] = (counts[r.stato] ?? 0) + 1; });
    return STATI_SCADENZA.map((name) => ({ name, count: counts[name] ?? 0 }));
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

    try {
      L.geoJSON(rfiTracksGeoJson as any, {
        style: () => ({ color: PBI_COLORS.textLight, weight: 2, opacity: 0.85 }),
      }).addTo(map);
    } catch (e) {
      console.warn('GeoJSON render error:', e);
    }

    const markers = L.layerGroup().addTo(map);
    markersLayerRef.current = markers;
    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 150);
  }, []);

  // Aggiornamento bubble (CountNonNull(Avviso) per località, fill #2F9292)
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    const groups: Record<string, { lat: number; lng: number; count: number; name: string }> = {};
    filtered.forEach((r) => {
      const key = `${r.lat.toFixed(2)}_${r.lng.toFixed(2)}`;
      if (!groups[key]) groups[key] = { lat: r.lat, lng: r.lng, count: 0, name: r.localita };
      groups[key].count++;
    });

    Object.values(groups).forEach((g) => {
      const radius = Math.min(14, Math.max(6, 6 + Math.sqrt(g.count)));
      L.circleMarker([g.lat, g.lng], {
        radius,
        fillColor: TEAL,
        fillOpacity: 0.75,
        color: '#154141',
        weight: 1,
      })
        .bindTooltip(
          `<div style="font-size:11px"><b>${g.name}</b><br/>Avvisi: ${g.count}</div>`,
          { direction: 'top' },
        )
        .addTo(markersLayerRef.current!);
    });
  }, [filtered]);

  return (
    <PbiCanvas>
      {/* ================= Pannelli / sfondi ================= */}
      <PbiShape x={0} y={65.45454545454545} w={278.46153846153845} h={85.38461538461539} z={0} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={0} y={212.96703296703296} w={649.2857142857143} h={92.85714285714286} z={0} fill={PBI_COLORS.card} radius={7} />
      <PbiShape x={134.16666666666669} y={140.83333333333334} w={244.58333333333334} h={85.41666666666667} z={1000} fill={PBI_COLORS.card} radius={7} />
      <PbiShape x={365.38461538461536} y={140.76923076923077} w={279.2307692307692} h={85.38461538461539} z={6000} fill={PBI_COLORS.card} radius={7} />
      <PbiShape x={269.2307692307691} y={64.61538461538461} w={219.23076923076923} h={85.38461538461539} z={7000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={447} y={296} w={202} h={193} z={9000} fill={PBI_COLORS.card} radius={5} />
      <PbiShape x={640} y={0} w={640} h={488.5575364667747} z={11000} fill="#000000" radius={2} />
      <PbiShape x={480.7692307692308} y={64.61538461538461} w={168.46153846153845} h={85.38461538461539} z={13000} fill={PBI_COLORS.panel} radius={7} />
      <PbiShape x={0} y={140.76923076923077} w={148.46153846153845} h={85.38461538461539} z={14000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={0.7692307692307692} y={296.15384615384613} w={456.15384615384613} h={193.07692307692307} z={15000} fill={PBI_COLORS.panel} radius={5} />
      <PbiShape x={0} y={479.09090909090907} w={1280} h={240.90909090909088} z={28000} fill={PBI_COLORS.band} radius={5} />

      {/* ================= Intestazione ================= */}
      <PbiBox x={1} y={0} w={210} h={61.53846153846153} z={23000}>
        <img
          src="/assets/logo_ufficiale.png"
          alt="RFI"
          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }}
        />
      </PbiBox>
      <PbiText x={202} y={4} w={485} h={28} z={2000}
        text="Difetti di livello e scartamento - DOIT VE" sizePt={20} bold color={RED} />
      <PbiText x={210.71428571428572} y={34.285714285714285} w={129.2857142857143} h={25.714285714285715} z={25000}
        text="Avvisi V3 e V4" sizePt={15} bold color={PBI_COLORS.textLight} background={PBI_COLORS.canvas} />
      <PbiText x={352.4937445015781} y={33.29907670524769} w={61} h={28} z={24000}
        text="Dati al:" sizePt={12} color={PBI_COLORS.textMuted} align="right" vAlign="middle" background={PBI_COLORS.canvas} />
      <PbiText x={405.49374450157785} y={34.44193384810484} w={130.71428571428572} h={27.142857142857146} z={22000}
        text={dataAggiornamento} sizePt={12} color={PBI_COLORS.textLight} vAlign="middle" background={PBI_COLORS.canvas} />
      <PbiButton x={555.7142857142858} y={34.285714285714285} w={87.85714285714286} h={38.57142857142858} z={30000}
        label="Reset Filtri" sizePt={9} onClick={handleResetFilters} />

      {/* ================= Etichette dei filtri ================= */}
      <PbiText x={16.153846153846153} y={83.91608391608392} w={245.3846153846154} h={17.692307692307693} z={2000}
        text="Anno avviso" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} />
      <PbiText x={286.551208434105} y={82.73363000633466} w={183.09466344864578} h={18.18181818181818} z={12000}
        text="Trimestre" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} />
      <PbiText x={155.67664263620264} y={159.2518080210388} w={199.56562343594783} h={17} z={8000}
        text="Unità Manutentiva" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} />
      <PbiText x={17.619047619047617} y={159.04761904761904} w={111.42857142857143} h={17.142857142857142} z={18000}
        text="Divisione" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} />
      <PbiText x={380} y={159.04761904761904} w={250} h={17.142857142857142} z={31000}
        text="Tipo Avviso" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} />
      <PbiText x={16.42857142857143} y={232.99058084772372} w={613.5714285714286} h={22.142857142857146} z={5000}
        text="Scadenza Avviso" sizePt={9} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} />
      <PbiText x={17.692307692307693} y={316.15384615384613} w={416.9230769230769} h={20} z={19000}
        text="Numero Difetti" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} />

      {/* ================= Slicer a tile ================= */}
      <PbiTileSlicer x={0.7692307692307692} y={107.76223776223776} w={274.6153846153846} h={26.153846153846153} z={1000}
        options={anniOptions} value={selectedAnni} onToggle={(v) => toggle(setSelectedAnni, v)} />
      <PbiTileSlicer x={269.04761904761904} y={107.61904761904762} w={219.52380952380952} h={26.666666666666664} z={10000}
        options={TRIMESTRI} value={selectedTrimestri} onToggle={(v) => toggle(setSelectedTrimestri, v)} />
      <PbiTileSlicer x={1.1764705882352942} y={181.76470588235296} w={140.58823529411765} h={28.235294117647058} z={16000}
        options={DIVISIONI} value={selectedDivisioni} onToggle={(v) => toggle(setSelectedDivisioni, v)} />
      <PbiTileSlicer x={138.69233425867515} y={181.74753451676528} w={233.53424019100274} h={28.717948717948715} z={4000}
        options={UNITA_MANUTENTIVE} value={selectedUM} onToggle={(v) => toggle(setSelectedUM, v)} />
      <PbiTileSlicer x={488.46153846153845} y={181.53846153846152} w={150} h={28.46153846153846} z={32000}
        options={TIPI} value={selectedTipi} onToggle={(v) => toggle(setSelectedTipi, v)} />
      <PbiTileSlicer x={0} y={259} w={649} h={28} z={3000}
        options={STATI_SCADENZA} value={selectedStati} onToggle={(v) => toggle(setSelectedStati, v)} />
      <PbiText x={380} y={172.3076923076923} w={125.38461538461539} h={45.38461538461538} z={33000}
        text={'V3 → Dif. livello\nV4 → Dif. scartamento'} sizePt={8} color={PBI_COLORS.textLight} />

      {/* ================= KPI Num. difetti (cardVisual Min(IW67.Km.)) ================= */}
      <PbiText x={491.92932426425244} y={70.33566433566455} w={117} h={28} z={27000}
        text="Num. difetti" sizePt={12} color={PBI_COLORS.textLight} />
      <PbiBox x={488.46153846153845} y={80} w={151.53846153846155} h={59.230769230769226} z={26000}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: fontSizePx(35), color: TEAL, lineHeight: 1 }}>
          {minKm.toLocaleString('it-IT')}
        </span>
      </PbiBox>

      {/* ================= Bar chart IW67.Stato ================= */}
      <PbiBox x={17.692307692307693} y={323.07692307692304} w={423.8461538461538} h={158.46153846153845} z={20000}
        style={{ overflow: 'hidden' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={barData} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false}
              interval={0} tick={{ fill: PBI_COLORS.textLight, fontSize: 11 }} />
            <Bar dataKey="count" fill={TEAL} isAnimationActive={false} barSize={14}>
              <LabelList dataKey="count" position="right" fill={PBI_COLORS.textLight} fontSize={fontSizePx(12)} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </PbiBox>

      {/* ================= Slicer a elenco Linea InRete ================= */}
      <PbiListSlicer x={457.27272727272725} y={310.9090909090909} w={182.72727272727272} h={162.72727272727272} z={21000}
        title="Linea InRete" options={MASTER_LINEE_INRETE} value={selectedLinee}
        onToggle={(v) => toggle(setSelectedLinee, v)} itemColor={PBI_COLORS.textLight} itemSizePt={8} />

      {/* ================= Mappa bubble ================= */}
      <PbiBox x={656.5964343598055} y={17.633711507293356} w={604.7325769854133} h={456.40194489465154} z={17000}
        style={{ overflow: 'hidden' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </PbiBox>

      {/* ================= Tabella (17 colonne) ================= */}
      <PbiBox x={14.545454545454545} y={491.81818181818176} w={1250.9090909090908} h={214.54545454545453} z={29000}
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
