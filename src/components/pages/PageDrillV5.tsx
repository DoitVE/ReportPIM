import React, { useState, useMemo } from 'react';
import { PdmV5Item, AvvisoV5Detail } from '../../types';
import { initialAvvisiV5Details } from '../../data/v5Dataset';
import { ArrowLeft, RotateCcw, Search } from 'lucide-react';

interface PageDrillV5Props {
  selectedItem?: PdmV5Item;
  pdmList: PdmV5Item[];
  dataAggiornamento: string;
  onBack: () => void;
}

export const PageDrillV5: React.FC<PageDrillV5Props> = ({
  selectedItem: initialSelectedItem,
  pdmList,
  dataAggiornamento,
  onBack,
}) => {
  // Current active PdM
  const [currentPdmId, setCurrentPdmId] = useState<string>(
    initialSelectedItem?.pdm || '1208502'
  );
  const [searchPdmInput, setSearchPdmInput] = useState('');
  const [searchAvvisoInput, setSearchAvvisoInput] = useState('');

  const currentItem = useMemo(() => {
    return (
      pdmList.find(p => p.pdm === currentPdmId) ||
      initialSelectedItem ||
      pdmList[0] ||
      undefined
    );
  }, [pdmList, currentPdmId, initialSelectedItem]);

  // Find linked Avviso
  const avvisoDetail = useMemo((): AvvisoV5Detail | null => {
    if (!currentItem) return null;
    const linked = initialAvvisiV5Details.find(
      a => a.pdm === currentItem.pdm || (currentItem.avviso && a.avviso === currentItem.avviso)
    );
    if (linked) return linked;

    return {
      avviso: currentItem.avviso || '50217845',
      pdm: currentItem.pdm,
      tipo: 'V5',
      descrizione: currentItem.osservazioni || 'Eliminazione difetti armamento',
      autore: currentItem.creato_da || '941235',
      data_creazione: currentItem.data_creaz_avviso || currentItem.data_creazione || '21/08/2026',
      ultima_mod: '946194',
      data_modifica: '27/08/2026',
      sede_tecnica: currentItem.sede_tecnica || 'LO3002-BC-BC24-DEV-D16',
      ordine: '',
      network: '',
      testo_esteso: `Eliminazione difetti armamento DDM n. 15828145 PDM n. ${currentItem.pdm}`,
      stato_sistema: 'MAPE',
      inizio_richiesta: currentItem.data_creazione || '21/08/2026',
      fine_richiesta: currentItem.fine_richiesta || '21/11/2026',
      data_chiusura: currentItem.data_tolto_dop || '',
      ritardo_avv: currentItem.ritardo_pdm || ''
    };
  }, [currentItem]);

  if (!currentItem || !avvisoDetail) {
    return (
      <div className="bg-[#18191c] min-h-[calc(100vh-6rem)] p-8 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
          <RotateCcw className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white">Nessun Punto di Misura selezionato</h3>
        <p className="text-xs text-slate-400 max-w-md">
          Per visualizzare la scheda monografica di dettaglio Drill V5, alimenta l'applicazione e seleziona un PdM dalla pagina Avvisi V5 o Cerca per SeTe.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded shadow transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna agli Avvisi V5</span>
        </button>
      </div>
    );
  }

  const handleResetFilters = () => {
    setCurrentPdmId('1208502');
    setSearchPdmInput('');
    setSearchAvvisoInput('');
  };

  const filteredPdmSuggestions = useMemo(() => {
    if (!searchPdmInput) return pdmList.slice(0, 5);
    return pdmList.filter(p => p.pdm.includes(searchPdmInput)).slice(0, 5);
  }, [pdmList, searchPdmInput]);

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
              Difetti di binario - DOIT VE
            </h1>
            <div className="flex items-center space-x-4 text-xs">
              <span className="text-white font-bold text-sm">Drill V5</span>
              <span className="text-[#94a3b8]">Dati aggiornati al: <strong className="text-white font-mono">{dataAggiornamento}</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={handleResetFilters}
          className="flex items-center space-x-1 px-3 py-1 bg-[#25282e] hover:bg-[#2f333a] border border-[#3f4553] rounded text-xs font-semibold text-slate-200 transition-colors cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Filtri</span>
        </button>
      </div>

      {/* Top Search & Shared Attributes Row matching Screenshot 3 */}
      <div className="grid grid-cols-12 gap-2 text-xs">
        {/* Cerca Avviso */}
        <div className="col-span-12 sm:col-span-6 md:col-span-2 bg-[#202227] p-1.5 rounded border border-[#2e323b]">
          <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">Cerca Avviso</span>
          <div className="relative mb-1">
            <Search className="w-3.5 h-3.5 absolute left-1.5 top-1.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca"
              value={searchAvvisoInput}
              onChange={e => setSearchAvvisoInput(e.target.value)}
              className="w-full bg-[#18191c] border border-[#3f4553] rounded pl-6 pr-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>
          <div className="flex items-center space-x-1 text-[11px] font-mono text-cyan-300">
            <input type="checkbox" checked readOnly className="w-3 h-3 text-amber-500 bg-[#18191c]" />
            <span>{avvisoDetail.avviso}</span>
          </div>
        </div>

        {/* Cerca PdM */}
        <div className="col-span-12 sm:col-span-6 md:col-span-2 bg-[#202227] p-1.5 rounded border border-[#2e323b]">
          <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">Cerca PdM</span>
          <div className="relative mb-1">
            <Search className="w-3.5 h-3.5 absolute left-1.5 top-1.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca"
              value={searchPdmInput}
              onChange={e => setSearchPdmInput(e.target.value)}
              className="w-full bg-[#18191c] border border-[#3f4553] rounded pl-6 pr-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>
          <div className="flex items-center space-x-1 text-[11px] font-mono text-amber-300">
            <input type="checkbox" checked readOnly className="w-3 h-3 text-amber-500 bg-[#18191c]" />
            <span>{currentItem.pdm}</span>
          </div>
        </div>

        {/* Dati condivisi Avviso-PdM: Linea | Localita | Classificazione | Scadenza */}
        <div className="col-span-12 md:col-span-4 bg-[#202227] p-2 rounded border border-[#2e323b] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Linea InRete</span>
            <span className="text-xs font-bold text-white">{currentItem.linea}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Località/Tratta</span>
            <span className="text-xs font-bold text-white">{currentItem.localita_tratta}</span>
          </div>
        </div>

        <div className="col-span-12 sm:col-span-6 md:col-span-2 bg-[#202227] p-2 rounded border border-[#2e323b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Classificazione</span>
          <span className="text-xs font-semibold text-sky-400">{currentItem.classificazione_stato}</span>
        </div>

        <div className="col-span-12 sm:col-span-6 md:col-span-2 bg-[#202227] p-2 rounded border border-[#2e323b]">
          <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">Stato scadenza</span>
          <span className="text-xs font-bold text-amber-400">{currentItem.scadenza}</span>
        </div>
      </div>

      {/* SECTION 1: Dati PdM (matches exact screenshot structure) */}
      <div className="grid grid-cols-12 gap-2 text-xs">
        <div className="col-span-12 lg:col-span-10 bg-[#202227] p-3 rounded border border-[#2e323b] space-y-2.5">
          <span className="text-xs font-bold text-white block pb-1 border-b border-[#2e323b]">
            Dati PdM
          </span>

          {/* Row 1 */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">PdM</span>
              <span className="font-mono font-bold text-amber-300 text-sm">{currentItem.pdm}</span>
            </div>
            <div className="col-span-2 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Classe prov.</span>
              <span className="font-bold text-white text-sm">{currentItem.classe || '-'}</span>
            </div>
            <div className="col-span-7 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Osservazioni</span>
              <span className="font-semibold text-white truncate block text-xs">{currentItem.osservazioni}</span>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Sede Tecnica</span>
              <span className="font-mono text-white text-xs">{currentItem.sede_tecnica}</span>
            </div>
            <div className="col-span-3 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Cod. linea</span>
              <span className="font-mono text-white text-xs">{currentItem.cod_linea || 'L750'}</span>
            </div>
            <div className="col-span-3 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Km linea</span>
              <span className="font-mono text-white text-xs font-bold">{currentItem.km_linea}</span>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-10 gap-1.5">
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Dev.</span>
              <span className="font-mono text-white text-xs">{currentItem.dev || '-'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Bin.</span>
              <span className="font-mono text-white text-xs">{currentItem.bin || '-'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Fila</span>
              <span className="font-mono text-white text-xs">{currentItem.fila || '-'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Tipo difetto</span>
              <span className="font-bold text-white text-xs">{currentItem.tipo_difetto}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Tipo Arm.</span>
              <span className="font-mono text-white text-xs">{currentItem.tipo_arm || '60UIC'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Val. (%/mm)</span>
              <span className="font-mono text-white text-xs">{currentItem.val_perc_mm || '-'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Prof. Dif.</span>
              <span className="font-mono text-white text-xs">{currentItem.prof_dif || '-'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Pos. Dif</span>
              <span className="font-mono text-white text-xs">{currentItem.pos_dif || 'FUNGO'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Ubi lin.</span>
              <span className="font-mono text-white text-xs">{currentItem.ubi_lin || 'In Sald'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">T. tratta</span>
              <span className="font-mono text-white text-xs">-</span>
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-8 gap-1.5">
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Tipo Sald.</span>
              <span className="font-mono text-white text-xs">{currentItem.tipo_sald || 'All.'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Data esec. sald.</span>
              <span className="font-mono text-white text-xs">{currentItem.data_esec_saldatura || '01/2026'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Pos. sezione</span>
              <span className="font-mono text-white text-xs">{currentItem.pos_sezione || 'Fungo'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Sald. in gar.</span>
              <span className="font-mono text-white text-xs">{currentItem.sald_in_gar || 'Si'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Eseguito da</span>
              <span className="font-mono text-white text-xs">{currentItem.esegui_to_da || 'Ditta'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">ID saldatore</span>
              <span className="font-mono text-white text-xs">{currentItem.id_saldatore || 'CEN705'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Creato da</span>
              <span className="font-mono text-white text-xs">{currentItem.creato_da || '941235'}</span>
            </div>
            <div className="bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[9.5px] text-[#94a3b8] block uppercase">Data creazione</span>
              <span className="font-mono text-white text-xs">{currentItem.data_creazione || '10/03/2026'}</span>
            </div>
          </div>
        </div>

        {/* Right Status Card: Stato PdM */}
        <div className="col-span-12 lg:col-span-2 bg-[#202227] p-3 rounded border border-[#2e323b] flex flex-col justify-between space-y-2">
          <span className="text-xs font-bold text-white block pb-1 border-b border-[#2e323b]">
            Stato PdM
          </span>
          <div className="bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Tolto d'opera</span>
            <span className={`text-base font-bold ${currentItem.tolto_dop === 'S' ? 'text-emerald-400' : 'text-red-400'}`}>
              {currentItem.tolto_dop}
            </span>
          </div>
          <div className="bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Data Scoperta</span>
            <span className="font-mono text-white text-xs font-semibold">{currentItem.data_scoperta || '-'}</span>
          </div>
          <div className="bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Data Agg.</span>
            <span className="font-mono text-white text-xs">-</span>
          </div>
          <div className="bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Data tolto d'op.</span>
            <span className="font-mono text-white text-xs">{currentItem.data_tolto_dop || '-'}</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Dati avviso (matches exact screenshot structure) */}
      <div className="grid grid-cols-12 gap-2 text-xs">
        <div className="col-span-12 lg:col-span-10 bg-[#202227] p-3 rounded border border-[#2e323b] space-y-2.5">
          <span className="text-xs font-bold text-white block pb-1 border-b border-[#2e323b]">
            Dati avviso
          </span>

          {/* Row 1 */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-2 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Avviso</span>
              <span className="font-mono font-bold text-cyan-300 text-sm">{avvisoDetail.avviso}</span>
            </div>
            <div className="col-span-1 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Tipo</span>
              <span className="font-bold text-white text-sm">{avvisoDetail.tipo}</span>
            </div>
            <div className="col-span-4 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Descrizione</span>
              <span className="font-semibold text-white text-xs truncate block">{avvisoDetail.descrizione}</span>
            </div>
            <div className="col-span-1 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Autore</span>
              <span className="font-mono text-white text-xs">{avvisoDetail.autore}</span>
            </div>
            <div className="col-span-2 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Data creazione</span>
              <span className="font-mono text-white text-xs">{avvisoDetail.data_creazione}</span>
            </div>
            <div className="col-span-1 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Ultima mod.</span>
              <span className="font-mono text-white text-xs">{avvisoDetail.ultima_mod}</span>
            </div>
            <div className="col-span-1 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Data mod.</span>
              <span className="font-mono text-white text-xs">{avvisoDetail.data_modifica}</span>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Sede tecnica</span>
              <span className="font-mono text-white text-xs">{avvisoDetail.sede_tecnica}</span>
            </div>
            <div className="col-span-3 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Ordine</span>
              <span className="font-mono text-white text-xs">{avvisoDetail.ordine || '-'}</span>
            </div>
            <div className="col-span-3 bg-[#18191c] p-1.5 rounded border border-[#2e323b]">
              <span className="text-[10px] text-[#94a3b8] block uppercase">Network</span>
              <span className="font-mono text-white text-xs">{avvisoDetail.network || '-'}</span>
            </div>
          </div>

          {/* Row 3: Testo Esteso */}
          <div className="bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase mb-0.5">Testo Esteso</span>
            <span className="text-xs text-[#e2e8f0] font-mono block leading-relaxed">{avvisoDetail.testo_esteso}</span>
          </div>
        </div>

        {/* Right Status Card: Stato avviso */}
        <div className="col-span-12 lg:col-span-2 bg-[#202227] p-3 rounded border border-[#2e323b] flex flex-col justify-between space-y-2">
          <span className="text-xs font-bold text-white block pb-1 border-b border-[#2e323b]">
            Stato avviso
          </span>
          <div className="bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Stato sistema</span>
            <span className="font-bold text-amber-400 text-sm">{avvisoDetail.stato_sistema}</span>
          </div>
          <div className="bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Inizio richiesta</span>
            <span className="font-mono text-white text-xs font-semibold">{avvisoDetail.inizio_richiesta || '-'}</span>
          </div>
          <div className="bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Fine richiesta</span>
            <span className="font-mono text-white text-xs font-semibold">{avvisoDetail.fine_richiesta || '-'}</span>
          </div>
          <div className="bg-[#18191c] p-2 rounded border border-[#2e323b]">
            <span className="text-[10px] text-[#94a3b8] block uppercase">Data chiusura</span>
            <span className="font-mono text-white text-xs">{avvisoDetail.data_chiusura || '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
