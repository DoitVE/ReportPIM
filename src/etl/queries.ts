/**
 * Port fedele in TypeScript delle 24 query Power Query M del report
 * "Difetti di binario - DOIT VE" (cartella LEGACY/Codice M).
 *
 * Ogni funzione corrisponde a una query M; i commenti citano il passo M
 * replicato per mantenere la tracciabilità 1:1 con l'originale.
 */
import {
  Row,
  Table,
  Matrix,
  matrixToIndexedTable,
  promoteHeaders,
  skipRows,
  removeLastN,
  selectRows,
  removeEmptyRows,
  renameColumns,
  removeColumns,
  addColumn,
  duplicateColumn,
  transformColumns,
  transformColumnTypes,
  replaceValue,
  splitColumn,
  groupBy,
  combine,
  textStart,
  beforeDelimiter,
  afterDelimiter,
  textContains,
  positionOf,
  dateYear,
  quarterOfYear,
  today,
  addDays,
  isBlank,
  toDate,
} from './helpers';

/* ------------------------------------------------------------------ */
/* Input: contenuto grezzo dei file sorgente SAP/RFI                   */
/* ------------------------------------------------------------------ */

export interface SourceFiles {
  zstmaia1_full?: Matrix;
  zstmaia2_full?: Matrix;
  zstmaia7_vem1?: Matrix;
  zstmaia7_vem2?: Matrix;
  iw29_txt_lines?: string[];
  iw29_excel?: Matrix;
  zavvisi_txt?: Matrix;
  ik07_attivo?: Matrix;
  ik07_inattivo?: Matrix;
  gps?: Matrix;
  ih06?: Matrix;
  lo_tr?: Matrix;
  iw67?: Matrix;
  iw39?: Matrix;
  caor_ntw?: Matrix;
  caor_odl?: Matrix;
  data_ora?: Matrix;
  /** Fogli del workbook ABBA.CO, indicizzati per nome foglio. */
  abbaco_sheets?: Record<string, Matrix>;
}

const asTable = (m?: Matrix): Table => (m ? matrixToIndexedTable(m) : []);

/* ------------------------------------------------------------------ */
/* 19) ZSTMAIA1_full                                                   */
/* ------------------------------------------------------------------ */
export function qZstmaia1Full(raw?: Matrix): Table {
  let t = asTable(raw);
  t = skipRows(t, 59); // Table.Skip(Data_Sheet, 59)
  t = removeLastN(t, 20); // Table.RemoveLastN(..., 20)
  t = selectRows(t, (r) => r.Column1 !== 'COD.' && r.Column1 !== 'TRATTA' && r.Column1 !== '');
  t = renameColumns(t, {
    Column1: 'Tratta',
    Column3: 'Dev.',
    Column5: 'Bin.',
    Column7: 'Fila',
    Column9: 'Km linea',
    Column13: 'Pdm',
  });
  t = removeColumns(t, ['Column2', 'Column4', 'Column6', 'Column8', 'Column10', 'Column11', 'Column12', 'Column14']);
  t = renameColumns(t, { Column15: 'Tipo difetto' });
  t = removeColumns(t, ['Column16']);
  t = renameColumns(t, { Column18: 'Classe provvedimento' });
  t = removeColumns(t, ['Column19', 'Column20']);
  t = renameColumns(t, { Column21: 'Val. (%/mm)' });
  t = removeColumns(t, ['Column22']);
  t = renameColumns(t, { Column23: 'Prof. Dif.', Column24: 'Pos. Dif', Column25: 'Data Scoperta' });
  t = renameColumns(t, {
    Column26: "Tolto d'opera",
    Column27: 'Data tolto d\'opera',
    Column28: 'Tipo Arm.',
    Column29: 'Osservazioni',
    Column30: 'Data Agg.',
  });
  t = transformColumnTypes(t, { "Data tolto d'opera": 'date', 'Data Agg.': 'date' });
  t = removeColumns(t, ['Column31']);
  t = selectRows(t, () => true);
  t = removeColumns(t, ['Column17']);
  return t;
}

