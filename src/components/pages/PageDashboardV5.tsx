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

/* -------------------- Palette (dai visual.json PBIR) -------------------- */
const RED = PBI_COLORS.accent; // #F26D6D
const BLUE = '#5CB8FF';
const GREEN = PBI_COLORS.good; // #6CC070
const YELLOW = PBI_COLORS.warn; // #F5C26B
const ORANGE = '#FC7942';
const PURPLE = '#8A50D8';

const HEADER_SLICER = PBI_COLORS.slicerHeader; // Theme#1 @ 0.1 -> #1A1A1A
const SLICER_YELLOW = '#F5C26B';
const SLICER_ORANGE = '#FC7942';

/* Domini dei filtri (dai valori distinti delle colonne PBIR) */
const CLASSI = ['A', 'B', 'C1', 'C2', 'C3', 'MANCANTE', 'S1', 'S2'];
const SCADENZE = ['COMPLETATO', 'MANCANTE', 'SCAD.>60GG', 'SCAD.<60GG', 'SCAD.<30GG', 'SCAD.<10GG', 'SCADUTO'];
const SN = ['S', 'N'] as const;

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

/** "Ritardo PdM"/"Ritardo Avv.": rosso se c'è ritardo, altrimenti nascosto. */
const ritardoColor = (v: string): string => (v && v !== '0' && v.includes('Ritardo') ? RED : '#2B2D31');

interface DashColumn {
  key: string;
  label: string;
  width: number;
  value: (r: PdmV5Item) => string;
  color?: (r: PdmV5Item, value: string) => string | undefined;
}

