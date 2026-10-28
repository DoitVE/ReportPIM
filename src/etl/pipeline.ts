/**
 * Orchestrazione ETL: lettura dei file sorgente SAP/RFI, costruzione delle
 * tabelle intermedie (port delle 24 query M), query master e mappatura verso
 * i tipi usati dalle pagine della web app.
 */
import * as XLSX from 'xlsx';
import {
  Row,
  Table,
  Matrix,
  formatDate,
  isBlank,
  toText,
  toDate,
} from './helpers';
import {
  SourceFiles,
  qZstmaia1Full,
  qZstmaia2Full,
  qZstmaia7Full,
  qZstmaia7Combined,
  qIw67,
  qIw29Full,
  qZavvisiTxt,
  qIk07,
  qIk07Full,
  qGps,
  qIh06,
  qLoTr,
  qIw39,
  qCaorNtw,
  qCaorOdl,
  qDataOra,
  qAbbacoLines,
  qAbbaco,
} from './queries';
import { buildMaster } from './master';
import { lookupGpsCoordinates, extractBaseSede, gpsLookupTable } from '../data/gpsService';
import {
  Avviso,
  AbbacoItem,
  Iw67Item,
  ControlloAvvisoItem,
  OdlItem,
  PdmV5Item,
} from '../types';

export type SourceKind =
  | 'zstmaia1_full'
  | 'zstmaia2_full'
  | 'zstmaia7_vem1'
  | 'zstmaia7_vem2'
  | 'iw29_full'
  | 'zavvisi_txt'
  | 'ik07_attivo'
  | 'ik07_inattivo'
  | 'gps'
  | 'ih06'
  | 'lo_tr'
  | 'iw67'
  | 'iw39'
  | 'caor_ntw'
  | 'caor_odl'
  | 'data_ora'
  | 'abbaco';

export interface RawRegistry extends SourceFiles {
  /** Workbook ABBA.CO multi-foglio. */
  abbaco_sheets?: Record<string, Matrix>;
}

/* ------------------------------------------------------------------ */
/* Lettura file                                                        */
/* ------------------------------------------------------------------ */

const norm = (s: string): string => s.toUpperCase().replace(/[\s.]+/g, '_');

/** Riconosce il tipo di sorgente dal nome file (e, se serve, dai fogli). */
export function detectSource(fileName: string, sheetNames: string[] = []): SourceKind | null {
  const n = norm(fileName);
  const has = (token: string) => n.includes(token);

  if (has('ABBA') || sheetNames.includes('Bologna-Padova')) return 'abbaco';
  if (has('ZSTMAIA1_FULL')) return 'zstmaia1_full';
  if (has('ZSTMAIA2_FULL')) return 'zstmaia2_full';
  if (has('ZSTMAIA7_FULL_VEM1')) return 'zstmaia7_vem1';
  if (has('ZSTMAIA7_FULL_VEM2')) return 'zstmaia7_vem2';
  if (has('IW29_FULL')) return 'iw29_full';
  if (has('ZAVVISI_TXT') || has('ZAVVISI')) return 'zavvisi_txt';
  if (has('IK07_ATTIVO')) return 'ik07_attivo';
  if (has('IK07_INATTIVO')) return 'ik07_inattivo';
  if (has('GPS')) return 'gps';
  if (has('IH06') || has('HI06')) return 'ih06';
  if (has('LO_TR') || has('LO-TR')) return 'lo_tr';
  if (has('IW67')) return 'iw67';
  if (has('IW39')) return 'iw39';
  if (has('CAOR_NTW')) return 'caor_ntw';
  if (has('CAOR_ODL')) return 'caor_odl';
  if (has('DATA_ORA')) return 'data_ora';
  return null;
}

export async function readWorkbookSheets(file: File): Promise<Record<string, Matrix>> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const out: Record<string, Matrix> = {};
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    // blankrows: true preserva gli offset di riga: i codici M usano Table.Skip(N)
    // su posizioni fisse contando anche le righe vuote.
    out[name] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: true }) as Matrix;
  }
  return out;
}

