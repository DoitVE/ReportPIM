import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  Trash2,
  Loader2,
  Info,
  Layers,
  CircleDashed,
} from 'lucide-react';
import {
  Avviso,
  AbbacoItem,
  Iw67Item,
  ControlloAvvisoItem,
  OdlItem,
  PdmV5Item,
} from '../types';
import { RawRegistry, SourceKind, registerFile, buildAll } from '../etl/pipeline';

interface FileLoaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdatePdm: (data: PdmV5Item[]) => void;
  onUpdateAvvisi: (data: Avviso[]) => void;
  onUpdateAbbaco: (data: AbbacoItem[]) => void;
  onUpdateIw67: (data: Iw67Item[]) => void;
  onUpdateControlli: (data: ControlloAvvisoItem[]) => void;
  onUpdateOdl: (data: OdlItem[]) => void;
  onLoadDemoData: () => void;
  onClearAllData: () => void;
  onUpdateDataAggiornamento?: (value: string) => void;
  onUpdateRawRegistry?: (registry: RawRegistry) => void;
  counts: {
    pdm: number;
    avvisi: number;
    abbaco: number;
    iw67: number;
    controlli: number;
    odl: number;
  };
}

interface LogEntry {
  name: string;
  status: 'ok' | 'err';
  message: string;
}

interface SourceDef {
  kind: SourceKind;
  label: string;
  fileName: string;
  feeds: string;
}

interface SourceGroup {
  title: string;
  sources: SourceDef[];
}

/**
 * Catalogo delle origini dati reali del report, allineato 1:1 con i codici M
 * in LEGACY/Codice M. Il riconoscimento dei file avviene sul nome, così come
 * i percorsi hard-coded nelle query M.
 */
const SOURCE_GROUPS: SourceGroup[] = [
  {
    title: 'Punti di Misura (PdM)',
    sources: [
      { kind: 'zstmaia1_full', label: 'ZSTMAIA1_full', fileName: 'ZSTMAIA1_full.xlsx', feeds: 'PdM V5, Drill V5' },
      { kind: 'zstmaia2_full', label: 'ZSTMAIA2_full', fileName: 'ZSTMAIA2_full.xlsx', feeds: 'Dettaglio PdM (saldature)' },
      { kind: 'zstmaia7_vem1', label: 'ZSTMAIA7_full VEM1', fileName: 'ZSTMAIA7_full_VEM1.xlsx', feeds: 'Avvisi PdM VEM1' },
      { kind: 'zstmaia7_vem2', label: 'ZSTMAIA7_full VEM2', fileName: 'ZSTMAIA7_full_VEM2.xlsx', feeds: 'Avvisi PdM VEM2' },
    ],
  },
  {
    title: 'Avvisi',
    sources: [
      { kind: 'iw29_full', label: 'IW29_full (TXT TAB)', fileName: 'IW29_full.txt', feeds: 'Avvisi V5, Scadenze, Controlli' },
      { kind: 'zavvisi_txt', label: 'ZAVVISI_TXT', fileName: 'ZAVVISI_TXT.xlsx', feeds: 'Testo esteso avvisi' },
    ],
  },
  {
    title: 'Anagrafiche e Geometria',
    sources: [
      { kind: 'ik07_attivo', label: 'IK07_attivo', fileName: 'IK07_attivo.xlsx', feeds: 'Anagrafica punti di misura' },
      { kind: 'ik07_inattivo', label: 'IK07_inattivo', fileName: 'IK07_inattivo.xlsx', feeds: 'Punti di misura dismessi' },
      { kind: 'gps', label: 'GPS', fileName: 'GPS.xlsx', feeds: 'Coordinate sedi tecniche' },
      { kind: 'ih06', label: 'IH06', fileName: 'IH06.xlsx', feeds: 'Anagrafica sedi tecniche' },
      { kind: 'lo_tr', label: 'LO-TR', fileName: 'LO-TR.xlsx', feeds: 'Linee, tratte e LVU' },
    ],
  },
  {
    title: 'Misure V3/V4 e Rallentamenti',
    sources: [
      { kind: 'iw67', label: 'IW67', fileName: 'IW67.xlsx', feeds: 'Avvisi e Frequenza V3/V4' },
      { kind: 'iw39', label: 'IW39_STATO_ODL', fileName: 'IW39_STATO_ODL.xlsx', feeds: 'Ordini di manutenzione' },
      { kind: 'caor_ntw', label: 'CAOR_NTW', fileName: 'CAOR_NTW.xlsx', feeds: 'Consuntivazione Network' },
      { kind: 'caor_odl', label: 'CAOR_ODL', fileName: 'CAOR_ODL.xlsx', feeds: 'Consuntivazione OdL' },
      { kind: 'data_ora', label: 'DATA_ORA', fileName: 'DATA_ORA.xlsx', feeds: 'Data/ora di scarico dati' },
      { kind: 'abbaco', label: 'ABBACO (multi-foglio)', fileName: 'ABBA.CO.AGGIORNATO-RPC.xlsx', feeds: 'Abbattimento codici / rallentamenti' },
    ],
  },
];

