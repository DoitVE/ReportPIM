import React, { useState } from 'react';
import {
  FileText,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Info,
  Maximize2,
  Eye,
  Layers,
  Search,
  TrainTrack
} from 'lucide-react';

interface GuideSlide {
  page: number;
  title: string;
  subtitle: string;
  badge: string;
  sections: {
    heading: string;
    points: string[];
  }[];
  keyTips: string[];
  relatedTab?: string;
}

export const PageQuickUserGuide: React.FC = () => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'interactive' | 'pdf'>('interactive');

  const slides: GuideSlide[] = [
    {
      page: 1,
      title: 'Copertina & Obiettivi della Piattaforma PIM',
      subtitle: 'Monitoraggio e Controllo dei Difetti di Armamento Ferroviario',
      badge: 'Architettura & Scopo',
      sections: [
        {
          heading: 'Finalità del Report',
          points: [
            'Monitoraggio centralizzato di tutti i difetti di armamento per la Direzione Operativa Infrastrutture Territoriale di Venezia (DOIT VE).',
            'Integrazione multipiattaforma: Avvisi SAP PM (transazioni IW29, IW67), Carrelli Diagnostici VEM, Rallentamenti di Linea (ABBA.CO) e Ordini di Lavoro (OdL).',
            'Superamento dei fogli di calcolo isolati attraverso una dashboard interattiva con georeferenziazione e navigazione drilldown.'
          ]
        },
        {
          heading: 'Destinatari e Ruoli Operativi',
          points: [
            'Unità Manutentive Territoriali (LVU1 Mestre, LVU2 Padova, LVU3 Treviso, LVU4 Udine).',
            'Responsabili di Divisione Manutenzione (VEM1 e VEM2).',
            'Staff di Programmazione & Controllo di Esercizio della Direzione Operativa.'
          ]
        }
      ],
      keyTips: [
        'Utilizza la barra di navigazione inferiore per passare velocemente da una vista analitica all\'altra.',
        'Tutti i filtri applicati nelle pagine rimangono attivi fino al reset tramite il pulsante "Ripristina Filtri".'
      ]
    },
    {
      page: 2,
      title: 'Pagina Avvisi V5',
      subtitle: 'Monitoraggio Difetti Ultrasuoni e Misure Aperte',
      badge: 'Avvisi V5',
      relatedTab: 'avvisi_v5',
      sections: [
        {
          heading: 'Elementi Chiave della Schermata',
          points: [
            'Totale Punti di Misura (PdM) aperti: monitora lo stock di difetti non ancora rimossi d\'opera.',
            'Istogramma delle Classi di Provvedimento: ripartizione categorica (A = intervento immediato, B, C1, C2, MANCANTE, S1, S2).',
            'Slicers di filtraggio: Divisione (VEM1, VEM2), U.M. (LVU1-LVU4), Stato Scadenza (<10gg, <30gg, <60gg, Scaduto, Mancante).',
            'Mappa cartografica: geolocalizzazione georeferenziata dei difetti sovrapposta alla rete ferroviaria.'
          ]
        },
        {
          heading: 'Interattività e Drill',
          points: [
            'Cliccando su una riga della tabella "Elenco Avvisi V5 / PdM", il pulsante giallo "Drill PdM/avviso" si abilita.',
            'Il click apre direttamente la scheda monografica di dettaglio "Drill V5".'
          ]
        }
      ],
      keyTips: [
        'I punti rossi sulla mappa indicano difetti di classe A o scaduti.',
        'La classificazione dello stato permette di isolare i PdM aperti con o senza avviso SAP collegato.'
      ]
    },
    {
      page: 3,
      title: 'Dashboard V5',
      subtitle: 'Controllo Qualità di Compilazione e Tempestività Manutentiva',
      badge: 'Dashboard V5',
      relatedTab: 'dashboard_v5',
      sections: [
        {
          heading: 'Analisi Grafica del Processo',
          points: [
            'PdM Tolto d\'Opera per Anno: verifica quanti difetti sono stati rimossi dall\'esercizio ferroviario nel tempo.',
            'Avvisi Chiusi per Anno: andamento della chiusura tecnica degli avvisi su SAP.',
            'Associazione PdM - Avviso: grafico di consistenza per identificare anomalie tra lo stato del PdM e quello dell\'Avviso.'
          ]
        },
        {
          heading: 'Monitoraggio Anomalie e Ritardi',
          points: [
            'Grafico a ciambella "Chiusi in Ritardo vs Nei Termini": percentuale di avvisi chiusi oltre la data di fine richiesta.',
            'Grafico a ciambella "Chiusura prima di scoperta": evidenzia errori materiali di data discovery su SAP.',
            'Schede KPI anomalie: Tolto d\'opera con data futura, Difetto non visibile in ZSTMAIA.'
          ]
        }
      ],
      keyTips: [
        'Utilizza lo slider temporale degli anni (es. 2018 - 2026) per analizzare trend pluriennali.',
        'Seleziona una riga nella tabella di sintesi e premi "Drill riga selezionata" per approfondire.'
      ]
    },
    {
      page: 4,
      title: 'Cerca per SeTe V5',
      subtitle: 'Ricerca Puntuale per Sede Tecnica, Codice PdM o Avviso',
      badge: 'Cerca per SeTe V5',
      relatedTab: 'cerca_sete_v5',
      sections: [
        {
          heading: 'Come Funziona la Ricerca',
          points: [
            'Campo autocompletato "Sede Tecnica": digita il codice dell\'impianto (es. LO3002-BC-BC42) per vedere all\'istante tutti i PdM e gli Avvisi correlati.',
            'Filtri veloci per "Avviso" e "PdM": per ispezionare istantaneamente un difetto specifico noto.',
            'Slider Anno Creazione: per restringere i risultati alle campagne ispettive recenti.'
          ]
        },
        {
          heading: 'Tabelle Collegate in Parallelo',
          points: [
            'Tabella Sinistra (PdM): mostra codice PdM, data scoperta, classe, localizzazione, deviatore/binario e osservazioni.',
            'Tabella Destra (Avvisi): mostra i dati dell\'avviso manutentivo SAP associato con date di richiesta e chiusura.'
          ]
        }
      ],
      keyTips: [
        'Questo strumento è ideale per sopralluoghi sul campo o verifiche preventive prima di un intervento in linea.'
      ]
    },
    {
      page: 5,
      title: 'Avvisi V3 V4',
      subtitle: 'Monitoraggio Anomalie Geometria Binario (Livellamento & Sghembo)',
      badge: 'Avvisi V3 V4',
      relatedTab: 'avvisi_v3v4',
      sections: [
        {
          heading: 'Origine dei Dati',
          points: [
            'Sorgente: transazione SAP IW67 filtrata per avvisi V3 (Livellamento Longitudinale) e V4 (Sghembo).',
            'I difetti provengono dalle registrazioni dei carrelli diagnostici e misure certificate.',
            'Filtri contestuali: Anno, Trimestre (Q1, Q2, Q3, Q4), Divisione e U.M. di competenza.'
          ]
        },
        {
          heading: 'Scadenze dei Provvedimenti',
          points: [
            'Grafico a barre orizzontali azzurre: conteggio delle misure in base alla classe di scadenza (<10gg, <30gg, <60gg, >60gg, Scaduto).',
            'Mappa georeferenziata con tracciato ferroviario e tabella dettagliata delle misure aperte.'
          ]
        }
      ],
      keyTips: [
        'Le misure di classe V4 (sghembo) richiedono priorità assoluta di presidio per la sicurezza della circolazione.'
      ]
    },
    {
      page: 6,
      title: 'Frequenza V3 V4',
      subtitle: 'Analisi di Concentrazione e Ripetitività dei Difetti',
      badge: 'Frequenza V3 V4',
      relatedTab: 'frequenza_v3v4',
      sections: [
        {
          heading: 'Algoritmo di Frequenza',
          points: [
            'Calcola quante volte uno stesso difetto si è ripresentato sul medesimo chilometro e binario.',
            'KPI Big Number "12K": volume aggregato delle misure storiche analizzate.',
            'Ripartizione per tipologia di binario: DISPARI, PARI, UNICO con grafici a barre verticali verde mela.'
          ]
        },
        {
          heading: 'Navigazione Drill V3 V4',
          points: [
            'Seleziona una tratta o un chilometro critico dalla tabella di frequenza.',
            'Premi il pulsante verde "Drill V3 V4" per accedere alla cronologia dettagliata di tutte le rilevazioni su quel tratto.'
          ]
        }
      ],
      keyTips: [
        'Chilometri con frequenza elevata indicano criticità geotecniche o usura accelerata della piattaforma.'
      ]
    },
    {
      page: 7,
      title: 'Drill Frequenza V3 V4',
      subtitle: 'Cronologia e Storico di Dettaglio delle Rilevazioni',
      badge: 'Drill fequenza V3 V4',
      relatedTab: 'drill_frequenza_v3v4',
      sections: [
        {
          heading: 'Contenuto del Drill',
          points: [
            'Riepilogo della tratta selezionata: Linea, Chilometrica di riferimento, Binario e Centro di Lavoro.',
            'Elenco cronologico completo di ogni passaggio del carrello o misura manuale registrata su SAP.',
            'Pulsante "Torna all\'Analisi Frequenza" per risalire rapidamente al livello sintetico.'
          ]
        }
      ],
      keyTips: [
        'Consente di verificare se una lavorazione eseguita in passato ha risolto definitivamente l\'anomalia o se c\'è stata una recidiva.'
      ]
    },
    {
      page: 8,
      title: 'Drill V5 (Scheda Monografica)',
      subtitle: 'Dati Tecnici Completi del Punto di Misura e dell\'Avviso SAP',
      badge: 'Drill V5',
      relatedTab: 'drill_v5',
      sections: [
        {
          heading: 'I Quattro Quadranti della Scheda',
          points: [
            '1. Dati PdM: Codice PdM, Data creazione, Data scoperta, Classe, Località/Tratta, Linea, Sede Tecnica, Dev./Binario.',
            '2. Stato PdM: Tolto d\'opera (S/N), Data tolto, Scadenza, Osservazioni e Ritardo.',
            '3. Dati Avviso: Numero avviso SAP, Descrizione, Autore, Data creazione, Ordine OdL collegato.',
            '4. Stato Avviso & Testo Esteso: Stato sistema (es. MECO ORAT), date inizio/fine richiesta, data effettiva chiusura e storico esteso.'
          ]
        }
      ],
      keyTips: [
        'Utilizza la casella di ricerca in alto per cambiare PdM al volo senza dover tornare indietro.',
        'Il pulsante "Torna agli Avvisi V5" memorizza la posizione di scorrimento precedente.'
      ]
    },
    {
      page: 9,
      title: 'Abbattimento Codici (ABBA.CO)',
      subtitle: 'Monitoraggio dei Rallentamenti Temporanei di Linea',
      badge: 'Abbattimento Codici',
      relatedTab: 'abbattimento_codici',
      sections: [
        {
          heading: 'Indicatori e Dati Monitorati',
          points: [
            'N. chiavi attive: indicatore numerico in evidenza (es. 20 rallentamenti in atto sulla rete DOIT VE).',
            'Numero Chiavi per Linea: istogramma orizzontale giallo/ambra (Bologna-Padova 15, Milano-Venezia SL 3, Mestre-Treviso 2).',
            'Geolocalizzazione: mappa scura con i punti di rallentamento evidenziati con halo di colore giallo caldo.',
            'Tabella completa: Chiave RL, Riduzione di velocità (es. 115 km/h), Chilometriche di inizio/fine, Motivo e U.M. titolare.'
          ]
        }
      ],
      keyTips: [
        'Permette alla Direzione di stimare l\'impatto sulla puntualità dei treni viaggiatori e merci.'
      ]
    },
    {
      page: 10,
      title: 'Aggiornamento Dati & Caricamento File',
      subtitle: 'Modalità di Refresh dei Dati e Transazioni SAP',
      badge: 'Manutenzione Dati',
      sections: [
        {
          heading: 'Transazioni SAP di Riferimento',
          points: [
            'IW29: estrazione Avvisi di Manutenzione (tipo V3, V4, V5) con layout standard colonne.',
            'IW67: estrazione Misure Aperte con codici difetto e localizzazioni.',
            'ZSTMAIA: estrazione dati carrelli e difetti visivi non ancora inseriti a sistema.',
            'ABBA.CO: estrazione chiavi RL da portale circolazione RFI.'
          ]
        },
        {
          heading: 'Caricamento Manuale nella Web App',
          points: [
            'Clicca sull\'icona "Carica Dati" (o cartella con freccia) nella barra superiore di Power BI.',
            'Trascina o seleziona i file Excel (.xlsx, .xls) o CSV estratti dalle transazioni SAP.',
            'Il sistema aggiornerà immediatamente tutti i grafici, le mappe e gli indicatori senza ricaricare la pagina.'
          ]
        }
      ],
      keyTips: [
        'Il report include già un dataset precaricato completo conforme alle estrazioni certificate di DOIT VE.'
      ]
    }
  ];

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="bg-[#18191c] text-[#e2e8f0] min-h-[calc(100vh-6rem)] p-3 space-y-3 font-sans select-none">
      {/* Top Banner Matching Screenshot 10 */}
      <div className="bg-[#20232a] border border-[#2d323d] rounded p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3.5">
          <img
            src="/rfi_logo.jpg"
            alt="RFI"
            className="h-10 w-auto object-contain rounded bg-white/5 p-0.5"
          />
          <div className="border-l border-[#374151] pl-3.5">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-white tracking-wide">
                Quick User Guide
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-600/30">
                PIM DOIT VE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Guida operativa ufficiale per l'utilizzo del Report Monitoraggio Difetti Armamento
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setViewMode(viewMode === 'interactive' ? 'pdf' : 'interactive')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors border shadow-xs ${
              viewMode === 'pdf'
                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                : 'bg-[#282c35] text-slate-200 border-[#3b4250] hover:bg-[#323742]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{viewMode === 'pdf' ? 'Vista Interattiva' : 'Visualizza PDF'}</span>
          </button>

          {/* Prominent "Apri PDF" Button */}
          <a
            href="/Quick_User_Guide.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#d90000] hover:bg-[#b80000] text-white rounded text-xs font-bold transition-colors shadow-md border border-red-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Apri / Scarica PDF</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
          </a>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'pdf' ? (
        /* Direct Embedded PDF Viewer */
        <div className="bg-[#20232a] border border-[#2d323d] rounded p-2 flex flex-col min-h-[620px]">
          <div className="flex items-center justify-between pb-2 px-2 border-b border-[#2d323d] mb-2 text-xs">
            <span className="font-bold text-slate-200 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-red-500" />
              <span>Documento Ufficiale: Quick User Guide.pdf (10 Pagine)</span>
            </span>
            <span className="text-slate-400 text-[11px]">
              Visualizzazione integrata nel canvas Power BI
            </span>
          </div>
          <div className="flex-1 w-full h-[620px] rounded overflow-hidden bg-[#18191c]">
            <iframe
              src="/Quick_User_Guide.pdf#toolbar=1&navpanes=1"
              title="Quick User Guide PDF"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      ) : (
        /* High-Fidelity Interactive Slide Navigator Matching Screenshot 10 */
        <div className="grid grid-cols-12 gap-3">
          
          {/* Left: Slide Index / Navigation List (3 Cols) */}
          <div className="col-span-12 lg:col-span-4 bg-[#20232a] border border-[#2d323d] rounded p-2.5 flex flex-col space-y-1.5">
            <div className="flex items-center justify-between px-1 pb-1.5 border-b border-[#2d323d]">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Indice Capitoli ({slides.length})</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-semibold">
                Pagina {currentSlideIndex + 1} di {slides.length}
              </span>
            </div>

            <div className="space-y-1 max-h-[530px] overflow-y-auto pr-1 scrollbar-thin">
              {slides.map((slide, idx) => {
                const isActive = idx === currentSlideIndex;
                return (
                  <button
                    key={slide.page}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-full text-left p-2 rounded transition-all flex items-center space-x-2.5 text-xs ${
                      isActive
                        ? 'bg-[#2a303c] border-l-4 border-amber-400 text-white font-semibold shadow-xs'
                        : 'bg-[#18191c]/50 text-slate-300 hover:bg-[#252933] border-l-2 border-transparent'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] shrink-0 font-bold ${
                        isActive
                          ? 'bg-amber-500 text-black'
                          : 'bg-[#2d323d] text-slate-400'
                      }`}
                    >
                      {slide.page}
                    </span>
                    <div className="truncate flex-1">
                      <div className="truncate text-slate-200">{slide.title}</div>
                      <div className="text-[10px] text-slate-500 truncate">{slide.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Slider Navigator Controls */}
            <div className="pt-2 border-t border-[#2d323d] flex items-center justify-between">
              <button
                onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                disabled={currentSlideIndex === 0}
                className="flex items-center space-x-1 px-2.5 py-1 bg-[#18191c] hover:bg-[#252933] disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs text-slate-200 border border-[#374151]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Precedente</span>
              </button>

              <button
                onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                disabled={currentSlideIndex === slides.length - 1}
                className="flex items-center space-x-1 px-2.5 py-1 bg-[#18191c] hover:bg-[#252933] disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs text-slate-200 border border-[#374151]"
              >
                <span>Successiva</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Active Slide Display Canvas (8 Cols) */}
          <div className="col-span-12 lg:col-span-8 bg-[#20232a] border border-[#2d323d] rounded p-4 flex flex-col space-y-4">
            {/* Slide Header */}
            <div className="flex items-start justify-between border-b border-[#2d323d] pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    {currentSlide.badge}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Capitolo {currentSlide.page} di 10
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">
                  {currentSlide.title}
                </h2>
                <p className="text-xs text-slate-400">
                  {currentSlide.subtitle}
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black text-[#facc15]/30 font-mono">
                  {String(currentSlide.page).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Slide Content Sections */}
            <div className="space-y-4 flex-1">
              {currentSlide.sections.map((section, sIdx) => (
                <div key={sIdx} className="bg-[#18191c] border border-[#282d38] rounded p-3">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{section.heading}</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-300 pl-4 list-disc marker:text-amber-500">
                    {section.points.map((pt, pIdx) => (
                      <li key={pIdx} className="leading-relaxed">
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Key Tips / Note Operative */}
              {currentSlide.keyTips.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-600/30 rounded p-3 flex items-start space-x-2.5">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-300 block">
                      Nota Operativa & Best Practice:
                    </span>
                    <ul className="text-xs text-amber-200/90 space-y-1 list-disc pl-3">
                      {currentSlide.keyTips.map((tip, tIdx) => (
                        <li key={tIdx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Slide Footer */}
            <div className="pt-2 border-t border-[#2d323d] flex items-center justify-between text-xs text-slate-400">
              <span className="italic">
                Guida redatta da Rete Ferroviaria Italiana - DOIT Venezia
              </span>
              <div className="flex items-center space-x-1 font-mono text-[11px]">
                <span>Pag.</span>
                <span className="font-bold text-white">{currentSlide.page}</span>
                <span>/ 10</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
