import React, { useMemo, useState } from 'react';
import { PdmV5Item } from '../../types';
import {
  PbiCanvas,
  PbiBox,
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

/* -------------------- Palette -------------------- */
const RED = PBI_COLORS.accent; // #F26D6D
const GREEN = PBI_COLORS.good; // #6CC070
const SLICER_YELLOW = '#F5C26B';
const HEADER_SLICER = PBI_COLORS.slicerHeader; // #1A1A1A

/* -------------------- Conditional formatting -------------------- */
const ritardoColor = (v: string): string => (v && v !== '0' && v.includes('Ritardo') ? RED : '#2B2D31');

interface SeTeColumn {
  key: string;
  label: string;
  width: number;
  value: (r: PdmV5Item) => string;
  color?: (r: PdmV5Item, value: string) => string | undefined;
}

const TABLE_PDM: SeTeColumn[] = [
  { key: 'pdm', label: 'PdM', width: 75, value: (r) => r.pdm },
  { key: 'avviso', label: 'Avviso', width: 75, value: (r) => r.avviso },
  { key: 'classe', label: 'Classe', width: 45, value: (r) => r.classe },
  { key: 'osservazioni', label: 'Osservazioni', width: 220, value: (r) => r.osservazioni },
  { key: 'linea', label: 'Linea InRete', width: 120, value: (r) => r.linea },
  { key: 'km_linea', label: 'Km linea', width: 65, value: (r) => r.km_linea },
  { key: 'sede_tecnica', label: 'Sede Tecnica', width: 155, value: (r) => r.sede_tecnica },
  { key: 'data_scoperta', label: 'Data scoperta', width: 85, value: (r) => r.data_scoperta },
  { key: 'fine_richiesta', label: 'Fine Rich.', width: 80, value: (r) => r.fine_richiesta ?? '' },
  {
    key: 'tolto_dop', label: "Tolto d'op.", width: 55, value: (r) => r.tolto_dop,
    color: (_r, v) => (v === 'N' ? RED : v === 'S' ? GREEN : undefined),
  },
  { key: 'data_tolto_dop', label: "Data tolto d'op.", width: 85, value: (r) => r.data_tolto_dop },
  { key: 'scadenza', label: 'Scadenza', width: 85, value: (r) => r.scadenza },
  { key: 'ritardo_pdm', label: 'Ritardo PdM', width: 95, value: (r) => r.ritardo_pdm ?? '', color: (_r, v) => ritardoColor(v) },
  {
    key: 'data_tolto_minore_scoperta', label: "Data Tolto d'opera < Data scoperta", width: 135,
    value: (r) => (r.data_tolto_minore_scoperta ? "Data Tolto d'opera < Data scoperta" : ''), color: () => RED,
  },
  {
    key: 'non_visibile_zstmaia', label: 'PdM non visibile in ZSTMAIA', width: 125,
    value: (r) => (r.non_visibile_zstmaia ? 'PdM non visibile in ZSTMAIA' : ''), color: () => RED,
  },
];

const TABLE_AVVISI: SeTeColumn[] = [
  { key: 'pdm', label: 'PdM', width: 75, value: (r) => r.pdm },
  { key: 'avviso', label: 'Avviso', width: 75, value: (r) => r.avviso },
  { key: 'testo_esteso', label: 'Testo esteso', width: 360, value: (r) => r.testo_esteso ?? '' },
  { key: 'sede_tecnica', label: 'Sede tecnica', width: 160, value: (r) => r.sede_tecnica },
  { key: 'inizio_richiesta', label: 'Inizio richiesta', width: 85, value: (r) => r.inizio_richiesta ?? '' },
  { key: 'fine_richiesta', label: 'Fine richiesta', width: 85, value: (r) => r.fine_richiesta ?? '' },
  {
    key: 'stato_avviso', label: 'Stato sistema', width: 85,
    value: (r) => r.stato_avviso, color: (_r, v) => (v.includes('MECO') ? GREEN : RED),
  },
  { key: 'data_chiusura', label: 'Data chiusura', width: 85, value: (r) => r.data_chiusura ?? '' },
  { key: 'ritardo_avv', label: 'Ritardo Avv.', width: 100, value: (r) => r.ritardo_avv ?? '', color: (_r, v) => ritardoColor(v) },
  {
    key: 'avviso_chiusura_antec_inizio', label: 'Data chiusura avv. < Data inizio avv.', width: 140,
    value: (r) => (r.avviso_chiusura_antec_inizio ? 'Data chiusura avv. < Data inizio avv.' : ''), color: () => RED,
  },
  {
    key: 'avviso_chiusura_futura', label: 'Data chiusura avv. futura', width: 120,
    value: (r) => (r.avviso_chiusura_futura ? 'Data chiusura avv. futura' : ''), color: () => RED,
  },
];

const TABLE_PDM_WIDTH = TABLE_PDM.reduce((sum, c) => sum + c.width, 0);
const TABLE_AVVISI_WIDTH = TABLE_AVVISI.reduce((sum, c) => sum + c.width, 0);

/* -------------------- Componente Tabella -------------------- */
const SeTeTable: React.FC<{
  x: number; y: number; w: number; h: number; z: number;
  columns: SeTeColumn[];
  width: number;
  rows: PdmV5Item[];
  selectedRowId: string;
  onSelectRow: (pdm: string) => void;
  onDrillRow: (row: PdmV5Item) => void;
}> = ({ x, y, w, h, z, columns, width, rows, selectedRowId, onSelectRow, onDrillRow }) => (
  <PbiBox
    x={x} y={y} w={w} h={h} z={z}
    style={{ border: `1.5px solid ${RED}`, borderRadius: 4, overflow: 'hidden', background: PBI_COLORS.band }}
  >
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
                  fontWeight: 500,
                  textAlign: 'left',
                  padding: '3px 6px',
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
                        padding: '3px 6px',
                        color: color ?? PBI_COLORS.textPrimary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        borderRight: `1px solid ${PBI_COLORS.band}`,
                        borderBottom: `1px solid rgba(255,255,255,0.03)`,
                      }}
                    >
                      {value || ''}
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
  const [selAvviso, setSelAvviso] = useState<string[]>([]);
  const [selPdm, setSelPdm] = useState<string[]>([]);
  const [selSede, setSelSede] = useState<string[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string>(pdmList[0]?.pdm ?? '');

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  const uniq = (getter: (r: PdmV5Item) => string): string[] => {
    const set = new Set<string>();
    pdmList.forEach((p) => { const v = getter(p); if (v) set.add(v); });
    return Array.from(set).sort();
  };
  const avvisiList = useMemo(() => uniq((p) => p.avviso), [pdmList]);
  const pdmOptions = useMemo(() => uniq((p) => p.pdm), [pdmList]);
  const sediList = useMemo(() => uniq((p) => p.sede_tecnica), [pdmList]);

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

  const pdmRows = useMemo(() => filtered.filter((r) => r.pdm !== ''), [filtered]);
  const avvisiRows = useMemo(() => filtered.filter((r) => !!r.avviso), [filtered]);

  return (
    <PbiCanvas>
      {/* ================= Header & Navigazione ================= */}
      <PbiBackButton x={15} y={14} size={32} onClick={onBack} title="Torna alla pagina precedente" />

      <PbiBox x={55} y={8} w={130} h={36} z={8000}>
        <img src="/assets/logo_ufficiale.png" alt="RFI" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }} />
      </PbiBox>
      <PbiButton x={55} y={48} w={85} h={22} z={20000} label="Reset Filtri" sizePt={8} onClick={handleResetFilters} />

      <PbiText x={195} y={8} w={270} h={26} z={0} text="Difetti di binario - DOIT VE" sizePt={16} bold color={RED} />
      <PbiText x={195} y={34} w={160} h={22} z={11000} text="Cerca per SeTe V5" sizePt={13} bold color={PBI_COLORS.textLight} />
      <PbiText x={195} y={56} w={48} h={18} z={9000} text="Dati al:" sizePt={9} color={PBI_COLORS.textMuted} vAlign="middle" />
      <PbiText x={245} y={56} w={140} h={18} z={5000} text={dataAggiornamento} sizePt={10} color={PBI_COLORS.textLight} vAlign="middle" />

      {/* ================= Slicer Superiori (y=10, h=125 per mostrare più sedi tecniche) ================= */}
      <PbiListSlicer
        x={475} y={10} w={210} h={125} z={17000}
        title="Cerca Sede tecnica" options={sediList} value={selSede} onToggle={(v) => toggle(setSelSede, v)}
        searchable itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={9.5}
      />
      <PbiListSlicer
        x={695} y={10} w={125} h={125} z={10000}
        title="Cerca Avviso" options={avvisiList} value={selAvviso} onToggle={(v) => toggle(setSelAvviso, v)}
        searchable itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={9.5}
      />
      <PbiListSlicer
        x={830} y={10} w={125} h={125} z={14000}
        title="Cerca PdM" options={pdmOptions} value={selPdm} onToggle={(v) => toggle(setSelPdm, v)}
        searchable itemColor={PBI_COLORS.textLight} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={9.5}
      />

      {/* Slicer Anno (Between) */}
      <PbiBox
        x={965} y={10} w={160} h={125} z={19000}
        style={{ background: PBI_COLORS.card, borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ background: SLICER_YELLOW, color: HEADER_SLICER, fontSize: fontSizePx(9.5), fontWeight: 700, padding: '3px 8px', flex: '0 0 auto' }}>
          Anno
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
            min={anniDisponibili.length ? Math.min(...anniDisponibili) : 2000}
            max={anniDisponibili.length ? Math.max(...anniDisponibili) : 2026}
            value={anno[1]}
            onChange={(e) => setAnno([anno[0], Number(e.target.value)])}
            style={{ width: '100%', accentColor: SLICER_YELLOW }}
          />
        </div>
      </PbiBox>

      {/* ================= Tabelle Inferiori ================= */}
      {/* Tabella 1: PdM */}
      <PbiText x={15} y={148} w={100} h={20} z={6000} text="PdM" sizePt={11} bold color={PBI_COLORS.textLight} />
      <SeTeTable
        x={15} y={170} w={1250} h={225} z={7000}
        columns={TABLE_PDM} width={TABLE_PDM_WIDTH} rows={pdmRows}
        selectedRowId={selectedRowId} onSelectRow={setSelectedRowId} onDrillRow={onNavigateToDrill}
      />

      {/* Tabella 2: Avvisi */}
      <PbiText x={15} y={408} w={100} h={20} z={8000} text="Avvisi" sizePt={11} bold color={PBI_COLORS.textLight} />
      <SeTeTable
        x={15} y={430} w={1250} h={270} z={9000}
        columns={TABLE_AVVISI} width={TABLE_AVVISI_WIDTH} rows={avvisiRows}
        selectedRowId={selectedRowId} onSelectRow={setSelectedRowId} onDrillRow={onNavigateToDrill}
      />

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
