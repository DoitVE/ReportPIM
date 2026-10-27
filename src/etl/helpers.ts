/**
 * Helper tabellari che riproducono le operazioni Power Query M usate nel report
 * "Difetti di binario - DOIT VE". Ogni funzione rispecchia 1:1 il comportamento
 * di una trasformazione M (Table.Skip, Table.PromoteHeaders, Table.SplitColumn,
 * Table.NestedJoin/Expand, ...), così che la pipeline TypeScript resti fedele
 * ai 24 codici M originali.
 */

export type Row = Record<string, any>;
export type Table = Row[];
/** Matrice grezza così come restituita da SheetJS (sheet_to_json header:1). */
export type Matrix = any[][];

export type ColumnType = 'text' | 'number' | 'int' | 'date' | 'datetime' | 'any';

/* ------------------------------------------------------------------ */
/* Conversioni di tipo (locale italiano, come da macchina Power Query) */
/* ------------------------------------------------------------------ */

/** true se la cella è vuota equivalente a null/"" in Power Query. */
export const isBlank = (v: any): boolean => v === null || v === undefined || v === '';

/** Conversione a testo come `type text` (le date diventano gg/mm/aaaa). */
export function toText(v: any): string | null {
  if (isBlank(v)) return null;
  if (v instanceof Date) return formatDate(v);
  return String(v);
}

/** Parsa un numero con convenzioni italiane (migliaia '.', decimali ','). */
export function toNumber(v: any): number | null {
  if (isBlank(v)) return null;
  if (typeof v === 'number') return Number.isNaN(v) ? null : v;
  let s = String(v).trim().replace(/\s/g, '');
  if (s === '') return null;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // '1.234,56' -> '.' migliaia, ',' decimale
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    s = s.replace(',', '.');
  }
  // se resta solo '.' lo si interpreta come decimale
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

export function toInt(v: any): number | null {
  const n = toNumber(v);
  return n === null ? null : Math.trunc(n);
}

/** Converte una seriale Excel (giorni dal 1899-12-30) in Date. */
function excelSerialToDate(serial: number): Date {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms);
}

/** Converte in Date (solo data, ora azzerata) applicando le regole italiane. */
export function toDate(v: any): Date | null {
  if (isBlank(v)) return null;
  if (v instanceof Date) return stripTime(v);
  if (typeof v === 'number') return stripTime(excelSerialToDate(v));
  const s = String(v).trim();
  const parsed = parseDateString(s);
  return parsed ? stripTime(parsed) : null;
}

/** Converte in datetime (mantiene l'ora). */
export function toDateTime(v: any): Date | null {
  if (isBlank(v)) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return excelSerialToDate(v);
  const s = String(v).trim();
  return parseDateString(s);
}

/**
 * Parsa stringhe data nei formati ricorrenti dei file SAP:
 * gg.mm.aaaa, gg/mm/aaaa, aaaa-mm-gg (con eventuale orario).
 */
