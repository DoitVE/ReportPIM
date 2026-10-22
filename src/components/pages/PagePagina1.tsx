import React, { useState, useMemo } from 'react';
import { Avviso, AbbacoItem } from '../../types';
import { Database, Search } from 'lucide-react';

interface PagePagina1Props {
  avvisi: Avviso[];
  abbaco: AbbacoItem[];
}

export const PagePagina1: React.FC<PagePagina1Props> = ({
  avvisi,
  abbaco,
}) => {
  const [search, setSearch] = useState<string>('');

  // Extract distinct technical locations
  const sediList = useMemo(() => {
    const map: Record<string, { sede: string; nome: string; divis: string; lvu: string; count: number }> = {};
    avvisi.forEach(a => {
      const base = a.sede_tecnica.split('-')[0] || a.sede_tecnica;
      if (!map[base]) {
        map[base] = { sede: base, nome: a.nome_sede, divis: a.divisione, lvu: a.lvu, count: 0 };
      }
      map[base].count += 1;
    });
    return Object.values(map);
  }, [avvisi]);

  const filteredSedi = useMemo(() => {
    if (!search.trim()) return sediList;
    const q = search.toLowerCase();
    return sediList.filter(s => s.sede.toLowerCase().includes(q) || s.nome.toLowerCase().includes(q));
  }, [sediList, search]);

  return (
    <div className="bg-[#f0f2f5] p-3 text-slate-800 space-y-3 font-sans">
      <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="p-2 bg-slate-100 border border-slate-300 rounded text-slate-700">
            <Database className="w-5 h-5 text-slate-700" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[#D90000] tracking-tight leading-tight">
              Pagina 1 - Riconciliazione Anagrafiche
            </h1>
            <p className="text-xs font-bold text-[#006666]">
              Relazioni e Raccordo Tabelle SAP (GPS • LO-TR • ABBACO • ZSTMAIA)
            </p>
          </div>
        </div>

        <div className="relative w-64 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca sede..."
            className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-600"
          />
        </div>
      </div>

      {/* 3 Columns matching Power BI Visuals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Table 1: Sedi Tecniche (GPS / LO-TR) */}
        <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
          <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-800 flex justify-between">
            <span>LO-TR / GPS Sedi Tecniche</span>
            <span className="text-slate-500 font-mono">{filteredSedi.length} sedi</span>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 text-[11px] uppercase">
                <tr>
                  <th className="py-1.5 px-2">Sede</th>
                  <th className="py-1.5 px-2">Definizione</th>
                  <th className="py-1.5 px-2">Div.</th>
                  <th className="py-1.5 px-2">LVU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSedi.map(s => (
                  <tr key={s.sede} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 font-mono font-bold text-slate-900">{s.sede}</td>
                    <td className="py-1.5 px-2 text-slate-800 truncate max-w-[120px]">{s.nome}</td>
                    <td className="py-1.5 px-2 text-slate-600 font-mono">{s.divis}</td>
                    <td className="py-1.5 px-2 text-emerald-700 font-mono font-semibold">{s.lvu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: ABBACO Tratte */}
        <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
          <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-800 flex justify-between">
            <span>ABBACO - Tratte & Chiavi RL</span>
            <span className="text-slate-500 font-mono">{abbaco.length} chiavi</span>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 text-[11px] uppercase">
                <tr>
                  <th className="py-1.5 px-2">Linea</th>
                  <th className="py-1.5 px-2">Tratta</th>
                  <th className="py-1.5 px-2">Chiave RL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {abbaco.map((ab, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 font-bold text-slate-900 truncate max-w-[100px]">{ab.linea}</td>
                    <td className="py-1.5 px-2 text-slate-800 truncate max-w-[120px]">{ab.tratta}</td>
                    <td className="py-1.5 px-2 font-mono font-bold text-amber-700">{ab.chiave_rl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3: ZSTMAIA Punti di Misura & Difetti */}
        <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
          <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-800 flex justify-between">
            <span>Punti Misura e Difetti Armamento</span>
            <span className="text-slate-500 font-mono">{avvisi.length} record</span>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 text-[11px] uppercase">
                <tr>
                  <th className="py-1.5 px-2">Avviso</th>
                  <th className="py-1.5 px-2">Sede Tecnica</th>
                  <th className="py-1.5 px-2">Tipo Difetto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {avvisi.slice(0, 100).map((a, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 font-mono font-bold text-slate-900">{a.avviso}</td>
                    <td className="py-1.5 px-2 font-mono text-slate-600 truncate max-w-[110px]">{a.sede_tecnica}</td>
                    <td className="py-1.5 px-2 text-slate-800 font-medium truncate max-w-[120px]">{a.tipo_difetto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
