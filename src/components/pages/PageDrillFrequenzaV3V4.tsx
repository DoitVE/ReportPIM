import React, { useMemo } from 'react';
import { FrequenzaRow } from './PageFrequenzaV3V4';
import { Iw67Item } from '../../types';
import { ArrowLeft } from 'lucide-react';
import {
  PbiCanvas,
  PbiBox,
  PbiShape,
  PbiText,
  PBI_COLORS,
  fontSizePx,
} from '../pbi/primitives';

interface PageDrillFrequenzaV3V4Props {
  selectedRow?: FrequenzaRow;
  iw67: Iw67Item[];
  dataAggiornamento: string;
  onBack: () => void;
}

const CARD_BG = '#32343A';
const CARD_BAR = '#99BD3C';
const GRID_RED = '#F26D6D';
const GREEN = '#99BD3C';

const COL_WIDTHS = [
  230.34, 30.91, 62.73, 64.55, 61.82, 50.00,
  285.44, 45.45, 70.78, 71.86, 70.96, 104.93, 104.93,
];

const HEADERS = [
  'Avviso', 'Data', 'Tipo', 'Codice', 'Km inizio', 'Km fine',
  'Val. difetto', 'Testo', 'Descrizione', 'DataEsec.',
  'Data Fine Richiesta', 'Stato sist.', 'Stato',
];

interface Measure {
  avviso: string;
  dataAvviso: string;
  tipo: string;
  codiceMisura: string;
  kmInizio: string;
  kmFine: string;
  valDifetto: string;
  testo: string;
  descrizione: string;
  dataEsecuzione: string;
  dataFineRichiesta: string;
  statoSist: string;
  stato: string;
}

const DEMO_MEASURES: Measure[] = [
  { avviso: '70163326', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '28,346', kmFine: '28,348', valDifetto: '10,30', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804086)', dataEsecuzione: '11/11/2023', dataFineRichiesta: '16/08/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163326', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '28,570', kmFine: '28,584', valDifetto: '10,80', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804086)', dataEsecuzione: '11/11/2023', dataFineRichiesta: '16/08/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163326', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '28,677', kmFine: '28,690', valDifetto: '11,80', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804086)', dataEsecuzione: '31/10/2024', dataFineRichiesta: '16/08/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163326', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'XL2', kmInizio: '28,636', kmFine: '28,638', valDifetto: '10,40', testo: 'Scarto Liv.Trasv -interv.', descrizione: 'Manutenzione armamento (DdM10804086)', dataEsecuzione: '20/11/2023', dataFineRichiesta: '16/08/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163326', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'XL2', kmInizio: '28,652', kmFine: '28,655', valDifetto: '10,20', testo: 'Scarto Liv.Trasv -interv.', descrizione: 'Manutenzione armamento (DdM10804086)', dataEsecuzione: '31/10/2024', dataFineRichiesta: '16/08/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163327', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '30,614', kmFine: '30,618', valDifetto: '10,50', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804087)', dataEsecuzione: '11/01/2024', dataFineRichiesta: '16/08/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163327', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '32,719', kmFine: '32,746', valDifetto: '11,50', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804087)', dataEsecuzione: '21/06/2023', dataFineRichiesta: '16/08/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163327', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '34,492', kmFine: '34,496', valDifetto: '14,90', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804087)', dataEsecuzione: '11/01/2024', dataFineRichiesta: '16/08/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163444', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '4,796', kmFine: '4,804', valDifetto: '10,50', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804520)', dataEsecuzione: '03/02/2024', dataFineRichiesta: '01/09/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163444', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '4,879', kmFine: '4,888', valDifetto: '11,65', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804520)', dataEsecuzione: '03/02/2024', dataFineRichiesta: '01/09/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163444', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '4,890', kmFine: '4,898', valDifetto: '10,40', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804520)', dataEsecuzione: '20/11/2023', dataFineRichiesta: '01/09/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163444', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '4,901', kmFine: '4,910', valDifetto: '12,50', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804520)', dataEsecuzione: '05/03/2024', dataFineRichiesta: '01/09/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163444', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '5,446', kmFine: '5,458', valDifetto: '14,20', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804520)', dataEsecuzione: '03/02/2024', dataFineRichiesta: '01/09/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163444', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '5,531', kmFine: '5,544', valDifetto: '16,70', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804520)', dataEsecuzione: '03/02/2024', dataFineRichiesta: '01/09/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163444', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '5,540', kmFine: '5,552', valDifetto: '14,00', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804520)', dataEsecuzione: '20/11/2023', dataFineRichiesta: '01/09/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163444', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '5,550', kmFine: '5,563', valDifetto: '16,30', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804520)', dataEsecuzione: '03/02/2024', dataFineRichiesta: '01/09/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163444', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'L2', kmInizio: '5,633', kmFine: '5,699', valDifetto: '15,60', testo: 'Liv. Long. - intervento', descrizione: 'Manutenzione armamento (DdM10804520)', dataEsecuzione: '09/06/2023', dataFineRichiesta: '01/09/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '70163444', dataAvviso: '01/02/2022', tipo: 'V3', codiceMisura: 'XL2', kmInizio: '5,680', kmFine: '5,699', valDifetto: '10,20', testo: 'Scarto Liv.Trasv -interv.', descrizione: 'Manutenzione armamento (DdM10804520)', dataEsecuzione: '09/06/2023', dataFineRichiesta: '01/09/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '80133955', dataAvviso: '01/02/2022', tipo: 'V4', codiceMisura: 'S2', kmInizio: '11,624', kmFine: '11,628', valDifetto: '1.429,80', testo: 'Scartamento - interv.', descrizione: 'Avviso per difetti non connessi', dataEsecuzione: '18/04/2023', dataFineRichiesta: '14/01/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '80133955', dataAvviso: '01/02/2022', tipo: 'V4', codiceMisura: 'S2', kmInizio: '11,670', kmFine: '11,673', valDifetto: '1.429,70', testo: 'Scartamento - interv.', descrizione: 'Avviso per difetti non connessi', dataEsecuzione: '18/07/2023', dataFineRichiesta: '14/01/2024', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '80134080', dataAvviso: '01/02/2022', tipo: 'V4', codiceMisura: 'S2', kmInizio: '1,274', kmFine: '1,292', valDifetto: '1.455,10', testo: 'Scartamento - interv.', descrizione: 'Avviso per difetti non connessi', dataEsecuzione: '12/06/2023', dataFineRichiesta: '05/09/2023', statoSist: 'MISC', stato: 'CHIUSO' },
  { avviso: '80134080', dataAvviso: '01/02/2022', tipo: 'V4', codiceMisura: 'S2', kmInizio: '3,044', kmFine: '3,066', valDifetto: '1.429,20', testo: 'Scartamento - interv.', descrizione: 'Avviso per difetti non connessi', dataEsecuzione: '12/06/2023', dataFineRichiesta: '05/09/2023', statoSist: 'MISC', stato: 'CHIUSO' },
];