/* ------------------------------------------------------------------ */
/* 20) ZSTMAIA2_full                                                   */
/* ------------------------------------------------------------------ */
export function qZstmaia2Full(raw?: Matrix): Table {
  let t = asTable(raw);
  t = skipRows(t, 21);
  t = removeColumns(t, ['Column2', 'Column5', 'Column7', 'Column9', 'Column12', 'Column13', 'Column14', 'Column15', 'Column18', 'Column20', 'Column24', 'Column34']);
  t = removeLastN(t, 32);
  t = removeEmptyRows(t);
  t = selectRows(t, (r) => !textContains(r.Column11, 'N.PUNTO DI') && !textContains(r.Column11, 'MISURA'));
  t = renameColumns(t, {
    Column1: 'Data scoperta',
    Column3: 'Cod. linea',
    Column4: 'Cod. tratta',
    Column6: 'Dev.',
    Column8: 'Bin',
    Column10: 'km linea',
    Column11: 'Pdm',
    Column16: 'Ubi lin.',
    Column17: 'T. tratta ragg. fug.',
    Column19: 'Fila',
    Column21: 'Tipo difetto',
    Column22: 'Classe prov.',
    Column23: 'Valore (%/mm)',
    Column25: 'Posizione difetto',
    Column26: 'Tipo Sald.',
    Column27: 'Data esec. saldatura',
    Column28: 'Posizione sezione',
    Column29: 'Sald. in gar.',
    Column30: "Tolto d'opera",
    Column31: "Data tolto d'opera",
    Column32: 'Eseguito da',
    Column33: 'ID saldatore',
  });
  t = replaceValue(t, ['Data scoperta'], '00/00/0000', null, 'replaceValue');
  t = transformColumnTypes(t, { 'Data scoperta': 'date', "Data tolto d'opera": 'date' });
  return t;
}

/* ------------------------------------------------------------------ */
/* 21/22) ZSTMAIA7_full_VEM1 e _VEM2                                   */
/* ------------------------------------------------------------------ */
export function qZstmaia7Full(raw?: Matrix): Table {
  let t = asTable(raw);
  t = transformColumnTypes(t, {
    Column1: 'text', Column2: 'text', Column3: 'text', Column4: 'text', Column5: 'text', Column6: 'text',
    Column7: 'text', Column8: 'any', Column9: 'any', Column10: 'text', Column11: 'text', Column12: 'text',
    Column13: 'text', Column14: 'text', Column15: 'int', Column16: 'text', Column17: 'text', Column18: 'date',
    Column19: 'text', Column20: 'text', Column21: 'text', Column22: 'text', Column23: 'any',
  });
  t = skipRows(t, 15);
  t = removeLastN(t, 18);
  t = removeColumns(t, ['Column2', 'Column5', 'Column6', 'Column8', 'Column9', 'Column12', 'Column13', 'Column15', 'Column23']);
  t = removeEmptyRows(t);
  t = selectRows(t, (r) => !textContains(r.Column20, 'N.PUNTO DI') && !textContains(r.Column20, 'MISURA'));
  t = renameColumns(t, {
    Column1: 'Data scoperta',
    Column3: 'Cod. linea',
    Column4: 'Cod. SeTe',
    Column7: 'Bin.',
    Column10: 'Fila',
    Column11: 'km linea',
    Column14: 'Tipo difetto',
    Column16: 'Classe porvv.',
    Column17: "Tolto d'opera",
    Column18: "Data tolto d'opera",
    Column19: 'Centro di lavoro',
    Column20: 'Pdm',
    Column21: 'N. doc. di misura',
    Column22: 'Avviso',
  });
  t = transformColumnTypes(t, { 'Data scoperta': 'date', "Data tolto d'opera": 'date' });
  return t;
}

