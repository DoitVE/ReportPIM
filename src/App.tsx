import React, { useState } from 'react';
import { PowerBiHeader } from './components/PowerBiHeader';
import { PowerBiTabs } from './components/PowerBiTabs';
import { FileLoaderModal } from './components/FileLoaderModal';

import { PageAvvisiV5 } from './components/pages/PageAvvisiV5';
import { PageDashboardV5 } from './components/pages/PageDashboardV5';
import { PageCercaSeTe } from './components/pages/PageCercaSeTe';
import { PageAvvisiV3V4 } from './components/pages/PageAvvisiV3V4';
import { PageFrequenzaV3V4, FrequenzaRow } from './components/pages/PageFrequenzaV3V4';
import { PageDrillFrequenzaV3V4 } from './components/pages/PageDrillFrequenzaV3V4';
import { PageDrillV5 } from './components/pages/PageDrillV5';
import { PageAbbaco } from './components/pages/PageAbbaco';
import { PageQuickUserGuide } from './components/pages/PageQuickUserGuide';

import {
  Avviso,
  AbbacoItem,
  Iw67Item,
  ControlloAvvisoItem,
  OdlItem,
  PowerBiSectionId,
  PdmV5Item
} from './types';

// Pre-extracted certified test datasets for DOIT VE (available on-demand via Demo button)
import { initialPdmV5List } from './data/v5Dataset';
import initialAvvisi from './data/avvisi.json';
import initialAbbaco from './data/abbaco.json';
import initialIw67 from './data/iw67.json';
import initialControlli from './data/controlli_sap.json';
import initialOdl from './data/odl.json';

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<PowerBiSectionId>('avvisi_v5');
  const [isFileLoaderOpen, setIsFileLoaderOpen] = useState<boolean>(false);

  // Datasets start EMPTY by default as requested: no residual/mock data until files are provided or demo is clicked
  const [pdmList, setPdmList] = useState<PdmV5Item[]>([]);
  const [avvisi, setAvvisi] = useState<Avviso[]>([]);
  const [abbaco, setAbbaco] = useState<AbbacoItem[]>([]);
  const [iw67, setIw67] = useState<Iw67Item[]>([]);
  const [controlli, setControlli] = useState<ControlloAvvisoItem[]>([]);
  const [odl, setOdl] = useState<OdlItem[]>([]);

  // Selected item state for drilldowns
  const [selectedPdmItem, setSelectedPdmItem] = useState<PdmV5Item | undefined>(undefined);
  const [selectedFreqRow, setSelectedFreqRow] = useState<FrequenzaRow | undefined>(undefined);

  const dataAggiornamento = '20/10/2026 15:47';

  // Load certified demo data on demand
  const handleLoadDemoData = () => {
    setPdmList(initialPdmV5List);
    setAvvisi(initialAvvisi as unknown as Avviso[]);
    setAbbaco(initialAbbaco as unknown as AbbacoItem[]);
    setIw67(initialIw67 as unknown as Iw67Item[]);
    setControlli(initialControlli as unknown as ControlloAvvisoItem[]);
    setOdl(initialOdl as unknown as OdlItem[]);
    setSelectedPdmItem(initialPdmV5List[0]);
  };

  // Reset all datasets to empty
  const handleClearAllData = () => {
    setPdmList([]);
    setAvvisi([]);
    setAbbaco([]);
    setIw67([]);
    setControlli([]);
    setOdl([]);
    setSelectedPdmItem(undefined);
    setSelectedFreqRow(undefined);
  };

  // Navigation handlers
  const handleDrillPdm = (item: PdmV5Item) => {
    setSelectedPdmItem(item);
    setActiveSection('drill_v5');
  };

  const handleDrillFreq = (row: FrequenzaRow) => {
    setSelectedFreqRow(row);
    setActiveSection('drill_frequenza_v3v4');
  };

  const totalLoaded = pdmList.length + avvisi.length + iw67.length + abbaco.length + odl.length;

  return (
    <div className="min-h-screen bg-[#18191c] flex flex-col font-sans select-none text-slate-100">
      {/* Power BI Header with Manual File Loading Button */}
      <PowerBiHeader
        onOpenFileLoader={() => setIsFileLoaderOpen(true)}
        dataAggiornamento={dataAggiornamento}
        totalRecords={totalLoaded}
      />

      {/* Main Power BI Report Canvas */}
      <main className="flex-1 w-full mx-auto overflow-x-hidden bg-[#18191c]">
        {activeSection === 'avvisi_v5' && (
          <PageAvvisiV5
            pdmList={pdmList}
            dataAggiornamento={dataAggiornamento}
            onNavigateToDrill={handleDrillPdm}
            onOpenFileLoader={() => setIsFileLoaderOpen(true)}
            onLoadDemoData={handleLoadDemoData}
          />
        )}

        {activeSection === 'dashboard_v5' && (
          <PageDashboardV5
            pdmList={pdmList}
            dataAggiornamento={dataAggiornamento}
            onNavigateToDrill={handleDrillPdm}
            onBack={() => setActiveSection('avvisi_v5')}
            onOpenFileLoader={() => setIsFileLoaderOpen(true)}
            onLoadDemoData={handleLoadDemoData}
          />
        )}

        {activeSection === 'cerca_sete_v5' && (
          <PageCercaSeTe
            pdmList={pdmList}
            dataAggiornamento={dataAggiornamento}
            onNavigateToDrill={handleDrillPdm}
            onBack={() => setActiveSection('avvisi_v5')}
            onOpenFileLoader={() => setIsFileLoaderOpen(true)}
            onLoadDemoData={handleLoadDemoData}
          />
        )}

        {activeSection === 'avvisi_v3v4' && (
          <PageAvvisiV3V4
            iw67={iw67}
            avvisi={avvisi}
            dataAggiornamento={dataAggiornamento}
            onOpenFileLoader={() => setIsFileLoaderOpen(true)}
            onLoadDemoData={handleLoadDemoData}
          />
        )}

        {activeSection === 'frequenza_v3v4' && (
          <PageFrequenzaV3V4
            iw67={iw67}
            avvisi={avvisi}
            dataAggiornamento={dataAggiornamento}
            onNavigateToDrill={handleDrillFreq}
            onOpenFileLoader={() => setIsFileLoaderOpen(true)}
            onLoadDemoData={handleLoadDemoData}
          />
        )}

        {activeSection === 'drill_frequenza_v3v4' && (
          <PageDrillFrequenzaV3V4
            selectedRow={selectedFreqRow}
            iw67={iw67}
            dataAggiornamento={dataAggiornamento}
            onBack={() => setActiveSection('frequenza_v3v4')}
          />
        )}

        {activeSection === 'drill_v5' && (
          <PageDrillV5
            selectedItem={selectedPdmItem}
            pdmList={pdmList}
            dataAggiornamento={dataAggiornamento}
            onBack={() => setActiveSection('avvisi_v5')}
          />
        )}

        {activeSection === 'abbattimento_codici' && (
          <PageAbbaco
            abbaco={abbaco}
            avvisi={avvisi}
            dataAggiornamento={dataAggiornamento}
            onOpenFileLoader={() => setIsFileLoaderOpen(true)}
            onLoadDemoData={handleLoadDemoData}
          />
        )}

        {activeSection === 'quick_user_guide' && (
          <PageQuickUserGuide />
        )}
      </main>

      {/* Bottom Tabs matching Power BI Desktop / Service */}
      <PowerBiTabs
        activeSection={activeSection}
        onChangeSection={setActiveSection}
      />

      {/* Modal to feed files manually into the webapp */}
      <FileLoaderModal
        isOpen={isFileLoaderOpen}
        onClose={() => setIsFileLoaderOpen(false)}
        onUpdatePdm={setPdmList}
        onUpdateAvvisi={setAvvisi}
        onUpdateAbbaco={setAbbaco}
        onUpdateIw67={setIw67}
        onUpdateControlli={setControlli}
        onUpdateOdl={setOdl}
        onLoadDemoData={handleLoadDemoData}
        onClearAllData={handleClearAllData}
        counts={{
          pdm: pdmList.length,
          avvisi: avvisi.length,
          abbaco: abbaco.length,
          iw67: iw67.length,
          controlli: controlli.length,
          odl: odl.length,
        }}
      />
    </div>
  );
};

export default App;
