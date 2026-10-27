import React, { useMemo, useState } from 'react';
import { PdmV5Item } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  LabelList,
  ResponsiveContainer,
  PieChart,
  Pie,
} from 'recharts';
import {
  PbiCanvas,
  PbiBox,
  PbiShape,
  PbiText,
  PbiListSlicer,
  PbiButton,
  PbiBackButton,
  PBI_COLORS,
  fontSizePx,
} from '../pbi/primitives';

interface PageDashboardV5Props {
  pdmList: PdmV5Item[];
  dataAggiornamento: string;
  onNavigateToDrill: (item: PdmV5Item) => void;
  onBack: () => void;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

/* -------------------- Palette -------------------- */
const RED = PBI_COLORS.accent; // #F26D6D
const BLUE = '#5CB8FF';
const GREEN = PBI_COLORS.good; // #6CC070
const YELLOW = PBI_COLORS.warn; // #F5C26B
const ORANGE = '#FC7942';
const PURPLE = '#8A50D8';

const HEADER_SLICER = PBI_COLORS.slicerHeader; // #1A1A1A
const SLICER_YELLOW = '#F5C26B';
const SLICER_ORANGE = '#FC7942';

/* Domini dei filtri */
const CLASSI = ['A', 'B', 'C1', 'C2', 'C3', 'MANCANTE', 'S1', 'S2'];
const SCADENZE = ['COMPLETATO', 'MANCANTE', 'SCAD.>60GG', 'SCAD.<60GG', 'SCAD.<30GG', 'SCAD.<10GG', 'SCADUTO'];
const SN = ['N', 'S'] as const;

/* -------------------- Conditional formatting tabella -------------------- */
const scadenzaColor = (v: string): string | undefined => {
  if (v.includes('<60')) return YELLOW;
  if (v.includes('MANCANTE')) return RED;
  if (v.includes('<30')) return ORANGE;
  if (v.includes('<10')) return RED;
  if (v.includes('SCADUTO')) return RED;
  if (v.includes('COMPLETATO')) return GREEN;
  return undefined;
};

const ritardoColor = (v: string): string => (v && v !== '0' && v.includes('Ritardo') ? RED : '#2B2D31');

interface DashColumn {
  key: string;
  label: string;
  width: number;
  value: (r: PdmV5Item) => string;
  color?: (r: PdmV5Item, value: string) => string | undefined;
}

const TABLE_COLUMNS: DashColumn[] = [
  { key: 'pdm', label: 'PdM', width: 85, value: (r) => r.pdm },
  { key: 'classe', label: 'Classe', width: 45, value: (r) => r.classe },
  { key: 'osservazioni', label: 'Osservazioni', width: 220, value: (r) => r.osservazioni },
  { key: 'data_creazione', label: 'Data creazione', width: 85, value: (r) => r.data_creazione },
  { key: 'linea', label: 'Linea InRete', width: 125, value: (r) => r.linea },
  { key: 'km_linea', label: 'Km linea', width: 60, value: (r) => r.km_linea },
  { key: 'sede_tecnica', label: 'Sede Tecnica', width: 155, value: (r) => r.sede_tecnica },
  { key: 'data_scoperta', label: 'Data scoperta', width: 80, value: (r) => r.data_scoperta },
  {
    key: 'tolto_dop', label: "Tolto d'op.", width: 55, value: (r) => r.tolto_dop,
    color: (_r, v) => (v === 'N' ? RED : v === 'S' ? GREEN : undefined),
  },
  { key: 'data_tolto_dop', label: "Data tolto d'op.", width: 85, value: (r) => r.data_tolto_dop },
  { key: 'scadenza', label: 'Scadenza', width: 85, value: (r) => r.scadenza, color: (_r, v) => scadenzaColor(v) },
  { key: 'ritardo_pdm', label: 'Ritardo PdM', width: 95, value: (r) => r.ritardo_pdm ?? '', color: (_r, v) => ritardoColor(v) },
  {
    key: 'data_tolto_minore_scoperta', label: "Data Tolto d'opera < Data scoperta", width: 140,
    value: (r) => (r.data_tolto_minore_scoperta ? "Data Tolto d'opera < Data scoperta" : ''), color: () => RED,
  },
  {
    key: 'tolto_data_futura', label: "Data Tolto d'opera futura", width: 120,
    value: (r) => (r.tolto_data_futura ? "Data Tolto d'opera futura" : ''), color: () => RED,
  },
  {
    key: 'non_visibile_zstmaia', label: 'PdM non visibile in ZSTMAIA', width: 130,
    value: (r) => (r.non_visibile_zstmaia ? 'PdM non visibile in ZSTMAIA' : ''), color: () => RED,
  },
  { key: 'avviso', label: 'Avviso', width: 85, value: (r) => r.avviso },
  { key: 'testo_esteso', label: 'Testo Esteso', width: 350, value: (r) => r.testo_esteso ?? '' },
  { key: 'inizio_richiesta', label: 'Inizio Rich.', width: 85, value: (r) => r.inizio_richiesta ?? '' },
  { key: 'fine_richiesta', label: 'Fine Rich.', width: 85, value: (r) => r.fine_richiesta ?? '' },
  {
    key: 'stato_avviso', label: 'Stato sist.', width: 75, value: (r) => r.stato_avviso,
    color: (_r, v) => (v.includes('MECO') ? GREEN : RED),
  },
  { key: 'data_chiusura', label: 'Data chiusura', width: 85, value: (r) => r.data_chiusura ?? '' },
  { key: 'ritardo_avv', label: 'Ritardo Avv.', width: 95, value: (r) => r.ritardo_avv ?? '', color: (_r, v) => ritardoColor(v) },
  { key: 'network', label: 'Network', width: 85, value: (r) => r.network ?? '' },
  { key: 'ordine', label: 'Ordine', width: 85, value: (r) => r.ordine ?? '' },
  {
    key: 'network_odl', label: 'Network/OdL agganciato', width: 110, value: (r) => r.network_odl ?? '',
    color: (_r, v) => (v === 'S' ? GREEN : v === 'N' ? RED : undefined),
  },
  {
    key: 'avviso_chiusura_antec_inizio', label: 'Data chiusura avv. < Data inizio avv.', width: 140,
    value: (r) => (r.avviso_chiusura_antec_inizio ? 'Data chiusura avv. < Data inizio avv.' : ''), color: () => RED,
  },
  {
    key: 'avviso_chiusura_futura', label: 'Data chiusura avv. futura', width: 120,
    value: (r) => (r.avviso_chiusura_futura ? 'Data chiusura avv. futura' : ''), color: () => RED,
  },
];

const TABLE_WIDTH = TABLE_COLUMNS.reduce((sum, c) => sum + c.width, 0);

/* -------------------- Componenti grafici -------------------- */
interface BarDatum {
  name: string;
  value: number;
  color: string;
}

const DashBars: React.FC<{
  x: number; y: number; w: number; h: number; z: number;
  data: BarDatum[];
  showLegend?: boolean;
  hideAxis?: boolean;
  legendWidth?: number;
  labelSizePt?: number;
  barSize?: number;
  topPadding?: number;
  labelColor?: string;
}> = ({
  x,
  y,
  w,
  h,
  z,
  data,
  showLegend,
  hideAxis,
  legendWidth = 82,
  labelSizePt = 8.5,
  barSize = 12,
  topPadding = 0,
  labelColor = PBI_COLORS.textMuted,
}) => (
  <PbiBox
    x={x}
    y={y}
    w={w}
    h={h}
    z={z}
    style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', padding: '2px 8px', boxSizing: 'border-box' }}
  >
    {showLegend && (
      <div
        style={{
          width: legendWidth,
          flex: `0 0 ${legendWidth}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 4,
          fontSize: fontSizePx(8),
          color: PBI_COLORS.textMuted,
          overflow: 'hidden',
        }}
      >
        {data.map((d) => (
          <span key={d.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: 'inline-block', flex: '0 0 auto' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
          </span>
        ))}
      </div>
    )}
    <div style={{ flex: '1 1 auto', height: '100%', minWidth: 0, minHeight: 0, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: topPadding, right: 30, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={1} hide={hideAxis ?? showLegend ?? true} />
          <Bar dataKey="value" isAnimationActive={false} barSize={barSize} radius={[0, 2, 2, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            <LabelList dataKey="value" position="right" fill={labelColor} fontSize={fontSizePx(labelSizePt)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </PbiBox>
);

const pct = (value: number, total: number): string =>
  total === 0 ? '0%' : `${((value / total) * 100).toFixed(1).replace('.', ',')}%`;

const DashDonut: React.FC<{
  x: number; y: number; w: number; h: number; z: number;
  data: BarDatum[];
  centerLabel?: string;
}> = ({ x, y, w, h, z, data, centerLabel }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <PbiBox x={x} y={y} w={w} h={h} z={z} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ flex: '1 1 auto', width: '100%', minHeight: 0, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="50%"
              outerRadius="78%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {centerLabel && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: fontSizePx(9),
              fontWeight: 700,
              color: PBI_COLORS.textLight,
              pointerEvents: 'none',
              textAlign: 'center',
            }}
          >
            {centerLabel}
          </div>
        )}
      </div>
      <div style={{ flex: '0 0 auto', textAlign: 'center', fontSize: fontSizePx(7.5), paddingBottom: 2, whiteSpace: 'nowrap' }}>
        {data.map((d) => (
          <span key={d.name} style={{ color: d.color, margin: '0 3px' }}>
            {d.value} ({pct(d.value, total)})
          </span>
        ))}
      </div>
    </PbiBox>
  );
};

/* -------------------- Pagina -------------------- */
export const PageDashboardV5: React.FC<PageDashboardV5Props> = ({
  pdmList,
  dataAggiornamento,
  onNavigateToDrill,
  onBack,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Filtri (multi-selezione)
  const [selSede, setSelSede] = useState<string[]>([]);
  const [selAvviso, setSelAvviso] = useState<string[]>([]);
  const [selPdm, setSelPdm] = useState<string[]>([]);
  const [selClasse, setSelClasse] = useState<string[]>([]);
  const [selAvvisoChiuso, setSelAvvisoChiuso] = useState<string[]>([]);
  const [selTolto, setSelTolto] = useState<string[]>([]);
  const [selUm, setSelUm] = useState<string[]>([]);
  const [selDivisione, setSelDivisione] = useState<string[]>([]);
  const [selScadenza, setSelScadenza] = useState<string[]>([]);

  const [selectedRowId, setSelectedRowId] = useState<string>(pdmList[0]?.pdm ?? '');

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  const uniq = (getter: (r: PdmV5Item) => string): string[] => {
    const set = new Set<string>();
    pdmList.forEach((p) => { const v = getter(p); if (v) set.add(v); });
    return Array.from(set).sort();
  };
  const sediList = useMemo(() => uniq((p) => p.sede_tecnica), [pdmList]);
  const avvisiList = useMemo(() => uniq((p) => p.avviso), [pdmList]);
  const pdmOptions = useMemo(() => uniq((p) => p.pdm), [pdmList]);
  const umList = useMemo(() => uniq((p) => p.lvu), [pdmList]);
  const divisioniList = useMemo(() => uniq((p) => p.divisione), [pdmList]);

  const anniDisponibili = useMemo(() => {
    const anni = pdmList.map((p) => p.anno).filter((a): a is number => typeof a === 'number');
    return anni.length ? anni : [];
  }, [pdmList]);
  const [anno, setAnno] = useState<[number, number]>(() => {
    const anni = pdmList.map((p) => p.anno).filter((a): a is number => typeof a === 'number');
    return anni.length ? [Math.min(...anni), Math.max(...anni)] : [2026, 2026];
  });

  const handleResetFilters = () => {
    setSelSede([]);
    setSelAvviso([]);
    setSelPdm([]);
    setSelClasse([]);
    setSelAvvisoChiuso([]);
    setSelTolto([]);
    setSelUm([]);
    setSelDivisione([]);
    setSelScadenza([]);
    setAnno(anniDisponibili.length ? [Math.min(...anniDisponibili), Math.max(...anniDisponibili)] : [2026, 2026]);
  };

  const filtered = useMemo(() => pdmList.filter((item) => {
    if (selSede.length > 0 && !selSede.includes(item.sede_tecnica)) return false;
    if (selAvviso.length > 0 && !selAvviso.includes(item.avviso)) return false;
    if (selPdm.length > 0 && !selPdm.includes(item.pdm)) return false;
    if (selClasse.length > 0 && !selClasse.includes(item.classe)) return false;
    if (selAvvisoChiuso.length > 0 && !selAvvisoChiuso.includes(item.avviso_chiuso ? 'S' : 'N')) return false;
    if (selTolto.length > 0 && !selTolto.includes(item.tolto_dop)) return false;
    if (selUm.length > 0 && !selUm.includes(item.lvu)) return false;
    if (selDivisione.length > 0 && !selDivisione.includes(item.divisione)) return false;
    if (selScadenza.length > 0 && !selScadenza.includes(item.scadenza)) return false;
    if (anniDisponibili.length > 0) {
      if (item.anno === undefined) return false;
      if (item.anno < anno[0] || item.anno > anno[1]) return false;
    }
    return true;
  }), [pdmList, selSede, selAvviso, selPdm, selClasse, selAvvisoChiuso, selTolto, selUm, selDivisione, selScadenza, anno, anniDisponibili]);

  const selectedItem = useMemo(
    () => filtered.find((p) => p.pdm === selectedRowId) ?? filtered[0] ?? pdmList[0],
    [filtered, selectedRowId, pdmList],
  );

  const tableRows = useMemo(
    () => [...filtered].sort((a, b) => b.pdm.localeCompare(a.pdm, undefined, { numeric: true })),
    [filtered],
  );

  /* ---------------- Dati grafici ---------------- */
  const rows = filtered;
  const count = (pred: (r: PdmV5Item) => boolean) => rows.filter(pred).length;

  const barTolto: BarDatum[] = [
    { name: 'N', value: count((r) => r.tolto_dop !== 'S'), color: RED },
    { name: 'S', value: count((r) => r.tolto_dop === 'S'), color: GREEN },
  ];
  const barAvvisoChiuso: BarDatum[] = [
    { name: 'N', value: count((r) => !r.avviso_chiuso), color: RED },
    { name: 'S', value: count((r) => !!r.avviso_chiuso), color: GREEN },
  ];
  const barNetworkOdl: BarDatum[] = [
    { name: 'N', value: count((r) => r.network_odl === 'N'), color: RED },
    { name: 'S', value: count((r) => r.network_odl === 'S'), color: GREEN },
  ];
  const barPresenza: BarDatum[] = [
    { name: 'Avviso senza Pdm', value: count((r) => r.presenza_pdm_avviso === 'Avviso senza Pdm'), color: PURPLE },
    { name: 'Pdm senza avviso', value: count((r) => r.presenza_pdm_avviso === 'Pdm senza avviso'), color: ORANGE },
  ];

  const donutRitardoPdm: BarDatum[] = [
    { name: 'In ritardo', value: count((r) => !!r.chiusura_ritardo), color: RED },
    { name: 'Regolare', value: count((r) => !r.chiusura_ritardo), color: BLUE },
  ];
  const donutRitardoAvv: BarDatum[] = [
    { name: 'In ritardo', value: count((r) => !!r.avviso_chiusura_ritardo), color: RED },
    { name: 'Regolare', value: count((r) => !r.avviso_chiusura_ritardo), color: BLUE },
  ];
  const donutPrimaScoperta: BarDatum[] = [
    { name: 'Antecedente', value: count((r) => !!r.data_tolto_minore_scoperta), color: RED },
    { name: 'Regolare', value: count((r) => !r.data_tolto_minore_scoperta), color: BLUE },
  ];
  const donutChiusAnteInizio: BarDatum[] = [
    { name: 'Antecedente', value: count((r) => !!r.avviso_chiusura_antec_inizio), color: RED },
    { name: 'Regolare', value: count((r) => !r.avviso_chiusura_antec_inizio), color: BLUE },
  ];

  const nonVisibileCount = count((r) => !!r.non_visibile_zstmaia);
  const toltoFuturaCount = count((r) => !!r.tolto_data_futura);
  const barToltoFutura: BarDatum[] = [
    { name: "Tolto con data futura", value: toltoFuturaCount, color: RED },
  ];

  return (
    <PbiCanvas>
      {/* ================= Top Bar ================= */}
      {/* Pulsante Indietro nativo Power BI */}
      <PbiBackButton x={15} y={14} size={32} onClick={onBack} title="Torna indietro" />

      {/* Logo RFI */}
      <PbiBox x={55} y={8} w={140} h={36} z={11000}>
        <img
          src="/assets/logo_ufficiale.png"
          alt="RFI"
          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }}
        />
      </PbiBox>
      <PbiButton x={55} y={48} w={85} h={22} z={22000} label="Reset Filtri" sizePt={8} onClick={handleResetFilters} />

      {/* Titoli e Data aggiornamento */}
      <PbiText x={18} y={74} w={280} h={26} z={5000} text="Difetti di binario - DOIT VE" sizePt={16} bold color={RED} />
      <PbiText x={18} y={100} w={200} h={22} z={14000} text="Dashboard V5" sizePt={13} bold color={PBI_COLORS.textLight} />
      <PbiText x={18} y={124} w={55} h={18} z={12000} text="Dati al:" sizePt={9} color={PBI_COLORS.textMuted} vAlign="middle" />
      <PbiText x={75} y={124} w={160} h={18} z={8000} text={dataAggiornamento} sizePt={10} color={PBI_COLORS.textLight} vAlign="middle" />

      {/* ================= Slicer Superiori ================= */}
      {/* Colonna 1: Cerca PdM / Cerca Avviso */}
      <PbiListSlicer
        x={315} y={10} w={115} h={86} z={17000}
        title="Cerca PdM" options={pdmOptions} value={selPdm} onToggle={(v) => toggle(setSelPdm, v)}
        searchable itemColor={PBI_COLORS.textLight} itemSizePt={7.5}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={9}
      />
      <PbiListSlicer
        x={315} y={102} w={115} h={86} z={13000}
        title="Cerca Avviso" options={avvisiList} value={selAvviso} onToggle={(v) => toggle(setSelAvviso, v)}
        searchable itemColor={PBI_COLORS.textLight} itemSizePt={7.5}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={9}
      />

      {/* Colonna 2: PdM tolto d'opera / Avviso chiuso */}
      <PbiListSlicer
        x={438} y={22} w={115} h={76} z={62000}
        title="PdM tolto d'opera" options={SN} value={selTolto} onToggle={(v) => toggle(setSelTolto, v)}
        itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_ORANGE} headerColor={HEADER_SLICER} headerSizePt={9}
      />
      <PbiListSlicer
        x={438} y={106} w={115} h={76} z={63000}
        title="Avviso chiuso" options={SN} value={selAvvisoChiuso} onToggle={(v) => toggle(setSelAvvisoChiuso, v)}
        itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_ORANGE} headerColor={HEADER_SLICER} headerSizePt={9}
      />

      {/* Colonna 3: Anno scoperta PdM / Cerca Sede tecnica */}
      <PbiBox
        x={561} y={12} w={155} h={76} z={21000}
        style={{ background: PBI_COLORS.card, borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ background: SLICER_ORANGE, color: HEADER_SLICER, fontSize: fontSizePx(9), fontWeight: 700, padding: '3px 8px', flex: '0 0 auto' }}>
          Anno scoperta PdM
        </div>
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '4px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              value={anno[0]}
              onChange={(e) => setAnno([Number(e.target.value), anno[1]])}
              style={{ width: 55, background: PBI_COLORS.panel, color: PBI_COLORS.textLight, border: `1px solid ${PBI_COLORS.tileBorder}`, borderRadius: 3, fontSize: fontSizePx(8), padding: '2px 4px', outline: 'none' }}
            />
            <span style={{ color: PBI_COLORS.textMuted, fontSize: fontSizePx(8) }}>-</span>
            <input
              type="number"
              value={anno[1]}
              onChange={(e) => setAnno([anno[0], Number(e.target.value)])}
              style={{ width: 55, background: PBI_COLORS.panel, color: PBI_COLORS.textLight, border: `1px solid ${PBI_COLORS.tileBorder}`, borderRadius: 3, fontSize: fontSizePx(8), padding: '2px 4px', outline: 'none' }}
            />
          </div>
          <input
            type="range"
            min={anniDisponibili.length ? Math.min(...anniDisponibili) : 2020}
            max={anniDisponibili.length ? Math.max(...anniDisponibili) : 2026}
            value={anno[1]}
            onChange={(e) => setAnno([anno[0], Number(e.target.value)])}
            style={{ width: '100%', accentColor: SLICER_YELLOW }}
          />
        </div>
      </PbiBox>

      <PbiListSlicer
        x={561} y={96} w={155} h={88} z={19000}
        title="Cerca Sede tecnica" options={sediList} value={selSede} onToggle={(v) => toggle(setSelSede, v)}
        searchable itemColor={PBI_COLORS.textLight} itemSizePt={7.5}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={9}
      />

      {/* Colonna 4: Divisione / U.M. */}
      <PbiListSlicer
        x={724} y={12} w={110} h={68} z={49000}
        title="Divisione" options={divisioniList} value={selDivisione} onToggle={(v) => toggle(setSelDivisione, v)}
        itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={9}
      />
      <PbiListSlicer
        x={724} y={86} w={110} h={98} z={51000}
        title="U.M." options={umList} value={selUm} onToggle={(v) => toggle(setSelUm, v)}
        itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={9}
      />

      {/* Colonna 5: Classe provv. */}
      <PbiListSlicer
        x={842} y={12} w={115} h={172} z={45000}
        title="Classe provv." options={CLASSI} value={selClasse} onToggle={(v) => toggle(setSelClasse, v)}
        itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={9}
      />

      {/* Colonna 6: Scadenza */}
      <PbiListSlicer
        x={965} y={12} w={125} h={172} z={47000}
        title="Scadenza" options={SCADENZE} value={selScadenza} onToggle={(v) => toggle(setSelScadenza, v)}
        itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={9}
      />

      {/* ================= Sezione Centrale Grafici ================= */}
      {/* 1. PdM tolto d'opera */}
      <PbiText x={15} y={188} w={200} h={18} z={33000} text="PdM tolto d'opera" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiShape x={15} y={208} w={205} h={68} z={32000} fill={PBI_COLORS.panel} radius={6} />
      <DashBars x={15} y={208} w={205} h={68} z={34000} data={barTolto} showLegend legendWidth={36} barSize={13} />

      {/* 2. Avvisi Chiusi */}
      <PbiText x={15} y={282} w={200} h={18} z={37000} text="Avvisi Chiusi" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiShape x={15} y={302} w={205} h={68} z={35000} fill={PBI_COLORS.panel} radius={6} />
      <DashBars x={15} y={302} w={205} h={68} z={36000} data={barAvvisoChiuso} showLegend legendWidth={36} barSize={13} />

      {/* 3. Associazione PdM-Avviso */}
      <PbiText x={15} y={376} w={200} h={18} z={58000} text="Associazione PdM-Avviso" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiShape x={15} y={396} w={455} h={66} z={57000} fill={PBI_COLORS.panel} radius={6} />
      <DashBars x={15} y={396} w={455} h={66} z={59000} data={barPresenza} showLegend legendWidth={125} barSize={10} labelSizePt={8} />

      {/* 4. Chiusi in ritardo */}
      <PbiText x={230} y={188} w={240} h={18} z={27000} text="Chiusi in ritardo" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiShape x={230} y={208} w={245} h={162} z={4000} fill={PBI_COLORS.panel} radius={6} />
      <DashDonut x={232} y={212} w={120} h={154} z={23000} data={donutRitardoPdm} centerLabel="PdM" />
      <DashDonut x={353} y={212} w={120} h={154} z={25000} data={donutRitardoAvv} centerLabel="Avvisi" />

      {/* 5. Chiusi prima della data scoperta */}
      <PbiText x={485} y={188} w={240} h={18} z={31000} text="Chiusi prima della data scoperta" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiShape x={485} y={208} w={250} h={162} z={28000} fill={PBI_COLORS.panel} radius={6} />
      <DashDonut x={487} y={212} w={122} h={154} z={29000} data={donutPrimaScoperta} centerLabel="PdM" />
      <DashDonut x={611} y={212} w={122} h={154} z={30000} data={donutChiusAnteInizio} centerLabel="Avvisi" />

      {/* 6. Anomalie PdM */}
      <PbiText x={745} y={188} w={200} h={18} z={41000} text="Anomalie PdM" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiShape x={745} y={208} w={520} h={162} z={0} fill={PBI_COLORS.panel} radius={6} />
      <PbiText x={760} y={238} w={180} h={20} z={55000} text="Non visibile in ZSTMAIA" sizePt={8.5} color={PBI_COLORS.textLight} />
      <PbiText x={1120} y={236} w={30} h={20} z={3000} text={nonVisibileCount > 0 ? String(nonVisibileCount) : "-"} sizePt={10} color={PBI_COLORS.textLight} />

      <PbiText x={760} y={302} w={180} h={20} z={42000} text="Tolto con data futura" sizePt={8.5} color={PBI_COLORS.textLight} />
      {toltoFuturaCount > 0 ? (
        <DashBars x={1030} y={292} w={200} h={36} z={43000} data={barToltoFutura} hideAxis labelSizePt={9} barSize={16} labelColor={PBI_COLORS.textLight} />
      ) : (
        <PbiText x={1120} y={300} w={30} h={20} z={2000} text="-" sizePt={10} color={PBI_COLORS.textLight} />
      )}

      {/* 7. Avvisi chiusi con OdL/Network */}
      <PbiText x={480} y={376} w={240} h={18} z={54000} text="Avvisi chiusi con OdL/Network" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiShape x={480} y={396} w={785} h={66} z={52000} fill={PBI_COLORS.panel} radius={6} />
      <DashBars x={480} y={396} w={785} h={66} z={53000} data={barNetworkOdl} showLegend legendWidth={40} barSize={12} labelSizePt={8.5} />

      {/* ================= Drill riga selezionata ================= */}
      <PbiText x={15} y={474} w={180} h={20} z={10000} text="Elenco PdM-Avvisi" sizePt={9.5} bold color={PBI_COLORS.textLight} />

      {/* Pulsante bianco con testo scuro "Drill riga selezionata" esattamente sopra la tabella */}
      <PbiButton
        x={540} y={468} w={160} h={30} z={56000}
        variant="light"
        label="Drill riga selezionata" sizePt={8.5}
        disabled={!selectedItem}
        onClick={() => selectedItem && onNavigateToDrill(selectedItem)}
      />

      {/* ================= Tabella (27 colonne) ================= */}
      <PbiBox
        x={15} y={504} w={1250} h={206} z={9000}
        style={{ border: `1.5px solid ${RED}`, borderRadius: 4, overflow: 'hidden', background: PBI_COLORS.band }}
      >
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
                      fontWeight: 500,
                      textAlign: 'left',
                      padding: '4px 6px',
                      borderRight: `1px solid ${PBI_COLORS.panel}`,
                      borderBottom: `1px solid ${PBI_COLORS.tileBorder}`,
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
                      background: isSelected ? '#000000' : PBI_COLORS.tableRowSecondary,
                      cursor: 'pointer',
                    }}
                  >
                    {TABLE_COLUMNS.map((c) => {
                      const value = c.value(row);
                      const color = c.color ? c.color(row, value) : undefined;
                      return (
                        <td
                          key={c.key}
                          title={value}
                          style={{
                            padding: '3px 6px',
                            color: color ?? PBI_COLORS.textPrimary,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            borderRight: `1px solid ${PBI_COLORS.band}`,
                            borderBottom: `1px solid rgba(255,255,255,0.03)`,
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
      {pdmList.length === 0 && (
        <PbiBox
          x={0} y={0} w={1280} h={720} z={65000}
          style={{ background: 'rgba(0,0,0,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}
        >
          <span style={{ color: PBI_COLORS.textPrimary, fontSize: 15, fontWeight: 700 }}>Web app non alimentata (0 record)</span>
          <span style={{ color: PBI_COLORS.textMuted, fontSize: 12 }}>
            Alimenta la web app con i file SAP (es. ZSTMAIA, IW29) oppure carica i dati demo.
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
