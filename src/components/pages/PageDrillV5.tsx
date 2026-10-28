import React, { useMemo, useState } from 'react';
import { PdmV5Item, AvvisoV5Detail } from '../../types';
import { initialAvvisiV5Details, initialPdmV5List } from '../../data/v5Dataset';
import {
  PbiCanvas,
  PbiBox,
  PbiText,
  PbiButton,
  PbiBackButton,
  PbiListSlicer,
  PBI_COLORS,
  fontSizePx,
} from '../pbi/primitives';

interface PageDrillV5Props {
  selectedItem?: PdmV5Item;
  pdmList: PdmV5Item[];
  dataAggiornamento: string;
  onBack: () => void;
}

/* -------------------- Palette -------------------- */
const RED = PBI_COLORS.accent; // #F26D6D
const GREEN = PBI_COLORS.good; // #6CC070
const AMBER = '#F5C26B';
const ORANGE = '#FC7942';
const PURPLE = '#8A50D8';
const PANEL = PBI_COLORS.panel; // #3A3D44
const BAND = PBI_COLORS.band; // #2B2B2B
const CANVAS = PBI_COLORS.canvas; // #1B1C1F
const HEADER = PBI_COLORS.tableHeader; // #000000
const WHITE = '#FFFFFF';
const TEXT_LIGHT = PBI_COLORS.textLight; // #E6E6E6
const MUTED = PBI_COLORS.textMuted; // #B3B3B3
const SLICER_YELLOW = '#F5C26B';
const HEADER_SLICER = PBI_COLORS.slicerHeader; // #1A1A1A

/* -------------------- Conditional formatting -------------------- */
const classificazioneColor = (v: string): string => {
  if (v === 'Pdm mancante - Avv. chiuso') return AMBER;
  if (v === 'Pdm mancante - Avv. aperto') return RED;
  if (v === 'Pdm chiuso - Avv. mancante') return RED;
  if (v.includes('Pdm chiuso - Avv. chiuso')) return GREEN;
  if (v.includes('Pdm chiuso - Avv. aperto')) return RED;
  if (v.includes('Pdm aperto - Avv. mancante')) return RED;
  if (v.includes('Pdm aperto - Avv. chiuso')) return RED;
  if (v.includes('Pdm aperto - Avv. aperto')) return AMBER;
  return WHITE;
};

const scadenzaColor = (v: string): string => {
  if (v.includes('<60')) return AMBER;
  if (v.includes('<30')) return ORANGE;
  if (v.includes('SCADUT')) return RED;
  if (v.includes('MANCANTE')) return RED;
  if (v.includes('<10')) return RED;
  if (v.includes('COMPLETATO')) return GREEN;
  return WHITE;
};

const statoAvvisoColor = (v: string): string => (v.includes('MECO') ? GREEN : RED);
const toltoColor = (v: string): string => (v === 'S' ? GREEN : v === 'N' ? RED : WHITE);

/* -------------------- Tabella generica -------------------- */
interface PbiColumn {
  label: string;
  value: string;
  color?: string;
  width?: number;
}

interface PbiDataTableProps {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  columns: PbiColumn[];
  widths?: number[];
  headerBackground?: string;
  headerColor?: string;
  headerSizePt?: number;
  rowBackground?: string;
  rowColor?: string;
  rowSizePt?: number;
  borderColor?: string;
  wordWrap?: boolean;
}