/** 23) ZSTMAIA7_full_VEM1+VEM2 = Table.Combine({VEM1, VEM2}). */
export function qZstmaia7Combined(vem1: Table, vem2: Table): Table {
  return combine([vem1, vem2]);
}

/* ------------------------------------------------------------------ */
/* 16) IW67                                                            */
/* ------------------------------------------------------------------ */
export function qIw67(raw?: Matrix): Table {
  let t = asTable(raw);
  const textTypes: Record<string, 'text' | 'any'> = {};
  for (let i = 1; i <= 23; i++) textTypes[`Column${i}`] = 'text';
  textTypes.Column24 = 'any';
  t = transformColumnTypes(t, textTypes);

  t = skipRows(t, 4);
  t = removeEmptyRows(t);
  t = promoteHeaders(t);

  t = transformColumnTypes(t, {
    Avviso: 'int', Ordine: 'int', 'Definizione della sede tecnica': 'text', 'Tp.': 'text', Codice: 'text',
    'Testo per la misura': 'text', 'Testo codice per misura': 'text', Data: 'date', Descrizione: 'text',
    'Latit iniz': 'int', 'Long inizi': 'int', CLavResp: 'text', CD: 'text', 'Data rif.': 'date',
    'DataEsec.': 'date', 'In. pian.': 'date', 'Mod. il': 'date', 'Data cr.': 'date', 'Fine pian.': 'date',
    'FineRich.': 'date', 'Sede tecnica': 'text', 'ST cons.': 'text', 'St.sist.': 'text',
  });

  t = replaceValue(t, ['Testo per la misura'], ' ', '', 'replaceText');
  t = splitColumn(t, 'Testo per la misura', 'Val.', ['Testo per la misura.1', 'Testo per la misura.2']);
  t = transformColumnTypes(t, { 'Testo per la misura.1': 'text', 'Testo per la misura.2': 'number' });
  t = renameColumns(t, { 'Testo per la misura.1': 'Km.', 'Testo per la misura.2': 'Val.' });

  t = duplicateColumn(t, 'Sede tecnica', 'Sede tecnica - Copia');
  t = transformColumns(t, 'Sede tecnica - Copia', (v) => beforeDelimiter(v, '-'));
  t = renameColumns(t, { 'Sede tecnica - Copia': 'SeTe primo livello' });

  t = addColumn(t, 'Personalizzato', (r) => dateYear(r.Data));
  t = selectRows(t, (r) => (r.Personalizzato ?? 0) > 2021);
  t = renameColumns(t, { Personalizzato: 'Anno avviso' });

  t = transformColumns(t, 'Sede tecnica', (v) => textStart(v, 14));
  t = renameColumns(t, { 'FineRich.': 'Data Fine Richiesta', 'Testo codice per misura': 'Testo' });

  t = addColumn(t, 'Personalizzato', (r) => quarterOfYear(r.Data));
  const adesso = today();
  t = addColumn(t, 'Personalizzato.1', (r) => {
    const fine = r['Data Fine Richiesta'] as Date | null;
    if (isBlank(r['St.sist.']) ? false : r['St.sist.'] === 'MISC') return 'CHIUSO';
    if (!fine) return 'SCAD.>60GG';
    if (fine < adesso) return 'SCADUTO';
    if (fine < addDays(adesso, 10)) return 'SCAD.<10GG';
    if (fine < addDays(adesso, 30)) return 'SCAD.<30GG';
    if (fine < addDays(adesso, 60)) return 'SCAD.<60GG';
    return 'SCAD.>60GG';
  });
  t = renameColumns(t, { 'Personalizzato.1': 'Stato', 'Tp.': 'Tipo', 'St.sist.': 'Stato sist.' });

  t = addColumn(t, 'Testo prima del delimitatore', (r) => beforeDelimiter(r['Km.'], ','));
  t = renameColumns(t, { 'Testo prima del delimitatore': 'Km. rif.', 'Val.': 'Val. difetto' });
  t = addColumn(t, 'Km inizio', (r) => beforeDelimiter(r['Km.'], '-'));
  t = addColumn(t, 'Km fine', (r) => afterDelimiter(r['Km.'], '-'));
  t = renameColumns(t, { Personalizzato: 'Trimestre' });

  t = addColumn(t, 'Cod. Stato', (r) => {
    const fine = r['Data Fine Richiesta'] as Date | null;
    if (r['Stato sist.'] === 'MISC') return 2;
    if (!fine) return 6;
    if (fine < adesso) return 1;
    if (fine < addDays(adesso, 10)) return 3;
    if (fine < addDays(adesso, 30)) return 4;
    if (fine < addDays(adesso, 60)) return 5;
    return 6;
  });
  return t;
}

