import React, { useState, useMemo } from 'react';
import {
  PdmV5Item,
  Avviso,
  AbbacoItem,
  Iw67Item,
  ControlloAvvisoItem,
  OdlItem,
} from '../../types';
import { RawRegistry } from '../../etl/pipeline';
import {
  Download,
  Copy,
  Check,
  FileJson,
  Database,
  Upload,
  RefreshCw,
  FileText,
  AlertCircle,
  Table,
} from 'lucide-react';
import {
  PbiCanvas,
  PbiBox,
  PbiText,
  PbiButton,
  PBI_COLORS,
  fontSizePx,
} from '../pbi/primitives';

interface PageDataDiagnosticProps {
  rawRegistry: RawRegistry;
  pdmList: PdmV5Item[];
  avvisi: Avviso[];
  abbaco: AbbacoItem[];
  iw67: Iw67Item[];
  controlli: ControlloAvvisoItem[];
  odl: OdlItem[];
  dataAggiornamento: string;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

export interface RawFileSummary {
  kind: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  sampleRows: any[];
  distinctValues?: Record<string, Record<string, number>>;
}

export const PageDataDiagnostic: React.FC<PageDataDiagnosticProps> = ({
  rawRegistry,
  pdmList,
  avvisi,
  abbaco,
  iw67,
  controlli,
  odl,
  dataAggiornamento,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Generate full JSON diagnostic summary object
  const diagnosticJson = useMemo(() => {
    const rawSummaries: Record<string, RawFileSummary> = {};

    // Helper to summarize a matrix (sheet / array of rows)
    const summarizeMatrix = (kind: string, matrix?: any[][]): RawFileSummary => {
      if (!matrix || matrix.length === 0) {
        return { kind, rowCount: 0, columnCount: 0, headers: [], sampleRows: [] };
      }
      const headers = matrix[0]?.map((h) => String(h ?? '')) || [];
      const sampleRows = matrix.slice(0, 8);
      return {
        kind,
        rowCount: matrix.length,
        columnCount: headers.length,
        headers,
        sampleRows,
      };
    };

    if (rawRegistry.zstmaia1_full) rawSummaries['zstmaia1_full'] = summarizeMatrix('zstmaia1_full', rawRegistry.zstmaia1_full);
    if (rawRegistry.zstmaia2_full) rawSummaries['zstmaia2_full'] = summarizeMatrix('zstmaia2_full', rawRegistry.zstmaia2_full);
    if (rawRegistry.zstmaia7_vem1) rawSummaries['zstmaia7_vem1'] = summarizeMatrix('zstmaia7_vem1', rawRegistry.zstmaia7_vem1);
    if (rawRegistry.zstmaia7_vem2) rawSummaries['zstmaia7_vem2'] = summarizeMatrix('zstmaia7_vem2', rawRegistry.zstmaia7_vem2);
    if (rawRegistry.zavvisi_txt) rawSummaries['zavvisi_txt'] = summarizeMatrix('zavvisi_txt', rawRegistry.zavvisi_txt);
    if (rawRegistry.ik07_attivo) rawSummaries['ik07_attivo'] = summarizeMatrix('ik07_attivo', rawRegistry.ik07_attivo);
    if (rawRegistry.ik07_inattivo) rawSummaries['ik07_inattivo'] = summarizeMatrix('ik07_inattivo', rawRegistry.ik07_inattivo);
    if (rawRegistry.gps) rawSummaries['gps'] = summarizeMatrix('gps', rawRegistry.gps);
    if (rawRegistry.ih06) rawSummaries['ih06'] = summarizeMatrix('ih06', rawRegistry.ih06);
    if (rawRegistry.lo_tr) rawSummaries['lo_tr'] = summarizeMatrix('lo_tr', rawRegistry.lo_tr);
    if (rawRegistry.iw67) rawSummaries['iw67'] = summarizeMatrix('iw67', rawRegistry.iw67);
    if (rawRegistry.iw39) rawSummaries['iw39'] = summarizeMatrix('iw39', rawRegistry.iw39);
    if (rawRegistry.caor_ntw) rawSummaries['caor_ntw'] = summarizeMatrix('caor_ntw', rawRegistry.caor_ntw);
    if (rawRegistry.caor_odl) rawSummaries['caor_odl'] = summarizeMatrix('caor_odl', rawRegistry.caor_odl);
    if (rawRegistry.data_ora) rawSummaries['data_ora'] = summarizeMatrix('data_ora', rawRegistry.data_ora);

    if (rawRegistry.iw29_txt_lines) {
      rawSummaries['iw29_full_txt'] = {
        kind: 'iw29_full_txt',
        rowCount: rawRegistry.iw29_txt_lines.length,
        columnCount: 1,
        headers: ['RAW_TEXT_LINES'],
        sampleRows: rawRegistry.iw29_txt_lines.slice(0, 10),
      };
    }

    if (rawRegistry.abbaco_sheets) {
      Object.entries(rawRegistry.abbaco_sheets).forEach(([sheetName, sheetMatrix]) => {
        rawSummaries[`abbaco_sheet_${sheetName}`] = summarizeMatrix(`abbaco_sheet_${sheetName}`, sheetMatrix);
      });
    }

    // Processed datasets distributions
    const getDistribution = (items: any[], keyGetter: (item: any) => string) => {
      const counts: Record<string, number> = {};
      items.forEach((item) => {
        const k = keyGetter(item) || '(vuoto)';
        counts[k] = (counts[k] || 0) + 1;
      });
      return counts;
    };

    return {
      timestamp: new Date().toISOString(),
      dataAggiornamento,
      summary: {
        rawFilesLoaded: Object.keys(rawSummaries).length,
        pdmCount: pdmList.length,
        avvisiCount: avvisi.length,
        iw67Count: iw67.length,
        abbacoCount: abbaco.length,
        controlliCount: controlli.length,
        odlCount: odl.length,
      },
      distributions: {
        pdmByClassification: getDistribution(pdmList, (p) => p.classificazione_stato),
        pdmByExpiration: getDistribution(pdmList, (p) => p.scadenza),
        pdmByYear: getDistribution(pdmList, (p) => String(p.anno ?? '')),
        iw67ByStatoSist: getDistribution(iw67, (i) => i['St.sist.'] || ''),
        iw67ByTipo: getDistribution(iw67, (i) => i['Tp.'] || ''),
      },
      rawFiles: rawSummaries,
      pdmSample: pdmList.slice(0, 5),
      iw67Sample: iw67.slice(0, 5),
      avvisiSample: avvisi.slice(0, 5),
    };
  }, [rawRegistry, pdmList, avvisi, abbaco, iw67, controlli, odl, dataAggiornamento]);

  const jsonString = useMemo(() => JSON.stringify(diagnosticJson, null, 2), [diagnosticJson]);

  const handleDownloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostica_dati_raw_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const totalLoaded = pdmList.length + avvisi.length + iw67.length + abbaco.length + controlli.length + odl.length;

  return (
    <div className="bg-[#181a20] text-slate-100 p-4 h-full overflow-y-auto flex flex-col space-y-4 font-sans select-none">
      {/* Top Header Card */}
      <div className="bg-[#20232a] border border-[#2d323d] rounded-lg p-4 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-lg border border-amber-500/30">
            <FileJson className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Diagnostica Dati Caricati (RAW Summary)</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Resoconto Estrazione SAP
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Genera e scarica il report JSON dei dati grezzi caricati nell'app per consentire l'analisi delle estrazioni reali.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenFileLoader && (
            <button
              onClick={onOpenFileLoader}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Alimenta Dati SAP</span>
            </button>
          )}

          <button
            onClick={handleCopyJson}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#2a2f3a] hover:bg-[#343b48] border border-[#3f4756] rounded text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiato!' : 'Copia JSON'}</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs shadow-md transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Scarica JSON Diagnostica</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#20232a] border border-[#2d323d] rounded-lg p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">File Grezzi Caricati</span>
          <span className="text-2xl font-bold font-mono text-amber-400 mt-0.5 block">
            {Object.keys(diagnosticJson.rawFiles).length}
          </span>
        </div>

        <div className="bg-[#20232a] border border-[#2d323d] rounded-lg p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Record PdM V5</span>
          <span className="text-2xl font-bold font-mono text-red-400 mt-0.5 block">
            {pdmList.length.toLocaleString('it-IT')}
          </span>
        </div>

        <div className="bg-[#20232a] border border-[#2d323d] rounded-lg p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Record IW67 (V3/V4)</span>
          <span className="text-2xl font-bold font-mono text-cyan-400 mt-0.5 block">
            {iw67.length.toLocaleString('it-IT')}
          </span>
        </div>

        <div className="bg-[#20232a] border border-[#2d323d] rounded-lg p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Record ABBA.CO</span>
          <span className="text-2xl font-bold font-mono text-yellow-400 mt-0.5 block">
            {abbaco.length.toLocaleString('it-IT')}
          </span>
        </div>

        <div className="bg-[#20232a] border border-[#2d323d] rounded-lg p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Record Avvisi IW29</span>
          <span className="text-2xl font-bold font-mono text-purple-400 mt-0.5 block">
            {avvisi.length.toLocaleString('it-IT')}
          </span>
        </div>

        <div className="bg-[#20232a] border border-[#2d323d] rounded-lg p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Totale Record Processati</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-0.5 block">
            {totalLoaded.toLocaleString('it-IT')}
          </span>
        </div>
      </div>

      {/* Detailed Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Col: File Summaries */}
        <div className="lg:col-span-5 bg-[#20232a] border border-[#2d323d] rounded-lg p-3.5 space-y-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2d323d] pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Table className="w-4 h-4 text-amber-400" />
              <span>Dettaglio File Grezzi Acquisiti ({Object.keys(diagnosticJson.rawFiles).length})</span>
            </span>
          </div>

          <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 scrollbar-thin">
            {Object.keys(diagnosticJson.rawFiles).length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-2 border border-dashed border-[#374151] rounded-lg">
                <AlertCircle className="w-8 h-8 mx-auto text-amber-400" />
                <div className="text-xs font-bold text-slate-200">Nessun file grezzo caricato nella sessione corrente</div>
                <div className="text-[11px] text-slate-400">
                  Usa il pulsante "Alimenta Dati SAP" in alto per trascinare i tuoi file XLSX o TXT. Potrai quindi scaricare il resoconto completo.
                </div>
                {onLoadDemoData && (
                  <button
                    onClick={onLoadDemoData}
                    className="mt-2 px-3 py-1.5 bg-[#2a2f3a] hover:bg-[#353c4a] text-amber-300 font-semibold rounded text-xs border border-[#3f4756] transition-colors"
                  >
                    Carica Dataset Demo
                  </button>
                )}
              </div>
            ) : (
              Object.entries(diagnosticJson.rawFiles).map(([key, info]) => (
                <div key={key} className="bg-[#181a20] border border-[#2d323d] rounded p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-300 border-b border-[#282d38] pb-1">
                    <span className="font-mono text-xs">{key}</span>
                    <span className="text-[11px] font-mono text-slate-400">{info.rowCount} righe · {info.columnCount} colonne</span>
                  </div>
                  {info.headers.length > 0 && (
                    <div className="text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-nowrap bg-[#121418] p-1.5 rounded">
                      <span className="text-slate-500 font-sans font-bold mr-1">Intestazioni:</span>
                      {info.headers.slice(0, 12).join(' | ')}
                      {info.headers.length > 12 && ` (+${info.headers.length - 12} al.)`}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Live JSON Preview & Distributions */}
        <div className="lg:col-span-7 bg-[#20232a] border border-[#2d323d] rounded-lg p-3.5 space-y-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2d323d] pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FileJson className="w-4 h-4 text-emerald-400" />
              <span>Anteprima JSON Diagnostico (Generato)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {(jsonString.length / 1024).toFixed(1)} KB
            </span>
          </div>

          {/* Code viewer */}
          <div className="flex-1 bg-[#121418] border border-[#282d38] rounded-md p-3 overflow-auto font-mono text-[11px] text-emerald-300 leading-relaxed scrollbar-thin">
            <pre>{jsonString}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
