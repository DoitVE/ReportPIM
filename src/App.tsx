import React, { useState } from 'react';
import { PowerBiHeader } from './components/PowerBiHeader';
import { PowerBiTabs } from './components/PowerBiTabs';
import { FileLoaderModal } from './components/FileLoaderModal';

import { PageAvvisiV5 } from './components/pages/PageAvvisiV5';
import { PageAvvisiV3V4 } from './components/pages/PageAvvisiV3V4';
import { PageAbbaco } from './components/pages/PageAbbaco';
import { PageAnalisiFrequenza } from './components/pages/PageAnalisiFrequenza';
import { PageDrillFrequenza } from './components/pages/PageDrillFrequenza';
import { PageControlli1 } from './components/pages/PageControlli1';
import { PageControlli2 } from './components/pages/PageControlli2';
import { PagePagina1 } from './components/pages/PagePagina1';

import { Avviso, AbbacoItem, Iw67Item, ControlloAvvisoItem, OdlItem, PowerBiSectionId } from './types';

// Pre-extracted datasets
import initialAvvisi from './data/avvisi.json';
import initialAbbaco from './data/abbaco.json';
import initialIw67 from './data/iw67.json';
import initialControlli from './data/controlli_sap.json';
import initialOdl from './data/odl.json';
import caorData from './data/caor.json';

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<PowerBiSectionId>('avvisi_v5');
  const [isFileLoaderOpen, setIsFileLoaderOpen] = useState<boolean>(false);

  // Datasets state
  const [avvisi, setAvvisi] = useState<Avviso[]>(initialAvvisi as unknown as Avviso[]);
  const [abbaco, setAbbaco] = useState<AbbacoItem[]>(initialAbbaco as unknown as AbbacoItem[]);
  const [iw67, setIw67] = useState<Iw67Item[]>(initialIw67 as unknown as Iw67Item[]);
  const [controlli, setControlli] = useState<ControlloAvvisoItem[]>(initialControlli as unknown as ControlloAvvisoItem[]);
  const [odl, setOdl] = useState<OdlItem[]>(initialOdl as unknown as OdlItem[]);
  const [caor] = useState<Record<string, { ore: number; data_prima: string; data_ultima: string }>>(
    caorData as Record<string, { ore: number; data_prima: string; data_ultima: string }>
  );

  const dataAggiornamento = '20/10/2026 15:47';

  return (
    <div className="min-h-screen bg-[#e5e7eb] flex flex-col font-sans select-none">
      {/* Power BI Header with Manual File Loading Button */}
      <PowerBiHeader
        onOpenFileLoader={() => setIsFileLoaderOpen(true)}
        dataAggiornamento={dataAggiornamento}
        totalRecords={avvisi.length + iw67.length + abbaco.length + controlli.length}
      />

      {/* Main Power BI Report Canvas */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto overflow-x-hidden">
        {activeSection === 'avvisi_v5' && (
          <PageAvvisiV5
            avvisi={avvisi}
            dataAggiornamento={dataAggiornamento}
          />
        )}

        {activeSection === 'avvisi_v3v4' && (
          <PageAvvisiV3V4
            iw67={iw67}
            avvisi={avvisi}
            dataAggiornamento={dataAggiornamento}
          />
        )}

        {activeSection === 'abbaco' && (
          <PageAbbaco
            abbaco={abbaco}
            avvisi={avvisi}
            dataAggiornamento={dataAggiornamento}
          />
        )}

        {activeSection === 'analisi_frequenza' && (
          <PageAnalisiFrequenza
            iw67={iw67}
            avvisi={avvisi}
            dataAggiornamento={dataAggiornamento}
            onNavigateToDrill={() => setActiveSection('drill_frequenza')}
          />
        )}

        {activeSection === 'drill_frequenza' && (
          <PageDrillFrequenza
            iw67={iw67}
            dataAggiornamento={dataAggiornamento}
            onBack={() => setActiveSection('analisi_frequenza')}
          />
        )}

        {activeSection === 'controlli_avvisi' && (
          <PageControlli1
            controlli={controlli}
            caor={caor}
            dataAggiornamento={dataAggiornamento}
          />
        )}

        {activeSection === 'controlli_avvisi_2' && (
          <PageControlli2
            controlli={controlli}
            caor={caor}
            dataAggiornamento={dataAggiornamento}
          />
        )}

        {activeSection === 'pagina_1' && (
          <PagePagina1
            avvisi={avvisi}
            abbaco={abbaco}
          />
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
        onUpdateAvvisi={setAvvisi}
        onUpdateAbbaco={setAbbaco}
        onUpdateIw67={setIw67}
        onUpdateControlli={setControlli}
        onUpdateOdl={setOdl}
        counts={{
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