/* ------------------------------------------------------------------ */
/* 17) LO-TR                                                           */
/* ------------------------------------------------------------------ */
export function qLoTr(raw?: Matrix): Table {
  let t = promoteHeaders(asTable(raw));
  t = transformColumnTypes(t, {
    'Sede tecnica': 'text', Definizione: 'text', 'Divis. ubic.': 'text', 'Stato utente': 'text',
    'Stato sistema': 'text', 'Km. Inizio': 'number', CdC: 'int', 'Codice linea InRete': 'text',
    'Linea InRete': 'text', 'Linea Profilo': 'text', LVU: 'text', ISU: 'text', TEU: 'text',
  });
  t = renameColumns(t, { Definizione: 'Località/Tratta' });
  t = replaceValue(t, ['Divis. ubic.'], '', 'N.D.', 'replaceValue');
  return t;
}

/* ------------------------------------------------------------------ */
/* 10) IH06                                                            */
/* ------------------------------------------------------------------ */
export function qIh06(raw?: Matrix): Table {
  let t = promoteHeaders(asTable(raw));
  t = transformColumnTypes(t, {
    'Sede tecnica': 'text', 'Definizione della sede tecnica': 'text', 'Divis. ubic.': 'text',
    'Stato sistema': 'text', 'Stato utente': 'text', 'Km. Inizio': 'number', 'Km. Fine': 'number',
    'Data modifica': 'date', 'Autore modifica': 'text', 'Centro di lavoro': 'text', Località: 'text',
    'In funz. dal': 'date', 'Data creazione': 'date', 'Divisione pian.': 'text', Lunghezza: 'text',
    'Sede tecnica di riferimento': 'text', Telefono: 'text', 'Centro lavoro resp.': 'text',
    'Tipo di oggetto': 'text', "Sistema d'identif.": 'text', 'Altezza minima L.d.C. [m]': 'number',
    'Autore dell\'ultima modifica': 'text', 'Base assoluta': 'text', Binario: 'text',
    'Binario AV/AC': 'text', 'Binario Allegato VI.12': 'text', 'Binario elettrificato': 'text',
    'Classe linea per vigilanza': 'int', 'Codice binario SAS': 'text', 'Data dell\'ultima modifica': 'int',
    'Div. pian. della manutenzione': 'text', 'Intercon. circol. da treni': 'text', Interconnessione: 'text',
    'Linea di appartenenza': 'text', 'Lungh. di stazionamento [m]': 'int',
    'Lunghezza del binario [Km]': 'number', 'Monitoraggio Carico Dinamico': 'text',
    'Monitoraggio temp. rotaia': 'text', 'Presenza Raccordo in Tratta': 'text',
    'Profilo Manutentivo L94 (BC)': 'text', 'Progr. Km monitoraggio temp.': 'number',
    'Progr. Km. altezza min. L.d.C.': 'number', 'Sent. percorribile piedi': 'text',
    'Tipo L.d.C.': 'text', 'Velocità Rango A': 'int', 'Velocità Rango B': 'int',
    'Velocità Rango C': 'int', 'Velocità Rango P': 'int', 'n. Regolazioni Automatiche': 'int',
    'n. dev. manovr. mano centr.': 'int', 'n. deviatoi elettrici': 'int',
    'n. di sezioni marcia DX': 'int', 'n. di sezioni marcia SX': 'int', 'n. passatoie': 'int',
    'n. tot deviatoi/inters. centr.': 'int',
  });
  t = renameColumns(t, { Binario: 'Bin.' });
  return t;
}

