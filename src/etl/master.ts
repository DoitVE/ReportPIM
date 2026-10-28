/**
 * 24) Query master `ZSTMAIA1+2+7(VEM1+VEM2)+IW29_full`:
 * catena di NestedJoin/Expand su chiave Pdm e Avviso + colonne derivate.
 */
import {
  Row,
  Table,
  mergeExpand,
  addColumn,
  removeColumns,
  transformColumnTypes,
  duplicateColumn,
  renameColumns,
  textStart,
  beforeDelimiter,
  textContains,
  toDate,
  today,
  addDays,
} from './helpers';

const eq = (a: any, b: any): boolean => (a === null || a === undefined) === (b === null || b === undefined) && a === b;
const lt = (a: Date | null, b: Date | null): boolean => !!a && !!b && a.getTime() < b.getTime();
const gt = (a: Date | null, b: Date | null): boolean => !!a && !!b && a.getTime() > b.getTime();

export interface MasterInputs {
  zstmaia1: Table;
  zstmaia2: Table;
  zstmaia7: Table;
  iw29: Table;
  zavvisi: Table;
  ik07full: Table;
}

export function buildMaster(inp: MasterInputs): Table {
  const { zstmaia1, zstmaia2, zstmaia7, iw29, zavvisi, ik07full } = inp;

  // 1) Merge ZSTMAIA1_full <-> ZSTMAIA2_full su {Pdm} (FullOuter)
  const z2Cols = [
    'Data scoperta', 'Cod. linea', 'Cod. tratta', 'Dev.', 'Bin', 'km linea', 'Pdm', 'Ubi lin.',
    'T. tratta ragg. fug.', 'Fila', 'Tipo difetto', 'Classe prov.', 'Valore (%/mm)', 'Posizione difetto',
    'Tipo Sald.', 'Data esec. saldatura', 'Posizione sezione', 'Sald. in gar.', "Tolto d'opera",
    "Data tolto d'opera", 'Eseguito da', 'ID saldatore',
  ];
  let t = mergeExpand(zstmaia1, 'Pdm', zstmaia2, 'Pdm', 'ZSTMAIA2_full', z2Cols, 'full');

  // 2) Merge con ZSTMAIA7 (VEM1+VEM2) su {Pdm} (FullOuter)
  const z7Cols = [
    'Data scoperta', 'Cod. linea', 'Cod. SeTe', 'Bin.', 'Fila', 'km linea', 'Tipo difetto',
    'Classe porvv.', "Tolto d'opera", "Data tolto d'opera", 'Centro di lavoro', 'Pdm', 'N. doc. di misura', 'Avviso',
  ];
  t = mergeExpand(t, 'Pdm', zstmaia7, 'Pdm', 'ZSTMAIA7_full_VEM1+VEM2', z7Cols, 'full');

  // 3) Merge con IW29_full su {ZSTMAIA7....Avviso} <-> {Avviso} (FullOuter)
  const iw29Cols = [
    'Tp.', 'Avviso', 'Descrizione', 'Ordine', 'Sede tecnica', 'FineRich.', 'In. rich.', 'St.pag.',
    'St.sist.', 'St.utente', 'Autore', 'Da', 'Aut.avviso', 'Data chiusura', 'Data avviso', 'Data cr.',
    'Data rif.', 'Data modifica', 'Dt.rif.cl.', 'Network', 'Op.',
  ];
  t = mergeExpand(t, 'ZSTMAIA7_full_VEM1+VEM2.Avviso', iw29, 'Avviso', 'IW29_full', iw29Cols, 'full');

  // 4) Merge ZAVVISI_TXT su {IW29_full.Avviso} <-> {Numero avviso} (LeftOuter)
  t = mergeExpand(t, 'IW29_full.Avviso', zavvisi, 'Numero avviso', 'ZAVVISI_TXT', ['Testo Esteso'], 'left');

  // 5) TransformColumnTypes {{"Data Scoperta", date}}
  t = transformColumnTypes(t, { 'Data Scoperta': 'date' });

  // ---- colonne derivate lato avviso (passi 11..21) ----
  t = addColumn(t, 'Avv. chiuso in ritardo', (r) =>
    r['IW29_full.Data chiusura'] !== null && r['IW29_full.FineRich.'] !== null
      ? gt(r['IW29_full.Data chiusura'], r['IW29_full.FineRich.'])
        ? 'Data chiusura avv. > Data fine rich.'
        : ''
      : ''
  );
  t = addColumn(t, 'Data chiusura avv. < Data inizio avv.', (r) =>
    r['IW29_full.Data chiusura'] !== null && r['IW29_full.In. rich.'] !== null
      ? lt(r['IW29_full.Data chiusura'], r['IW29_full.In. rich.'])
        ? 'Data chiusura avv. < Data inizio avv.'
        : ''
      : ''
  );
  t = addColumn(t, 'Data chiusura avv. futura', (r) =>
    r['IW29_full.Data chiusura'] !== null && gt(r['IW29_full.Data chiusura'], todayToMidnight())
      ? "Data Tolto d'opera futura"
      : ''
  );
  t = addColumn(t, 'Ritardo Avv.', (r) => {
    const dc = r['IW29_full.Data chiusura'] as Date | null;
    const fr = r['IW29_full.FineRich.'] as Date | null;
    if (dc !== null && fr !== null) {
      if (gt(dc, fr)) return `(Ritardo ${durationDaysStr(dc, fr)} gg)`;
      return 0;
    }
    return 0;
  });

  // 22) Merge IK07_full su {Pdm} <-> {Punto di misura} (FullOuter)
  const ik07Cols = [
    'Autore modifica', 'Punto di misura', 'Descrizione', 'Sede tecnica', 'Tipo punto di mis.',
    'Gruppo codici', 'Pos. misura', 'Punto mis. inattivo', 'Tipo catalogo', 'Chiave lingua', 'Creato da',
    'Data creazione', 'Data modifica', 'Mandante', 'N. ogg. punto mis.', 'Ind.punto mis. rif.',
    'Indic. di canc.', 'Punto mis. è contat.', 'Punto mis. rif.', 'Tsto',
  ];
  t = mergeExpand(t, 'Pdm', ik07full, 'Punto di misura', 'IK07_full', ik07Cols, 'full');

  // ---- colonne derivate finali ----
  t = addColumn(t, 'PdM non visibile in ZSTMAIA', (r) =>
    r['IK07_full.Punto di misura'] !== null && r['Pdm'] === null ? 'PdM non visibile in ZSTMAIA' : ''
  );
  t = addColumn(t, 'PdM_definitivo', (r) => (r['Pdm'] !== null ? r['Pdm'] : r['IK07_full.Punto di misura']));
  t = duplicateColumn(t, 'PdM_definitivo', 'PdM_definitivo_clone');
  t = addColumn(t, 'Osservazioni_definitivo', (r) =>
    r['IK07_full.Punto di misura'] !== null && r['Pdm'] === null ? r['IK07_full.Descrizione'] : r['Osservazioni']
  );
  t = addColumn(t, 'Sede_tecnica_definitiva', (r) =>
    r['Tratta'] !== null ? r['Tratta'] : r['IW29_full.Sede tecnica'] !== null ? r['IW29_full.Sede tecnica'] : r['IK07_full.Sede tecnica']
  );
  t = addColumn(t, " Tolto d'opera_definitivo", (r) => {
    if (r['IK07_full.Punto di misura'] !== null && r['Pdm'] === null) {
      return r['IK07_full.Punto mis. inattivo'] === 'X' ? 'S' : 'N';
    }
    return r["Tolto d'opera"];
  });
  t = addColumn(t, 'Anno', (r) => {
    if (r['Pdm'] !== null && r['Data Scoperta'] !== null) {
      const d = toDate(r['Data Scoperta']);
      if (d) return d.getFullYear();
    }
    if (r['IW29_full.Avviso'] !== null) {
      const d = toDate(r['IW29_full.Data avviso']);
      if (d) return d.getFullYear();
    }
    const d = toDate(r['IK07_full.Data creazione']);
    if (d) return d.getFullYear();
    const dAgg = toDate(r['Data Agg.']);
    return dAgg ? dAgg.getFullYear() : null;
  });
  t = transformColumnTypes(t, { Anno: 'int' });
  t = addColumn(t, 'Caratteri iniziali', (r) => textStart(r['Sede_tecnica_definitiva'], 6));
  t = renameColumns(t, { 'Caratteri iniziali': 'Tratta_definitiva' });

  t = addColumn(t, 'PdM chiuso in ritardo', (r) => {
    const dt = r["Data tolto d'opera"] as Date | null;
    const fr = r['IW29_full.FineRich.'] as Date | null;
    if (dt !== null && fr !== null) {
      return gt(dt, fr) ? 'Data Tolto d\'opera > Data fine rich.' : '';
    }
    return '';
  });
  t = addColumn(t, 'Data Tolto d\'opera < Data scoperta', (r) => {
    const ds = r['Data Scoperta'] as Date | null;
    const dt = r["Data tolto d'opera"] as Date | null;
    if (ds !== null && dt !== null) return gt(ds, dt) ? "Data Tolto d'opera < Data scoperta" : '';
    return '';
  });
  t = addColumn(t, "Data Tolto d'opera futura", (r) => {
    const dt = r["Data tolto d'opera"] as Date | null;
    return dt !== null && gt(dt, todayToMidnight()) ? "Data Tolto d'opera futura" : '';
  });
  t = addColumn(t, 'Ritardo PdM', (r) => {
    const dt = r["Data tolto d'opera"] as Date | null;
    const fr = r['IW29_full.FineRich.'] as Date | null;
    if (dt !== null && fr !== null) {
      return gt(dt, fr) ? `(Ritardo ${durationDaysStr(dt, fr)} gg)` : 0;
    }
    return 0;
  });
  t = addColumn(t, 'Anomalie PdM', (r) => {
    if (r['PdM non visibile in ZSTMAIA'] !== '') return 1;
    if (r['PdM chiuso in ritardo'] !== '') return 1;
    if (r["Data Tolto d'opera futura"] !== '') return 1;
    if (r["Data Tolto d'opera < Data scoperta"] !== '') return 1;
    return 0;
  });
  t = addColumn(t, 'Avviso chiuso', (r) =>
    r['IW29_full.St.sist.'] === null ? null : textContains(r['IW29_full.St.sist.'], 'MECO') ? 'S' : 'N'
  );
  t = addColumn(t, 'Classe_prov_definitiva', (r) =>
    r['Classe provvedimento'] === null || r['Classe provvedimento'] === '' ? 'MANCANTE' : r['Classe provvedimento']
  );
  t = addColumn(t, 'Avviso aperto', (r) =>
    r['IW29_full.St.sist.'] === null || r['IW29_full.St.sist.'] === undefined
      ? 0
      : textContains(r['IW29_full.St.sist.'], 'MECO')
        ? 0
        : 1
  );
  t = addColumn(t, 'Pdm aperto', (r) => (r[" Tolto d'opera_definitivo"] === 'N' ? 1 : 0));
  t = transformColumnTypes(t, { 'Avviso aperto': 'int', 'Pdm aperto': 'int' });
  t = addColumn(t, 'Avviso aperto o Pdm aperto', (r) => ((r['Avviso aperto'] as number) + (r['Pdm aperto'] as number) > 0 ? 1 : 0));
  t = transformColumnTypes(t, { 'Avviso aperto o Pdm aperto': 'int' });
  t = addColumn(t, 'Classificazione stato', (r) => {
    const pdm = r['Pdm aperto'] === 1 ? 'Pdm aperto' : r['Pdm'] === null ? 'Pdm mancante' : 'Pdm chiuso';
    const avv = r['Avviso aperto'] === 1 ? 'Avv. aperto' : r['IW29_full.Avviso'] === null ? 'Avv. mancante' : 'Avv. chiuso';
    return `${pdm} - ${avv}`;
  });
  t = addColumn(t, 'Stato scadenza', (r) => statoScadenza(r, false) as string);
  t = addColumn(t, 'Cod. stato scadenza', (r) => statoScadenza(r, true) as string);
  t = addColumn(t, 'Network/OdL agganciato', (r) => {
    if (r['IW29_full.Avviso'] !== null) {
      if (r['Avviso chiuso'] === 'S') {
        if (r['IW29_full.Network'] !== null || (r['IW29_full.Ordine'] !== '' && r['IW29_full.Ordine'] !== '')) return 'S';
        return 'N';
      }
      return '-';
    }
    return '-';
  });
  t = addColumn(t, 'Chiave (PdM o Avviso)', (r) => (r['PdM_definitivo'] !== null ? r['PdM_definitivo'] : r['IW29_full.Avviso']));
  t = addColumn(t, 'Presenza PdM e Avviso', (r) => {
    if (r['PdM_definitivo'] !== null) return r['IW29_full.Avviso'] !== null ? 'Pdm con Avviso' : 'Pdm senza avviso';
    return r['IW29_full.Avviso'] !== null ? 'Avviso senza Pdm' : 'No avviso no Pdm';
  });
  t = duplicateColumn(t, 'IW29_full.Avviso', 'IW29_full.Avviso - Copia');
  t = renameColumns(t, { 'IW29_full.Avviso - Copia': 'IW29_full.Avviso_clone' });

  return t;
}

function todayToMidnight(): Date {
  return today();
}

function durationDaysStr(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/** Stato scadenza ('SCADUTO'...) oppure Cod. stato scadenza ('00'..'06'). */
function statoScadenza(r: Row, asCode: boolean): string | null {
  const adesso = today();
  const aperto = r['Avviso aperto o Pdm aperto'];
  if (aperto === 0) return asCode ? '00' : 'COMPLETATO';
  if (r['IW29_full.Avviso'] === null) return asCode ? '01' : 'MANCANTE';
  const fr = r['IW29_full.FineRich.'] as Date | null;
  if (!fr) return asCode ? '06' : 'SCAD.>60GG';
  if (fr.getTime() < adesso.getTime()) return asCode ? '02' : 'SCADUTO';
  if (fr.getTime() < addDays(adesso, 10).getTime()) return asCode ? '03' : 'SCAD.<10GG';
  if (fr.getTime() < addDays(adesso, 30).getTime()) return asCode ? '04' : 'SCAD.<30GG';
  if (fr.getTime() < addDays(adesso, 60).getTime()) return asCode ? '05' : 'SCAD.<60GG';
  return asCode ? '06' : 'SCAD.>60GG';
}

export { eq, beforeDelimiter, toDate };
