export interface Avviso {
  tipo: string;
  avviso: string;
  descrizione: string;
  ordine: string;
  sede_tecnica: string;
  nome_sede: string;
  linea: string;
  divisione: string;
  lvu: string;
  fine_richiesta: string;
  inizio_richiesto: string;
  stato_sistema: string;
  stato_utente: string;
  data_creazione: string;
  network: string;
  operazione: string;
  tipo_difetto: string;
  stato_scadenza: 'Regolare' | 'In scadenza' | 'Scaduto';
  lat: number;
  lng: number;
}

export interface Iw67Item {
  Avviso: string;
  Ordine: string;
  'Definizione della sede tecnica': string;
  'Tp.': string;
  Codice: string;
  'Testo per la misura': string;
  'Testo codice per misura': string;
  Data: string;
  Descrizione: string;
  Latit_iniz?: string;
  Long_inizi?: string;
  CLavResp: string;
  CD?: string;
  'Data rif.'?: string;
  DataEsec?: string;
  'Data cr.'?: string;
  'FineRich.'?: string;
  'Sede tecnica': string;
  'St.sist.'?: string;
}

export interface AbbacoItem {
  linea: string;
  tratta_codice: string;
  tratta: string;
  binario: string;
  km_inizio: string;
  km_fine: string;
  chiave_rl: string;
  rid_vel: string;
  motivo: string;
  titolare: string;
  data_inizio?: string;
  data_fine?: string;
}

export interface OdlItem {
  centro_lavoro: string;
  divisione: string;
  ordine: string;
  tipo_ordine: string;
  descrizione: string;
  stato_sistema: string;
  costo_eff: string;
  costo_pian: string;
}

export interface ControlloAvvisoItem {
  Avviso: string;
  Ordine: string;
  Descrizione: string;
  'Sede tecnica': string;
  'Data avviso': string;
  'Inizio guasto'?: string;
  'Tipo avviso': string;
  'Centro lavoro resp.': string;
  'Fine richiesta': string;
  'Div. per c.di lavoro'?: string;
  'Divisione pian.'?: string;
  Network?: string;
  Operazione?: string;
  'Stato sistema': string;
  'Stato utente'?: string;
}

export interface DiagnosticaItem {
  data_scoperta: string;
  cod_linea: string;
  cod_tratta: string;
  binario: string;
  fila: string;
  km: string;
  tipo_difetto: string;
  classe: string;
  centro_lavoro: string;
}

export type TabType = 
  | 'overview' 
  | 'avvisi_v5' 
  | 'avvisi_v3v4' 
  | 'abbaco' 
  | 'frequenza' 
  | 'controlli' 
  | 'mappa' 
  | 'importa';

export type PowerBiSectionId =
  | 'avvisi_v5'
  | 'avvisi_v3v4'
  | 'abbaco'
  | 'analisi_frequenza'
  | 'drill_frequenza'
  | 'controlli_avvisi'
  | 'controlli_avvisi_2'
  | 'pagina_1';
