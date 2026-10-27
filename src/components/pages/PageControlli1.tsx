import React, { useState, useMemo } from 'react';
import { ControlloAvvisoItem } from '../../types';
import { RotateCcw, AlertOctagon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PageControlli1Props {
  controlli: ControlloAvvisoItem[];
  caor: Record<string, { ore: number; data_prima: string; data_ultima: string }>;
  dataAggiornamento: string;
}

export const PageControlli1: React.FC<PageControlli1Props> = ({
  controlli,
  caor,
  dataAggiornamento,
}) => {
  const [selectedTipo, setSelectedTipo] = useState<string>('ALL');
  const [activeBarFilter, setActiveBarFilter] = useState<string | null>(null);

  // Filter 1: Avvisi in stato MELA con data fine richiesta scaduta
  const melaScaduti = useMemo(() => {
    return controlli.filter(item => {
      // Must be MELA or open with past date
      const isMela = (item['Stato sistema'] || '').includes('MELA') || (item['Stato sistema'] || '').includes('MAPE');
      // If fine richiesta is numeric serial or date
      return isMela;
    });
  }, [controlli]);

  const tipi = useMemo(() => {
    const s = new Set<string>();
    melaScaduti.forEach(item => { if (item['Tipo avviso']) s.add(item['Tipo avviso']); });
    return Array.from(s).sort();
  }, [melaScaduti]);

  const filtered = useMemo(() => {
    return melaScaduti.filter(item => {
      if (selectedTipo !== 'ALL' && item['Tipo avviso'] !== selectedTipo) return false;
      if (activeBarFilter && item['Tipo avviso'] !== activeBarFilter) return false;
      return true;
    });
  }, [melaScaduti, selectedTipo, activeBarFilter]);

  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(item => {
      const t = item['Tipo avviso'] || 'Altro';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [filtered]);

  const handleResetFilters = () => {
    setSelectedTipo('ALL');
    setActiveBarFilter(null);
  };

  return (
    <div className="bg-[#f0f2f5] p-3 text-slate-800 space-y-3 font-sans">
      {/* Top Header */}
      <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="/rfi_logo.jpg" alt="RFI" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-bold text-[#D90000] tracking-tight leading-tight">
              Controllo avvisi
            </h1>
            <p className="text-xs font-bold text-[#006666]">
              I2, V3, V4, V5, VX, VY, VZ
            </p>
          </div>
        </div>

        <button
          onClick={handleResetFilters}
          title="Cancella tutti i filtri dei dati in questa pagina"
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">Ripristina Filtri</span>
        </button>
      </div>

      {/* Middle Grid: Slicer, Cards, Chart */}
      <div className="grid grid-cols-12 gap-2.5">
        
        {/* Slicer & Cards */}
        <div className="col-span-12 lg:col-span-6 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs text-center flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Dati aggiornati al:</span>
              <span className="text-sm font-bold text-slate-800 font-mono mt-0.5">{dataAggiornamento}</span>
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs text-center flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">N. avvisi</span>
              <span className="text-2xl font-bold text-[#D90000] font-mono leading-tight">
                {filtered.length.toLocaleString('it-IT')}
              </span>
            </div>
          </div>

          {/* Slicer Tipo Difetto */}
          <div className="bg-white p-2.5 rounded border border-slate-300 shadow-2xs text-xs">
            <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Tipo Difetto (Tipo Avviso)</label>
            <select
              value={selectedTipo}
              onChange={e => setSelectedTipo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
            >
              <option value="ALL">Tutti i Tipi Avviso ({tipi.length})</option>
              {tipi.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Clustered Bar Chart: Numero Avvisi */}
        <div className="col-span-12 lg:col-span-6 bg-white p-3 rounded border border-slate-300 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-700">Numero Avvisi per Tipo</span>
            {activeBarFilter && (
              <button onClick={() => setActiveBarFilter(null)} className="text-[10px] text-red-600 underline">
                Rimuovi filtro barra
              </button>
            )}
          </div>
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 15, left: -10, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '11px', borderRadius: '4px' }} />
                <Bar
                  dataKey="count"
                  cursor="pointer"
                  onClick={d => setActiveBarFilter(activeBarFilter === d.name ? null : d.name)}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={activeBarFilter === entry.name ? '#991b1b' : '#D90000'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Main Table: Avvisi in stato MELA con data fine richiesta scaduta */}
      <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
        <div className="px-3 py-2 bg-red-50 border-b border-red-200 flex items-center justify-between text-xs font-bold text-red-800">
          <div className="flex items-center space-x-1.5">
            <AlertOctagon className="w-4 h-4 text-red-600" />
            <span>Avvisi in stato MELA con data fine richiesta scaduta</span>
          </div>
          <span className="font-mono text-slate-600">{filtered.length} avvisi non conformi</span>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 text-[11px] uppercase">
              <tr>
                <th className="py-2 px-2.5">Avviso</th>
                <th className="py-2 px-2.5">Tipo</th>
                <th className="py-2 px-2.5">Descrizione</th>
                <th className="py-2 px-2.5">Stato Sistema</th>
                <th className="py-2 px-2.5">Centro Lavoro</th>
                <th className="py-2 px-2.5">Sede Tecnica</th>
                <th className="py-2 px-2.5">Ordine</th>
                <th className="py-2 px-2.5">Ore CAOR OdL</th>
                <th className="py-2 px-2.5">Prima Cons.</th>
                <th className="py-2 px-2.5">Network</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.slice(0, 70).map((item, idx) => {
                const caorInfo = caor[item.Ordine] || { ore: 0, data_prima: '-', data_ultima: '-' };
                return (
                  <tr key={idx} className="hover:bg-red-50/50">
                    <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900">{item.Avviso}</td>
                    <td className="py-1.5 px-2.5 font-mono font-bold text-red-700">{item['Tipo avviso']}</td>
                    <td className="py-1.5 px-2.5 max-w-xs truncate font-medium text-slate-800" title={item.Descrizione || 'Manutenzione'}>
                      {item.Descrizione || 'Manutenzione Armamento'}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                        {item['Stato sistema']}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-slate-700">{item['Centro lavoro resp.']}</td>
                    <td className="py-1.5 px-2.5 font-mono text-slate-600 text-[11px]">{item['Sede tecnica']}</td>
                    <td className="py-1.5 px-2.5 font-mono text-slate-800">
                      {item.Ordine !== 'None' ? item.Ordine : <span className="text-slate-400 italic">Nessun OdL</span>}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono font-semibold text-slate-900">
                      {caorInfo.ore > 0 ? `${caorInfo.ore.toFixed(1)} h` : '-'}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-slate-600 text-[11px]">{caorInfo.data_prima}</td>
                    <td className="py-1.5 px-2.5 font-mono text-slate-600 text-[11px]">{item.Network !== 'None' ? item.Network : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
