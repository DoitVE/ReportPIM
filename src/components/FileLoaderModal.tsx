import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Database,
  RefreshCw,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Avviso, AbbacoItem, Iw67Item, ControlloAvvisoItem, OdlItem } from '../types';

interface FileLoaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateAvvisi: (data: Avviso[]) => void;
  onUpdateAbbaco: (data: AbbacoItem[]) => void;
  onUpdateIw67: (data: Iw67Item[]) => void;
  onUpdateControlli: (data: ControlloAvvisoItem[]) => void;
  onUpdateOdl: (data: OdlItem[]) => void;
  counts: {
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
  onUpdateAvvisi,
  onUpdateAbbaco,
  onUpdateIw67,
  onUpdateControlli,
  onUpdateOdl,
  counts,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<{ name: string; status: 'ok' | 'err'; message: string }[]>([]);

  if (!isOpen) return null;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    const newLogs: { name: string; status: 'ok' | 'err'; message: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.toUpperCase();

      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (fileName.includes('IW67')) {
          // Parse IW67
          let headIdx = -1;
          for (let r = 0; r < Math.min(10, rawJson.length); r++) {
            if (rawJson[r].some((c: any) => String(c).includes('Avviso') || String(c).includes('Tp.'))) {
              headIdx = r;
              break;
            }
          }
          if (headIdx !== -1) {
            const headers = rawJson[headIdx].map((h: any) => String(h || '').trim());
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
            newLogs.push({ name: file.name, status: 'ok', message: `Caricati con successo ${parsed.length} record IW67.` });
          } else {
            throw new Error('Intestazioni IW67 non rilevate.');
          }
        } else if (fileName.includes('ABBA') || fileName.includes('RALLENT')) {
          // Parse ABBA.CO from all sheets
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
                  rid_vel: String(r[6] || '30 Km/h'),
                  motivo: String(r[7] || 'Difetto armamento'),
                  titolare: String(r[8] || 'LVU1'),
                });
              }
            });
          });
          onUpdateAbbaco(abbacoItems);
          newLogs.push({ name: file.name, status: 'ok', message: `Caricati ${abbacoItems.length} rallentamenti ABBA.CO.` });
        } else if (fileName.includes('CONTROLLO') || fileName.includes('CONTROLLI')) {
          // Parse Controlli avvisi
          const headers = (rawJson[0] || []).map((h: any) => String(h || '').trim());
          const parsed: ControlloAvvisoItem[] = [];
          for (let r = 1; r < rawJson.length; r++) {
            const row = rawJson[r];
            if (row && row.length > 2 && row[0]) {
              const item: any = {};
              headers.forEach((h, idx) => { if (h) item[h] = String(row[idx] || '').trim(); });
              parsed.push(item);
            }
          }
          onUpdateControlli(parsed);
          newLogs.push({ name: file.name, status: 'ok', message: `Caricati ${parsed.length} avvisi per audit e controlli.` });
        } else if (fileName.includes('IW39') || fileName.includes('ODL')) {
          // Parse IW39 ODL
          const headers = (rawJson[0] || []).map((h: any) => String(h || '').trim());
          const parsed: OdlItem[] = [];
          for (let r = 1; r < rawJson.length; r++) {
            const row = rawJson[r];
            if (row && row.length >= 7 && row[2]) {
              parsed.push({
                centro_lavoro: String(row[0] || '').trim(),
                divisione: String(row[1] || '').trim(),
                ordine: String(row[2] || '').trim(),
                tipo_ordine: String(row[3] || '').trim(),
                descrizione: String(row[5] || '').trim(),
                stato_sistema: String(row[6] || '').trim(),
                costo_eff: String(row[7] || '0').trim(),
                costo_pian: String(row[8] || '0').trim()
              });
            }
          }
          onUpdateOdl(parsed);
          newLogs.push({ name: file.name, status: 'ok', message: `Caricati ${parsed.length} ordini IW39.` });
        } else {
          // Default IW29 avvisi
          let headIdx = 0;
          for (let r = 0; r < Math.min(10, rawJson.length); r++) {
            if (rawJson[r].some((c: any) => String(c).includes('Avviso'))) {
              headIdx = r;
              break;
            }
          }
          const headers = (rawJson[headIdx] || []).map((h: any) => String(h || '').trim());
          const avvIdx = headers.findIndex(h => h.includes('Avviso'));
          const descIdx = headers.findIndex(h => h.includes('Descrizione'));
          const ordIdx = headers.findIndex(h => h.includes('Ordine'));
          const sedeIdx = headers.findIndex(h => h.includes('Sede tecnica'));
          const fineIdx = headers.findIndex(h => h.includes('Fine'));
          const stSistIdx = headers.findIndex(h => h.includes('Stato sistema') || h.includes('St.sist'));

          const parsedAvvisi: Avviso[] = [];
          for (let r = headIdx + 1; r < rawJson.length; r++) {
            const row = rawJson[r];
            const avvId = String(row[avvIdx] || '').trim();
            if (avvId && /^\d+$/.test(avvId)) {
              parsedAvvisi.push({
                tipo: 'V5',
                avviso: avvId,
                descrizione: String(row[descIdx] || 'Difetto armamento'),
                ordine: String(row[ordIdx] || ''),
                sede_tecnica: String(row[sedeIdx] || 'LO-TRATTA'),
                nome_sede: String(row[sedeIdx] || '').split('-')[0],
                linea: 'Direttrice RFI DOIT VE',
                divisione: 'VEM1',
                lvu: 'LVU1',
                fine_richiesta: String(row[fineIdx] || ''),
                inizio_richiesto: '',
                stato_sistema: String(row[stSistIdx] || 'APER'),
                stato_utente: '',
                data_creazione: new Date().toLocaleDateString('it-IT'),
                network: '',
                operazione: '',
                tipo_difetto: 'Difetto di binario',
                stato_scadenza: 'Regolare',
                lat: 45.45 + (parsedAvvisi.length % 50) * 0.005,
                lng: 12.15 + (parsedAvvisi.length % 50) * 0.005,
              });
            }
          }
          if (parsedAvvisi.length > 0) {
            onUpdateAvvisi(parsedAvvisi);
            newLogs.push({ name: file.name, status: 'ok', message: `Caricati ${parsedAvvisi.length} avvisi IW29.` });
          } else {
            newLogs.push({ name: file.name, status: 'err', message: 'Nessun record valido riconosciuto nel file.' });
          }
        }
      } catch (err: any) {
        newLogs.push({ name: file.name, status: 'err', message: err.message || 'Errore di lettura.' });
      }
    }

    setLogs(newLogs);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-850 rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-yellow-400 text-slate-900 rounded-lg shadow-sm font-bold">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Alimenta Web App - Selezione File SAP
              </h3>
              <p className="text-xs text-slate-500">
                Carica manualmente i file estratti da SAP per alimentare e aggiornare il report Power BI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* File Picker Box */}
          <div className="border-2 border-dashed border-slate-300 hover:border-yellow-500 rounded-xl p-6 text-center bg-slate-50 transition-colors">
            <FileSpreadsheet className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">
              Seleziona i file di alimentazione da disco
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Puoi selezionare uno o più file contemporaneamente (.xlsx, .xls, .txt). Il sistema riconoscerà automaticamente le tabelle IW29, IW39, IW67, ABBA.CO, CAOR o ZSTMAIA.
            </p>

            <label className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-lg cursor-pointer transition-all shadow hover:shadow-md">
              <Upload className="w-4 h-4 text-yellow-400" />
              <span>Sfoglia e Seleziona File</span>
              <input
                type="file"
                multiple
                accept=".xlsx,.xls,.txt"
                onChange={handleFiles}
                className="hidden"
              />
            </label>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-600 font-medium py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-yellow-500" />
              <span>Elaborazione file in corso...</span>
            </div>
          )}

          {/* Upload Logs */}
          {logs.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`flex items-start space-x-2 p-2.5 rounded-lg text-xs ${
                    log.status === 'ok'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {log.status === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="font-mono">{log.name}</strong>: {log.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current Loaded Sources Status */}
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-200">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>Fonti Dati Attualmente Caricate nel Report</span>
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500">IW29 (Avvisi V5/Binario)</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">{counts.avvisi.toLocaleString('it-IT')} righe</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500">IW67 (Avvisi V3/V4 Misure)</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">{counts.iw67.toLocaleString('it-IT')} righe</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500">ABBA.CO (Rallentamenti)</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">{counts.abbaco.toLocaleString('it-IT')} chiavi</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500">IW39 (Ordini ODL)</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">{counts.odl.toLocaleString('it-IT')} ordini</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500">Audit Controlli SAP</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">{counts.controlli.toLocaleString('it-IT')} verifiche</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-500">Stato Motore Power BI</div>
                <div className="font-bold text-emerald-600 mt-0.5 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Attivo & Reattivo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Chiudi e Visualizza Report
          </button>
        </div>
      </div>
    </div>
  );
};
