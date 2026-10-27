import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PdmV5Item, AvvisoV5Detail } from '../../types';
import { initialAvvisiV5Details, initialPdmV5List } from '../../data/v5Dataset';
import {
  PbiCanvas,
  PbiBox,
  PbiShape,
  PbiText,
  PbiButton,
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

/* -------------------- Palette (dai visual.json PBIR) -------------------- */
const RED = PBI_COLORS.accent; // #F26D6D
const GREEN = PBI_COLORS.good; // #6CC070
const AMBER = '#F5C26B';
const ORANGE = '#FC7942';
const PURPLE = '#8A50D8';
const PANEL = PBI_COLORS.panel; // #3A3D44
const BAND = PBI_COLORS.band; // #2B2B2B
const CANVAS = PBI_COLORS.canvas; // #1B1C1F
const CARD = PBI_COLORS.card; // #2B2D31
const HEADER = PBI_COLORS.tableHeader; // #000000
const WHITE = '#FFFFFF';
const TEXT_LIGHT = PBI_COLORS.textLight; // #E6E6E6
const MUTED = PBI_COLORS.textMuted; // #B3B3B3
const SLICER_YELLOW = '#F5C26B';
const HEADER_SLICER = PBI_COLORS.slicerHeader; // #1A1A1A

/* -------------------- Conditional formatting -------------------- */
/** Classificazione stato (tableEx 5e0ece156b20a8dd86a6). */
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

/** Stato scadenza (tableEx 5e0ece156b20a8dd86a6). */
const scadenzaColor = (v: string): string => {
  if (v.includes('<60')) return AMBER;
  if (v.includes('<30')) return ORANGE;
  if (v.includes('SCADUT')) return RED;
  if (v.includes('MANCANTE')) return RED;
  if (v.includes('<10')) return RED;
  return WHITE;
};

/** St.sist. / Stato avviso: MECO -> verde, altrimenti rosso. */
const statoAvvisoColor = (v: string): string => (v.includes('MECO') ? GREEN : RED);

/** Tolto d'opera: N -> rosso, S -> verde. */
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

/**
 * Riproduce un `tableEx` con un singolo record: intestazioni e riga con le
 * larghezze di colonna (`columnWidth`) del PBIR, ridimensionate per riempire
 * il box del visual.
 */
const PbiDataTable: React.FC<PbiDataTableProps> = ({
  x, y, w, h, z, columns, widths = [],
  headerBackground = HEADER, headerColor = WHITE, headerSizePt = 10,
  rowBackground = BAND, rowColor = WHITE, rowSizePt = 10,
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
      style={{ overflow: 'hidden', border: `1px solid ${borderColor}`, background: rowBackground }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', fontSize: fontSizePx(rowSizePt) }}>
        <colgroup>
          {colW.map((cw, i) => <col key={i} style={{ width: cw }} />)}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                style={{
                  background: headerBackground,
                  color: headerColor,
                  fontWeight: 400,
                  textAlign: 'left',
                  padding: '2px 4px',
                  fontSize: fontSizePx(headerSizePt),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  borderRight: `1px solid ${borderColor}`,
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
                  padding: '2px 4px',
                  color: c.color ?? rowColor,
                  verticalAlign: 'top',
                  whiteSpace: wordWrap ? 'pre-wrap' : 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {c.value}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </PbiBox>
  );
};

/* -------------------- Indicatore (flag / anomalia) -------------------- */
interface PbiFlagProps {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  text: string;
  color: string;
  background: string;
}

/** Riproduce i `tableEx` di flag: icona `CircleSymbolMedium` + testo. */
const PbiFlag: React.FC<PbiFlagProps> = ({ x, y, w, h, z, text, color, background }) => (
  <PbiBox x={x} y={y} w={w} h={h} z={z}
    style={{ background, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px', overflow: 'hidden' }}>
    <span style={{ color, fontSize: fontSizePx(10), lineHeight: 1 }}>{'\u25CF'}</span>
    <span style={{ color, fontSize: fontSizePx(10), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
  </PbiBox>
);

/* -------------------- Pagina -------------------- */
export const PageDrillV5: React.FC<PageDrillV5Props> = ({
  selectedItem: initialSelectedItem,
  pdmList,
  dataAggiornamento,
  onBack,
}) => {
  const [currentPdmId, setCurrentPdmId] = useState<string>(
    initialSelectedItem?.pdm || '1208502'
  );
  const [searchPdmInput, setSearchPdmInput] = useState('');
  const [searchAvvisoInput, setSearchAvvisoInput] = useState('');
  const [selAvviso, setSelAvviso] = useState<string[]>([]);

  // Fallback ai dati demo quando la web app non è alimentata
  const effectiveList = useMemo(
    () => (pdmList && pdmList.length ? pdmList : initialPdmV5List),
    [pdmList]
  );

  const currentItem: PdmV5Item = useMemo(
    () =>
      effectiveList.find((p) => p.pdm === currentPdmId) ||
      initialSelectedItem ||
      effectiveList[0],
    [effectiveList, currentPdmId, initialSelectedItem]
  );

  const avvisoDetail: AvvisoV5Detail = useMemo(() => {
    const linked = initialAvvisiV5Details.find(
      (a) => a.pdm === currentItem?.pdm || (currentItem?.avviso && a.avviso === currentItem.avviso)
    );
    if (linked) return linked;
    return initialAvvisiV5Details[0];
  }, [currentItem]);

  // Opzioni degli slicer (uniche, filtrate dal testo di ricerca)
  const avvisiList = useMemo(() => {
    const set = new Set<string>();
    effectiveList.forEach((p) => { if (p.avviso) set.add(p.avviso); });
    const all = Array.from(set).sort();
    return searchAvvisoInput
      ? all.filter((a) => a.toLowerCase().includes(searchAvvisoInput.toLowerCase()))
      : all;
  }, [effectiveList, searchAvvisoInput]);

  const pdmOptions = useMemo(() => {
    const all = effectiveList.map((p) => p.pdm).sort();
    return searchPdmInput
      ? all.filter((p) => p.toLowerCase().includes(searchPdmInput.toLowerCase()))
      : all;
  }, [effectiveList, searchPdmInput]);

  const handleResetFilters = () => {
    setCurrentPdmId(initialSelectedItem?.pdm || '1208502');
    setSearchPdmInput('');
    setSearchAvvisoInput('');
    setSelAvviso([]);
  };

  const toggleAvviso = (value: string) => {
    setSelAvviso((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  };

  // Flag di anomalia (sovrappongono il canvas solo quando attivi)
  const flagToltoFuturo = !!currentItem.tolto_data_futura;
  const flagToltoMinoreScoperta = !!currentItem.data_tolto_minore_scoperta;
  const flagChiusuraFutura = !!currentItem.avviso_chiusura_futura || !!avvisoDetail.chiusura_futura;
  const flagChiusuraAntecedente =
    !!currentItem.avviso_chiusura_antec_inizio || !!avvisoDetail.chiusura_minore_inizio;
  const flagNonVisibile = !!currentItem.non_visibile_zstmaia;

  const chiusuraRitardo = !!avvisoDetail.ritardo_avv || !!currentItem.avviso_chiusura_ritardo;
  const consuntivazioneAnomala = currentItem.network_odl === 'N';

  return (
    <PbiCanvas>
      {/* ================= Sfondi / pannelli ================= */}
      <PbiShape x={1096} y={138} w={184} h={275} z={1000} fill={PANEL} radius={8} />
      <PbiShape x={1095.5555555555554} y={436.6666666666667} w={184.44444444444443} h={283.3333333333333} z={2000} fill={PANEL} radius={8} />
      <PbiShape x={290.3295019157089} y={0} w={178.08695652173913} h={93.49565217391304} z={8000} fill={CARD} radius={8} />
      <PbiShape x={892.2921914357682} y={0} w={386.29722921914356} h={126.04534005037783} z={9000} fill={CANVAS} radius={8} />
      <PbiShape x={0} y={138.06020066889633} w={1103.4113712374583} h={275.05016722408027} z={11000} fill={BAND} radius={5} />
      <PbiShape x={0} y={436.6666666666667} w={1103.3333333333333} h={283.3333333333333} z={12000} fill={BAND} radius={5} />
      <PbiShape x={461.73835854366735} y={0} w={163.61739130434782} h={94.6086956521739} z={41000} fill={CARD} radius={8} />
      <PbiShape x={616.624685138539} y={0} w={285.6423173803526} h={126.04534005037783} z={46000} fill={CANVAS} radius={8} />

      {/* ================= Indicatori (flag / anomalie) ================= */}
      {flagToltoFuturo && (
        <PbiFlag x={640.2015113350126} y={96.12090680100755} w={192.2418136020151} h={58.942065491183875} z={0}
          text="Data Tolto d'opera futura" color={RED} background={CANVAS} />
      )}
      {flagToltoMinoreScoperta && (
        <PbiFlag x={832.3984719098727} y={95.81805376593658} w={260.58631921824104} h={59.413680781758956} z={4000}
          text="Data Tolto d'opera < Data scoperta" color={RED} background={CANVAS} />
      )}
      {flagChiusuraFutura && (
        <PbiFlag x={515.7739557739558} y={389.97542997543} w={261.031941031941} h={59.75429975429976} z={5000}
          text="Data chiusura avv. futura" color={RED} background={CANVAS} />
      )}
      {flagChiusuraAntecedente && (
        <PbiFlag x={824.4951140065147} y={390.8794788273616} w={260.58631921824104} h={59.413680781758956} z={6000}
          text="Data chiusura avv. < Data inizio avv." color={RED} background={CANVAS} />
      )}
      {flagNonVisibile && (
        <PbiFlag x={869.2307692307692} y={346.9230769230769} w={215.3846153846154} h={55.38461538461538} z={43000}
          text="PdM non visibile in ZSTMAIA" color={RED} background={BAND} />
      )}

      {/* ================= Intestazione ================= */}
      <PbiText x={7.2544080604534} y={92.49370277078086} w={339.14357682619647} h={27.20403022670025} z={7000}
        text="Difetti di binario - DOIT VE" sizePt={20} bold color={RED} background={CANVAS} />
      <PbiText x={305.59193954659946} y={95.21410579345087} w={79.02608695652174} h={25.6} z={37000}
        text="Drill V5" sizePt={15} bold color={TEXT_LIGHT} background={CANVAS} />
      <PbiBox x={39.8992443324937} y={11.788413098236775} w={249.37027707808562} h={74.35768261964735} z={33000}>
        <img src="/assets/logo_ufficiale.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }} />
      </PbiBox>
      <PbiText x={385.7637221857338} y={92.88026964410722} w={118} h={28} z={34000}
        text="Dati aggiornati al:" sizePt={11} color={MUTED} align="right" vAlign="middle" background={CANVAS} />
      <PbiText x={493.7637221857336} y={93.88026964410722} w={131} h={27} z={13000}
        text={dataAggiornamento} sizePt={12} color={TEXT_LIGHT} vAlign="middle" background={CANVAS} />

      {/* ================= Bottoni ================= */}
      <PbiBox x={0} y={0} w={99.74811083123424} h={39.8992443324937} z={38000} onClick={onBack} title="Indietro"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: PBI_COLORS.button, border: `1px solid ${MUTED}`, borderRadius: 18, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>
        <ArrowLeft size={18} color={MUTED} />
      </PbiBox>
      <PbiButton x={174.1057934508816} y={5.44080604534005} w={122.72727272727272} h={40} z={44000}
        label="Reset Filtri" sizePt={9} onClick={handleResetFilters} />

      {/* ================= Slicer ================= */}
      <PbiListSlicer x={305.9121106113611} y={11.130434782608685} w={143.58260869565217} h={67.89565217391305} z={36000}
        title="Cerca Avviso" options={avvisiList} value={selAvviso} onToggle={toggleAvviso}
        searchable itemColor={TEXT_LIGHT} itemSizePt={10}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={12} />
      <PbiListSlicer x={477.32096723931954} y={11.130434782608685} w={129.11304347826086} h={72.34782608695652} z={42000}
        title="Cerca PdM" options={pdmOptions} value={currentItem ? [currentItem.pdm] : []} onToggle={(v) => setCurrentPdmId(v)}
        searchable itemColor={TEXT_LIGHT} itemSizePt={10}
        headerBackground={SLICER_YELLOW} headerColor={HEADER_SLICER} headerSizePt={12} />

      {/* ================= Etichette sezioni ================= */}
      <PbiText x={23.57682619647355} y={117.88413098236775} w={150.52896725440806} h={30.83123425692695} z={30000}
        text="Dati PdM" sizePt={11} bold color={TEXT_LIGHT} />
      <PbiText x={18.55163727772889} y={418.9420654913001} w={159} h={31} z={10000}
        text="Dati avviso" sizePt={11} bold color={TEXT_LIGHT} background={CANVAS} />
      <PbiText x={1114.4584382871535} y={119.6977329974811} w={93.40050377833752} h={29.924433249370274} z={31000}
        text="Stato PdM" sizePt={11} bold color={TEXT_LIGHT} />
      <PbiText x={1113.5516372777283} y={417.9420654913001} w={166} h={31} z={29000}
        text="Stato avviso" sizePt={11} bold color={TEXT_LIGHT} />

      {/* ================= Card Posizione (Linea / Località / Tratta) ================= */}
      <PbiDataTable x={632.0403022670025} y={14.5088161209068} w={257.5314861460957} h={93.40050377833752} z={47000}
        columns={[
          { label: 'Linea InRete', value: currentItem.linea },
          { label: 'Località/Tratta', value: currentItem.localita_tratta },
          { label: 'Tratta', value: currentItem.localita_tratta },
        ]}
        widths={[90.57170808220056, 93, 130, 111, 0]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={CANVAS} rowColor={WHITE} rowSizePt={10}
        borderColor={MUTED} />

      {/* ================= Card Classificazione / Stato scadenza ================= */}
      <PbiDataTable x={911.3350125944584} y={14.5088161209068} w={352.74559193954656} h={64.38287153652392} z={32000}
        columns={[
          { label: 'Classificazione stato', value: currentItem.classificazione_stato, color: classificazioneColor(currentItem.classificazione_stato) },
          { label: 'Stato scadenza', value: currentItem.scadenza, color: scadenzaColor(currentItem.scadenza) },
        ]}
        widths={[90.57170808220056, 93, 235, 99]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={CANVAS} rowColor={WHITE} rowSizePt={10}
        borderColor={PURPLE} />

      {/* ================= Dati PdM: Punto di Misura ================= */}
      <PbiDataTable x={19} y={151} w={1053} h={65} z={14000}
        columns={[
          { label: 'PdM', value: currentItem.pdm },
          { label: 'Classe prov. def.', value: currentItem.classe },
          { label: 'Osservazioni def.', value: currentItem.osservazioni },
        ]}
        widths={[90.57170808220056, 93, 98.44147529535977, 825.6159122426678]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={BAND} rowColor={WHITE} rowSizePt={10}
        borderColor={RED} />

      {/* ================= Dati PdM: Posizione ================= */}
      <PbiDataTable x={19} y={212} w={1069} h={65} z={17000}
        columns={[
          { label: 'Tratta', value: currentItem.localita_tratta },
          { label: 'Cod. linea', value: currentItem.cod_linea ?? '' },
          { label: 'Km linea', value: currentItem.km_linea },
        ]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={BAND} rowColor={WHITE} rowSizePt={10}
        borderColor={RED} />

      {/* ================= Dati PdM: Dettagli ================= */}
      <PbiDataTable x={19} y={274} w={1061} h={64} z={15000}
        columns={[
          { label: 'Dev.', value: currentItem.dev ?? '' },
          { label: 'Bin.', value: currentItem.bin ?? '' },
          { label: 'Fila', value: currentItem.fila ?? '' },
          { label: 'Tipo difetto', value: currentItem.tipo_difetto },
          { label: 'Tipo Arm.', value: currentItem.tipo_arm ?? '' },
          { label: 'Val. (%/mm)', value: currentItem.val_perc_mm ?? '' },
          { label: 'Prof. Dif.', value: currentItem.prof_dif ?? '' },
          { label: 'Pos. Dif', value: currentItem.pos_dif ?? '' },
          { label: 'Ubi lin.', value: currentItem.ubi_lin ?? '' },
          { label: 'T. tratta ragg. fug.', value: currentItem.t_tratta_ragg_fug ?? '' },
        ]}
        widths={[90.57170808220056, 93, 60, 57, 51, 103, 96, 86, 65, 140, 82, 116]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={BAND} rowColor={WHITE} rowSizePt={10}
        borderColor={RED} />

      {/* ================= Dati PdM: Saldatura ================= */}
      <PbiDataTable x={19.23076923076923} y={337.6923076923077} w={668.4615384615385} h={61.53846153846153} z={16000}
        columns={[
          { label: 'Tipo Sald.', value: currentItem.tipo_sald ?? '' },
          { label: 'Data esec. saldatura', value: currentItem.data_esec_saldatura ?? '' },
          { label: 'Posizione sezione', value: currentItem.pos_sezione ?? '' },
          { label: 'Sald. in gar.', value: currentItem.sald_in_gar ?? '' },
          { label: 'Eseguito da', value: currentItem.esegui_to_da ?? '' },
          { label: 'ID saldatore', value: currentItem.id_saldatore ?? '' },
        ]}
        widths={[90.57170808220056, 93, 95, 132, 115, 83, 123, 106.84615753916452]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={BAND} rowColor={WHITE} rowSizePt={10}
        borderColor={RED} />

      {/* ================= Dati PdM: Creato da / Data creazione ================= */}
      <PbiDataTable x={687.6923076923076} y={337.6923076923077} w={188.46153846153845} h={61.53846153846153} z={45000}
        columns={[
          { label: 'Creato da', value: currentItem.creato_da ?? '' },
          { label: 'Data creazione', value: currentItem.data_creazione },
        ]}
        widths={[90.57170808220056, 93, 78.26285472202176]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={BAND} rowColor={WHITE} rowSizePt={10}
        borderColor={RED} />

      {/* ================= Dati avviso: Avviso ================= */}
      <PbiDataTable x={19} y={458} w={541} h={63} z={21000}
        columns={[
          { label: 'Avviso', value: avvisoDetail.avviso },
          { label: 'Tp.', value: avvisoDetail.tipo },
          { label: 'Descrizione', value: avvisoDetail.descrizione },
        ]}
        widths={[43, 389]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={BAND} rowColor={WHITE} rowSizePt={10}
        borderColor={RED} />

      {/* ================= Dati avviso: Sede tecnica ================= */}
      <PbiDataTable x={19} y={527} w={475} h={67} z={35000}
        columns={[
          { label: 'Sede tecnica', value: avvisoDetail.sede_tecnica },
        ]}
        widths={[90.57170808220056, 93, 262]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={BAND} rowColor={WHITE} rowSizePt={10}
        borderColor={RED} />

      {/* ================= Dati avviso: Autori ================= */}
      <PbiDataTable x={613} y={457} w={467} h={64} z={27000}
        columns={[
          { label: 'Aut.avviso', value: avvisoDetail.autore },
          { label: 'Data cr.', value: avvisoDetail.data_creazione },
          { label: 'Da', value: avvisoDetail.ultima_mod },
          { label: 'Data modifica', value: avvisoDetail.data_modifica },
        ]}
        widths={[102, 119, 121, 90]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={BAND} rowColor={WHITE} rowSizePt={10}
        borderColor={RED} />

      {/* ================= Dati avviso: Consuntivazione ================= */}
      <PbiDataTable x={612} y={527} w={205} h={64} z={28000}
        columns={[
          { label: 'Ordine', value: avvisoDetail.ordine },
          { label: 'Network', value: avvisoDetail.network },
        ]}
        widths={[90.57170808220056, 93]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={consuntivazioneAnomala ? RED : BAND} rowColor={WHITE} rowSizePt={10}
        borderColor={RED} />

      {/* ================= Dati avviso: Testo avviso ================= */}
      <PbiDataTable x={18.579067990832694} y={596.4858670741023} w={1071.7188693659282} h={101.69595110771581} z={26000}
        columns={[
          { label: 'Testo Esteso', value: avvisoDetail.testo_esteso },
        ]}
        widths={[1048.119623081706]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={BAND} rowColor={WHITE} rowSizePt={10}
        borderColor={RED}
        wordWrap />

      {/* ================= Stato PdM (pannello destro) ================= */}
      <PbiDataTable x={1114.1565217391305} y={150.2608695652174} w={148.03478260869565} h={61.21739130434783} z={18000}
        columns={[{ label: "Tolto d'opera", value: currentItem.tolto_dop, color: toltoColor(currentItem.tolto_dop) }]}
        widths={[131.49999499080235]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={PANEL} rowColor={WHITE} rowSizePt={12}
        borderColor={PURPLE} />

      <PbiDataTable x={1114.1565217391305} y={207.02608695652174} w={148.03478260869565} h={61.21739130434783} z={19000}
        columns={[{ label: 'Data Scoperta', value: currentItem.data_scoperta }]}
        widths={[131.51810940734782]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={PANEL} rowColor={WHITE} rowSizePt={12}
        borderColor={PURPLE} />

      <PbiDataTable x={1114.1565217391305} y={266.0173913043478} w={148.03478260869565} h={61.21739130434783} z={20000}
        columns={[{ label: 'Data Agg.', value: currentItem.data_creazione }]}
        widths={[131.51810940734782]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={PANEL} rowColor={WHITE} rowSizePt={12}
        borderColor={PURPLE} />

      <PbiDataTable x={1114.4584382871535} y={325.5415617128463} w={147.80856423173802} h={57.12846347607052} z={40000}
        columns={[{ label: "Data tolto d'opera", value: currentItem.data_tolto_dop }]}
        widths={[131.51810940734782]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={PANEL} rowColor={WHITE} rowSizePt={12}
        borderColor={PURPLE} />

      <PbiDataTable x={1107.2040302267} y={351.8387909319899} w={170.4785894206549} h={54.4080604534005} z={39000}
        columns={[{ label: 'Ritardo PdM', value: currentItem.ritardo_pdm ?? '', color: RED }]}
        widths={[143.45435586485283]}
        headerBackground={PANEL} headerColor={PANEL} headerSizePt={10}
        rowBackground={PANEL} rowColor={RED} rowSizePt={12}
        borderColor={PANEL} />

      {/* ================= Stato avviso (pannello destro) ================= */}
      <PbiDataTable x={1114} y={457} w={156} h={61} z={22000}
        columns={[{ label: 'St.sist.', value: avvisoDetail.stato_sistema, color: statoAvvisoColor(avvisoDetail.stato_sistema) }]}
        widths={[131.49999499080235]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={PANEL} rowColor={WHITE} rowSizePt={12}
        borderColor={PURPLE} />

      <PbiDataTable x={1114.1565217391305} y={513.1130434782609} w={155.82608695652175} h={61.21739130434783} z={23000}
        columns={[{ label: 'In. rich.', value: avvisoDetail.inizio_richiesta }]}
        widths={[131.51810940734782]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={PANEL} rowColor={WHITE} rowSizePt={12}
        borderColor={PURPLE} />

      <PbiDataTable x={1114.1565217391305} y={573.2173913043479} w={155.82608695652175} h={60.10434782608696} z={24000}
        columns={[{ label: 'FineRich.', value: avvisoDetail.fine_richiesta }]}
        widths={[131.51810940734782, 132.36526709673592]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={PANEL} rowColor={WHITE} rowSizePt={12}
        borderColor={PURPLE} />

      <PbiDataTable x={1114.1565217391305} y={632.2086956521739} w={148.03478260869565} h={56.76521739130435} z={25000}
        columns={[{ label: 'Data chiusura', value: avvisoDetail.data_chiusura, color: chiusuraRitardo ? RED : WHITE }]}
        widths={[130.86049987735453]}
        headerBackground={HEADER} headerColor={WHITE} headerSizePt={10}
        rowBackground={PANEL} rowColor={WHITE} rowSizePt={12}
        borderColor={PURPLE} />

      <PbiDataTable x={1109.0176322418135} y={658.3375314861461} w={171.38539042821156} h={61.6624685138539} z={3000}
        columns={[{ label: 'Ritardo Avv.', value: avvisoDetail.ritardo_avv, color: RED }]}
        widths={[140.32891719311414]}
        headerBackground={PANEL} headerColor={PANEL} headerSizePt={10}
        rowBackground={PANEL} rowColor={RED} rowSizePt={12}
        borderColor={PANEL} />
    </PbiCanvas>
  );
};