/** IW29_full è un TXT delimitato TAB in encoding Windows-1252. */
export async function readText1252(file: File | Blob): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const text = new TextDecoder('windows-1252').decode(buf);
  return text.split(/\r?\n/);
}

/** Prende il foglio "Data"/"Sheet1"/primo disponibile da un workbook letto. */
function pickSheet(sheets: Record<string, Matrix>, preferred: string[]): Matrix | undefined {
  for (const p of preferred) if (sheets[p]) return sheets[p];
  const keys = Object.keys(sheets);
  return keys.length ? sheets[keys[0]] : undefined;
}

/**
 * Aggiunge un file caricato al registry, riconoscendone il tipo dal nome.
 * Restituisce il tipo riconosciuto (o null).
 */
/**
 * Aggiunge un file caricato al registry, riconoscendone il tipo dal nome.
 * Restituisce il tipo riconosciuto (o null).
 */
export async function registerFile(file: File, reg: RawRegistry): Promise<SourceKind | null> {
  const isIw29 = detectSource(file.name) === 'iw29_full';
  if (isIw29) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf.slice(0, 4));
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    if (isZip || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const sheets = await readWorkbookSheets(file);
      reg.iw29_excel = pickSheet(sheets, ['Data', 'IW29', 'Sheet1']) || Object.values(sheets)[0];
    } else {
      const text = new TextDecoder('windows-1252').decode(buf);
      reg.iw29_txt_lines = text.split(/\r?\n/);
    }
    return 'iw29_full';
  }

  const sheets = await readWorkbookSheets(file);
  const kind = detectSource(file.name, Object.keys(sheets));
  if (!kind) return null;

  switch (kind) {
    case 'zstmaia1_full': reg.zstmaia1_full = pickSheet(sheets, ['Data']); break;
    case 'zstmaia2_full': reg.zstmaia2_full = pickSheet(sheets, ['Data']); break;
    case 'zstmaia7_vem1': reg.zstmaia7_vem1 = pickSheet(sheets, ['Data']); break;
    case 'zstmaia7_vem2': reg.zstmaia7_vem2 = pickSheet(sheets, ['Data']); break;
    case 'zavvisi_txt': reg.zavvisi_txt = pickSheet(sheets, ['Data']); break;
    case 'ik07_attivo': reg.ik07_attivo = pickSheet(sheets, ['Data']); break;
    case 'ik07_inattivo': reg.ik07_inattivo = pickSheet(sheets, ['Data']); break;
    case 'gps': reg.gps = pickSheet(sheets, ['Sheet1']); break;
    case 'ih06': reg.ih06 = pickSheet(sheets, ['Sheet1']); break;
    case 'lo_tr': reg.lo_tr = pickSheet(sheets, ['LO-TR']); break;
    case 'iw67': reg.iw67 = pickSheet(sheets, ['Data']); break;
    case 'iw39': reg.iw39 = pickSheet(sheets, ['Sheet1']); break;
    case 'caor_ntw': reg.caor_ntw = pickSheet(sheets, ['CAOR_NTW']); break;
    case 'caor_odl': reg.caor_odl = pickSheet(sheets, ['CAOR_ODL']); break;
    case 'data_ora': reg.data_ora = pickSheet(sheets, ['Foglio1']); break;
    case 'abbaco': reg.abbaco_sheets = sheets; break;
  }
  return kind;
}

/* ------------------------------------------------------------------ */
/* Costruzione tabelle + master + mappatura app                        */
/* ------------------------------------------------------------------ */

export interface EtlTables {
  zstmaia1: Table;
  zstmaia2: Table;
  zstmaia7: Table;
  iw29: Table;
  zavvisi: Table;
  ik07: Table;
  gps: Table;
  ih06: Table;
  loTr: Table;
  iw67: Table;
  iw39: Table;
  caorNtw: Table;
  caorOdl: Table;
  dataOra: Table;
  abbaco: Table;
}

