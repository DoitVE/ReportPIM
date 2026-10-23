import React, { useMemo } from 'react';
import { FrequenzaRow } from './PageFrequenzaV3V4';
import { Iw67Item } from '../../types';
import { ArrowLeft } from 'lucide-react';

interface PageDrillFrequenzaV3V4Props {
  selectedRow?: FrequenzaRow;
  iw67: Iw67Item[];
  dataAggiornamento: string;
  onBack: () => void;
}

export const PageDrillFrequenzaV3V4: React.FC<PageDrillFrequenzaV3V4Props> = ({
  selectedRow: propRow,
  iw67,
  dataAggiornamento,
  onBack,
}) => {
  // Default fallback if navigated without selection
  const selectedRow: FrequenzaRow = propRow || {
    id: 'freq_1',
    linea: 'Milano-Venezia',
    setePrimoLivello: 'LO3002',
    localita: 'VENEZIA MESTRE',
    sete: 'LO3002-BC-BC23',
    definizione: 'Binario Dispari VE.MESTRE (Milano AV/AC)',
    bin: 'DISPARI',
    kmRif: 258,
    conteggio: 264,
    um: 'LVU1',
    lat: 45.4821,
    lng: 12.2321
  };

  // Measures matching Screenshot 8 & 6
  const measures = useMemo(() => {
    return [
      {
        avviso: '70163326',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '28,346',
        kmFine: '28,348',
        valDifetto: '10,30',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804086)',
        dataEsecuzione: '11/11/2023',
        dataFineRichiesta: '16/08/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163326',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '28,570',
        kmFine: '28,584',
        valDifetto: '10,80',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804086)',
        dataEsecuzione: '11/11/2023',
        dataFineRichiesta: '16/08/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163326',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '28,677',
        kmFine: '28,690',
        valDifetto: '11,80',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804086)',
        dataEsecuzione: '31/10/2024',
        dataFineRichiesta: '16/08/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163326',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'XL2',
        kmInizio: '28,636',
        kmFine: '28,638',
        valDifetto: '10,40',
        testo: 'Scarto Liv.Trasv -interv.',
        descrizione: 'Manutenzione armamento (DdM10804086)',
        dataEsecuzione: '20/11/2023',
        dataFineRichiesta: '16/08/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163326',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'XL2',
        kmInizio: '28,652',
        kmFine: '28,655',
        valDifetto: '10,20',
        testo: 'Scarto Liv.Trasv -interv.',
        descrizione: 'Manutenzione armamento (DdM10804086)',
        dataEsecuzione: '31/10/2024',
        dataFineRichiesta: '16/08/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163327',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '30,614',
        kmFine: '30,618',
        valDifetto: '10,50',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804087)',
        dataEsecuzione: '11/01/2024',
        dataFineRichiesta: '16/08/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163327',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '32,719',
        kmFine: '32,746',
        valDifetto: '11,50',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804087)',
        dataEsecuzione: '21/06/2023',
        dataFineRichiesta: '16/08/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163327',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '34,492',
        kmFine: '34,496',
        valDifetto: '14,90',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804087)',
        dataEsecuzione: '11/01/2024',
        dataFineRichiesta: '16/08/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163444',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '4,796',
        kmFine: '4,804',
        valDifetto: '10,50',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804520)',
        dataEsecuzione: '03/02/2024',
        dataFineRichiesta: '01/09/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163444',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '4,879',
        kmFine: '4,888',
        valDifetto: '11,65',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804520)',
        dataEsecuzione: '03/02/2024',
        dataFineRichiesta: '01/09/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163444',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '4,890',
        kmFine: '4,898',
        valDifetto: '10,40',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804520)',
        dataEsecuzione: '20/11/2023',
        dataFineRichiesta: '01/09/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163444',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '4,901',
        kmFine: '4,910',
        valDifetto: '12,50',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804520)',
        dataEsecuzione: '05/03/2024',
        dataFineRichiesta: '01/09/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163444',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '5,446',
        kmFine: '5,458',
        valDifetto: '14,20',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804520)',
        dataEsecuzione: '03/02/2024',
        dataFineRichiesta: '01/09/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163444',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '5,531',
        kmFine: '5,544',
        valDifetto: '16,70',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804520)',
        dataEsecuzione: '03/02/2024',
        dataFineRichiesta: '01/09/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163444',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '5,540',
        kmFine: '5,552',
        valDifetto: '14,00',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804520)',
        dataEsecuzione: '20/11/2023',
        dataFineRichiesta: '01/09/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163444',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '5,550',
        kmFine: '5,563',
        valDifetto: '16,30',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804520)',
        dataEsecuzione: '03/02/2024',
        dataFineRichiesta: '01/09/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163444',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'L2',
        kmInizio: '5,633',
        kmFine: '5,699',
        valDifetto: '15,60',
        testo: 'Liv. Long. - intervento',
        descrizione: 'Manutenzione armamento (DdM10804520)',
        dataEsecuzione: '09/06/2023',
        dataFineRichiesta: '01/09/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '70163444',
        dataAvviso: '01/02/2022',
        tipo: 'V3',
        codiceMisura: 'XL2',
        kmInizio: '5,680',
        kmFine: '5,699',
        valDifetto: '10,20',
        testo: 'Scarto Liv.Trasv -interv.',
        descrizione: 'Manutenzione armamento (DdM10804520)',
        dataEsecuzione: '09/06/2023',
        dataFineRichiesta: '01/09/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '80133955',
        dataAvviso: '01/02/2022',
        tipo: 'V4',
        codiceMisura: 'S2',
        kmInizio: '11,624',
        kmFine: '11,628',
        valDifetto: '1.429,80',
        testo: 'Scartamento - interv.',
        descrizione: 'Avviso per difetti non connessi',
        dataEsecuzione: '18/04/2023',
        dataFineRichiesta: '14/01/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '80133955',
        dataAvviso: '01/02/2022',
        tipo: 'V4',
        codiceMisura: 'S2',
        kmInizio: '11,670',
        kmFine: '11,673',
        valDifetto: '1.429,70',
        testo: 'Scartamento - interv.',
        descrizione: 'Avviso per difetti non connessi',
        dataEsecuzione: '18/07/2023',
        dataFineRichiesta: '14/01/2024',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '80134080',
        dataAvviso: '01/02/2022',
        tipo: 'V4',
        codiceMisura: 'S2',
        kmInizio: '1,274',
        kmFine: '1,292',
        valDifetto: '1.455,10',
        testo: 'Scartamento - interv.',
        descrizione: 'Avviso per difetti non connessi',
        dataEsecuzione: '12/06/2023',
        dataFineRichiesta: '05/09/2023',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      },
      {
        avviso: '80134080',
        dataAvviso: '01/02/2022',
        tipo: 'V4',
        codiceMisura: 'S2',
        kmInizio: '3,044',
        kmFine: '3,066',
        valDifetto: '1.429,20',
        testo: 'Scartamento - interv.',
        descrizione: 'Avviso per difetti non connessi',
        dataEsecuzione: '12/06/2023',
        dataFineRichiesta: '05/09/2023',
        statoSist: 'MISC',
        stato: 'CHIUSO'
      }
    ];
  }, []);

  return (
    <div className="bg-[#18191c] text-[#e2e8f0] min-h-screen p-3 flex flex-col space-y-3 font-sans">
      {/* Top Banner Row */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#2d3139] pb-2">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-[#25282e] hover:bg-[#323640] border border-[#3f4553] flex items-center justify-center cursor-pointer transition-colors shadow-sm"
            title="Torna alla pagina precedente"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="h-9 px-2 bg-white rounded flex items-center justify-center">
            <span className="text-[#008542] font-black tracking-tighter text-base">RFI</span>
            <span className="text-[#dc2626] font-bold text-[10px] ml-1 uppercase">FS</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-[#e11d48] tracking-tight">
              Difetti di livello e scartamento - DOIT VE
            </h1>
            <div className="flex items-center space-x-4 text-xs">
              <span className="text-white font-bold text-sm">Drill frequenza V3 V4</span>
              <span className="text-[#94a3b8]">Dati al: <strong className="text-white font-mono">{dataAggiornamento}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Cards Row: Selected Frequency Segment Details (matches Screenshot 8) */}
      <div className="bg-[#202227] p-3 rounded border border-[#2e323b] space-y-2">
        <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
          Riga selezionata nella pagina precedente 'Frequenza V3 V4'
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-12 gap-2 text-xs">
          <div className="col-span-12 sm:col-span-3 bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Linea InRete</span>
            <span className="font-bold text-white text-sm">{selectedRow.linea}</span>
          </div>
          <div className="col-span-12 sm:col-span-3 bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">SeTe primo livello</span>
            <span className="font-mono font-bold text-amber-300 text-sm">{selectedRow.setePrimoLivello}</span>
          </div>
          <div className="col-span-12 sm:col-span-4 bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Località/Tratta</span>
            <span className="font-bold text-white text-sm">{selectedRow.localita}</span>
          </div>
          <div className="col-span-12 sm:col-span-2 bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">U.M.</span>
            <span className="font-bold text-cyan-300 text-sm">{selectedRow.um}</span>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-12 gap-2 text-xs">
          <div className="col-span-12 sm:col-span-3 bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Sede tecnica</span>
            <span className="font-mono text-white text-xs">{selectedRow.sete}</span>
          </div>
          <div className="col-span-12 sm:col-span-4 bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Definizione della sede tecnica</span>
            <span className="font-semibold text-white text-xs truncate block">{selectedRow.definizione}</span>
          </div>
          <div className="col-span-12 sm:col-span-1 bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Bin.</span>
            <span className="font-mono font-bold text-white text-xs">{selectedRow.bin}</span>
          </div>
          <div className="col-span-12 sm:col-span-2 bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Km. rif.</span>
            <span className="font-mono font-bold text-white text-xs">{selectedRow.kmRif}</span>
          </div>
          <div className="col-span-12 sm:col-span-2 bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Conteggio di Val. difetto</span>
            <span className="font-mono font-black text-lime-400 text-base">{selectedRow.conteggio}</span>
          </div>
        </div>
      </div>

      {/* Bottom Table: Dettaglio delle misure conteggiate (matches Screenshot 8) */}
      <div className="bg-[#202227] rounded border border-[#2e323b] overflow-hidden flex flex-col flex-1">
        <div className="px-3 py-1.5 bg-[#18191c] border-b border-[#2e323b] flex items-center justify-between text-xs">
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Dettaglio delle misure conteggiate ({measures.length} record)
          </span>
          <span className="text-[11px] text-[#94a3b8]">
            Misure rilevate nel binario {selectedRow.bin} al km {selectedRow.kmRif}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141518] sticky top-0 border-b border-[#2e323b] text-[#94a3b8] text-[10.5px] uppercase font-semibold">
              <tr>
                <th className="py-2 px-2">Avviso</th>
                <th className="py-2 px-2">Data Avviso</th>
                <th className="py-2 px-2">Tipo</th>
                <th className="py-2 px-2">Codice Misura</th>
                <th className="py-2 px-2">Km inizio</th>
                <th className="py-2 px-2">Km fine</th>
                <th className="py-2 px-2">Val. difetto</th>
                <th className="py-2 px-2">Testo</th>
                <th className="py-2 px-2">Descrizione</th>
                <th className="py-2 px-2">Data Esecuzione</th>
                <th className="py-2 px-2">Data Fine Richiesta</th>
                <th className="py-2 px-2">Stato sist.</th>
                <th className="py-2 px-2">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#282b34] text-[11.5px] text-[#cbd5e1]">
              {measures.map((m, idx) => (
                <tr key={`${m.avviso}_${idx}`} className="hover:bg-[#252830] transition-colors">
                  <td className="py-1.5 px-2 font-mono font-bold text-cyan-300">{m.avviso}</td>
                  <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{m.dataAvviso}</td>
                  <td className="py-1.5 px-2 font-bold text-white">{m.tipo}</td>
                  <td className="py-1.5 px-2 font-mono font-bold text-amber-300">{m.codiceMisura}</td>
                  <td className="py-1.5 px-2 font-mono">{m.kmInizio}</td>
                  <td className="py-1.5 px-2 font-mono">{m.kmFine}</td>
                  <td className="py-1.5 px-2 font-mono font-bold text-white">{m.valDifetto}</td>
                  <td className="py-1.5 px-2 text-[#cbd5e1] truncate max-w-[170px]" title={m.testo}>
                    {m.testo}
                  </td>
                  <td className="py-1.5 px-2 text-[#94a3b8] truncate max-w-[240px]" title={m.descrizione}>
                    {m.descrizione}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{m.dataEsecuzione}</td>
                  <td className="py-1.5 px-2 font-mono text-[#94a3b8]">{m.dataFineRichiesta}</td>
                  <td className="py-1.5 px-2 font-mono text-emerald-400 font-bold">{m.statoSist}</td>
                  <td className="py-1.5 px-2 font-bold text-slate-300">{m.stato}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