const MultiRowCard: React.FC<{
  x: number; y: number; w: number; h: number; z: number;
  items: { label: string; value: string | number }[];
}> = ({ x, y, w, h, z, items }) => (
  <PbiBox x={x} y={y} w={w} h={h} z={z} style={{ display: 'flex', background: CARD_BG }}>
    <div style={{ width: 4, background: CARD_BAR, flex: '0 0 auto' }} />
    <div style={{ display: 'flex', flex: '1 1 auto', padding: 20, overflow: 'hidden' }}>
      {items.map((item, i) => (
        <div key={i} style={{
          flex: '1 1 0', minWidth: 0, padding: '0 8px',
          borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}>
          <div style={{
            fontSize: fontSizePx(11), color: PBI_COLORS.textMuted,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.label}
          </div>
          <div style={{
            fontSize: fontSizePx(10), color: PBI_COLORS.textLight, fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {String(item.value)}
          </div>
        </div>
      ))}
    </div>
  </PbiBox>
);

export const PageDrillFrequenzaV3V4: React.FC<PageDrillFrequenzaV3V4Props> = ({
  selectedRow: propRow,
  iw67,
  dataAggiornamento,
  onBack,
}) => {
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
    lng: 12.2321,
  };

  const measures = useMemo<Measure[]>(() => {
    const filtered = iw67.filter((item) => {
      const sede = item['Sede tecnica'] || '';
      return sede.includes(selectedRow.setePrimoLivello);
    });
    if (filtered.length > 0) {
      return filtered.map((item): Measure => {
        const testo = item['Testo per la misura'] || '';
        const kmMatch = /^(\d+[.,]\d+)\s*[-\u2013]\s*(\d+[.,]\d+)/.exec(testo);
        const testoClean = testo.replace(/^\d+[.,]\d+\s*[-\u2013]\s*\d+[.,]\d+\s*/, '').trim() || testo;
        const statoSist = item['St.sist.'] || '';
        return {
          avviso: item.Avviso,
          dataAvviso: item.Data,
          tipo: item['Tp.'] || '',
          codiceMisura: item.Codice,
          kmInizio: kmMatch ? kmMatch[1].replace('.', ',') : '',
          kmFine: kmMatch ? kmMatch[2].replace('.', ',') : '',
          valDifetto: item['Testo codice per misura'] || '',
          testo: testoClean,
          descrizione: item.Descrizione,
          dataEsecuzione: item.DataEsec || '',
          dataFineRichiesta: item['FineRich.'] || '',
          statoSist,
          stato: statoSist.toUpperCase() === 'MECO' ? 'CHIUSO' : 'APERTO',
        };
      });
    }
    return DEMO_MEASURES;
  }, [iw67, selectedRow]);

  const cells = (m: Measure): string[] => [
    m.avviso, m.dataAvviso, m.tipo, m.codiceMisura,
    m.kmInizio, m.kmFine, m.valDifetto, m.testo,
    m.descrizione, m.dataEsecuzione, m.dataFineRichiesta,
    m.statoSist, m.stato,
  ];

  return (
    <PbiCanvas>
      {/* z=0: Back button */}
      <PbiBox x={0} y={0} w={100} h={40} z={0}>
        <button onClick={onBack} style={{
          width: '100%', height: '100%', background: 'transparent',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ArrowLeft color={PBI_COLORS.textMuted} size={20} />
        </button>
      </PbiBox>

      {/* z=3000: Title */}
      <PbiText x={238.67} y={3.95} w={485} h={28} z={3000}
        text="Difetti di livello e scartamento - DOIT VE"
        sizePt={20} bold color={PBI_COLORS.accent} />

      {/* z=7000: Drill label */}
      <PbiText x={247.71} y={34.95} w={204} h={25} z={7000}
        text="Drill frequenza V3 V4"
        sizePt={15} bold color={PBI_COLORS.textLight} />

      {/* z=5000: Logo */}
      <PbiBox x={34.45} y={0} w={210} h={61.54} z={5000}>
        <img src="/assets/logo_ufficiale.png" alt="Logo"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </PbiBox>

      {/* z=6000: "Dati al:" label */}
      <PbiText x={502.07} y={34.22} w={60} h={27} z={6000}
        text="Dati al:" sizePt={10} color={PBI_COLORS.textMuted}
        align="right" vAlign="middle" />

      {/* z=4000: DATA_ORA card */}
      <PbiBox x={553.99} y={35.29} w={130.77} h={26.92} z={4000}
        style={{ background: PBI_COLORS.canvas, display: 'flex',
          alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: fontSizePx(12), color: PBI_COLORS.textLight }}>
          {dataAggiornamento}
        </span>
      </PbiBox>

      {/* z=1000: MultiRowCard 1 — Linea, SeTe, Località, LVU */}
      <MultiRowCard x={12.35} y={95.29} w={1262.35} h={50} z={1000}
        items={[
          { label: 'Linea InRete', value: selectedRow.linea },
          { label: 'SeTe primo livello', value: selectedRow.setePrimoLivello },
          { label: 'Località/Tratta', value: selectedRow.localita },
          { label: 'LVU', value: selectedRow.um },
        ]} />

      {/* z=2000: MultiRowCard 2 — Sede tecnica, Definizione, Bin, Km rif, Conteggio */}
      <MultiRowCard x={12.35} y={145.29} w={1262.35} h={61.76} z={2000}
        items={[
          { label: 'Sede tecnica', value: selectedRow.sete },
          { label: 'Definizione della sede tecnica', value: selectedRow.definizione },
          { label: 'Bin.', value: selectedRow.bin },
          { label: 'Km. rif.', value: selectedRow.kmRif },
          { label: 'Conteggio di Val. difetto', value: selectedRow.conteggio },
        ]} />

      {/* z=8000: Banda shape */}
      <PbiShape x={0} y={210} w={1280} h={510} z={8000}
        fill={PBI_COLORS.band} radius={2} />

      {/* z=9000: TableEx — 13 columns */}
      <PbiBox x={12.35} y={222.94} w={1254.71} h={483.53} z={9000}
        style={{ background: PBI_COLORS.band, overflow: 'hidden',
          border: `4px solid ${GRID_RED}` }}>
        <div style={{ height: '100%', overflowY: 'auto' }}>
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <colgroup>
              {COL_WIDTHS.map((cw, i) => (
                <col key={i} style={{ width: cw }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {HEADERS.map((hdr, i) => (
                  <th key={i} style={{
                    background: PBI_COLORS.tableHeader,
                    color: PBI_COLORS.textPrimary,
                    fontSize: fontSizePx(8),
                    fontWeight: 400,
                    padding: '2px 4px',
                    textAlign: 'left',
                    borderBottom: `1px solid ${GREEN}`,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                  }}>
                    {hdr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {measures.map((m, idx) => (
                <tr key={idx} style={{
                  background: idx % 2 === 0 ? PBI_COLORS.tableRowSecondary : PBI_COLORS.tableRowPrimary,
                }}>
                  {cells(m).map((val, i) => (
                    <td key={i} style={{
                      color: idx % 2 === 0 ? PBI_COLORS.textMuted : PBI_COLORS.textPrimary,
                      fontSize: fontSizePx(8),
                      padding: '1px 4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PbiBox>
    </PbiCanvas>
  );
};