export interface AppDatasets {
  pdm: PdmV5Item[];
  avvisi: Avviso[];
  abbaco: AbbacoItem[];
  iw67: Iw67Item[];
  controlli: ControlloAvvisoItem[];
  odl: OdlItem[];
}

export interface EtlOutput {
  tables: EtlTables;
  master: Table;
  app: AppDatasets;
  dataAggiornamento: string;
}

export function buildTables(reg: RawRegistry): EtlTables {
  const vem1 = qZstmaia7Full(reg.zstmaia7_vem1);
  const vem2 = qZstmaia7Full(reg.zstmaia7_vem2);
  return {
    zstmaia1: qZstmaia1Full(reg.zstmaia1_full),
    zstmaia2: qZstmaia2Full(reg.zstmaia2_full),
    zstmaia7: qZstmaia7Combined(vem1, vem2),
    iw29: qIw29Full(reg.iw29_txt_lines, reg.iw29_excel),
    zavvisi: qZavvisiTxt(reg.zavvisi_txt),
    ik07: qIk07Full(qIk07(reg.ik07_inattivo, false), qIk07(reg.ik07_attivo, true)),
    gps: qGps(reg.gps),
    ih06: qIh06(reg.ih06),
    loTr: qLoTr(reg.lo_tr),
    iw67: qIw67(reg.iw67),
    iw39: qIw39(reg.iw39),
    caorNtw: qCaorNtw(reg.caor_ntw),
    caorOdl: qCaorOdl(reg.caor_odl),
    dataOra: qDataOra(reg.data_ora),
    abbaco: qAbbaco(qAbbacoLines(reg.abbaco_sheets)),
  };
}

/** True se sono presenti tutte le sorgenti necessarie alla query master. */
export function canBuildMaster(reg: RawRegistry): boolean {
  return !!(reg.zstmaia1_full && (reg.zstmaia2_full || reg.zstmaia7_vem1) && (reg.iw29_txt_lines || reg.iw29_excel));
}

export function buildAll(reg: RawRegistry): EtlOutput {
  const tables = buildTables(reg);
  const master = canBuildMaster(reg)
    ? buildMaster({
        zstmaia1: tables.zstmaia1,
        zstmaia2: tables.zstmaia2,
        zstmaia7: tables.zstmaia7,
        iw29: tables.iw29,
        zavvisi: tables.zavvisi,
        ik07full: tables.ik07,
      })
    : [];

  const loTrIndex = buildLoTrIndex(tables.loTr);
  const app: AppDatasets = {
    pdm: master.map((r) => mapPdm(r, loTrIndex)),
    avvisi: master.filter((r) => !isBlank(r['IW29_full.Avviso'])).map((r) => mapAvviso(r, loTrIndex)),
    abbaco: tables.abbaco.map(mapAbbaco),
    iw67: tables.iw67.map(mapIw67),
    controlli: tables.iw29.map((r) => mapControllo(r, tables.iw39)),
    odl: tables.iw39.map(mapOdl),
  };

  const dataAggiornamento = tables.dataOra.length
    ? toText(tables.dataOra[0]['Data e ora scarico dati:']) ?? ''
    : '';

  return { tables, master, app, dataAggiornamento: dataAggiornamento.replace('T', ' ').slice(0, 16) };
}

/* ------------------------------------------------------------------ */
/* Lookup LO-TR (linea / LVU / nome sede per sede tecnica)             */
/* ------------------------------------------------------------------ */
interface LoTrInfo {
  linea: string;
  lvu: string;
  nomeSede: string;
}

function buildLoTrIndex(loTr: Table): Map<string, LoTrInfo> {
  const m = new Map<string, LoTrInfo>();
  for (const r of loTr) {
    const base = extractBaseSede(r['Sede tecnica']);
    if (base && !m.has(base)) {
      m.set(base, {
        linea: String(r['Linea InRete'] ?? ''),
        lvu: String(r['LVU'] ?? ''),
        nomeSede: String(r['Località/Tratta'] ?? ''),
      });
    }
  }
  return m;
}