/* ------------------------------------------------------------------ */
/* 9) GPS                                                              */
/* ------------------------------------------------------------------ */
export function qGps(raw?: Matrix): Table {
  let t = promoteHeaders(asTable(raw));
  t = transformColumnTypes(t, {
    'Sede tecnica': 'text', 'Definizione della sede tecnica': 'text', 'Divis. ubic.': 'text',
    'Stato sistema': 'text', 'Stato utente': 'text', 'Km. Inizio': 'number', 'Km. Fine': 'number',
    'Data modifica': 'any', 'Autore modifica': 'text', 'Centro di lavoro': 'text', Località: 'text',
    'In funz. dal': 'any', 'Data creazione': 'any', 'Divisione pian.': 'text', Lunghezza: 'int',
    'Sede tecnica superiore': 'text', 'Sede tecnica di riferimento': 'text', 'Latitudine Fine': 'number',
    'Latitudine Inizio': 'number', 'Longitudine Fine': 'number', 'Altitudine Fine': 'number',
    'Altitudine Inizio': 'number', 'Longitudine Inizio': 'number',
  });
  return t;
}

/* ------------------------------------------------------------------ */
/* 11/12/13) IK07_ATTIVO / IK07_INATTIVO / IK07_full                   */
/* ------------------------------------------------------------------ */
export function qIk07(raw: Matrix | undefined, autoreIsInt: boolean): Table {
  let t = promoteHeaders(asTable(raw));
  t = transformColumnTypes(t, {
    'Autore modifica': autoreIsInt ? 'int' : 'text',
    'Punto di misura': 'any', Descrizione: 'text', 'Sede tecnica': 'text', 'Tipo punto di mis.': 'text',
    'Gruppo codici': 'text', 'Pos. misura': 'text', 'Punto mis. inattivo': 'text', 'Tipo catalogo': 'int',
    'Chiave lingua': 'text', 'Creato da': 'int', 'Data creazione': 'date', 'Data modifica': 'date',
    Mandante: 'int', 'N. ogg. punto mis.': 'text', 'Ind.punto mis. rif.': 'text', 'Indic. di canc.': 'text',
    'Punto mis. è contat.': 'text', 'Punto mis. rif.': 'text', Tsto: 'text',
  });
  return t;
}

/** 13) IK07_full = Table.Combine({IK07_INATTIVO, IK07_ATTIVO}). */
export function qIk07Full(inattivo: Table, attivo: Table): Table {
  return combine([inattivo, attivo]);
}

