import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AbbacoItem, Avviso } from '../../types';
import { BarChart, Bar, XAxis, YAxis, LabelList, ResponsiveContainer } from 'recharts';
import L from 'leaflet';
import {
  rfiTracksGeoJson,
  lookupGpsCoordinates,
  DEFAULT_DARK_TILE_URL,
  DEFAULT_DARK_TILE_ATTRIBUTION,
} from '../../data/gpsService';
import {
  PbiCanvas,
  PbiBox,
  PbiShape,
  PbiText,
  PbiTileSlicer,
  PbiButton,
  PBI_COLORS,
  fontSizePx,
} from '../pbi/primitives';

interface PageAbbacoProps {
  abbaco: AbbacoItem[];
  avvisi: Avviso[];
  dataAggiornamento: string;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

/* -------------------- Palette (dai visual.json PBIR) -------------------- */
const RED = PBI_COLORS.accent; // #F26D6D
const YELLOW = PBI_COLORS.warn; // #F5C26B

interface AbbacoColumn {
  key: string;
  label: string;
  width: number;
  value: (r: AbbacoItem) => string;
}

/**
 * Le 12 colonne del `tableEx` nell'ordine dei ROLE Values del PBIR, con le
 * larghezze esatte (`columnWidth`; Binario/Titolare/Data fine usano
 * `defaultColumnWidth: 90`).
 */
const TABLE_COLUMNS: AbbacoColumn[] = [
  { key: 'linea', label: 'Linea', width: 128.3242951027215, value: (r) => r.linea },
  { key: 'tratta', label: 'Tratta', width: 172.4336040456551, value: (r) => r.tratta },
  { key: 'chiave_rl', label: 'chiave_RL', width: 159.2904169714704, value: (r) => r.chiave_rl },
  { key: 'rid_vel', label: 'Rid. Vel. (km/h)', width: 67.52743233357717, value: (r) => r.rid_vel },
  { key: 'binario', label: 'Binario (P/D/L)', width: 90, value: (r) => r.binario },
  { key: 'inizio', label: 'Inizio', width: 57.22750548646671, value: (r) => r.km_inizio },
  { key: 'fine', label: 'Fine', width: 62.84564740307242, value: (r) => r.km_fine },
  { key: 'motivo', label: 'Motivo', width: 167.6248607916895, value: (r) => r.motivo },
  { key: 'data_inizio', label: 'Data inizio', width: 67.52740379303293, value: (r) => r.data_inizio ?? '' },
  { key: 'titolare', label: 'Titolare del rallentamento (matr.)', width: 90, value: (r) => r.titolare },
  { key: 'pianificazione', label: 'Pianificazione', width: 68.46378931967813, value: () => '' },
  { key: 'data_fine', label: 'Data fine', width: 90, value: (r) => r.data_fine ?? '' },
];

const TABLE_WIDTH = TABLE_COLUMNS.reduce((sum, c) => sum + c.width, 0);

export const PageAbbaco: React.FC<PageAbbacoProps> = ({
  abbaco,
  avvisi,
  dataAggiornamento,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Slicer a tile: "Divis. ubic." (LO-TR) e "LVU" (LO-TR)
  const [selectedDivisioni, setSelectedDivisioni] = useState<string[]>([]);
  const [selectedUM, setSelectedUM] = useState<string[]>([]);
  // Slicer a tile ABBACO
  const [selectedLinee, setSelectedLinee] = useState<string[]>([]);
  const [selectedBinari, setSelectedBinari] = useState<string[]>([]);

  // Contenitore Leaflet
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  const uniq = (values: string[]): string[] => {
    const set = new Set<string>();
    values.forEach((v) => { if (v) set.add(v); });
    return Array.from(set).sort();
  };

  // Domini degli slicer: Linea/Binario da ABBA.CO, Divisione/UM dalla LO-TR (avvisi)
  const lineeList = useMemo(() => uniq(abbaco.map((r) => r.linea)), [abbaco]);
  const binariList = useMemo(() => uniq(abbaco.map((r) => r.binario)), [abbaco]);
  const umList = useMemo(() => uniq(abbaco.map((r) => r.titolare)), [abbaco]);
  const divisioniList = useMemo(() => uniq(avvisi.map((a) => a.divisione)), [avvisi]);

  const handleResetFilters = () => {
    setSelectedDivisioni([]);
    setSelectedUM([]);
    setSelectedLinee([]);
    setSelectedBinari([]);
  };

  // Filtri applicati alla tabella ABBA.CO
  const filtered = useMemo(() => abbaco.filter((item) => {
    if (selectedLinee.length > 0 && !selectedLinee.includes(item.linea)) return false;
    if (selectedBinari.length > 0 && !selectedBinari.includes(item.binario)) return false;
    if (selectedUM.length > 0 && !selectedUM.includes(item.titolare)) return false;
    return true;
  }), [abbaco, selectedLinee, selectedBinari, selectedUM]);

  // Bar chart "Numero Rallentamenti": Category = Linea, Y = CountNonNull(chiave_RL)
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      if (!r.linea) return;
      counts[r.linea] = (counts[r.linea] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [filtered]);

  // Inizializzazione mappa (grayscale_dark + referenceLayer DOIT VE)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [45.304095705167896, 11.98123664000002],
      zoom: 8.71,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(DEFAULT_DARK_TILE_URL, {
      attribution: DEFAULT_DARK_TILE_ATTRIBUTION,
      maxZoom: 16,
    }).addTo(map);

    try {
      L.geoJSON(rfiTracksGeoJson as any, {
        style: () => ({ color: PBI_COLORS.textLight, weight: 2, opacity: 0.85 }),
      }).addTo(map);
    } catch (e) {
      console.warn('GeoJSON render error:', e);
    }

    const markers = L.layerGroup().addTo(map);
    markersLayerRef.current = markers;
    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 150);
  }, []);

  // Aggiornamento marker (bubbleLayer: fill #F5C26B, raggio 6-14 in base al conteggio)
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    const groups: Record<string, { lat: number; lng: number; count: number; name: string }> = {};
    filtered.forEach((item) => {
      const coords = lookupGpsCoordinates(undefined, item.tratta, item.km_inizio, item.linea);
      const key = `${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}`;
      if (!groups[key]) groups[key] = { lat: coords.lat, lng: coords.lng, count: 0, name: item.tratta };
      groups[key].count++;
    });

    Object.values(groups).forEach((g) => {
      const radius = Math.min(14, Math.max(6, 6 + Math.sqrt(g.count)));
      L.circleMarker([g.lat, g.lng], {
        radius,
        fillColor: YELLOW,
        fillOpacity: 0.7,
        color: PBI_COLORS.textLight,
        weight: 1,
      })
        .bindTooltip(
          `<div style="font-size:11px"><b>${g.name}</b><br/>Rallentamenti: ${g.count}</div>`,
          { direction: 'top' },
        )
        .addTo(markersLayerRef.current!);
    });
  }, [filtered]);

  return (
    <PbiCanvas>
      {/* ================= Sfondi / pannelli ================= */}
      <PbiShape x={0} y={216.15384615384616} w={650} h={90} z={0} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={158} y={66} w={299} h={85} z={0} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={640} y={0} w={640} h={488.18181818181813} z={0} fill="#000000" radius={2} />
      <PbiShape x={0} y={142} w={650} h={85} z={1000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={447} y={66} w={203} h={86} z={2000} fill={PBI_COLORS.panel} radius={7} />
      <PbiShape x={0} y={65.6689342403628} w={169.04761904761904} h={85.71428571428571} z={3000} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={0} y={295.88880760790056} w={649.8317483540601} h={192.88953913679592} z={6000} fill={PBI_COLORS.panel} radius={5} />
      <PbiShape x={0} y={479.09090909090907} w={1280} h={240.90909090909088} z={21000} fill={PBI_COLORS.band} radius={5} />

      {/* ================= Etichette dei filtri ================= */}
      <PbiText x={28.571428571428566} y={86.19047619047618} w={112.38095238095238} h={18} z={9000}
        text="Divisione" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} padding={2} />
      <PbiText x={190.44122965641952} y={83.94444444444446} w={228.71066907775767} h={17.944444444444446} z={2000}
        text="Unità Manutentiva" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} padding={2} />
      <PbiText x={28.75} y={161.875} w={590.625} h={16.875} z={5000}
        text="Linea" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} padding={2} />
      <PbiText x={29.09090909090909} y={233.35664335664336} w={590.4545454545454} h={21.363636363636363} z={2000}
        text="Scadenza Avviso" sizePt={9} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} padding={2} />

      {/* ================= Slicer a tile ================= */}
      <PbiTileSlicer x={11} y={107} w={147} h={28} z={7000}
        options={divisioniList} value={selectedDivisioni} onToggle={(v) => toggle(setSelectedDivisioni, v)} />
      <PbiTileSlicer x={169} y={104} w={277} h={30} z={1000}
        options={umList} value={selectedUM} onToggle={(v) => toggle(setSelectedUM, v)} />
      <PbiTileSlicer x={12} y={183} w={621} h={28} z={4000}
        options={lineeList} value={selectedLinee} onToggle={(v) => toggle(setSelectedLinee, v)} />
      <PbiTileSlicer x={10} y={259.2307692307692} w={628.4615384615385} h={28.46153846153846} z={1000}
        options={binariList} value={selectedBinari} onToggle={(v) => toggle(setSelectedBinari, v)} />

      {/* ================= Intestazione ================= */}
      <PbiBox x={10} y={3.846153846153846} w={210} h={61.53846153846153} z={16000}>
        <img
          src="/assets/logo_ufficiale.png"
          alt="RFI"
          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }}
        />
      </PbiBox>
      <PbiText x={233.07692307692307} y={3.846153846153846} w={343.8461538461538} h={27.69230769230769} z={14000}
        text="Abbatimento Codici - DOIT VE" sizePt={20} bold color={RED} />
      <PbiText x={233} y={35} w={84} h={25} z={18000}
        text="ABBA.CO" sizePt={15} bold color={PBI_COLORS.textLight} background={PBI_COLORS.canvas} />
      <PbiText x={335.7240205753123} y={33.188689916520104} w={70} h={27} z={17000}
        text="Dati al:" sizePt={12} color={PBI_COLORS.textMuted} align="right" vAlign="middle" background={PBI_COLORS.canvas} padding={2} />
      <PbiText x={397.6470974983892} y={34.26561299344317} w={130.76923076923077} h={26.923076923076923} z={15000}
        text={dataAggiornamento} sizePt={12} color={PBI_COLORS.textLight} align="center" vAlign="middle" background={PBI_COLORS.canvas} padding={2} />

      {/* ================= Reset Filtri ================= */}
      <PbiButton x={554} y={31} w={96.36363636363636} h={44.54545454545454} z={23000}
        label="Reset Filtri" onClick={handleResetFilters} />

      {/* ================= KPI Num. Rallentamenti ================= */}
      <PbiText x={456.9422092172641} y={72.09948792977323} w={161.98975859546454} h={28.09070958302853} z={20000}
        text="Num. Rallentamenti" sizePt={12} color={PBI_COLORS.textLight} />
      <PbiBox x={457} y={82} w={181} h={59} z={19000} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: fontSizePx(35), color: YELLOW, lineHeight: 1 }}>{filtered.length}</span>
      </PbiBox>

      {/* ================= Bar chart Numero Rallentamenti ================= */}
      <PbiText x={29.027066569129484} y={316.48866130212144} w={537.4689100219459} h={19.663496708119972} z={10000}
        text="Numero Rallentamenti" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} padding={2} />
      <PbiBox x={29.027066569129484} y={323.0431602048281} w={603.9502560351134} h={159.18068763716167} z={11000} style={{ overflow: 'hidden' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 26, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={110}
              tick={{ fill: PBI_COLORS.textLight, fontSize: 11 }} />
            <Bar dataKey="count" fill={YELLOW} isAnimationActive={false} barSize={14}>
              <LabelList dataKey="count" position="right" fill={PBI_COLORS.textLight} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </PbiBox>

      {/* ================= Mappa ================= */}
      <PbiBox x={656.3636363636363} y={17.27272727272727} w={605.4545454545454} h={454.5454545454545} z={8000} style={{ overflow: 'hidden' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </PbiBox>

      {/* ================= Tabella (12 colonne) ================= */}
      <PbiBox x={14.545454545454545} y={491.81818181818176} w={1250.9090909090908} h={214.54545454545453} z={22000}
        style={{ border: `2px solid ${RED}`, overflow: 'hidden', background: PBI_COLORS.tableRowSecondary }}>
        <div className="scrollbar-thin" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: TABLE_WIDTH, fontSize: fontSizePx(8) }}>
            <colgroup>
              {TABLE_COLUMNS.map((c) => <col key={c.key} style={{ width: c.width }} />)}
            </colgroup>
            <thead>
              <tr>
                {TABLE_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      background: PBI_COLORS.tableHeader,
                      color: PBI_COLORS.textPrimary,
                      fontWeight: 400,
                      textAlign: 'left',
                      padding: '3px 4px',
                      borderRight: `1px solid ${YELLOW}`,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={`${row.chiave_rl}-${i}`}
                  style={{ background: i % 2 === 0 ? PBI_COLORS.tableRowPrimary : PBI_COLORS.tableRowSecondary }}
                >
                  {TABLE_COLUMNS.map((c) => {
                    const value = c.value(row);
                    return (
                      <td
                        key={c.key}
                        title={value}
                        style={{
                          padding: '2px 4px',
                          color: PBI_COLORS.textPrimary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PbiBox>

      {/* ================= Stato vuoto ================= */}
      {abbaco.length === 0 && (
        <PbiBox x={0} y={0} w={1280} h={720} z={65000}
          style={{ background: 'rgba(0,0,0,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <span style={{ color: PBI_COLORS.textPrimary, fontSize: 15, fontWeight: 700 }}>Web app non alimentata (0 rallentamenti)</span>
          <span style={{ color: PBI_COLORS.textMuted, fontSize: 12 }}>
            Alimenta la web app con il file ABBA.CO oppure carica i dati demo.
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {onOpenFileLoader && (
              <button
                type="button"
                onClick={onOpenFileLoader}
                style={{ background: RED, color: '#111', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Alimenta Web App
              </button>
            )}
            {onLoadDemoData && (
              <button
                type="button"
                onClick={onLoadDemoData}
                style={{ background: PBI_COLORS.button, color: PBI_COLORS.textLight, border: `1px solid ${PBI_COLORS.tileBorder}`, borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Carica Demo
              </button>
            )}
          </div>
        </PbiBox>
      )}
    </PbiCanvas>
  );
};