function loTrLookup(idx: Map<string, LoTrInfo>, sede: any): LoTrInfo | undefined {
  const base = extractBaseSede(sede === null || sede === undefined ? undefined : String(sede));
  return base ? idx.get(base) : undefined;
}

/* ------------------------------------------------------------------ */
/* Mappature verso i tipi applicativi                                  */
/* ------------------------------------------------------------------ */

const fmt = (v: any): string => (v instanceof Date ? formatDate(v) : isBlank(v) ? '' : String(v));

function coords(sede: any, localita: any, km: any, linea: any): { lat: number; lng: number } {
  const c = lookupGpsCoordinates(
    sede === null || sede === undefined ? undefined : String(sede),
    localita === null || localita === undefined ? undefined : String(localita),
    km === null || km === undefined ? undefined : String(km),
    linea === null || linea === undefined ? undefined : String(linea)
  );
  return { lat: c.lat, lng: c.lng };
}

function mapStatoScadenzaV3(codStato: any): Avviso['stato_scadenza'] {
  const c = codStato === null || codStato === undefined ? '' : String(codStato);
  if (c === '02') return 'Scaduto';
  if (c === '03' || c === '04') return 'In scadenza';
  return 'Regolare';
}

function mapPdm(r: Row, loTr: Map<string, LoTrInfo>): PdmV5Item {
  const sede = r['Sede_tecnica_definitiva'] ?? r['Tratta'] ?? '';
  const info = loTrLookup(loTr, sede);
  const baseSede = extractBaseSede(sede);
  const gpsRec = baseSede ? gpsLookupTable[baseSede] : undefined;
  const linea = info?.linea ?? '';
  const localita = info?.nomeSede || gpsRec?.desc || r['Tratta'] || sede;
  const km = r['Km linea'] ?? '';
  const c = coords(sede, localita, km, linea);
  const tolto = r[" Tolto d'opera_definitivo"];

  return {
    pdm: fmt(r['PdM_definitivo']),
    data_creazione: fmt(r['IK07_full.Data creazione'] ?? r['IW29_full.Data cr.'] ?? r['Data Agg.']),
    data_scoperta: fmt(r['Data Scoperta']),
    tolto_dop: tolto === 'S' ? 'S' : 'N',
    data_tolto_dop: fmt(r["Data tolto d'opera"]),
    classe: fmt(r['Classe_prov_definitiva']) || 'MANCANTE',
    localita_tratta: fmt(localita),
    linea,
    osservazioni: fmt(r['Osservazioni_definitivo']),
    avviso: fmt(r['IW29_full.Avviso']),
    data_creaz_avviso: fmt(r['IW29_full.Data avviso'] ?? r['IW29_full.Data cr.']),
    km_linea: fmt(km),
    tipo_difetto: fmt(r['Tipo difetto']),
    pos_difetto: fmt(r['Pos. Dif'] ?? r['ZSTMAIA2_full.Posizione difetto']),
    esegui_to_da: fmt(r['ZSTMAIA2_full.Eseguito da']),
    id_sald: fmt(r['ZSTMAIA2_full.ID saldatore']),
    gara_stato: fmt(r['ZSTMAIA2_full.Sald. in gar.']),
    cod_stato: fmt(r['Cod. stato scadenza']),
    scadenza: fmt(r['Stato scadenza']),
    stato_avviso: fmt(r['IW29_full.St.sist.']),
    sede_tecnica: fmt(sede),
    divisione: 'VEM1',
    lvu: info?.lvu ?? '',
    classificazione_stato: fmt(r['Classificazione stato']),
    fine_richiesta: fmt(r['IW29_full.FineRich.']),
    ritardo_pdm: fmt(r['Ritardo PdM']),
    data_tolto_minore_scoperta: r["Data Tolto d'opera < Data scoperta"] !== '',
    non_visibile_zstmaia: r['PdM non visibile in ZSTMAIA'] !== '',
    tolto_data_futura: r["Data Tolto d'opera futura"] !== '',
    avviso_chiuso: r['Avviso chiuso'] === 'S',
    avviso_chiuso_con_odl: r['Network/OdL agganciato'] === 'S',
    chiusura_ritardo: r['PdM chiuso in ritardo'] !== '',
    lat: c.lat,
    lng: c.lng,
    dev: fmt(r['Dev.']),
    bin: fmt(r['Bin.']),
    fila: fmt(r['Fila']),
    tipo_arm: fmt(r['Tipo Arm.']),
    val_perc_mm: fmt(r['Val. (%/mm)']),
    prof_dif: fmt(r['Prof. Dif.']),
    pos_dif: fmt(r['Pos. Dif']),
    ubi_lin: fmt(r['ZSTMAIA2_full.Ubi lin.']),
    t_tratta_ragg_fug: fmt(r['ZSTMAIA2_full.T. tratta ragg. fug.']),
    tipo_sald: fmt(r['ZSTMAIA2_full.Tipo Sald.']),
    data_esec_saldatura: fmt(r['ZSTMAIA2_full.Data esec. saldatura']),
    pos_sezione: fmt(r['ZSTMAIA2_full.Posizione sezione']),
    sald_in_gar: fmt(r['ZSTMAIA2_full.Sald. in gar.']),
    id_saldatore: fmt(r['ZSTMAIA2_full.ID saldatore']),
    creato_da: fmt(r['IK07_full.Creato da']),
    cod_linea: fmt(r['ZSTMAIA2_full.Cod. linea']),
    anno: (typeof r['Anno'] === 'number' && !Number.isNaN(r['Anno']))
      ? (r['Anno'] as number)
      : (Number(r['Anno']) ||
          toDate(r['Data Scoperta'])?.getFullYear() ||
          toDate(r['IW29_full.Data avviso'])?.getFullYear() ||
          toDate(r['IK07_full.Data creazione'])?.getFullYear() ||
          toDate(r['Data Agg.'])?.getFullYear() ||
          toDate(r['Data creazione'] ?? r['IW29_full.Data cr.'])?.getFullYear() ||
          undefined),
    testo_esteso: fmt(r['ZAVVISI_TXT.Testo Esteso']),
    inizio_richiesta: fmt(r['IW29_full.In. rich.']),
    data_chiusura: fmt(r['IW29_full.Data chiusura']),
    ritardo_avv: fmt(r['Ritardo Avv.']),
    network: fmt(r['IW29_full.Network']),
    ordine: fmt(r['IW29_full.Ordine']),
    network_odl: fmt(r['Network/OdL agganciato']),
    presenza_pdm_avviso: fmt(r['Presenza PdM e Avviso']),
    avviso_chiusura_ritardo: r['Avv. chiuso in ritardo'] !== '',
    avviso_chiusura_futura: r['Data chiusura avv. futura'] !== '',
    avviso_chiusura_antec_inizio: r['Data chiusura avv. < Data inizio avv.'] !== '',
  };
}