/** Verifica se una sorgente è già stata caricata nel registry. */
function isLoaded(reg: RawRegistry, kind: SourceKind): boolean {
  switch (kind) {
    case 'iw29_full':
      return !!reg.iw29_txt_lines && reg.iw29_txt_lines.length > 0;
    case 'abbaco':
      return !!reg.abbaco_sheets;
    default:
      return reg[kind] !== undefined;
  }
}

export const FileLoaderModal: React.FC<FileLoaderModalProps> = ({
  isOpen,
  onClose,
  onUpdatePdm,
  onUpdateAvvisi,
  onUpdateAbbaco,
  onUpdateIw67,
  onUpdateControlli,
  onUpdateOdl,
  onLoadDemoData,
  onClearAllData,
  onUpdateDataAggiornamento,
  onUpdateRawRegistry,
  counts,
}) => {
  // Registry persistente: permette di caricare i file uno alla volta.
  const registryRef = useRef<RawRegistry>({});
  // Contatore usato solo per forzare il re-render della checklist origini.
  const [registryVersion, setRegistryVersion] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const registry = registryRef.current;

  // Ricostruisce tutti i dataset con l'ETL fedele ai codici M e li propaga all'app.
  const rebuild = (newLogs: LogEntry[]) => {
    try {
      if (onUpdateRawRegistry) {
        onUpdateRawRegistry({ ...registry });
      }
      const out = buildAll(registry);
      onUpdatePdm(out.app.pdm);
      onUpdateAvvisi(out.app.avvisi);
      onUpdateAbbaco(out.app.abbaco);
      onUpdateIw67(out.app.iw67);
      onUpdateControlli(out.app.controlli);
      onUpdateOdl(out.app.odl);
      if (onUpdateDataAggiornamento && out.dataAggiornamento) {
        onUpdateDataAggiornamento(out.dataAggiornamento);
      }
      newLogs.push({
        name: 'ETL',
        status: 'ok',
        message: `Query master: ${out.master.length} righe → PdM ${out.app.pdm.length}, Avvisi ${out.app.avvisi.length}, IW67 ${out.app.iw67.length}, Rallentamenti ${out.app.abbaco.length}, OdL ${out.app.odl.length}.`,
      });
    } catch (err) {
      newLogs.push({
        name: 'ETL',
        status: 'err',
        message: err instanceof Error ? err.message : 'Errore durante la costruzione della query master.',
      });
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setLoading(true);

    const newLogs: LogEntry[] = [];
    for (const file of Array.from(fileList)) {
      try {
        const kind = await registerFile(file, registry);
        if (!kind) {
          newLogs.push({
            name: file.name,
            status: 'err',
            message: 'Origine non riconosciuta: il nome del file non corrisponde a nessuna query M.',
          });
        } else {
          newLogs.push({ name: file.name, status: 'ok', message: `Riconosciuto come origine "${kind}".` });
        }
      } catch (err) {
        newLogs.push({
          name: file.name,
          status: 'err',
          message: err instanceof Error ? err.message : 'Errore durante la lettura del file.',
        });
      }
    }

    rebuild(newLogs);
    setLogs((prev) => [...newLogs, ...prev]);
    setRegistryVersion((v) => v + 1);
    setLoading(false);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    void handleFiles(e.dataTransfer.files);
  };

  const handleReset = () => {
    registryRef.current = {};
    if (onUpdateRawRegistry) onUpdateRawRegistry({});
    onClearAllData();
    setRegistryVersion((v) => v + 1);
    setLogs([
      { name: 'Reset', status: 'ok', message: 'Registry origini svuotato e dataset azzerati.' },
    ]);
  };

  const handleDemo = () => {
    onLoadDemoData();
    setLogs([
      {
        name: 'Dataset dimostrativo',
        status: 'ok',
        message: 'Caricato il dataset di test pre-estratto (ZSTMAIA, IW29, IW67, ABBA.CO, OdL).',
      },
    ]);
  };

  const loadedCount = SOURCE_GROUPS.reduce(
    (acc, g) => acc + g.sources.filter((s) => isLoaded(registry, s.kind)).length,
    0
  );
  const totalSources = SOURCE_GROUPS.reduce((acc, g) => acc + g.sources.length, 0);
  const totalLoaded = counts.pdm + counts.avvisi + counts.iw67 + counts.abbaco + counts.odl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#1e222b] border border-[#2d323d] rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">

        {/* Header */}
        <div className="bg-[#181a20] px-5 py-3.5 border-b border-[#2d323d] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/15 text-amber-400 rounded-md border border-amber-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Alimenta Web App - Origini Dati SAP &amp; RFI</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-[#2a2f3a] text-amber-400 border border-[#3b4250]">
                  {loadedCount}/{totalSources} origini · {totalLoaded} record
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                I file vengono processati con la stessa logica Power Query M del report originale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#2a2f3a] rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">

          {/* Info */}
          <div className="bg-[#242933] border border-[#333a47] rounded-md p-3 flex items-start space-x-3 text-xs">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-300 leading-relaxed">
              <span className="font-bold text-white block">Come funziona l'alimentazione dei dati:</span>
              <span>
                Seleziona o trascina i file estratti dalle transazioni SAP. Ogni file viene riconosciuto dal nome
                (non dal contenuto) e collegato all'origine corrispondente. Puoi caricarli anche uno alla volta: le
                origini già acquisite restano in memoria.
              </span>
            </div>
          </div>

          {/* Upload area */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group ${
              isDragOver
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-[#374151] hover:border-amber-400/80 bg-[#181a20]/60 hover:bg-[#181a20]'
            }`}
          >
            <input
              type="file"
              ref={inputRef}
              onChange={onInputChange}
              accept=".xlsx,.xls,.txt,.csv"
              multiple
              className="hidden"
            />
            <div className="p-3 rounded-full bg-[#242933] group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-400 transition-colors">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {loading ? 'Elaborazione dei file in corso…' : 'Trascina qui i file oppure clicca per selezionarli'}
              </span>
              <span className="text-[11px] text-slate-400">
                Puoi selezionarli tutti insieme (es. ZSTMAIA1_full.xlsx, IW29_full.txt, IW67.xlsx, ABBACO.xlsx)
              </span>
            </div>
          </div>

          {/* Origini previste */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Origini dati del report</span>
              </span>
              <span className="text-[11px] text-slate-400">{loadedCount}/{totalSources} caricate</span>
            </div>

            {SOURCE_GROUPS.map((group) => (
              <div key={group.title} className="bg-[#181a20] border border-[#2d323d] rounded-md p-3">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  {group.title}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {group.sources.map((src) => {
                    const loaded = isLoaded(registry, src.kind);
                    return (
                      <div
                        key={src.kind}
                        className={`flex items-start justify-between gap-2 rounded border px-2.5 py-1.5 ${
                          loaded
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-[#2d323d] bg-[#1b1d23]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            {loaded ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                            ) : (
                              <CircleDashed className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                            )}
                            <span className="text-[11px] font-semibold text-white truncate">{src.label}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                            {src.fileName} · {src.feeds}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold border shrink-0 ${
                            loaded
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {loaded ? 'OK' : 'Vuoto'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Log */}
          {logs.length > 0 && (
            <div className="bg-[#181a20] border border-[#2d323d] rounded p-3 space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                Registro operazioni:
              </span>
              <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`text-xs px-2.5 py-1 rounded flex items-center space-x-2 ${
                      log.status === 'ok'
                        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                        : 'bg-red-950/40 text-red-300 border border-red-800/40'
                    }`}
                  >
                    {log.status === 'ok' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    )}
                    <span className="font-semibold text-white shrink-0">{log.name}:</span>
                    <span className="flex-1 truncate">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#181a20] px-5 py-3 border-t border-[#2d323d] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDemo}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#25282e] hover:bg-[#2f333a] border border-[#3f4553] rounded text-xs font-semibold text-amber-300 transition-colors"
              title="Carica un dataset completo di test per provare l'applicazione"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Carica Dati di Esempio (Demo)</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-950/30 hover:bg-red-950/60 border border-red-800/50 rounded text-xs font-semibold text-red-300 transition-colors"
              title="Svuota il registry origini e azzera tutti i dataset"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Azzera Dati</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors shadow-md cursor-pointer"
          >
            Fatto / Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
