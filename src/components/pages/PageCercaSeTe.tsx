import React, { useMemo, useState } from 'react';
import { PdmV5Item } from '../../types';
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

interface PageCercaSeTeProps {
  pdmList: PdmV5Item[];
  dataAggiornamento: string;
  onNavigateToDrill: (item: PdmV5Item) => void;
  onBack: () => void;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

/* -------------------- Palette (dai visual.json PBIR) -------------------- */
const RED = PBI_COLORS.accent; // #F26D6D
const GREEN = PBI_COLORS.good; // #6CC070
const SLICER_YELLOW = '#F5C26B';
const HEADER_SLICER = PBI_COLORS.slicerHeader; // Theme#1 @ 0.1 -> #1A1A1A

/* -------------------- Conditional formatting -------------------- */
/** "Ritardo PdM"/"Ritardo Avv.": rosso se c'è ritardo, altrimenti nascosto. */
const ritardoColor = (v: string): string => (v && v !== '0' && v.includes('Ritardo') ? RED : '#2B2D31');

interface SeTeColumn {
  key: string;
  label: string;
  width: number;
  value: (r: PdmV5Item) => string;
  color?: (r: PdmV5Item, value: string) => string | undefined;
}

/**
 * Tabella superiore (`tableEx` 281214caa89eecee3fd3): 15 colonne nell'ordine del
 * PBIR, con le larghezze esatte di `columnWidth`.
 */
const TABLE_PDM: SeTeColumn[] = [
  { key: 'pdm', label: 'PdM', width: 61.64009689447592, value: (r) => r.pdm },
  { key: 'avviso', label: 'Avviso', width: 66.17380679551866, value: (r) => r.avviso },
  { key: 'classe', label: 'Classe', width: 32.850078302337906, value: (r) => r.classe },
  { key: 'osservazioni', label: 'Osservazioni', width: 213.1070076504108, value: (r) => r.osservazioni },
  { key: 'linea', label: 'Linea InRete', width: 94.33271457536863, value: (r) => r.linea },
  { key: 'km_linea', label: 'Km linea', width: 55, value: (r) => r.km_linea },
  { key: 'sede_tecnica', label: 'Sede Tecnica', width: 143.6011112668033, value: (r) => r.sede_tecnica },
  { key: 'data_scoperta', label: 'Data scoperta', width: 72.16862817790042, value: (r) => r.data_scoperta },
  { key: 'fine_richiesta', label: 'Fine Rich.', width: 69.54297650170533, value: (r) => r.fine_richiesta ?? '' },
  {
    key: 'tolto_dop', label: "Tolto d'op.", width: 38.20606457660532, value: (r) => r.tolto_dop,
    color: (_r, v) => (v === 'N' ? RED : v === 'S' ? GREEN : undefined),
  },
  { key: 'data_tolto_dop', label: "Data tolto d'op.", width: 69.44226220986364, value: (r) => r.data_tolto_dop },
  { key: 'scadenza', label: 'Scadenza', width: 79.65238480194017, value: (r) => r.scadenza },
  { key: 'ritardo_pdm', label: 'Ritardo PdM', width: 79.18319612732604, value: (r) => r.ritardo_pdm ?? '', color: (_r, v) => ritardoColor(v) },
  {
    key: 'data_tolto_minore_scoperta', label: "Data Tolto d'opera < Data scoperta", width: 101.638199194941,
    value: (r) => (r.data_tolto_minore_scoperta ? "Data Tolto d'opera < Data scoperta" : ''), color: () => RED,
  },
  {
    key: 'non_visibile_zstmaia', label: 'PdM non visibile in ZSTMAIA', width: 91.03476151980598,
    value: (r) => (r.non_visibile_zstmaia ? 'PdM non visibile in ZSTMAIA' : ''), color: () => RED,
  },
];

/**
 * Tabella inferiore (`tableEx` 54b02bf6afcd38275d22): 11 colonne nell'ordine del
 * PBIR, con le larghezze esatte di `columnWidth` (St.sist. usa il default 90).
 */
const TABLE_AVVISI: SeTeColumn[] = [
  { key: 'pdm', label: 'PdM', width: 61.572951406787745, value: (r) => r.pdm },
  { key: 'avviso', label: 'Avviso', width: 69.8046581517656, value: (r) => r.avviso },
  { key: 'testo_esteso', label: 'Testo Esteso', width: 353.21034299181525, value: (r) => r.testo_esteso ?? '' },
  { key: 'sede_tecnica', label: 'Sede tecnica', width: 151.02145080947113, value: (r) => r.sede_tecnica },
  { key: 'inizio_richiesta', label: 'Inizio Rich.', width: 72.68970698722765, value: (r) => r.inizio_richiesta ?? '' },
  { key: 'fine_richiesta', label: 'Fine Rich.', width: 70.7663410969196, value: (r) => r.fine_richiesta ?? '' },
  {
    key: 'stato_avviso', label: 'Stato sist.', width: 90,
    value: (r) => r.stato_avviso, color: (_r, v) => (v.includes('MECO') ? GREEN : RED),
  },
  { key: 'data_chiusura', label: 'Data chiusura', width: 77.5828617623282, value: (r) => r.data_chiusura ?? '' },
  { key: 'ritardo_avv', label: 'Ritardo Avv.', width: 99.31284714303257, value: (r) => r.ritardo_avv ?? '', color: (_r, v) => ritardoColor(v) },
  {
    key: 'avviso_chiusura_antec_inizio', label: 'Data chiusura avv. < Data inizio avv.', width: 103.84868710864905,
    value: (r) => (r.avviso_chiusura_antec_inizio ? 'Data chiusura avv. < Data inizio avv.' : ''), color: () => RED,
  },
  {
    key: 'avviso_chiusura_futura', label: 'Data chiusura avv. futura', width: 75.51333872271624,
    value: (r) => (r.avviso_chiusura_futura ? 'Data chiusura avv. futura' : ''), color: () => RED,
  },
];

const TABLE_PDM_WIDTH = TABLE_PDM.reduce((sum, c) => sum + c.width, 0);
const TABLE_AVVISI_WIDTH = TABLE_AVVISI.reduce((sum, c) => sum + c.width, 0);

/* -------------------- Tabella -------------------- */
const SeTeTable: React.FC<{
  x: number; y: number; w: number; h: number; z: number;
  columns: SeTeColumn[];
  width: number;
  rows: PdmV5Item[];
  selectedRowId: string;
  onSelectRow: (pdm: string) => void;
  onDrillRow: (row: PdmV5Item) => void;
}> = ({ x, y, w, h, z, columns, width, rows, selectedRowId, onSelectRow, onDrillRow }) => (
  <PbiBox x={x} y={y} w={w} h={h} z={z}
    style={{ border: `2px solid ${RED}`, overflow: 'hidden', background: PBI_COLORS.band }}>
    <div className="scrollbar-thin" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width, fontSize: fontSizePx(8) }}>
        <colgroup>
          {columns.map((c) => <col key={c.key} style={{ width: c.width }} />)}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c) => (
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
          {rows.map((row, i) => {
            const isSelected = row.pdm === selectedRowId;
            return (
              <tr
                key={`${row.pdm}-${i}`}
                onClick={() => onSelectRow(row.pdm)}
                onDoubleClick={() => onDrillRow(row)}
                style={{ background: isSelected ? '#000000' : PBI_COLORS.tableRowSecondary, cursor: 'pointer' }}
              >
                {columns.map((c) => {
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
);

/* -------------------- Pagina -------------------- */
export const PageCercaSeTe: React.FC<PageCercaSeTeProps> = ({
  pdmList,
  dataAggiornamento,
  onNavigateToDrill,
  onBack,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Filtri (multi-selezione), come gli slicer del PBIR
  const [selAvviso, setSelAvviso] = useState<string[]>([]);
  const [selPdm, setSelPdm] = useState<string[]>([]);
  const [selSede, setSelSede] = useState<string[]>([]);

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
  const avvisiList = useMemo(() => uniq((p) => p.avviso), [pdmList]);
  const pdmOptions = useMemo(() => uniq((p) => p.pdm), [pdmList]);
  const sediList = useMemo(() => uniq((p) => p.sede_tecnica), [pdmList]);

  // Slicer "Anno" (mode Between): intervallo minimo/massimo disponibile
  const anniDisponibili = useMemo(() => {
    const anni = pdmList.map((p) => p.anno).filter((a): a is number => typeof a === 'number');
    return anni.length ? anni : [];
  }, [pdmList]);
  const [anno, setAnno] = useState<[number, number]>(() => {
    const anni = pdmList.map((p) => p.anno).filter((a): a is number => typeof a === 'number');
    return anni.length ? [Math.min(...anni), Math.max(...anni)] : [2026, 2026];
  });

  const handleResetFilters = () => {
    setSelAvviso([]);
    setSelPdm([]);
    setSelSede([]);
    setAnno(anniDisponibili.length ? [Math.min(...anniDisponibili), Math.max(...anniDisponibili)] : [2026, 2026]);
  };

  const filtered = useMemo(() => pdmList.filter((item) => {
    if (selAvviso.length > 0 && !selAvviso.includes(item.avviso)) return false;
    if (selPdm.length > 0 && !selPdm.includes(item.pdm)) return false;
    if (selSede.length > 0 && !selSede.includes(item.sede_tecnica)) return false;
    if (anniDisponibili.length > 0) {
      if (item.anno === undefined) return false;
      if (item.anno < anno[0] || item.anno > anno[1]) return false;
    }
    return true;
  }), [pdmList, selAvviso, selPdm, selSede, anno, anniDisponibili]);

  // Filtro del `tableEx` superiore: PdM_definitivo non nullo e non vuoto
  const pdmRows = useMemo(() => filtered.filter((r) => r.pdm !== ''), [filtered]);

  // Filtro del `tableEx` inferiore: IW29_full.Avviso non nullo e non vuoto
  const avvisiRows = useMemo(() => filtered.filter((r) => !!r.avviso), [filtered]);

  return (
    <PbiCanvas>
      {/* ================= Sfondi / pannelli ================= */}
      <PbiShape x={748.313043478261} y={53.42028985507248} w={178.08695652173913} h={93.49565217391304} z={1000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={0} y={138} w={1280} h={275} z={3000} fill={PBI_COLORS.band} radius={5} />
      <PbiShape x={0} y={437.0780856423174} w={1280.4030226700252} h={282.9219143576826} z={4000} fill={PBI_COLORS.band} radius={5} />
      <PbiShape x={917.4996778839941} y={51.198067632850254} w={163.61739130434782} h={94.6086956521739} z={13000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={499.32992005748656} y={52.92553669271536} w={256.6208569118836} h={94.16329830234437} z={16000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={1073.8812539297578} y={25.792688403844426} w={205.91754244139045} h={120.03233629749393} z={18000} fill={PBI_COLORS.card} radius={8} />

      {/* ================= Intestazione e Bottoni ================= */}
      <PbiBackButton x={15} y={14} size={32} onClick={onBack} />

      <PbiBox x={55} y={8} w={150} h={48} z={8000}>
        <img src="/assets/logo_ufficiale.png" alt="RFI" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }} />
      </PbiBox>

      <PbiText x={215} y={4} w={260} h={28} z={0} text="Difetti di binario - DOIT VE" sizePt={18} bold color={RED} />
      <PbiText x={215} y={32} w={160} h={22} z={11000}
        text="Cerca per SeTe V5" sizePt={14} bold color={PBI_COLORS.textLight} />
      <PbiText x={215} y={54} w={50} h={20} z={9000}
        text="Dati al:" sizePt={10} color={PBI_COLORS.textMuted} vAlign="middle" />
      <PbiText x={268} y={54} w={120} h={20} z={5000}
        text={dataAggiornamento} sizePt={11} color={PBI_COLORS.textLight} vAlign="middle" />

      <PbiButton x={480} y={10} w={90} h={34} z={20000} label="Reset Filtri" sizePt={9} onClick={handleResetFilters} />

      {/* ================= Slicer Superiori ================= */}
      <PbiListSlicer x={580} y={8} w={150} h={66} z={17000}
        title="Cerca Sede tecnica" options={sediList} value={selSede} onToggle={(v) => toggle(setSelSede, v)}
        searchable itemColor={PBI_COLORS.textLight} itemSizePt={9}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={10} />
      <PbiListSlicer x={740} y={8} w={120} h={66} z={10000}
        title="Cerca Avviso" options={avvisiList} value={selAvviso} onToggle={(v) => toggle(setSelAvviso, v)}
        searchable itemColor={PBI_COLORS.textLight} itemSizePt={9}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={10} />
      <PbiListSlicer x={870} y={8} w={120} h={66} z={14000}
        title="Cerca PdM" options={pdmOptions} value={selPdm} onToggle={(v) => toggle(setSelPdm, v)}
        searchable itemColor={PBI_COLORS.textLight} itemSizePt={9}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={10} />

      {/* Slicer "Anno" (mode Between) */}
      <PbiBox x={1000} y={8} w={265} h={66} z={19000}
        style={{ background: PBI_COLORS.card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: SLICER_YELLOW, color: HEADER_SLICER, fontSize: fontSizePx(10), padding: '2px 6px', flex: '0 0 auto' }}>
          Anno
        </div>
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, padding: '2px 8px' }}>
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

      {/* ================= Etichette tabelle ================= */}
      <PbiText x={24} y={112} w={150} h={31} z={7000} text="PdM" sizePt={11} bold color={PBI_COLORS.textLight} />
      <PbiText x={19} y={411} w={159} h={31} z={2000} text="Avvisi" sizePt={11} bold color={PBI_COLORS.textLight} />

      {/* ================= Tabella PdM (15 colonne) ================= */}
      <SeTeTable x={14.3928035982009} y={152.56371814092952} w={1251.2143928035982} h={246.5967016491754} z={6000}
        columns={TABLE_PDM} width={TABLE_PDM_WIDTH} rows={pdmRows}
        selectedRowId={selectedRowId} onSelectRow={setSelectedRowId} onDrillRow={onNavigateToDrill} />

      {/* ================= Tabella Avvisi (11 colonne) ================= */}
      <SeTeTable x={14.3928035982009} y={452.89355322338827} w={1250.254872563718} h={251.3943028485757} z={15000}
        columns={TABLE_AVVISI} width={TABLE_AVVISI_WIDTH} rows={avvisiRows}
        selectedRowId={selectedRowId} onSelectRow={setSelectedRowId} onDrillRow={onNavigateToDrill} />

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
