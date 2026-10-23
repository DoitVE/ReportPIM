import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  Trash2,
  FolderOpen,
  Info,
  Layers,
  FileCheck,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Avviso,
  AbbacoItem,
  Iw67Item,
  ControlloAvvisoItem,
  OdlItem,
  PdmV5Item
} from '../types';

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
  counts: {
    pdm: number;
    avvisi: number;
    abbaco: number;
    iw67: number;
    controlli: number;
    odl: number;
  };
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
  counts,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<{ name: string; status: 'ok' | 'err'; message: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'individual' | 'combined'>('individual');

  // Hidden file input refs for individual file pickers
  const inputPdmRef = useRef<HTMLInputElement>(null);
  const inputIw29Ref = useRef<HTMLInputElement>(null);
  const inputIw67Ref = useRef<HTMLInputElement>(null);
  const inputAbbacoRef = useRef<HTMLInputElement>(null);
  const inputIw39Ref = useRef<HTMLInputElement>(null);
  const inputMultiRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Coordinate lookup helper by Sede Tecnica / Linea
  const getCoordinates = (linea: string, sede: string, kmStr?: string): { lat: number; lng: number } => {
    const l = (linea || '').toLowerCase();
    const s = (sede || '').toUpperCase();

    if (s.includes('LO3002') || l.includes('mestre') || l.includes('venezia')) {
      return { lat: 45.485 + Math.random() * 0.02, lng: 12.235 + Math.random() * 0.02 };
    }
    if (s.includes('LO2000') || s.includes('LO0364') || l.includes('padova')) {
      return { lat: 45.415 + Math.random() * 0.02, lng: 11.875 + Math.random() * 0.02 };
    }
    if (s.includes('LO2445') || s.includes('LO0378') || l.includes('bologna') || l.includes('rovigo')) {
      return { lat: 45.075 + Math.random() * 0.04, lng: 11.785 + Math.random() * 0.04 };
    }
    if (s.includes('LO8716') || l.includes('treviso')) {
      return { lat: 45.665 + Math.random() * 0.02, lng: 12.245 + Math.random() * 0.02 };
    }
    if (l.includes('calalzo') || l.includes('belluno')) {
      return { lat: 46.145 + Math.random() * 0.03, lng: 12.215 + Math.random() * 0.03 };
    }
    if (l.includes('udine') || l.includes('trieste') || l.includes('portogruaro')) {
      return { lat: 45.785 + Math.random() * 0.03, lng: 12.835 + Math.random() * 0.03 };
    }
    return { lat: 45.45 + Math.random() * 0.1, lng: 12.05 + Math.random() * 0.2 };
  };

  // Process a single file
  const processFile = async (file: File): Promise<{ name: string; status: 'ok' | 'err'; message: string }> => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rawJson: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      const fileName = file.name.toUpperCase();

      // Find header row in first 10 rows
      let headIdx = 0;
      for (let r = 0; r < Math.min(10, rawJson.length); r++) {
        const rowStr = (rawJson[r] || []).join(' ').toUpperCase();
        if (
          rowStr.includes('AVVISO') ||
          rowStr.includes('PDM') ||
          rowStr.includes('MISURA') ||
          rowStr.includes('PUNTO DI MISURA') ||
          rowStr.includes('CHIAVE RL') ||
          rowStr.includes('ORDINE') ||
          rowStr.includes('TRATTA')
        ) {
          headIdx = r;
          break;
        }
      }

      const headers = (rawJson[headIdx] || []).map((h: any) => String(h || '').trim());
      const headersUpper = headers.map(h => h.toUpperCase());

      // 1. ZSTMAIA / PDM file
      if (
        fileName.includes('ZSTMAIA') ||
        fileName.includes('PDM') ||
        headersUpper.some(h => h.includes('PDM') || h.includes('PUNTO DI MISURA') || h.includes('TOLTO'))
      ) {
        const pdmCol = headersUpper.findIndex(h => h.includes('PDM') || h.includes('PUNTO') || h === 'PUNTO DI MISURA');
        const scopCol = headersUpper.findIndex(h => h.includes('SCOPERTA') || h.includes('SCOP'));
        const creazCol = headersUpper.findIndex(h => h.includes('CREAZ') || h.includes('DATA CR'));
        const toltoCol = headersUpper.findIndex(h => h.includes('TOLTO'));
        const classeCol = headersUpper.findIndex(h => h.includes('CLASSE'));
        const locCol = headersUpper.findIndex(h => h.includes('LOCALIT') || h.includes('TRATTA'));
        const lineaCol = headersUpper.findIndex(h => h.includes('LINEA'));
        const ossCol = headersUpper.findIndex(h => h.includes('OSSERVA') || h.includes('NOTE') || h.includes('DESCRIZIONE'));
        const avvCol = headersUpper.findIndex(h => h.includes('AVVISO'));
        const kmCol = headersUpper.findIndex(h => h.includes('KM'));
        const tipoDifCol = headersUpper.findIndex(h => h.includes('DIFETTO') || h.includes('TIPO'));
        const sedeCol = headersUpper.findIndex(h => h.includes('SEDE TECNICA') || h.includes('SETE'));
        const divCol = headersUpper.findIndex(h => h.includes('DIV'));
        const lvuCol = headersUpper.findIndex(h => h.includes('LVU') || h.includes('UM'));

        const parsedPdm: PdmV5Item[] = [];
        for (let r = headIdx + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || row.length < 2) continue;
          const pdmId = String(row[pdmCol >= 0 ? pdmCol : 0] || '').trim();
          if (!pdmId) continue;

          const linea = String(row[lineaCol >= 0 ? lineaCol : 1] || 'Bologna-Padova').trim();
          const sede = String(row[sedeCol >= 0 ? sedeCol : 2] || 'LO3002-BC-BC42-DEV-I02').trim();
          const coords = getCoordinates(linea, sede);

          const item: PdmV5Item = {
            pdm: pdmId,
            data_creazione: String(row[creazCol >= 0 ? creazCol : 1] || '12/01/2024').trim(),
            data_scoperta: String(row[scopCol >= 0 ? scopCol : 2] || '12/01/2024').trim(),
            tolto_dop: String(row[toltoCol >= 0 ? toltoCol : 3] || 'N').toUpperCase().includes('S') ? 'S' : 'N',
            data_tolto_dop: '',
            classe: String(row[classeCol >= 0 ? classeCol : 4] || 'B').trim(),
            localita_tratta: String(row[locCol >= 0 ? locCol : 5] || 'MESTRE').trim(),
            linea: linea,
            osservazioni: String(row[ossCol >= 0 ? ossCol : 6] || 'Controllo difetto armamento').trim(),
            avviso: String(row[avvCol >= 0 ? avvCol : 7] || '').trim(),
            data_creaz_avviso: '',
            km_linea: String(row[kmCol >= 0 ? kmCol : 8] || '258,190').trim(),
            tipo_difetto: String(row[tipoDifCol >= 0 ? tipoDifCol : 9] || 'US').trim(),
            pos_difetto: 'Fungo',
            esegui_to_da: 'ISPETTORE',
            id_sald: '',
            gara_stato: '',
            cod_stato: '01',
            scadenza: 'SCAD.<30GG',
            sede_tecnica: sede,
            divisione: String(row[divCol >= 0 ? divCol : 10] || 'VEM1').trim(),
            lvu: String(row[lvuCol >= 0 ? lvuCol : 11] || 'LVU1').trim(),
            classificazione_stato: 'Pdm aperto - Avv. aperto',
            lat: coords.lat,
            lng: coords.lng,
          };
          parsedPdm.push(item);
        }

        onUpdatePdm(parsedPdm);
        return { name: file.name, status: 'ok', message: `Caricati con successo ${parsedPdm.length} Punti di Misura da ZSTMAIA.` };
      }

      // 2. IW67 file
      if (fileName.includes('IW67') || headersUpper.some(h => h.includes('MISURA') && h.includes('CODICE'))) {
        const parsed: Iw67Item[] = [];
        for (let r = headIdx + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (row && row.length > 3 && row[0]) {
            const item: any = {};
            headers.forEach((h, idx) => { if (h) item[h] = String(row[idx] || '').trim(); });
            parsed.push(item);
          }
        }
        onUpdateIw67(parsed);
        return { name: file.name, status: 'ok', message: `Caricati con successo ${parsed.length} record IW67 (Misure V3/V4).` };
      }

      // 3. ABBA.CO file
      if (fileName.includes('ABBA') || fileName.includes('RALLENT')) {
        const abbacoItems: AbbacoItem[] = [];
        wb.SheetNames.forEach(sName => {
          const s = wb.Sheets[sName];
          const rows: any[][] = XLSX.utils.sheet_to_json(s, { header: 1 });
          rows.forEach((r, idx) => {
            if (idx > 5 && r && r.length >= 6 && r[5]) {
              abbacoItems.push({
                linea: sName,
                tratta_codice: String(r[0] || ''),
                tratta: String(r[1] || sName),
                binario: String(r[2] || 'P'),
                km_inizio: String(r[3] || ''),
                km_fine: String(r[4] || ''),
                chiave_rl: String(r[5] || ''),
                rid_vel: String(r[6] || '115 Km/h'),
                motivo: String(r[7] || 'Difetto armamento'),
                titolare: String(r[8] || 'LVU1'),
                data_inizio: '01/01/2024',
                data_fine: '30/06/2024'
              });
            }
          });
        });
        onUpdateAbbaco(abbacoItems);
        return { name: file.name, status: 'ok', message: `Caricati ${abbacoItems.length} rallentamenti ABBA.CO.` };
      }

      // 4. IW39 / OdL
      if (fileName.includes('IW39') || fileName.includes('ODL') || headersUpper.some(h => h.includes('ORDINE') && h.includes('COSTO'))) {
        const parsed: OdlItem[] = [];
        for (let r = headIdx + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (row && row.length >= 4 && row[2]) {
            parsed.push({
              centro_lavoro: String(row[0] || 'LVU1').trim(),
              divisione: String(row[1] || 'VEM1').trim(),
              ordine: String(row[2] || '').trim(),
              tipo_ordine: String(row[3] || 'MO01').trim(),
              descrizione: String(row[4] || '').trim(),
              stato_sistema: String(row[5] || 'MECO ORAT').trim(),
              costo_eff: String(row[6] || '0').trim(),
              costo_pian: String(row[7] || '0').trim()
            });
          }
        }
        onUpdateOdl(parsed);
        return { name: file.name, status: 'ok', message: `Caricati ${parsed.length} ordini da transazione IW39.` };
      }

      // 5. IW29 Avvisi SAP
      const avvCol = headersUpper.findIndex(h => h.includes('AVVISO'));
      if (avvCol >= 0 || fileName.includes('IW29')) {
        const parsedAvvisi: Avviso[] = [];
        const parsedControlli: ControlloAvvisoItem[] = [];

        for (let r = headIdx + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || row.length < 2) continue;
          const avvId = String(row[avvCol >= 0 ? avvCol : 0] || '').trim();
          if (avvId && /^\d+$/.test(avvId)) {
            const coords = getCoordinates('Venezia-Mestre', 'LO3002');
            parsedAvvisi.push({
              tipo: 'V5',
              avviso: avvId,
              descrizione: String(row[1] || 'Verifica difetti armamento con U.S.'),
              ordine: String(row[2] || ''),
              sede_tecnica: String(row[3] || 'LO3002-BC-BC42-DEV-I02'),
              nome_sede: 'MESTRE',
              linea: 'Milano-Venezia',
              divisione: 'VEM1',
              lvu: 'LVU1',
              fine_richiesta: String(row[4] || '10/08/2024'),
              inizio_richiesto: String(row[5] || '10/05/2024'),
              stato_sistema: String(row[6] || 'MECO ORAT'),
              stato_utente: '',
              data_creazione: '10/05/2024',
              network: '',
              operazione: '',
              tipo_difetto: 'US',
              stato_scadenza: 'Regolare',
              lat: coords.lat,
              lng: coords.lng
            });

            parsedControlli.push({
              Avviso: avvId,
              Ordine: String(row[2] || ''),
              Descrizione: String(row[1] || ''),
              'Sede tecnica': String(row[3] || 'LO3002'),
              'Data avviso': '10/05/2024',
              'Tipo avviso': 'V5',
              'Centro lavoro resp.': 'LVU1',
              'Fine richiesta': '10/08/2024',
              'Stato sistema': String(row[6] || 'MECO ORAT')
            });
          }
        }

        onUpdateAvvisi(parsedAvvisi);
        onUpdateControlli(parsedControlli);
        return { name: file.name, status: 'ok', message: `Caricati con successo ${parsedAvvisi.length} avvisi da IW29.` };
      }

      throw new Error('Formato non riconosciuto. Assicurati che il file contenga le intestazioni SAP standard.');
    } catch (err: any) {
      return { name: file.name, status: 'err', message: err.message || 'Errore durante la lettura del file.' };
    }
  };

  // Handle multi-file batch upload
  const handleBatchFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    const newLogs: { name: string; status: 'ok' | 'err'; message: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const res = await processFile(files[i]);
      newLogs.push(res);
    }

    setLogs(prev => [...newLogs, ...prev]);
    setLoading(false);
  };

  // Single file picker handler
  const handleSingleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const res = await processFile(file);
    setLogs(prev => [res, ...prev]);
    setLoading(false);
  };

  // Source files metadata list
  const dataSources = [
    {
      id: 'zstmaia',
      name: 'ZSTMAIA (Punti di Misura V5)',
      sapTx: 'ZSTMAIA',
      expectedFile: 'ZSTMAIA_*.xlsx / PdM_*.xlsx',
      feeds: 'Avvisi V5, Dashboard V5, Cerca SeTe, Drill V5',
      count: counts.pdm,
      inputRef: inputPdmRef,
      badgeColor: counts.pdm > 0 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700',
    },
    {
      id: 'iw29',
      name: 'IW29 (Avvisi di Manutenzione SAP)',
      sapTx: 'IW29',
      expectedFile: 'IW29_*.xlsx / Avvisi_*.xlsx',
      feeds: 'Avvisi V5, Monitoraggio Chiusure, Audit, Sede Tecnica',
      count: counts.avvisi,
      inputRef: inputIw29Ref,
      badgeColor: counts.avvisi > 0 ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-slate-800 text-slate-400 border-slate-700',
    },
    {
      id: 'iw67',
      name: 'IW67 (Misure Aperte Geometria)',
      sapTx: 'IW67',
      expectedFile: 'IW67_*.xlsx / Misure_*.xlsx',
      feeds: 'Avvisi V3 V4, Frequenza V3 V4, Drill Frequenza',
      count: counts.iw67,
      inputRef: inputIw67Ref,
      badgeColor: counts.iw67 > 0 ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-slate-800 text-slate-400 border-slate-700',
    },
    {
      id: 'abbaco',
      name: 'ABBA.CO (Rallentamenti Linea)',
      sapTx: 'ABBA.CO',
      expectedFile: 'ABBACO_*.xlsx / Rallentamenti_*.xlsx',
      feeds: 'Abbattimento Codici (chiavi RL, riduzioni velocità)',
      count: counts.abbaco,
      inputRef: inputAbbacoRef,
      badgeColor: counts.abbaco > 0 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700',
    },
    {
      id: 'iw39',
      name: 'IW39 (Ordini di Manutenzione OdL)',
      sapTx: 'IW39',
      expectedFile: 'IW39_*.xlsx / OdL_*.xlsx',
      feeds: 'Chiusura Tecnica con Ordine, Costi consuntivati',
      count: counts.odl,
      inputRef: inputIw39Ref,
      badgeColor: counts.odl > 0 ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' : 'bg-slate-800 text-slate-400 border-slate-700',
    },
  ];

  const totalLoaded = counts.pdm + counts.avvisi + counts.iw67 + counts.abbaco + counts.odl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#1e222b] border border-[#2d323d] rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="bg-[#181a20] px-5 py-3.5 border-b border-[#2d323d] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/15 text-amber-400 rounded-md border border-amber-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Alimenta Web App - Origini Dati SAP & RFI</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-[#2a2f3a] text-amber-400 border border-[#3b4250]">
                  {totalLoaded > 0 ? `${totalLoaded} record attivi` : 'Non alimentata'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Seleziona i file estratti dalle transazioni SAP per popolare le analisi, le mappe e i grafici del report
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
          
          {/* Information & Instructions Banner */}
          <div className="bg-[#242933] border border-[#333a47] rounded-md p-3 flex items-start space-x-3 text-xs">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-300 leading-relaxed">
              <span className="font-bold text-white block">Come funziona l'alimentazione dei dati:</span>
              <span>
                Puoi caricare i file <strong>uno alla volta</strong> selezionando ciascun flusso dal suo pulsante locale "Sfoglia file", oppure <strong>trascinarli tutti insieme</strong> nel box di caricamento multiplo in basso.
              </span>
            </div>
          </div>

          {/* Section 1: Individual File Sources List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>1. File Sorgente Specifici (Caricamento Singolo)</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Aggiorna un singolo file senza sovrascrivere gli altri
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {dataSources.map(src => (
                <div
                  key={src.id}
                  className="bg-[#181a20] border border-[#2d323d] hover:border-[#3b4250] rounded-md p-3 flex flex-col justify-between space-y-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-white">{src.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {src.sapTx}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Alimenta: <span className="text-slate-300">{src.feeds}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        File atteso: {src.expectedFile}
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${src.badgeColor}`}>
                      {src.count > 0 ? `${src.count} rec.` : 'Vuoto'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#232731]">
                    <span className="text-[11px] text-slate-400">
                      {src.count > 0 ? (
                        <span className="text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Dati caricati</span>
                        </span>
                      ) : (
                        <span>Non ancora alimentato</span>
                      )}
                    </span>

                    {/* Dedicated Local File Picker Input & Trigger */}
                    <div>
                      <input
                        type="file"
                        ref={src.inputRef}
                        onChange={handleSingleFile}
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                      />
                      <button
                        onClick={() => src.inputRef.current?.click()}
                        disabled={loading}
                        className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#25282e] hover:bg-[#2f333a] border border-[#3f4553] rounded text-xs font-semibold text-amber-400 transition-colors cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Sfoglia {src.sapTx}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Combined Multi-File Drag & Drop */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Caricamento Complessivo Multi-File (Trascina o Seleziona Tutti)</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Riconoscimento automatico del tipo di file
              </span>
            </div>

            <div
              onClick={() => inputMultiRef.current?.click()}
              className="border-2 border-dashed border-[#374151] hover:border-amber-400/80 rounded-lg p-6 text-center bg-[#181a20]/60 hover:bg-[#181a20] cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group"
            >
              <input
                type="file"
                ref={inputMultiRef}
                onChange={handleBatchFiles}
                accept=".xlsx,.xls,.csv"
                multiple
                className="hidden"
              />
              <div className="p-3 rounded-full bg-[#242933] group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-400 transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  Trascina qui i tuoi file Excel / CSV oppure clicca per selezionare dal PC
                </span>
                <span className="text-[11px] text-slate-400">
                  Puoi selezionare insieme più file (es. ZSTMAIA.xlsx, IW29.xlsx, IW67.xlsx, ABBACO.xlsx)
                </span>
              </div>
            </div>
          </div>

          {/* Processing Logs */}
          {logs.length > 0 && (
            <div className="bg-[#181a20] border border-[#2d323d] rounded p-3 space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                Registro Operazioni di Caricamento:
              </span>
              <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin">
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
                    <span className="font-semibold text-white">{log.name}:</span>
                    <span className="flex-1 truncate">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="bg-[#181a20] px-5 py-3 border-t border-[#2d323d] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Quick Demo & Clear Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onLoadDemoData();
                setLogs([
                  {
                    name: 'Dataset Dimostrativo',
                    status: 'ok',
                    message: 'Caricati dati di test certificati RFI DOIT VE (ZSTMAIA, IW29, IW67, ABBA.CO, OdL).'
                  }
                ]);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#25282e] hover:bg-[#2f333a] border border-[#3f4553] rounded text-xs font-semibold text-amber-300 transition-colors"
              title="Carica un dataset completo di test per provare l'applicazione"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Carica Dati di Esempio (Demo)</span>
            </button>

            <button
              onClick={() => {
                onClearAllData();
                setLogs([
                  {
                    name: 'Reset Dati',
                    status: 'ok',
                    message: 'Tutti i dataset sono stati svuotati. La web app è ora non alimentata.'
                  }
                ]);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-950/30 hover:bg-red-950/60 border border-red-800/50 rounded text-xs font-semibold text-red-300 transition-colors"
              title="Svuota tutti i dati caricati per ripartire da zero"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Azzera Dati (Svuota)</span>
            </button>
          </div>

          {/* Close Button */}
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