/** Le 27 colonne del `tableEx` nell'ordine del PBIR, con le larghezze esatte. */
const TABLE_COLUMNS: DashColumn[] = [
  { key: 'pdm', label: 'PdM', width: 90, value: (r) => r.pdm },
  { key: 'classe', label: 'Classe', width: 32.850078302337906, value: (r) => r.classe },
  { key: 'osservazioni', label: 'Osservazioni', width: 223.95948670515736, value: (r) => r.osservazioni },
  { key: 'data_creazione', label: 'Data creazione', width: 90, value: (r) => r.data_creazione },
  { key: 'linea', label: 'Linea InRete', width: 128.68511703988634, value: (r) => r.linea },
  { key: 'km_linea', label: 'Km linea', width: 55, value: (r) => r.km_linea },
  { key: 'sede_tecnica', label: 'Sede Tecnica', width: 154.45189734732398, value: (r) => r.sede_tecnica },
  { key: 'data_scoperta', label: 'Data scoperta', width: 75.80555313761172, value: (r) => r.data_scoperta },
  {
    key: 'tolto_dop', label: " Tolto d'op.", width: 38.20606457660532, value: (r) => r.tolto_dop,
    color: (_r, v) => (v === 'N' ? RED : v === 'S' ? GREEN : undefined),
  },
  { key: 'data_tolto_dop', label: "Data tolto d'op.", width: 69.44226220986364, value: (r) => r.data_tolto_dop },
  { key: 'scadenza', label: 'Scadenza', width: 79.65238480194017, value: (r) => r.scadenza, color: (_r, v) => scadenzaColor(v) },
  { key: 'ritardo_pdm', label: 'Ritardo PdM', width: 104.4634758994813, value: (r) => r.ritardo_pdm ?? '' , color: (_r, v) => ritardoColor(v) },
  {
    key: 'data_tolto_minore_scoperta', label: "Data Tolto d'opera < Data scoperta", width: 101.638199194941,
    value: (r) => (r.data_tolto_minore_scoperta ? "Data Tolto d'opera < Data scoperta" : ''), color: () => RED,
  },
  {
    key: 'tolto_data_futura', label: "Data Tolto d'opera futura", width: 90,
    value: (r) => (r.tolto_data_futura ? "Data Tolto d'opera futura" : ''), color: () => RED,
  },
  {
    key: 'non_visibile_zstmaia', label: 'PdM non visibile in ZSTMAIA', width: 117.6922781539507,
    value: (r) => (r.non_visibile_zstmaia ? 'PdM non visibile in ZSTMAIA' : ''), color: () => RED,
  },
  { key: 'avviso', label: 'Avviso', width: 90, value: (r) => r.avviso },
  { key: 'testo_esteso', label: 'Testo Esteso', width: 404.7973232297614, value: (r) => r.testo_esteso ?? '' },
  { key: 'inizio_richiesta', label: 'Inizio Rich.', width: 90, value: (r) => r.inizio_richiesta ?? '' },
  { key: 'fine_richiesta', label: 'Fine Rich.', width: 69.54297650170533, value: (r) => r.fine_richiesta ?? '' },
  {
    key: 'stato_avviso', label: 'Stato sist.', width: 90, value: (r) => r.stato_avviso,
    color: (_r, v) => (v.includes('MECO') ? GREEN : RED),
  },
  { key: 'data_chiusura', label: 'Data chiusura', width: 90, value: (r) => r.data_chiusura ?? '' },
  { key: 'ritardo_avv', label: 'Ritardo Avv.', width: 110.60606060606061, value: (r) => r.ritardo_avv ?? '', color: (_r, v) => ritardoColor(v) },
  { key: 'network', label: 'Network', width: 90, value: (r) => r.network ?? '' },
  { key: 'ordine', label: 'Ordine', width: 90, value: (r) => r.ordine ?? '' },
  {
    key: 'network_odl', label: 'Network/OdL agganciato', width: 90, value: (r) => r.network_odl ?? '',
    color: (_r, v) => (v === 'S' ? GREEN : v === 'N' ? RED : undefined),
  },
  {
    key: 'avviso_chiusura_antec_inizio', label: 'Data chiusura avv. < Data inizio avv.', width: 104.54545454545455,
    value: (r) => (r.avviso_chiusura_antec_inizio ? 'Data chiusura avv. < Data inizio avv.' : ''), color: () => RED,
  },
  {
    key: 'avviso_chiusura_futura', label: 'Data chiusura avv. futura', width: 90,
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
  labelSizePt = 9,
  barSize = 12,
  topPadding = 34,
  labelColor = PBI_COLORS.textMuted,
}) => (
  <PbiBox
    x={x}
    y={y}
    w={w}
    h={h}
    z={z}
    style={{ display: 'flex', overflow: 'hidden', padding: '0 8px 8px 8px', boxSizing: 'border-box' }}
  >
    {showLegend && (
      <div
        style={{
          width: legendWidth,
          flex: `0 0 ${legendWidth}px`,
          paddingTop: topPadding,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 6,
          fontSize: fontSizePx(8),
          color: PBI_COLORS.textMuted,
          overflow: 'hidden',
        }}
      >
        {data.map((d) => (
          <span key={d.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, background: d.color, display: 'inline-block', flex: '0 0 auto' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
          </span>
        ))}
      </div>
    )}
    <div style={{ flex: '1 1 auto', minWidth: 0, minHeight: 0, paddingTop: topPadding, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={1} hide={hideAxis ?? showLegend ?? true} />
          <Bar dataKey="value" isAnimationActive={false} barSize={barSize}>
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
}> = ({ x, y, w, h, z, data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <PbiBox x={x} y={y} w={w} h={h} z={z} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: '1 1 auto', minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="40%"
              outerRadius="76%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: '0 0 auto', textAlign: 'center', fontSize: fontSizePx(8), paddingBottom: 2 }}>
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
  // Filtri (multi-selezione), come gli slicer del PBIR
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

  // Opzioni derivate dal dataset per gli slicer "a ricerca"
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

  // Anno scoperta PdM (mode Between): intervallo minimo/massimo disponibile
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

  // Tabella ordinata per PdM discendente (sort del PBIR)
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
    { name: 'S', value: count((r) => r.network_odl === 'S'), color: GREEN },
    { name: 'N', value: count((r) => r.network_odl === 'N'), color: RED },
    { name: '-', value: count((r) => (r.network_odl ?? '') === '' || r.network_odl === '-'), color: PBI_COLORS.textMuted },
  ];
  const barPresenza: BarDatum[] = [
    { name: 'Pdm con Avviso', value: count((r) => r.presenza_pdm_avviso === 'Pdm con Avviso'), color: BLUE },
    { name: 'Pdm senza avviso', value: count((r) => r.presenza_pdm_avviso === 'Pdm senza avviso'), color: ORANGE },
    { name: 'Avviso senza Pdm', value: count((r) => r.presenza_pdm_avviso === 'Avviso senza Pdm'), color: PURPLE },
    { name: 'No avviso no Pdm', value: count((r) => r.presenza_pdm_avviso === 'No avviso no Pdm'), color: PBI_COLORS.textMuted },
  ];
  const barNonVisibile: BarDatum[] = [
    { name: 'PdM non visibile in ZSTMAIA', value: count((r) => !!r.non_visibile_zstmaia), color: ORANGE },
  ];
  const barToltoFutura: BarDatum[] = [
    { name: "Data Tolto d'opera futura", value: count((r) => !!r.tolto_data_futura), color: RED },
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

  return (
    <PbiCanvas>
      {/* ================= Sfondi / pannelli ================= */}
      <PbiShape x={1032.22} y={202.22} w={247.78} h={85.56} z={0} fill={PBI_COLORS.panel} radius={10} />
      <PbiShape x={1030.9090909090908} y={278.1818181818182} w={249.09090909090907} h={85.45454545454545} z={1000} fill={PBI_COLORS.panel} radius={10} />
      <PbiShape x={242.22222222222223} y={201.11111111111111} w={411.1111111111111} h={187.77777777777777} z={4000} fill={PBI_COLORS.panel} radius={5} />
      <PbiShape x={0} y={475.55555555555554} w={1280} h={244.44444444444443} z={7000} fill={PBI_COLORS.band} radius={5} />
      <PbiShape x={368.1587109936089} y={29.072514179410945} w={128.76574307304784} h={86.14609571788412} z={16000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={368.375149094178} y={106.03006618985968} w={129.67254408060452} h={86.14609571788412} z={6000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={651.7540200486633} y={105.10440393632342} w={238.4886649874055} h={86.14609571788412} z={18000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={651.7540200486633} y={0} w={238.4886649874055} h={115.16372795969772} z={20000} fill={PBI_COLORS.card} radius={7} />
      <PbiShape x={645.5555555555555} y={201.11111111111111} w={393.3333333333333} h={187.77777777777777} z={28000} fill={PBI_COLORS.panel} radius={5} />
      <PbiShape x={0.6375892319852225} y={202.76068482455727} w={248.18181818181816} h={85} z={32000} fill={PBI_COLORS.panel} radius={10} />
      <PbiShape x={0} y={291.2469135799601} w={248.88888888888889} h={85} z={35000} fill={PBI_COLORS.panel} radius={10} />
      <PbiShape x={1011.0335421225315} y={0.906801007556675} w={140} h={193.63636363636363} z={44000} fill={PBI_COLORS.card} radius={7} />
      <PbiShape x={1140.6128936428531} y={0} w={139.64735516372795} h={193.14861460957178} z={46000} fill={PBI_COLORS.card} radius={7} />
      <PbiShape x={881.0922024704479} y={0} w={140} h={80.70528967254407} z={48000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={880.4369132418087} y={70.73047858942066} w={140} h={123.3249370277078} z={50000} fill={PBI_COLORS.card} radius={7} />
      <PbiShape x={645.5555555555555} y={381.1111111111111} w={633.3333333333334} h={80} z={52000} fill={PBI_COLORS.panel} radius={10} />
      <PbiShape x={0} y={380} w={653.3333333333334} h={81} z={57000} fill={PBI_COLORS.panel} radius={10} />
      <PbiShape x={488.5349361382418} y={0} w={172.14124718256951} h={99.05334335086401} z={61000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={489.4966190833958} y={93.28324567993991} w={171.1795642374155} h={97.12997746055598} z={60000} fill={PBI_COLORS.card} radius={8} />

      {/* ================= Intestazione ================= */}
      <PbiBox x={39.8992443324937} y={11.788413098236775} w={249.37027707808562} h={74.35768261964735} z={11000}>
        <img src="/assets/logo_ufficiale.png" alt="RFI" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }} />
      </PbiBox>
      <PbiText x={17.229219143576824} y={92.49370277078086} w={343.6775818639798} h={27.20403022670025} z={5000}
        text="Difetti di binario - DOIT VE" sizePt={20} bold color={RED} />
      <PbiText x={18.1360201511335} y={125.13853904282115} w={299.24433249370276} h={24.483627204030224} z={14000}
        text="Dashboard V5" sizePt={15} bold color={PBI_COLORS.textLight} />
      <PbiText x={0.906801007556675} y={148.7153652392947} w={76.1712846347607} h={35.36523929471033} z={12000}
        text="Dati al:" sizePt={11} color={PBI_COLORS.textMuted} vAlign="middle" />
      <PbiText x={69.82367758186398} y={143.27455919395464} w={136.02015113350126} h={40.806045340050375} z={8000}
        text={dataAggiornamento} sizePt={12} color={PBI_COLORS.textLight} vAlign="middle" />

      {/* ================= Bottoni di navigazione ================= */}
      <PbiButton x={0} y={0} w={99.74811083123424} h={39.8992443324937} z={15000} label="Indietro" sizePt={9} onClick={onBack} />
      <PbiButton x={371.17998163452694} y={0.9616829451540195} w={122.22222222222221} h={40} z={22000} label="Reset Filtri" sizePt={9} onClick={handleResetFilters} />

      {/* ================= Slicer ================= */}
      <PbiListSlicer x={380.8539250994024} y={40.86092727764772} w={105.1889168765743} h={62.569269521410575} z={17000}
        title="Cerca PdM" options={pdmOptions} value={selPdm} onToggle={(v) => toggle(setSelPdm, v)}
        searchable itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={10} />
      <PbiListSlicer x={381.07036319997144} y={116.91167828053976} w={104.28211586901763} h={63.47607052896725} z={13000}
        title="Cerca Avviso" options={avvisiList} value={selAvviso} onToggle={(v) => toggle(setSelAvviso, v)}
        searchable itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={10} />
      <PbiListSlicer x={664.4492341544568} y={115.07921501944683} w={214.91183879093197} h={65.2896725440806} z={19000}
        title="Cerca Sede tecnica" options={sediList} value={selSede} onToggle={(v) => toggle(setSelSede, v)}
        searchable itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={10} />
      <PbiListSlicer x={1023.3577921797789} y={14.506526219372565} w={116.0705289672544} h={165.9445843828715} z={45000}
        title="Classe provv." options={CLASSI} value={selClasse} onToggle={(v) => toggle(setSelClasse, v)}
        itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={10} />
      <PbiListSlicer x={1153.3081077486463} y={15.415617128463476} w={116.0705289672544} h={153.24937027707807} z={47000}
        title="Scadenza" options={SCADENZE} value={selScadenza} onToggle={(v) => toggle(setSelScadenza, v)}
        itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={10} />
      <PbiListSlicer x={893.71150780852} y={13.602015113350125} w={116.0705289672544} h={56.22166246851385} z={49000}
        title="Divisione" options={divisioniList} value={selDivisione} onToggle={(v) => toggle(setSelDivisione, v)}
        itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={10} />
      <PbiListSlicer x={893.216640287853} y={82.51889168765743} w={116} h={85.23929471032746} z={51000}
        title="U.M." options={umList} value={selUm} onToggle={(v) => toggle(setSelUm, v)}
        itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={10} />
      <PbiListSlicer x={502.0} y={22.12} w={134.63561232156275} h={55.777610818933134} z={62000}
        title="PdM tolto d'opera" options={SN} value={selTolto} onToggle={(v) => toggle(setSelTolto, v)}
        itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_ORANGE} headerColor={HEADER_SLICER} headerSizePt={10} />
      <PbiListSlicer x={503.9218632607061} y={113.47858752817432} w={132.7122464312547} h={55.777610818933134} z={63000}
        title="Avviso chiuso" options={SN} value={selAvvisoChiuso} onToggle={(v) => toggle(setSelAvvisoChiuso, v)}
        itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_ORANGE} headerColor={HEADER_SLICER} headerSizePt={10} />

      {/* Slicer "Anno scoperta PdM" (mode Between) */}
      <PbiBox x={664.4492341544568} y={14.5088161209068} w={214.0050377833753} h={88.86649874055415} z={21000}
        style={{ background: PBI_COLORS.card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: SLICER_YELLOW, color: HEADER_SLICER, fontSize: fontSizePx(12), padding: '3px 6px', flex: '0 0 auto' }}>
          Anno scoperta PdM
        </div>
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '4px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              value={anno[0]}
              onChange={(e) => setAnno([Number(e.target.value), anno[1]])}
              style={{ width: 68, background: PBI_COLORS.panel, color: PBI_COLORS.textLight, border: `1px solid ${PBI_COLORS.panel}`, fontSize: fontSizePx(8), padding: '2px 4px', outline: 'none' }}
            />
            <span style={{ color: PBI_COLORS.textMuted, fontSize: fontSizePx(8) }}>-</span>
            <input
              type="number"
              value={anno[1]}
              onChange={(e) => setAnno([anno[0], Number(e.target.value)])}
              style={{ width: 68, background: PBI_COLORS.panel, color: PBI_COLORS.textLight, border: `1px solid ${PBI_COLORS.panel}`, fontSize: fontSizePx(8), padding: '2px 4px', outline: 'none' }}
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

      {/* ================= Donut ================= */}
      <DashDonut x={251.81818181796973} y={202.65289256226887} w={201.8181818181818} h={172.72727272727272} z={23000} data={donutRitardoPdm} />
      <PbiText x={327.27272727251517} y={271.7438016531779} w={50.90909090909091} h={33.63636363636363} z={24000}
        text="PdM" sizePt={9} bold color={PBI_COLORS.textLight} align="center" vAlign="middle" />
      <DashDonut x={437.8888888863077} y={203.33333333333331} w={202.72727272727272} h={172.72727272727272} z={25000} data={donutRitardoAvv} />
      <PbiText x={508.34343434085287} y={272.8787878787879} w={61.81818181818181} h={33.63636363636363} z={26000}
        text="Avvisi" sizePt={9} bold color={PBI_COLORS.textLight} align="center" vAlign="middle" />
      <DashDonut x={653.4997710033646} y={204.24380043785433} w={202} h={172.29219143576825} z={29000} data={donutPrimaScoperta} />
      <PbiText x={729.0452255488193} y={273.57171433755684} w={50.90909090909091} h={33.63636363636363} z={38000}
        text="PdM" sizePt={9} bold color={PBI_COLORS.textLight} align="center" vAlign="middle" />
      <DashDonut x={837.3181818116999} y={201.51652771058164} w={202} h={172.29219143576825} z={30000} data={donutChiusAnteInizio} />
      <PbiText x={907.409090902609} y={270.8444416102841} w={61.81818181818181} h={33.63636363636363} z={39000}
        text="Avvisi" sizePt={9} bold color={PBI_COLORS.textLight} align="center" vAlign="middle" />

      {/* ================= Bar chart ================= */}
      <DashBars x={14.444444444444445} y={164.44444444444443} w={226.66666666666666} h={155.55555555555554} z={34000}
        data={barTolto} showLegend legendWidth={34} topPadding={48} />
      <DashBars x={12.222222222222221} y={253.33333333333331} w={228.88888888888889} h={155.55555555555554} z={36000}
        data={barAvvisoChiuso} showLegend legendWidth={34} topPadding={48} />
      <DashBars x={14.545454545454545} y={359.99999999999994} w={614.5454545454545} h={125.45454545454544} z={59000}
        data={barPresenza} showLegend legendWidth={146} topPadding={28} />
      <DashBars x={666.3636363636363} y={353.6363636363636} w={595.4545454545454} h={131.8181818181818} z={53000}
        data={barNetworkOdl} showLegend legendWidth={134} topPadding={28} />
      <DashBars x={1177.9558902635852} y={211.30132589470563} w={91.53846153846153} h={64.61538461538461} z={40000}
        data={barNonVisibile} hideAxis labelSizePt={9} barSize={16} topPadding={22} labelColor={PBI_COLORS.textLight} />
      <DashBars x={1178.1818181598576} y={290.834710718682} w={90} h={51} z={43000}
        data={barToltoFutura} hideAxis labelSizePt={9} barSize={16} topPadding={18} labelColor={PBI_COLORS.textLight} />

      {/* ================= Etichette ================= */}
      <PbiText x={15.372750369407493} y={183.8118070386205} w={226} h={30} z={33000} text="PdM tolto d'opera" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiText x={14.444444444444445} y={274.5802469132935} w={110} h={31.11111111111111} z={37000} text="Avvisi Chiusi" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiText x={12.222222222222221} y={364.3058984910837} w={215.55555555555554} h={31.11111111111111} z={58000} text="Associazione PdM-Avviso" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiText x={251.68181817533628} y={184.59171413287103} w={249.96632996632997} h={28.013468013468014} z={27000} text="Chiusi in ritardo" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiText x={661.5808080743255} y={184.59171413287103} w={317.84511784511784} h={31.245791245791246} z={31000} text="Chiusi prima della data scoperta" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiText x={1046.3636363636363} y={186.36363636363635} w={215.45454545454544} h={30.909090909090907} z={41000} text="Anomalie PdM" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiText x={1047.272727272728} y={232.14048673386637} w={150} h={31.818181818181817} z={55000} text="Non visibile in ZSTMAIA" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiText x={1177.5427335519435} y={231.64373099536087} w={31.43514965464313} h={32.41749808135073} z={3000} text="-" sizePt={11} color={PBI_COLORS.textLight} />
      <PbiText x={1049.090909090909} y={305.54545454503045} w={167.27272727272725} h={31.818181818181817} z={42000} text="Tolto con data futura" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiText x={1178.163535767079} y={303.21493959062747} w={29.470452801227932} h={32.41749808135073} z={2000} text="-" sizePt={11} color={PBI_COLORS.textLight} />
      <PbiText x={1044.5454545454545} y={364.5454545454545} w={219.99999999999997} h={29.09090909090909} z={54000} text="Avvisi chiusi con OdL/Network" sizePt={9} color={PBI_COLORS.textLight} />
      <PbiText x={14.545454545454545} y={458.18181818181813} w={150.9090909090909} h={30.909090909090907} z={10000} text="Elenco PdM-Avvisi" sizePt={9} color={PBI_COLORS.textLight} />

      {/* ================= Drill riga selezionata ================= */}
      <PbiButton x={575.6561780506523} y={449.91557943207977} w={144.40521872601687} h={36.34689178818112} z={56000}
        label="Drill riga selezionata" sizePt={9} disabled={!selectedItem} onClick={() => selectedItem && onNavigateToDrill(selectedItem)} />

      {/* ================= Tabella (27 colonne) ================= */}
      <PbiBox x={14.444444444444445} y={488.88888888888886} w={1251.111111111111} h={211.11111111111111} z={9000}
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
                            padding: '2px 4px',
                            color: color ?? PBI_COLORS.textPrimary,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            borderRight: `1px solid ${PBI_COLORS.band}`,
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
        <PbiBox x={0} y={0} w={1280} h={720} z={65000}
          style={{ background: 'rgba(0,0,0,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
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