/* ------------------------------------------------------------------ */
/* 14) IW29_full (TXT delimitato TAB, encoding 1252)                   */
/* ------------------------------------------------------------------ */
export function qIw29Full(lines?: string[], matrix?: Matrix): Table {
  if (matrix && matrix.length > 0) {
    let headerIdx = -1;
    for (let i = 0; i < Math.min(matrix.length, 10); i++) {
      const rowStr = (matrix[i] || []).map((c) => String(c ?? '')).join(' ');
      if (rowStr.includes('Avviso') || rowStr.includes('FineRich.') || rowStr.includes('Sede tecnica')) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) headerIdx = 0;

    const headers = (matrix[headerIdx] || []).map((c) => String(c ?? '').trim());
    const table: Table = [];

    for (let i = headerIdx + 1; i < matrix.length; i++) {
      const row = matrix[i];
      if (!row || row.length === 0 || row.every((c) => c === null || c === undefined || String(c).trim() === '')) {
        continue;
      }
      const item: Row = {};
      headers.forEach((h, colIdx) => {
        if (h) {
          item[h] = row[colIdx] ?? null;
        }
      });

      const dateKeys = ['FineRich.', 'In. rich.', 'Chiusura', 'Data chiusura', 'Data', 'Data avviso', 'Data cr.', 'Mod. il', 'Data modifica', 'Data rif.', 'Dt.rif.cl.'];
      for (const dk of dateKeys) {
        if (item[dk] !== undefined && item[dk] !== null) {
          if (typeof item[dk] === 'string') {
            item[dk] = item[dk].replace(/\./g, '/');
          }
          item[dk] = toDate(item[dk]);
        }
      }

      if (item['Chiusura'] !== undefined && item['Data chiusura'] === undefined) {
        item['Data chiusura'] = item['Chiusura'];
      }
      if (item['Data'] !== undefined && item['Data avviso'] === undefined) {
        item['Data avviso'] = item['Data'];
      }
      if (item['Mod. il'] !== undefined && item['Data modifica'] === undefined) {
        item['Data modifica'] = item['Mod. il'];
      }

      if (!isBlank(item['Avviso'])) {
        table.push(item);
      }
    }
    if (table.length > 0) return table;
  }

  if (!lines || lines.length === 0) return [];
  let t: Table = lines.map((l) => ({ Column1: l }));
  t = transformColumnTypes(t, { Column1: 'text' });
  t = skipRows(t, 3);
  t = removeEmptyRows(t);
  t = splitColumn(
    t,
    'Column1',
    '\t',
    Array.from({ length: 22 }, (_, i) => `Column1.${i + 1}`)
  );
  t = removeColumns(t, ['Column1.1']);
  t = promoteHeaders(t);
  t = replaceValue(
    t,
    ['FineRich.', 'In. rich.', 'Chiusura', 'Data', 'Data cr.', 'Data rif.', 'Mod. il', 'Dt.rif.cl.'],
    '.',
    '/',
    'replaceText'
  );
  t = transformColumnTypes(t, {
    'FineRich.': 'date', 'In. rich.': 'date', Chiusura: 'date', Data: 'date', 'Data cr.': 'date',
    'Mod. il': 'date', 'Data rif.': 'date', 'Dt.rif.cl.': 'date',
  });
  t = renameColumns(t, { Chiusura: 'Data chiusura', Data: 'Data avviso', 'Mod. il': 'Data modifica' });
  return t;
}

/* ------------------------------------------------------------------ */
/* 18) ZAVVISI_TXT                                                     */
/* ------------------------------------------------------------------ */
export function qZavvisiTxt(raw?: Matrix): Table {
  let t = promoteHeaders(asTable(raw));
  t = transformColumnTypes(t, { 'Numero avviso': 'text', 'Testo Esteso': 'text' });
  return t;
}

/* ------------------------------------------------------------------ */
/* 15) IW39_STATO_ODL                                                  */
/* ------------------------------------------------------------------ */
export function qIw39(raw?: Matrix): Table {
  let t = promoteHeaders(asTable(raw));
  t = transformColumnTypes(t, {
    'Centro lavoro resp.': 'text', Divisione: 'text', Ordine: 'int', 'Tipo di ordine': 'int',
    'Data inizio cardine': 'date', 'Tsto br.': 'text', 'Stato sistema': 'text',
    'Costi tot. effettivi': 'number', 'Costi totali pian.': 'number', 'Data fine cardine': 'date',
    'Data inizio eff.': 'date', 'Fine schedulata': 'date', 'Inizio schedulato': 'date',
    'Sede tecnica': 'text', 'Tot. pianificato': 'number', 'Totale (effettivo)': 'number',
  });
  t = addColumn(t, 'Stato OdL', (r) => {
    const s = r['Stato sistema'];
    if (positionOf(s, 'TECC') > -1) return 'Chiuso';
    if (positionOf(s, 'RIL') > -1) return 'Rilasciato';
    if (positionOf(s, 'APER') > -1) return 'Aperto';
    if (positionOf(s, 'CONC') > -1) return 'Concluso';
    return 'n.d.';
  });
  return t;
}

