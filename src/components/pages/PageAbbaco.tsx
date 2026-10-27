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
  { key: 'linea', label: 'Linea', width: 110, value: (r) => r.linea },
  { key: 'tratta', label: 'Tratta', width: 155, value: (r) => r.tratta },
  { key: 'chiave_rl', label: 'Chiave RL', width: 130, value: (r) => r.chiave_rl },
  { key: 'rid_vel', label: 'Rid. Vel. (km/h)', width: 85, value: (r) => r.rid_vel },
  { key: 'binario', label: 'Binario (P/D/L)', width: 95, value: (r) => r.binario },
  { key: 'inizio', label: 'Inizio', width: 65, value: (r) => r.km_inizio },
  { key: 'fine', label: 'Fine', width: 65, value: (r) => r.km_fine },
  { key: 'motivo', label: 'Motivo', width: 150, value: (r) => r.motivo },
  { key: 'data_inizio', label: 'Data inizio', width: 85, value: (r) => r.data_inizio ?? '' },
  { key: 'titolare', label: 'Titolare del rallentamento', width: 115, value: (r) => r.titolare },
  { key: 'pianificazione', label: 'Data pianificata', width: 90, value: () => '' },
  { key: 'data_fine', label: 'Data fine', width: 85, value: (r) => r.data_fine ?? '' },
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
      <PbiShape x={15} y={66} w={100} h={68} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={122} y={66} w={220} h={68} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={350} y={66} w={140} h={68} z={0} fill={PBI_COLORS.panel} radius={6} />

      <PbiShape x={15} y={140} w={476} h={64} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={15} y={210} w={476} h={64} z={0} fill={PBI_COLORS.card} radius={6} />
      <PbiShape x={15} y={282} w={476} h={190} z={0} fill={PBI_COLORS.panel} radius={6} />

      {/* ================= Intestazione ================= */}
      <PbiBox x={15} y={8} w={150} h={48} z={16000}>
        <img
          src="/assets/logo_ufficiale.png"
          alt="RFI"
          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }}
        />
      </PbiBox>
      <PbiText x={180} y={8} w={340} h={26} z={14000}
        text="Abbattimento Codici - DOIT VE" sizePt={16} bold color={RED} />
      <PbiText x={180} y={34} w={75} h={20} z={18000}
        text="ABBA.CO" sizePt={12} bold color={PBI_COLORS.textLight} />
      <PbiText x={258} y={35} w={45} h={18} z={17000}
        text="Dati al:" sizePt={9} color={PBI_COLORS.textMuted} align="right" vAlign="middle" />
      <PbiText x={306} y={35} w={105} h={18} z={15000}
        text={dataAggiornamento} sizePt={9.5} color={PBI_COLORS.textLight} vAlign="middle" />

      {/* ================= Reset Filtri ================= */}
      <PbiButton x={415} y={32} w={65} h={24} z={23000}
        label="Reset Filtri" sizePt={8} onClick={handleResetFilters} />

      {/* ================= Etichette dei filtri ================= */}
      <PbiText x={22} y={72} w={85} h={16} z={9000}
        text="Divisione" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={128} y={72} w={205} h={16} z={2000}
        text="Unità Manutentiva" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={22} y={144} w={460} h={16} z={5000}
        text="Linea" sizePt={8} color={PBI_COLORS.textMuted} />
      <PbiText x={22} y={214} w={460} h={16} z={2000}
        text="Scadenza Avviso" sizePt={8.5} color={PBI_COLORS.textMuted} />
      <PbiText x={22} y={288} w={460} h={16} z={10000}
        text="Numero Rallentamenti" sizePt={8} color={PBI_COLORS.textMuted} />

      {/* ================= Slicer a tile ================= */}
      <PbiTileSlicer x={20} y={94} w={90} h={28} z={7000}
        options={divisioniList} value={selectedDivisioni} onToggle={(v) => toggle(setSelectedDivisioni, v)} />
      <PbiTileSlicer x={126} y={94} w={210} h={28} z={1000}
        options={umList} value={selectedUM} onToggle={(v) => toggle(setSelectedUM, v)} />
      <PbiTileSlicer x={20} y={166} w={465} h={28} z={4000}
        options={lineeList} value={selectedLinee} onToggle={(v) => toggle(setSelectedLinee, v)} />
      <PbiTileSlicer x={20} y={236} w={465} h={28} z={1000}
        options={binariList} value={selectedBinari} onToggle={(v) => toggle(setSelectedBinari, v)} />

      {/* ================= KPI Num. Rallentamenti ================= */}
      <PbiText x={350} y={72} w={140} h={18} z={20000}
        text="Num. Rallentamenti" sizePt={9.5} color={PBI_COLORS.textLight} align="center" />
      <PbiBox x={350} y={88} w={140} h={42} z={19000} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: fontSizePx(30), fontWeight: 700, color: YELLOW, lineHeight: 1 }}>{filtered.length}</span>
      </PbiBox>

      {/* ================= Bar chart Numero Rallentamenti ================= */}
      <PbiBox x={20} y={306} w={465} h={160} z={11000} style={{ overflow: 'hidden' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={115}
              tick={{ fill: PBI_COLORS.textLight, fontSize: 10 }} />
            <Bar dataKey="count" fill={YELLOW} isAnimationActive={false} barSize={14} radius={[0, 2, 2, 0]}>
              <LabelList dataKey="count" position="right" fill={PBI_COLORS.textLight} fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </PbiBox>

      {/* ================= Mappa ================= */}
      <PbiBox x={505} y={10} w={760} h={462} z={8000} style={{ overflow: 'hidden', borderRadius: 4 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </PbiBox>

      {/* ================= Tabella (12 colonne) ================= */}
      <PbiBox x={15} y={482} w={1250} h={228} z={22000}
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