function parseDateString(s: string): Date | null {
  if (s === '') return null;
  // gg.mm.aaaa / gg/mm/aaaa [hh:mm[:ss]]
  let m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    let [, d, mo, y, hh, mi, ss] = m;
    let year = parseInt(y, 10);
    if (year < 100) year += 2000;
    return new Date(year, parseInt(mo, 10) - 1, parseInt(d, 10), hh ? parseInt(hh, 10) : 0, mi ? parseInt(mi, 10) : 0, ss ? parseInt(ss, 10) : 0);
  }
  // aaaa-mm-gg
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, y, mo, d, hh, mi, ss] = m;
    return new Date(parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10), hh ? parseInt(hh, 10) : 0, mi ? parseInt(mi, 10) : 0, ss ? parseInt(ss, 10) : 0);
  }
  return null;
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Formato gg/mm/aaaa usato dal report per le date. */
export function formatDate(v: Date | null): string {
  if (!v || Number.isNaN(v.getTime())) return '';
  const dd = String(v.getDate()).padStart(2, '0');
  const mm = String(v.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${v.getFullYear()}`;
}

/* ------------------------------------------------------------------ */
/* Costruzione tabella e intestazioni                                  */
/* ------------------------------------------------------------------ */

/** Da matrice grezza a tabella con colonne Column1..ColumnN (come Excel.Workbook). */
export function matrixToIndexedTable(m: Matrix): Table {
  const width = m.reduce((w, r) => Math.max(w, r ? r.length : 0), 0);
  return m.map((r) => {
    const o: Row = {};
    for (let i = 0; i < width; i++) o[`Column${i + 1}`] = r && i < r.length ? r[i] : null;
    return o;
  });
}

/**
 * Table.PromoteHeaders: la prima riga diventa intestazione. Se una cella di
 * intestazione è vuota la colonna mantiene il nome posizionale precedente
 * (ColumnN). I duplicati vengono numerati con suffisso ".1", ".2" (come M).
 */
export function promoteHeaders(t: Table): Table {
  if (t.length === 0) return [];
  const first = t[0];
  const prevNames = Object.keys(first);
  const used = new Map<string, number>();
  const names = prevNames.map((prev, i) => {
    const raw = first[prev];
    let name = isBlank(raw) ? prev : String(raw).trim();
    if (used.has(name)) {
      const n = used.get(name)! + 1;
      used.set(name, n);
      name = `${name}.${n}`;
    } else {
      used.set(name, 0);
    }
    return name;
  });
  return t.slice(1).map((r) => {
    const vals = Object.values(r);
    const o: Row = {};
    names.forEach((n, i) => (o[n] = vals[i] ?? null));
    return o;
  });
}

/* ------------------------------------------------------------------ */
/* Trasformazioni riga/colonna                                         */
/* ------------------------------------------------------------------ */

export const skipRows = (t: Table, n: number): Table => t.slice(n);
export const removeLastN = (t: Table, n: number): Table => (n <= 0 ? t.slice() : t.slice(0, Math.max(0, t.length - n)));
export const selectRows = (t: Table, pred: (r: Row) => boolean): Table => t.filter(pred);

/** Idioma M: scarta righe in cui tutte le celle sono "" o null. */
export function removeEmptyRows(t: Table): Table {
  return t.filter((r) => Object.values(r).some((v) => !isBlank(v)));
}

export function renameColumns(t: Table, map: Record<string, string>): Table {
  return t.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) o[map[k] ?? k] = v;
    return o;
  });
}

export function removeColumns(t: Table, cols: string[]): Table {
  const set = new Set(cols);
  return t.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) if (!set.has(k)) o[k] = v;
    return o;
  });
}

export function addColumn(t: Table, name: string, fn: (r: Row) => any): Table {
  return t.map((r) => ({ ...r, [name]: fn(r) }));
}

export function duplicateColumn(t: Table, src: string, dest: string): Table {
  return t.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) {
      o[k] = v;
      if (k === src) o[dest] = v;
    }
    return o;
  });
}

export function transformColumns(t: Table, col: string, fn: (v: any) => any): Table {
  return t.map((r) => ({ ...r, [col]: fn(r[col]) }));
}

export function transformColumnTypes(t: Table, types: Record<string, ColumnType>): Table {
  return t.map((r) => {
    const o: Row = { ...r };
    for (const [col, type] of Object.entries(types)) {
      if (!(col in o)) continue;
      o[col] = coerce(o[col], type);
    }
    return o;
  });
}

function coerce(v: any, type: ColumnType): any {
  switch (type) {
    case 'text':
      return toText(v);
    case 'number':
      return toNumber(v);
    case 'int':
      return toInt(v);
    case 'date':
      return toDate(v);
    case 'datetime':
      return toDateTime(v);
    default:
      return v;
  }
}

/**
 * Table.ReplaceValue. `mode` = 'replaceValue' (match esatto, come Replacer.ReplaceValue)
 * oppure 'replaceText' (sostituzione di sottostringa su testo).
 */
export function replaceValue(
  t: Table,
  cols: string[],
  search: any,
  replace: any,
  mode: 'replaceValue' | 'replaceText'
): Table {
  return t.map((r) => {
    const o: Row = { ...r };
    for (const c of cols) {
      if (!(c in o)) continue;
      const v = o[c];
      if (mode === 'replaceValue') {
        if (v === search) o[c] = replace;
      } else if (typeof v === 'string') {
        o[c] = v.split(String(search)).join(replace === null ? '' : String(replace));
      }
    }
    return o;
  });
}

/** Table.SplitColumn con Splitter.SplitTextByDelimiter. */
export function splitColumn(t: Table, col: string, delimiter: string, newNames: string[]): Table {
  return t.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) {
      if (k !== col) {
        o[k] = v;
        continue;
      }
      const s = isBlank(v) ? '' : String(v);
      const parts = s.split(delimiter);
      newNames.forEach((n, i) => (o[n] = i < parts.length ? parts[i] : null));
    }
    return o;
  });
}

/* ------------------------------------------------------------------ */
/* Join (Table.NestedJoin + Table.ExpandTableColumn)                   */
/* ------------------------------------------------------------------ */

export type JoinKind = 'full' | 'left' | 'inner';

interface NestedTable extends Table {}

/**
 * Table.NestedJoin seguito da Table.ExpandTableColumn: esegue il join sul campo
 * `leftKey`/`rightKey`, produce le righe del lato sinistro arricchite con le
 * colonne `expand` del lato destro, prefissate da `prefix + "."`.
 */
export function mergeExpand(
  left: Table,
  leftKey: string,
  right: Table,
  rightKey: string,
  prefix: string,
  expand: string[],
  kind: JoinKind = 'full'
): Table {
  // Indice del lato destro: una riga per chiave (prima occorrenza), le altre
  // vengono conservate come ulteriori righe solo nei join non-left.
  const rightByKey = new Map<any, Table>();
  for (const r of right) {
    const k = r[rightKey];
    if (isBlank(k)) continue;
    if (!rightByKey.has(k)) rightByKey.set(k, []);
    rightByKey.get(k)!.push(r);
  }

  const out: Table = [];
  const matchedKeys = new Set<any>();

  for (const lr of left) {
    const k = lr[leftKey];
    const matches = !isBlank(k) ? rightByKey.get(k) : undefined;
    if (matches && matches.length > 0) {
      matchedKeys.add(k);
      for (const mr of matches) {
        const o: Row = { ...lr };
        for (const c of expand) o[`${prefix}.${c}`] = mr[c] ?? null;
        out.push(o);
      }
    } else if (kind !== 'inner') {
      const o: Row = { ...lr };
      for (const c of expand) o[`${prefix}.${c}`] = null;
      out.push(o);
    }
  }

  // Lato destro non agganciato: per FullOuter si aggiungono righe "a destra".
  if (kind === 'full') {
    for (const [k, rows] of rightByKey.entries()) {
      if (matchedKeys.has(k)) continue;
      for (const mr of rows) {
        const o: Row = {};
        for (const c of Object.keys(left[0] ?? {})) o[c] = null;
        o[leftKey] = mr[rightKey] ?? null;
        for (const c of expand) o[`${prefix}.${c}`] = mr[c] ?? null;
        out.push(o);
      }
    }
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* GroupBy (Table.Group)                                               */
/* ------------------------------------------------------------------ */

export function groupBy<T extends Row>(
  t: Table,
  keyCols: string[],
  aggs: Record<string, (rows: Row[]) => any>
): Table {
  const groups = new Map<string, Row[]>();
  for (const r of t) {
    const key = JSON.stringify(keyCols.map((c) => r[c] ?? null));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const out: Table = [];
  for (const rows of groups.values()) {
    const o: Row = {};
    for (const c of keyCols) o[c] = rows[0][c] ?? null;
    for (const [name, fn] of Object.entries(aggs)) o[name] = fn(rows);
    out.push(o);
  }
  return out;
}

/** Table.Combine: unione di più tabelle (le colonne non comuni diventano null). */
export function combine(tables: Table[]): Table {
  return tables.flatMap((t) => t.map((r) => ({ ...r })));
}

/* ------------------------------------------------------------------ */
/* Funzioni testo/data stile M                                         */
/* ------------------------------------------------------------------ */

export const textStart = (v: any, n: number): string | null => (isBlank(v) ? null : String(v).slice(0, n));

export function beforeDelimiter(v: any, delimiter: string): string | null {
  if (isBlank(v)) return null;
  const s = String(v);
  const i = s.indexOf(delimiter);
  return i === -1 ? s : s.slice(0, i);
}

export function afterDelimiter(v: any, delimiter: string): string | null {
  if (isBlank(v)) return null;
  const s = String(v);
  const i = s.indexOf(delimiter);
  return i === -1 ? '' : s.slice(i + delimiter.length);
}

export const textContains = (v: any, sub: string): boolean => (isBlank(v) ? false : String(v).includes(sub));
export const positionOf = (v: any, sub: string): number => (isBlank(v) ? -1 : String(v).indexOf(sub));

export const dateYear = (v: any): number | null => {
  const d = v instanceof Date ? v : toDate(v);
  return d ? d.getFullYear() : null;
};
export const quarterOfYear = (v: any): number | null => {
  const d = v instanceof Date ? v : toDate(v);
  return d ? Math.floor(d.getMonth() / 3) + 1 : null;
};

export const today = (): Date => stripTime(new Date());
export const addDays = (d: Date, n: number): Date => {
  const x = stripTime(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Duration.Days tra due date. */
export const durationDays = (a: Date, b: Date): number =>
  Math.round((stripTime(a).getTime() - stripTime(b).getTime()) / 86400000);