/* ------------------------------------------------------------------ */
/* 6) CAOR_NTW                                                         */
/* ------------------------------------------------------------------ */
export function qCaorNtw(raw?: Matrix): Table {
  let t = asTable(raw);
  t = transformColumnTypes(t, { Column11: 'text', Column10: 'text' });
  t = promoteHeaders(t);
  t = addColumn(t, 'Networl-C. lav.', (r) => (r.Network === 'n.d.' ? 'n.d.' : `${r.Network}-${r['C. lav.']}`));
  t = groupBy(t, ['Networl-C. lav.'], {
    'Data prima consuntivazione': (rows) => minDate(rows.map((r) => r.Data)),
    'Data ultima consuntivazione': (rows) => maxDate(rows.map((r) => r.Data)),
    Ore_consuntivate: (rows) => sumNumber(rows.map((r) => r['        Ore'])),
  });
  t = renameColumns(t, {
    Ore_consuntivate: 'Ore cons. su Ntw',
    'Data prima consuntivazione': 'Data prima cons. su NTW',
    'Data ultima consuntivazione': 'Data ultima cons. su NTW',
  });
  return t;
}

/* ------------------------------------------------------------------ */
/* 7) CAOR_ODL                                                         */
/* ------------------------------------------------------------------ */
export function qCaorOdl(raw?: Matrix): Table {
  let t = promoteHeaders(asTable(raw));
  t = transformColumnTypes(t, { Data: 'date', 'Creato il': 'date' });
  t = groupBy(t, ['Ord. dest.'], {
    'Data prima consuntivazione': (rows) => minDate(rows.map((r) => r.Data)),
    'Data ultima consuntivazione': (rows) => maxDate(rows.map((r) => r.Data)),
    Ore_consuntivate: (rows) => sumNumber(rows.map((r) => r['       Ore'])),
  });
  t = renameColumns(t, {
    Ore_consuntivate: 'Ore cons. su OdL',
    'Data prima consuntivazione': 'Data prima cons. su OdL',
    'Data ultima consuntivazione': 'Data ultima cons. su OdL',
  });
  return t;
}

function minDate(vals: any[]): any {
  const ds = vals.filter((v) => v !== null && v !== undefined);
  if (ds.length === 0) return null;
  return ds.reduce((a, b) => (compareValues(a, b) <= 0 ? a : b));
}
function maxDate(vals: any[]): any {
  const ds = vals.filter((v) => v !== null && v !== undefined);
  if (ds.length === 0) return null;
  return ds.reduce((a, b) => (compareValues(a, b) >= 0 ? a : b));
}
function compareValues(a: any, b: any): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b));
}
function sumNumber(vals: any[]): number {
  return vals.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
}

/* ------------------------------------------------------------------ */
/* 8) DATA_ORA                                                         */
/* ------------------------------------------------------------------ */
export function qDataOra(raw?: Matrix): Table {
  let t = promoteHeaders(asTable(raw));
  t = transformColumnTypes(t, { 'Data e ora scarico dati:': 'datetime' });
  return t;
}

/* ------------------------------------------------------------------ */
/* 1..5) ABBACO (4 linee + consolidamento)                             */
/* ------------------------------------------------------------------ */
type AbbacoLine = 'Bologna-Padova' | 'Mestre-Quarto' | 'Mestre-Treviso' | 'Milano-Venezia SL';

