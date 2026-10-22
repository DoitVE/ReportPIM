import React, { useMemo } from 'react';
import { Avviso, AbbacoItem, TabType } from '../types';
import { 
  AlertOctagon, 
  Clock, 
  CheckCircle2, 
  GitCommit, 
  Activity, 
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Gauge
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface OverviewProps {
  avvisi: Avviso[];
  abbaco: AbbacoItem[];
  setActiveTab: (tab: TabType) => void;
  setSelectedLinea?: (linea: string) => void;
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const Overview: React.FC<OverviewProps> = ({
  avvisi,
  abbaco,
  setActiveTab,
}) => {
  // Compute KPI metrics
  const stats = useMemo(() => {
    const total = avvisi.length;
    const v5Count = avvisi.filter(a => a.tipo === 'V5').length;
    const v3v4Count = avvisi.filter(a => a.tipo === 'V3' || a.tipo === 'V4').length;
    const scaduti = avvisi.filter(a => a.stato_scadenza === 'Scaduto').length;
    const inScadenza = avvisi.filter(a => a.stato_scadenza === 'In scadenza').length;
    const melaCount = avvisi.filter(a => a.stato_sistema.includes('MELA')).length;
    const mecoCount = avvisi.filter(a => a.stato_sistema.includes('MECO')).length;
    const senzaOdl = avvisi.filter(a => a.stato_sistema.includes('MECO') && !a.ordine).length;

    // By Linea
    const lineaMap: Record<string, number> = {};
    // By Tipo Difetto
    const tipoMap: Record<string, number> = {};
    // By UM / Divisione
    const umMap: Record<string, number> = {};

    avvisi.forEach(a => {
      const l = a.linea || 'Altra Linea';
      lineaMap[l] = (lineaMap[l] || 0) + 1;

      const t = a.tipo_difetto || 'Altro';
      tipoMap[t] = (tipoMap[t] || 0) + 1;

      const um = a.lvu || a.divisione || 'N/D';
      umMap[um] = (umMap[um] || 0) + 1;
    });

    const topLinee = Object.entries(lineaMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    const topTipi = Object.entries(tipoMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const topUm = Object.entries(umMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const scadenzaPie = [
      { name: 'Regolari', value: total - scaduti - inScadenza, color: '#10b981' },
      { name: 'In Scadenza (≤30gg)', value: inScadenza, color: '#f59e0b' },
      { name: 'Scaduti', value: scaduti, color: '#ef4444' },
    ];

    return {
      total,
      v5Count,
      v3v4Count,
      scaduti,
      inScadenza,
      melaCount,
      mecoCount,
      senzaOdl,
      topLinee,
      topTipi,
      topUm,
      scadenzaPie,
    };
  }, [avvisi]);

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-red-500 font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Cruscotto Direzionale - Territorio Venezia (DOIT VE)
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Monitoraggio Integrato Difetti Armamento & Rallentamenti
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-3xl">
            Sintesi esecutiva delle anomalie di binario (V5), rilievi geometrici diagnostici (V3/V4),
            disposizioni di rallentamento con abbattimento codici (ABBA.CO) e conformità ordini SAP.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('avvisi_v5')}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow"
          >
            <span>Gestione Avvisi V5</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('controlli')}
            className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors border border-slate-600"
          >
            <span>Audit Controlli SAP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* KPI 1: Totale Avvisi */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-sm hover:border-slate-600 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Totale Avvisi</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{stats.total.toLocaleString('it-IT')}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
            <span>Rete DOIT Venezia</span>
          </div>
        </div>

        {/* KPI 2: Avvisi V5 */}
        <div 
          onClick={() => setActiveTab('avvisi_v5')}
          className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-sm hover:border-red-500/60 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Avvisi V5 (Binario)</span>
            <GitCommit className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">{stats.v5Count.toLocaleString('it-IT')}</div>
          <div className="text-xs text-slate-400 mt-1">Interventi ordinari & US</div>
        </div>

        {/* KPI 3: Avvisi V3/V4 */}
        <div 
          onClick={() => setActiveTab('avvisi_v3v4')}
          className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-sm hover:border-cyan-500/60 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Avvisi V3 / V4</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">{stats.v3v4Count.toLocaleString('it-IT')}</div>
          <div className="text-xs text-slate-400 mt-1">Da carrelli VEM1/VEM2</div>
        </div>

        {/* KPI 4: ABBA.CO Rallentamenti */}
        <div 
          onClick={() => setActiveTab('abbaco')}
          className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-sm hover:border-amber-500/60 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Rallentamenti ABBA.CO</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{abbaco.length}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
            <TrendingDown className="w-3 h-3 text-amber-400" />
            <span>Limitazioni velocità</span>
          </div>
        </div>

        {/* KPI 5: Avvisi Scaduti */}
        <div 
          onClick={() => setActiveTab('avvisi_v5')}
          className="bg-slate-800/80 border border-red-900/60 rounded-xl p-4 shadow-sm hover:border-red-500 cursor-pointer transition-colors bg-red-950/20"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-red-300">Scaduti</span>
            <AlertOctagon className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">{stats.scaduti.toLocaleString('it-IT')}</div>
          <div className="text-xs text-red-300 mt-1">Data fine superata</div>
        </div>

        {/* KPI 6: Anomalie SAP (MECO senza ODL) */}
        <div 
          onClick={() => setActiveTab('controlli')}
          className="bg-slate-800/80 border border-amber-900/60 rounded-xl p-4 shadow-sm hover:border-amber-500 cursor-pointer transition-colors bg-amber-950/20"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-300">MECO senza ODL</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono">{stats.senzaOdl.toLocaleString('it-IT')}</div>
          <div className="text-xs text-amber-300 mt-1">Anomalie chiusura SAP</div>
        </div>
      </div>

      {/* Middle Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Difetti per Linea Ferroviaria */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Concentrazione Difetti per Linea Ferroviaria</h3>
              <p className="text-xs text-slate-400">Distribuzione delle segnalazioni sulle direttrici del compartimento</p>
            </div>
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded font-mono">
              Top 7 Linee
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topLinee} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={90} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} name="Numero Avvisi" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Stato Scadenze Difetti */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white tracking-wide">Stato Scadenze Manutenzione</h3>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 mb-4">Analisi temporale rispetto alla data fine richiesta SAP</p>
          </div>
          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.scadenzaPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stats.scadenzaPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/60 text-center">
            {stats.scadenzaPie.map((item, i) => (
              <div key={i} className="text-xs">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-400 truncate text-[11px]">{item.name.split(' ')[0]}</span>
                </div>
                <div className="font-bold text-white font-mono">{item.value.toLocaleString('it-IT')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Tipologie e Rallentamenti in Evidenza */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tipologie di Difetto */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Difetti per Tipologia Componente</h3>
              <p className="text-xs text-slate-400">Classificazione tecnica degli interventi di armamento</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{stats.topTipi.length} categorie</span>
          </div>
          <div className="space-y-3">
            {stats.topTipi.slice(0, 6).map((item, idx) => {
              const pct = ((item.count / stats.total) * 100).toFixed(1);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{item.name}</span>
                    <span className="text-slate-400 font-mono">{item.count.toLocaleString('it-IT')} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${pct}%`,
                        backgroundColor: COLORS[idx % COLORS.length]
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Critical ABBA.CO Speed Restrictions */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Rallentamenti Linea Attivi (ABBA.CO)</h3>
                <p className="text-xs text-slate-400">Limitazioni di velocità in esercizio per cause di armamento</p>
              </div>
              <button
                onClick={() => setActiveTab('abbaco')}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1"
              >
                <span>Vedi tutti</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1">
              {abbaco.slice(0, 5).map((ab, i) => (
                <div key={i} className="bg-slate-900/70 border border-amber-900/40 rounded-lg p-3 hover:border-amber-600/60 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-300 font-mono">{ab.linea}</span>
                    <span className="bg-amber-950 text-amber-400 border border-amber-800 text-xs px-2 py-0.5 rounded font-mono font-semibold">
                      {ab.rid_vel || 'Rallentamento'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">Motivo:</span> {ab.motivo}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 pt-1 border-t border-slate-800">
                    <span>Km: <strong className="text-slate-200">{ab.km_inizio} - {ab.km_fine}</strong></span>
                    <span>Bin: <strong className="text-slate-200">{ab.binario}</strong> | Ch: <strong className="text-slate-200">{ab.chiave_rl}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span>Titolare manutenzione prevalente: <strong>LVU1 / LVU2</strong></span>
            <span className="text-amber-400 font-semibold">{abbaco.length} tratti rallentati</span>
          </div>
        </div>
      </div>
    </div>
  );
};