function mapAvviso(r: Row, loTr: Map<string, LoTrInfo>): Avviso {
  const avviso = r['IW29_full.Avviso'];
  const sede = r['IW29_full.Sede tecnica'] ?? r['Sede_tecnica_definitiva'] ?? '';
  const info = loTrLookup(loTr, sede);
  const baseSede = extractBaseSede(sede);
  const gpsRec = baseSede ? gpsLookupTable[baseSede] : undefined;
  const linea = info?.linea ?? '';
  const km = r['Km linea'] ?? '';
  const nomeSede = info?.nomeSede || gpsRec?.desc || '';
  const c = coords(sede, nomeSede, km, linea);
  return {
    tipo: 'V5',
    avviso: fmt(avviso),
    descrizione: fmt(r['IW29_full.Descrizione']),
    ordine: fmt(r['IW29_full.Ordine']),
    sede_tecnica: fmt(sede),
    nome_sede: nomeSede,
    linea,
    divisione: 'VEM1',
    lvu: info?.lvu ?? '',
    fine_richiesta: fmt(r['IW29_full.FineRich.']),
    inizio_richiesto: fmt(r['IW29_full.In. rich.']),
    stato_sistema: fmt(r['IW29_full.St.sist.']),
    stato_utente: fmt(r['IW29_full.St.utente']),
    data_creazione: fmt(r['IW29_full.Data cr.']),
    network: fmt(r['IW29_full.Network']),
    operazione: fmt(r['IW29_full.Op.']),
    tipo_difetto: fmt(r['Tipo difetto']),
    stato_scadenza: mapStatoScadenzaV3(r['Cod. stato scadenza']),
    lat: c.lat,
    lng: c.lng,
  };
}