const ABBACO_RENAMES: Record<string, string> = {
  'Codice Tratta INRETE': 'Codice Tratta INRETE',
  'Tratta (descrizione)': 'Tratta (descrizione)',
  'Binario (P/D/L)': 'Binario (P/D/L)',
  Inizio: 'Inizio',
  Fine: 'Fine',
  chiave_RL: 'chiave_RL',
  Motivo: 'Motivo',
  'Titolare del rallentamento (matr.)': 'Titolare del rallentamento (matr.)',
  'Data inizio': 'Data inizio',
  'Ora inizio': 'Ora inizio',
  'Avviso Avaria': 'Avviso Avaria',
  EA: 'EA',
  'CODICE ABBATTIMENTO ': 'CODICE ABBATTIMENTO ',
  UM: 'UM',
  Pianificazione: 'Pianificazione',
  'Data fine': 'Data fine',
  'Ora fine': 'Ora fine',
};
void ABBACO_RENAMES;

function qAbbacoLine(raw: Matrix | undefined, linea: AbbacoLine): Table {
  let t = promoteHeaders(asTable(raw)); // 1ª intestazione
  if (linea === 'Mestre-Treviso') {
    // in Mestre-Treviso la rimozione colonne avviene PRIMA dello skip
    t = removeColumns(t, ['Column19', 'Column20']);
  }
  t = skipRows(t, 7);
  if (linea === 'Mestre-Treviso') {
    t = removeEmptyRows(t);
  }
  t = promoteHeaders(t); // 2ª intestazione -> nomi reali

  const types: Record<string, any> = {
    'Codice Tratta INRETE': 'text',
    'Tratta (descrizione)': linea === 'Mestre-Quarto' ? 'any' : 'text',
    'Binario (P/D/L)': 'text',
    Inizio: 'text',
    Fine: 'text',
    chiave_RL: 'text',
    Motivo: 'text',
    'Titolare del rallentamento (matr.)': 'text',
    'Data inizio': linea === 'Mestre-Quarto' ? 'text' : 'date',
    'Ora inizio': linea === 'Mestre-Treviso' ? 'datetime' : linea === 'Milano-Venezia SL' ? 'datetime' : linea === 'Bologna-Padova' ? 'any' : 'text',
    'Avviso Avaria': 'text',
    EA: 'text',
    'CODICE ABBATTIMENTO ': 'text',
    UM: linea === 'Milano-Venezia SL' ? 'text' : 'any',
    Pianificazione: linea === 'Bologna-Padova' ? 'date' : 'text',
    'Data fine': 'text',
    'Ora fine': 'text',
  };
  if (linea === 'Milano-Venezia SL') {
    types['rid_vel'] = 'text';
  } else {
    types['rid_vel (km/h)'] = 'text';
  }
  t = transformColumnTypes(t, types);

  if (linea === 'Bologna-Padova') {
    t = removeEmptyRows(t);
    t = removeColumns(t, ['Column19']);
    t = removeEmptyRows(t);
  } else if (linea === 'Milano-Venezia SL') {
    t = removeEmptyRows(t);
  } else if (linea === 'Mestre-Quarto') {
    t = removeEmptyRows(t);
  }

  t = addColumn(t, 'Linea', () => linea);
  return t;
}

/** 1..4) Le quattro linee ABBACO dal workbook multi-foglio. */
export function qAbbacoLines(sheets?: Record<string, Matrix>): Table {
  if (!sheets) return [];
  const lines: AbbacoLine[] = ['Bologna-Padova', 'Mestre-Quarto', 'Mestre-Treviso', 'Milano-Venezia SL'];
  const parts = lines.map((l) => qAbbacoLine(sheets[l], l));
  return combine(parts);
}

/** 5) ABBACO = Table.Combine + Text.Start("Codice Tratta INRETE", 6). */
export function qAbbaco(combined: Table): Table {
  return transformColumns(combined, 'Codice Tratta INRETE', (v) => textStart(v, 6));
}
