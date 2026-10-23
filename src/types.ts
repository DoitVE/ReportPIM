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
  | 'dashboard_v5'
  | 'cerca_sete_v5'
  | 'avvisi_v3v4'
  | 'frequenza_v3v4'
  | 'drill_frequenza_v3v4'
  | 'drill_v5'
  | 'abbattimento_codici'
  | 'mappa_georeferenziata'
  | 'quick_user_guide';

export interface PdmV5Item {
  pdm: string;
  data_creazione: string;
  data_scoperta: string;
  tolto_dop: 'N' | 'S';
  data_tolto_dop: string;
  classe: 'A' | 'B' | 'C1' | 'C2' | 'C3' | 'MANCANTE' | 'S1' | 'S2' | string;
  localita_tratta: string;
  linea: string;
  osservazioni: string;
  avviso: string;
  data_creaz_avviso: string;
  km_linea: string;
  tipo_difetto: string;
  pos_difetto: string;
  esegui_to_da: string;
  id_sald: string;
  gara_stato: string;
  cod_stato: string;
  scadenza: 'MANCANTE' | 'SCAD.<10GG' | 'SCAD.<30GG' | 'SCAD.<60GG' | 'SCAD.>60GG' | 'SCADUTO' | 'COMPLETATO' | string;
  sede_tecnica: string;
  divisione: 'VEM1' | 'VEM2' | string;
  lvu: 'LVU1' | 'LVU2' | 'LVU3' | 'LVU4' | string;
  classificazione_stato: 'Pdm aperto - Avv. aperto' | 'Pdm aperto - Avv. chiuso' | 'Pdm aperto - Avv. mancante' | 'Pdm chiuso - Avv. aperto' | 'Pdm mancante - Avv. aperto' | string;
  fine_richiesta?: string;
  ritardo_pdm?: string;
  data_tolto_minore_scoperta?: boolean;
  non_visibile_zstmaia?: boolean;
  tolto_data_futura?: boolean;
  avviso_chiuso?: boolean;
  avviso_chiuso_con_odl?: boolean;
  chiusura_ritardo?: boolean;
  lat: number;
  lng: number;

  // Drill V5 specific properties
  dev?: string;
  bin?: string;
  fila?: string;
  tipo_arm?: string;
  val_perc_mm?: string;
  prof_dif?: string;
  pos_dif?: string;
  ubi_lin?: string;
  t_tratta_ragg_fug?: string;
  tipo_sald?: string;
  data_esec_saldatura?: string;
  pos_sezione?: string;
  sald_in_gar?: string;
  id_saldatore?: string;
  creato_da?: string;
  cod_linea?: string;
}

export interface AvvisoV5Detail {
  avviso: string;
  pdm?: string;
  tipo: string;
  descrizione: string;
  autore: string;
  data_creazione: string;
  ultima_mod: string;
  data_modifica: string;
  sede_tecnica: string;
  ordine: string;
  network: string;
  testo_esteso: string;
  stato_sistema: string;
  inizio_richiesta: string;
  fine_richiesta: string;
  data_chiusura: string;
  ritardo_avv: string;
  chiusura_minore_inizio?: boolean;
  chiusura_futura?: boolean;
}