const PbiDataTable: React.FC<PbiDataTableProps> = ({
  x, y, w, h, z, columns, widths = [],
  headerBackground = HEADER, headerColor = WHITE, headerSizePt = 9,
  rowBackground = BAND, rowColor = WHITE, rowSizePt = 9.5,
  borderColor = RED, wordWrap = false,
}) => {
  const n = columns.length;
  const base = columns.map((c, i) => c.width ?? widths[i] ?? 90);
  const sum = base.reduce((a, b) => a + b, 0) || 1;
  let colW = base;
  if (sum > w) {
    const k = w / sum;
    colW = base.map((v) => v * k);
  } else {
    colW = [...base];
    colW[n - 1] += w - sum;
  }

  return (
    <PbiBox x={x} y={y} w={w} h={h} z={z}
      style={{ overflow: 'hidden', border: `1.5px solid ${borderColor}`, borderRadius: 3, background: rowBackground }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', height: '100%', fontSize: fontSizePx(rowSizePt) }}>
        <colgroup>
          {colW.map((cw, i) => <col key={i} style={{ width: cw }} />)}
        </colgroup>
        <thead>
          <tr style={{ height: 22 }}>
            {columns.map((c, i) => (
              <th
                key={i}
                style={{
                  background: headerBackground,
                  color: headerColor,
                  fontWeight: 500,
                  textAlign: 'left',
                  padding: '3px 6px',
                  fontSize: fontSizePx(headerSizePt),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  borderRight: `1px solid ${borderColor}`,
                  borderBottom: `1px solid ${borderColor}`,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.map((c, i) => (
              <td
                key={i}
                title={c.value}
                style={{
                  padding: '4px 6px',
                  color: c.color ?? rowColor,
                  verticalAlign: 'top',
                  whiteSpace: wordWrap ? 'pre-wrap' : 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  borderRight: `1px solid ${borderColor}`,
                  fontSize: fontSizePx(rowSizePt),
                }}
              >
                {c.value || '-'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </PbiBox>
  );
};

/* -------------------- Pagina -------------------- */
export const PageDrillV5: React.FC<PageDrillV5Props> = ({
  selectedItem,
  pdmList,
  dataAggiornamento,
  onBack,
}) => {
  const currentList = pdmList.length > 0 ? pdmList : initialPdmV5List;
  const [currentPdmId, setCurrentPdmId] = useState<string>(selectedItem?.pdm || currentList[0]?.pdm || '');
  const [selAvviso, setSelAvviso] = useState<string[]>([]);

  const currentItem = useMemo(() => {
    return currentList.find((p) => p.pdm === currentPdmId) || selectedItem || currentList[0] || {} as PdmV5Item;
  }, [currentList, currentPdmId, selectedItem]);

  const avvisoDetail = useMemo((): AvvisoV5Detail => {
    const fromStatic = initialAvvisiV5Details.find((a) => a.pdm === currentItem.pdm || a.avviso === currentItem.avviso);
    if (fromStatic) return fromStatic;

    return {
      avviso: currentItem.avviso || '-',
      pdm: currentItem.pdm,
      tipo: 'V5',
      descrizione: currentItem.osservazioni || 'Dettaglio difetto armamento',
      autore: currentItem.creato_da || '941235',
      data_creazione: currentItem.data_creaz_avviso || currentItem.data_creazione || '-',
      ultima_mod: currentItem.creato_da || '946194',
      data_modifica: currentItem.data_tolto_dop || currentItem.data_creazione || '-',
      sede_tecnica: currentItem.sede_tecnica || '-',
      ordine: currentItem.ordine || '-',
      network: currentItem.network || '-',
      testo_esteso: currentItem.testo_esteso || currentItem.osservazioni || '-',
      stato_sistema: currentItem.stato_avviso || 'MAPE',
      inizio_richiesta: currentItem.inizio_richiesta || currentItem.data_creazione || '-',
      fine_richiesta: currentItem.fine_richiesta || '-',
      data_chiusura: currentItem.data_chiusura || '-',
      ritardo_avv: currentItem.ritardo_avv || '',
    };
  }, [currentItem]);

  const avvisiList = useMemo(() => {
    const set = new Set<string>();
    currentList.forEach((p) => { if (p.avviso) set.add(p.avviso); });
    return Array.from(set).sort();
  }, [currentList]);

  const pdmOptions = useMemo(() => {
    return currentList.map((p) => p.pdm).filter(Boolean);
  }, [currentList]);

  const handleResetFilters = () => {
    setSelAvviso([]);
    if (currentList[0]) setCurrentPdmId(currentList[0].pdm);
  };

  const toggleAvviso = (avviso: string) => {
    setSelAvviso((prev) => {
      const next = prev.includes(avviso) ? [] : [avviso];
      if (next.length > 0) {
        const found = currentList.find((p) => p.avviso === avviso);
        if (found) setCurrentPdmId(found.pdm);
      }
      return next;
    });
  };

  return (
    <PbiCanvas>
      {/* ================= Barra Superiore (y=8 a 105) ================= */}
      {/* Pulsante Indietro nativo Power BI */}
      <PbiBackButton x={15} y={14} size={32} onClick={onBack} title="Torna alla pagina precedente" />

      {/* Logo RFI */}
      <PbiBox x={52} y={8} w={95} h={36} z={33000}>
        <img
          src="/assets/logo_ufficiale.png"
          alt="RFI"
          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }}
        />
      </PbiBox>

      {/* Slicer Cerca Avviso */}
      <PbiListSlicer
        x={240} y={8} w={115} h={95} z={36000}
        title="Cerca Avviso" options={avvisiList} value={selAvviso} onToggle={toggleAvviso}
        searchable itemColor={TEXT_LIGHT} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={9.5}
      />

      {/* Slicer Cerca PdM */}
      <PbiListSlicer
        x={362} y={8} w={115} h={95} z={42000}
        title="Cerca PdM" options={pdmOptions} value={currentItem ? [currentItem.pdm] : []} onToggle={(v) => setCurrentPdmId(v)}
        searchable itemColor={TEXT_LIGHT} itemSizePt={8}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={9.5}
      />

      {/* Card Posizione: Linea InRete / Località/Tratta */}
      <PbiDataTable
        x={485} y={8} w={195} h={95} z={47000}
        columns={[
          { label: 'Linea InRete', value: currentItem.linea || '-' },
          { label: 'Località/Tratta', value: currentItem.localita_tratta || '-' },
        ]}
        widths={[95, 100]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={9}
        rowBackground={CANVAS} rowColor={WHITE} rowSizePt={9}
        borderColor={MUTED}
      />

      {/* Card Classificazione / Stato scadenza */}
      <PbiDataTable
        x={688} y={8} w={275} h={95} z={32000}
        columns={[
          { label: 'Classificazione', value: currentItem.classificazione_stato || '-', color: classificazioneColor(currentItem.classificazione_stato || '') },
          { label: 'Stato scadenza', value: currentItem.scadenza || '-', color: scadenzaColor(currentItem.scadenza || '') },
        ]}
        widths={[150, 125]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={9}
        rowBackground={CANVAS} rowColor={WHITE} rowSizePt={9}
        borderColor={PURPLE}
      />

      {/* ================= Riferimento temporale e Titoli (riga y=114 a 142) ================= */}
      <PbiText
        x={20} y={116} w={320} h={26} z={7000}
        text="Difetti di binario - DOIT VE" sizePt={16} bold color={RED}
      />
      <PbiText
        x={345} y={117} w={90} h={24} z={37000}
        text="Drill V5" sizePt={15} bold color={TEXT_LIGHT}
      />
      {/* Dati aggiornati al: + Data aggiornamento + Pulsante Reset Filtri compatto a destra */}
      <PbiBox x={440} y={118} w={350} h={24} z={34000} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: fontSizePx(10), color: MUTED }}>Dati aggiornati al:</span>
        <span style={{ fontSize: fontSizePx(10.5), color: TEXT_LIGHT }}>{dataAggiornamento}</span>
        <button
          onClick={handleResetFilters}
          style={{
            marginLeft: 6,
            padding: '1px 7px',
            fontSize: fontSizePx(7.5),
            fontWeight: 600,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.08)',
            color: TEXT_LIGHT,
            border: `1px solid ${PBI_COLORS.tileBorder}`,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            lineHeight: '16px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.borderColor = MUTED;
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

      {/* ================= SEZIONE DATI PDM (y=155 a 465) ================= */}
      <PbiText x={20} y={156} w={150} h={22} z={30000} text="Dati PdM" sizePt={11} bold color={TEXT_LIGHT} />
      <PbiText x={835} y={156} w={125} h={22} z={31000} text="Stato PdM" sizePt={11} bold color={TEXT_LIGHT} />

      {/* Riga 1 PdM: PdM, Classe, Osservazioni */}
      <PbiDataTable
        x={20} y={180} w={800} h={60} z={14000}
        columns={[
          { label: 'PdM', value: currentItem.pdm || '-' },
          { label: 'Classe prov.', value: currentItem.classe || '-' },
          { label: 'Osservazioni', value: currentItem.osservazioni || '-' },
        ]}
        widths={[90, 95, 615]}
        borderColor={RED}
      />

      {/* Riga 2 PdM: Sede Tecnica, Cod. linea, Km linea */}
      <PbiDataTable
        x={20} y={246} w={360} h={60} z={17000}
        columns={[
          { label: 'Sede Tecnica', value: currentItem.sede_tecnica || '-' },
          { label: 'Cod. linea', value: currentItem.cod_linea || '-' },
          { label: 'Km linea', value: currentItem.km_linea || '-' },
        ]}
        widths={[180, 90, 90]}
        borderColor={RED}
      />

      {/* Riga 3 PdM: Dettagli difetto */}
      <PbiDataTable
        x={20} y={312} w={800} h={60} z={15000}
        columns={[
          { label: 'Dev.', value: currentItem.dev || '-' },
          { label: 'Bin.', value: currentItem.bin || '-' },
          { label: 'Fila', value: currentItem.fila || '-' },
          { label: 'Tipo difetto', value: currentItem.tipo_difetto || '-' },
          { label: 'Tipo Arm.', value: currentItem.tipo_arm || '-' },
          { label: 'Val. (%/mm)', value: currentItem.val_perc_mm || '-' },
          { label: 'Prof. Dif.', value: currentItem.prof_dif || '-' },
          { label: 'Pos. Dif', value: currentItem.pos_dif || '-' },
          { label: 'Ubi lin.', value: currentItem.ubi_lin || '-' },
          { label: 'T. tratta ragg. fug.', value: currentItem.t_tratta_ragg_fug || '-' },
        ]}
        widths={[65, 50, 50, 95, 80, 80, 70, 80, 80, 150]}
        borderColor={RED}
      />

      {/* Riga 4 PdM: Saldatura & Creazione */}
      <PbiDataTable
        x={20} y={378} w={570} h={60} z={16000}
        columns={[
          { label: 'Tipo Sald.', value: currentItem.tipo_sald || '-' },
          { label: 'Data esec. saldatura', value: currentItem.data_esec_saldatura || '-' },
          { label: 'Pos. sezione', value: currentItem.pos_sezione || '-' },
          { label: 'Sald. in gar.', value: currentItem.sald_in_gar || '-' },
          { label: 'Eseguito da', value: currentItem.esegui_to_da || '-' },
          { label: 'ID saldatore', value: currentItem.id_saldatore || '-' },
        ]}
        widths={[80, 115, 95, 80, 100, 100]}
        borderColor={RED}
      />
      <PbiDataTable
        x={600} y={378} w={220} h={60} z={45000}
        columns={[
          { label: 'Creato da', value: currentItem.creato_da || '-' },
          { label: 'Data creazione', value: currentItem.data_creazione || '-' },
        ]}
        widths={[100, 120]}
        borderColor={RED}
      />

      {/* Pannello Destro: Stato PdM (cards viola) */}
      <PbiDataTable
        x={835} y={180} w={125} h={56} z={18000}
        columns={[{ label: "Tolto d'opera", value: currentItem.tolto_dop, color: toltoColor(currentItem.tolto_dop) }]}
        widths={[125]}
        headerBackground={HEADER} rowBackground={PANEL} rowSizePt={12}
        borderColor={PURPLE}
      />
      <PbiDataTable
        x={835} y={246} w={125} h={56} z={19000}
        columns={[{ label: 'Data Scoperta', value: currentItem.data_scoperta || '-' }]}
        widths={[125]}
        headerBackground={HEADER} rowBackground={PANEL} rowSizePt={10}
        borderColor={PURPLE}
      />
      <PbiDataTable
        x={835} y={312} w={125} h={56} z={20000}
        columns={[{ label: 'Data Agg.', value: currentItem.data_creazione || '-' }]}
        widths={[125]}
        headerBackground={HEADER} rowBackground={PANEL} rowSizePt={10}
        borderColor={PURPLE}
      />
      <PbiDataTable
        x={835} y={378} w={125} h={56} z={22000}
        columns={[{ label: "Data tolto d'op.", value: currentItem.data_tolto_dop || '-' }]}
        widths={[125]}
        headerBackground={HEADER} rowBackground={PANEL} rowSizePt={10}
        borderColor={PURPLE}
      />

      {/* ================= SEZIONE DATI AVVISO (y=470 a 705) ================= */}
      <PbiText x={20} y={472} w={150} h={22} z={10000} text="Dati avviso" sizePt={11} bold color={TEXT_LIGHT} />
      <PbiText x={835} y={472} w={125} h={22} z={29000} text="Stato avviso" sizePt={11} bold color={TEXT_LIGHT} />

      {/* Riga 1 Avviso: Avviso, Tipo, Descrizione + Autore, Data cr., Da, Data mod. */}
      <PbiDataTable
        x={20} y={496} w={410} h={60} z={21000}
        columns={[
          { label: 'Avviso', value: avvisoDetail.avviso },
          { label: 'Tipo', value: avvisoDetail.tipo },
          { label: 'Descrizione', value: avvisoDetail.descrizione },
        ]}
        widths={[85, 45, 280]}
        borderColor={RED}
      />
      <PbiDataTable
        x={440} y={496} w={380} h={60} z={27000}
        columns={[
          { label: 'Autore', value: avvisoDetail.autore },
          { label: 'Data creazione', value: avvisoDetail.data_creazione },
          { label: 'Ultima mod.', value: avvisoDetail.ultima_mod },
          { label: 'Data modifica', value: avvisoDetail.data_modifica },
        ]}
        widths={[90, 100, 95, 95]}
        borderColor={RED}
      />

      {/* Riga 2 Avviso: Sede tecnica + Ordine, Network */}
      <PbiDataTable
        x={20} y={562} w={410} h={60} z={35000}
        columns={[{ label: 'Sede tecnica', value: avvisoDetail.sede_tecnica }]}
        widths={[410]}
        borderColor={RED}
      />
      <PbiDataTable
        x={440} y={562} w={190} h={60} z={28000}
        columns={[
          { label: 'Ordine', value: avvisoDetail.ordine },
          { label: 'Network', value: avvisoDetail.network },
        ]}
        widths={[95, 95]}
        borderColor={RED}
      />

      {/* Riga 3 Avviso: Testo Esteso */}
      <PbiDataTable
        x={20} y={628} w={800} h={76} z={26000}
        columns={[{ label: 'Testo Esteso', value: avvisoDetail.testo_esteso }]}
        widths={[800]}
        borderColor={RED}
        wordWrap
      />

      {/* Pannello Destro: Stato Avviso (cards viola) */}
      <PbiDataTable
        x={835} y={496} w={125} h={48} z={23000}
        columns={[{ label: 'Stato sistema', value: avvisoDetail.stato_sistema, color: statoAvvisoColor(avvisoDetail.stato_sistema) }]}
        widths={[125]}
        headerBackground={HEADER} rowBackground={PANEL} rowSizePt={10}
        borderColor={PURPLE}
      />
      <PbiDataTable
        x={835} y={550} w={125} h={48} z={24000}
        columns={[{ label: 'Inizio richiesta', value: avvisoDetail.inizio_richiesta || '-' }]}
        widths={[125]}
        headerBackground={HEADER} rowBackground={PANEL} rowSizePt={10}
        borderColor={PURPLE}
      />
      <PbiDataTable
        x={835} y={604} w={125} h={48} z={25000}
        columns={[{ label: 'Fine richiesta', value: avvisoDetail.fine_richiesta || '-' }]}
        widths={[125]}
        headerBackground={HEADER} rowBackground={PANEL} rowSizePt={10}
        borderColor={PURPLE}
      />
      <PbiDataTable
        x={835} y={658} w={125} h={48} z={38000}
        columns={[{ label: 'Data chiusura', value: avvisoDetail.data_chiusura || '-' }]}
        widths={[125]}
        headerBackground={HEADER} rowBackground={PANEL} rowSizePt={10}
        borderColor={PURPLE}
      />
    </PbiCanvas>
  );
};
