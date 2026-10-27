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

  const [selectedRowId, setSelectedRowId] = useState<string>('');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

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

  const anniOptions = useMemo(
    () => Array.from(new Set(baseRows.map((r) => r.anno))).filter(Boolean).sort(),
    [baseRows],
  );

  const filtered = useMemo(() => baseRows.filter((r) => {
    if (selAnni.length > 0 && !selAnni.includes(r.anno)) return false;
    if (selTrimestri.length > 0 && !selTrimestri.includes(r.trimestre)) return false;
    if (selDivisioni.length > 0 && !selDivisioni.includes(r.divisione)) return false;
    if (selUm.length > 0 && !selUm.includes(r.um)) return false;
    if (selTipi.length > 0 && !selTipi.includes(r.tipo)) return false;
    if (selScadenze.length > 0 && !selScadenze.includes(r.scadenza)) return false;
    if (selStati.length > 0 && !selStati.includes(r.stato)) return false;
    if (selLinee.length > 0 && !selLinee.includes(r.linea)) return false;
    return true;
  }), [baseRows, selAnni, selTrimestri, selDivisioni, selUm, selTipi, selScadenze, selStati, selLinee]);

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

  // bubbleLayer: fill #99BD3C, stroke #4E601E, raggio 6..14
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    const groups: Record<string, { lat: number; lng: number; count: number; name: string; rowId: string }> = {};
    filtered.forEach((r) => {
      const key = `${r.lat.toFixed(2)}_${r.lng.toFixed(2)}`;
      if (!groups[key]) groups[key] = { lat: r.lat, lng: r.lng, count: 0, name: r.localita, rowId: r.id };
      groups[key].count += r.conteggio;
    });

    Object.values(groups).forEach((g) => {
      const radius = Math.min(14, Math.max(6, 6 + Math.sqrt(g.count)));
      L.circleMarker([g.lat, g.lng], {
        radius,
        fillColor: BIN_GREEN,
        fillOpacity: 0.7,
        color: '#4E601E',
        weight: 1,
      })
        .bindTooltip(
          `<div style="font-size:11px"><b>${g.name}</b><br/>Num. difetti: ${g.count}</div>`,
          { direction: 'top' },
        )
        .on('click', () => setSelectedRowId(g.rowId))
        .addTo(markersLayerRef.current!);
    });
  }, [filtered]);

  return (
    <PbiCanvas>
      {/* ================= Sfondi / pannelli ================= */}
      <PbiShape x={138.69230769230484} y={140.76923076923077} w={236.9230769230769} h={86.15384615384615} z={0} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={0} y={218.09749407804514} w={647.2609400324149} h={88.16855753646676} z={1000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={0} y={65.45454545454545} w={278.46153846153845} h={85.38461538461539} z={3000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={365.1215559157212} y={141.06969205834685} w={282.1393841166937} h={85.05672609400324} z={5000} fill={PBI_COLORS.card} radius={7} />
      <PbiShape x={269.2307692307691} y={64.61538461538461} w={219.23076923076923} h={85.38461538461539} z={8000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={0} y={413} w={211} h={271} z={12000} fill={PBI_COLORS.card} radius={5} />
      <PbiShape x={640} y={0} w={640} h={417.27272727272725} z={14000} fill="#000000" radius={2} />
      <PbiShape x={480.7692307692308} y={64.61538461538461} w={168.46153846153845} h={85.38461538461539} z={16000} fill={PBI_COLORS.panel} radius={7} />
      <PbiShape x={0} y={140.76923076923077} w={148.46153846153845} h={85.38461538461539} z={17000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={0.8695652173913044} y={296.5217391304348} w={371.304347826087} h={120.86956521739131} z={18000} fill={PBI_COLORS.panel} radius={5} />
      <PbiShape x={363.9130434782609} y={296.5217391304348} w={284.34782608695656} h={120.86956521739131} z={37000} fill={PBI_COLORS.card} radius={7} />
      <PbiShape x={201.8181818181818} y={411.8181818181818} w={1078.181818181818} h={271.8181818181818} z={31000} fill={PBI_COLORS.tableRowSecondary} radius={5} />

      {/* ================= Intestazione ================= */}
      <PbiBox x={1} y={0} w={210} h={61.53846153846153} z={26000}>
        <img
          src="/assets/logo_ufficiale.png"
          alt="RFI"
          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }}
        />
      </PbiBox>
      <PbiText x={202} y={4} w={485} h={28} z={2000}
        text="Difetti di livello e scartamento - DOIT VE" sizePt={20} bold color={ACCENT} />
      <PbiText x={211} y={35} w={162} h={25} z={28000}
        text="Frequenza V3 e V4" sizePt={15} bold color={PBI_COLORS.textLight} background={PBI_COLORS.canvas} />
      <PbiText x={372.19226698812577} y={33.50695756924371} w={60} h={27} z={27000}
        text="Dati al:" sizePt={9} color={PBI_COLORS.textMuted} align="right" vAlign="middle" background={PBI_COLORS.canvas} padding={2} />
      <PbiText x={424.1153439112027} y={34.58388064616678} w={130.76923076923077} h={26.923076923076923} z={25000}
        text={dataAggiornamento} sizePt={12} color={PBI_COLORS.textLight} background={PBI_COLORS.canvas} vAlign="middle" padding={2} />

      {/* ================= Bottoni di navigazione ================= */}
      <PbiButton x={560} y={29} w={88} h={45} z={33000} label="Reset Filtri" sizePt={9} onClick={handleResetFilters} />
      <PbiButton x={1191.8181818181818} y={675.4545454545454} w={88} h={45} z={41000}
        label="Drill V3 V4" sizePt={9} disabled={!selectedRow} onClick={() => selectedRow && onNavigateToDrill(selectedRow)} />

      {/* ================= Etichette dei filtri ================= */}
      <PbiText x={16.153846153846153} y={84.61538461538461} w={245.3846153846154} h={16.923076923076923} z={11000}
        text="  Anno avviso" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.slicerHeader} padding={2} />
      <PbiText x={286.551208434105} y={82.73363000633466} w={183.09466344864578} h={18.18181818181818} z={15000}
        text="  Trimestre" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.slicerHeader} padding={2} />
      <PbiText x={155.67664263620264} y={159.2518080210388} w={199.56562343594783} h={18.188034188034187} z={9000}
        text="  Unità Manutentiva" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.slicerHeader} padding={2} />
      <PbiText x={17.692307692307693} y={161.53846153846152} w={111.53846153846153} h={17.692307692307693} z={21000}
        text="   Divisione" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.slicerHeader} padding={2} />
      <PbiText x={16} y={234} w={607} h={21} z={10000}
        text="  Scadenza Avviso" sizePt={9} color={PBI_COLORS.textMuted} background={PBI_COLORS.slicerHeader} padding={2} />
      <PbiText x={17.826086956521742} y={311.304347826087} w={327.3913043478261} h={18.260869565217394} z={22000}
        text="  Numero Difetti Binario" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.slicerHeader} padding={2} />
      <PbiText x={381.0372771474879} y={157.1562149357935} w={250} h={18.46153846153846} z={34000}
        text="  Tipo Avviso" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.slicerHeader} padding={2} />
      <PbiText x={381.0372771474879} y={170.23313801271658} w={125.38461538461539} h={45.38461538461538} z={36000}
        text={'V3 → Dif. livello\nV4 → Dif. scartamento'} sizePt={8} color={PBI_COLORS.textLight} />
      <PbiText x={382.4275362318841} y={328.4057971014489} w={246.66666666666669} h={18.333333333333336} z={38000}
        text="  Tipo Avviso" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.slicerHeader} padding={2} />
      <PbiText x={382.0372066802904} y={341.34017768574836} w={125.38461538461539} h={45.38461538461538} z={40000}
        text={'MISC → MISura Chiusa\nMIAP → MIsura Aperta'} sizePt={8} color={PBI_COLORS.textLight} />

      {/* ================= Slicer a tile ================= */}
      <PbiTileSlicer x={0.7692307692307692} y={107.76223776223776} w={274.6153846153846} h={26.153846153846153} z={7000}
        options={anniOptions} value={selAnni} onToggle={(v) => toggle(setSelAnni, v)} />
      <PbiTileSlicer x={269.2307692307692} y={107.6923076923077} w={220} h={26.153846153846153} z={13000}
        options={TRIMESTRI} value={selTrimestri} onToggle={(v) => toggle(setSelTrimestri, v)} />
      <PbiTileSlicer x={138.46153846153845} y={181.53846153846152} w={236.9230769230769} h={29.23076923076923} z={4000}
        options={UNITA_MANUTENTIVE} value={selUm} onToggle={(v) => toggle(setSelUm, v)} />
      <PbiTileSlicer x={0.7692307692307692} y={183.84615384615384} w={147.69230769230768} h={27.69230769230769} z={19000}
        options={DIVISIONI} value={selDivisioni} onToggle={(v) => toggle(setSelDivisioni, v)} />
      <PbiTileSlicer x={0} y={260} w={647} h={27} z={6000}
        options={SCADENZE} value={selScadenze} onToggle={(v) => toggle(setSelScadenze, v)} />
      <PbiTileSlicer x={489.49881560902634} y={179.4639072434858} w={150} h={28.46153846153846} z={35000}
        options={TIPI} value={selTipi} onToggle={(v) => toggle(setSelTipi, v)} />
      <PbiTileSlicer x={489.2307692307692} y={350.7692307692308} w={160} h={28.46153846153846} z={39000}
        options={STATI_MISURA} value={selStati} onToggle={(v) => toggle(setSelStati, v)} />

      {/* ================= Slicer a elenco ================= */}
      <PbiListSlicer x={10} y={425} w={181} h={244} z={24000}
        title="Linea InRete" options={MASTER_LINEE_INRETE} value={selLinee}
        onToggle={(v) => toggle(setSelLinee, v)} itemColor={PBI_COLORS.textLight} />

      {/* ================= KPI Num. difetti ================= */}
      <PbiText x={491.92932426425244} y={70.33566433566455} w={117} h={28} z={30000}
        text="Num. difetti" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiText x={488.46153846153845} y={80} w={151.53846153846155} h={59.230769230769226} z={29000}
        text={formatCount(totalDifetti)} sizePt={35} color={BIN_GREEN} align="center" vAlign="middle" />

      {/* ================= Grafico Numero Difetti Binario ================= */}
      <BinBars x={18.260869565217394} y={316.5217391304348} w={337} h={96} z={23000}
        data={binChartData} onSelect={(bin) => { const row = rowForBin(bin); if (row) onNavigateToDrill(row); }} />

      {/* ================= Mappa (azureMap) ================= */}
      <PbiBox x={656.3636363636363} y={17.27272727272727} w={604.5454545454545} h={383.6363636363636} z={20000} style={{ overflow: 'hidden' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </PbiBox>

      {/* ================= Tabella (Punto di Misura) ================= */}
      <PbiBox x={219.09090909090907} y={424.5454545454545} w={1046.3636363636363} h={243.63636363636363} z={32000}
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