function mapAbbaco(r: Row): AbbacoItem {
  return {
    linea: fmt(r['Linea']),
    tratta_codice: fmt(r['Codice Tratta INRETE']),
    tratta: fmt(r['Tratta (descrizione)']),
    binario: fmt(r['Binario (P/D/L)']),
    km_inizio: fmt(r['Inizio']),
    km_fine: fmt(r['Fine']),
    chiave_rl: fmt(r['chiave_RL']),
    rid_vel: fmt(r['rid_vel (km/h)'] ?? r['rid_vel']),
    motivo: fmt(r['Motivo']),
    titolare: fmt(r['Titolare del rallentamento (matr.)']),
    data_inizio: fmt(r['Data inizio']),
    data_fine: fmt(r['Data fine']),
  };
}

function mapIw67(r: Row): Iw67Item {
  return {
    Avviso: fmt(r['Avviso']),
    Ordine: fmt(r['Ordine']),
    'Definizione della sede tecnica': fmt(r['Definizione della sede tecnica']),
    'Tp.': fmt(r['Tipo'] ?? r['Tp.']),
    Codice: fmt(r['Codice']),
    'Testo per la misura': fmt(r['Km.']),
    'Testo codice per misura': fmt(r['Testo']),
    Data: fmt(r['Data']),
    Descrizione: fmt(r['Descrizione']),
    CLavResp: fmt(r['CLavResp']),
    'Sede tecnica': fmt(r['Sede tecnica']),
    'St.sist.': fmt(r['Stato sist.'] ?? r['St.sist.']),
    'FineRich.': fmt(r['Data Fine Richiesta'] ?? r['FineRich.']),
  };
}

function mapOdl(r: Row): OdlItem {
  return {
    centro_lavoro: fmt(r['Centro lavoro resp.']),
    divisione: fmt(r['Divisione']),
    ordine: fmt(r['Ordine']),
    tipo_ordine: fmt(r['Tipo di ordine']),
    descrizione: fmt(r['Tsto br.']),
    stato_sistema: fmt(r['Stato sistema']),
    costo_eff: fmt(r['Costi tot. effettivi']),
    costo_pian: fmt(r['Costi totali pian.']),
  };
}

function mapControllo(r: Row, iw39: Table): ControlloAvvisoItem {
  const ordine = fmt(r['Ordine']);
  const odl = iw39.find((o) => fmt(o['Ordine']) === ordine);
  return {
    Avviso: fmt(r['Avviso']),
    Ordine: ordine,
    Descrizione: fmt(r['Descrizione']),
    'Sede tecnica': fmt(r['Sede tecnica']),
    'Data avviso': fmt(r['Data avviso']),
    'Tipo avviso': fmt(r['Tp.']),
    'Centro lavoro resp.': odl ? fmt(odl['Centro lavoro resp.']) : '',
    'Fine richiesta': fmt(r['FineRich.']),
    'Stato sistema': fmt(r['St.sist.']),
    Network: fmt(r['Network']),
    Operazione: fmt(r['Op.']),
    'Stato utente': fmt(r['St.utente']),
  };
}
