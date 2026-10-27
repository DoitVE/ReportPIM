import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PdmV5Item } from '../../types';
import { BarChart, Bar, XAxis, YAxis, LabelList, ResponsiveContainer } from 'recharts';
import L from 'leaflet';
import {
  rfiTracksGeoJson,
  lookupGpsCoordinates,
  DEFAULT_DARK_TILE_URL,
  DEFAULT_DARK_TILE_ATTRIBUTION,
  MASTER_LINEE_INRETE,
} from '../../data/gpsService';
import {
  PbiCanvas,
  PbiBox,
  PbiShape,
  PbiText,
  PbiTileSlicer,
  PbiListSlicer,
  PbiButton,
  PBI_COLORS,
  fontSizePx,
} from '../pbi/primitives';

interface PageAvvisiV5Props {
  pdmList: PdmV5Item[];
  dataAggiornamento: string;
  onNavigateToDrill: (item: PdmV5Item) => void;
  onOpenFileLoader?: () => void;
  onLoadDemoData?: () => void;
}

/**
 * Valori di filtro fedeli ai visual `advancedSlicerVisual` / `slicer` del PBIR
 * (pagina "Avvisi V5", id de2fd66484b8de2ad8ed).
 */
const DIVISIONI = ['VEM1', 'VEM2'];
const UNITA_MANUTENTIVE = ['LVU1', 'LVU2', 'LVU3', 'LVU4'];
const CLASSI = ['A', 'B', 'C1', 'C2', 'MANCANTE', 'S1', 'S2'];
const SCADENZE = ['MANCANTE', 'SCAD.<10GG', 'SCAD.<30GG', 'SCAD.<60GG', 'SCAD.>60GG', 'SCADUTO'];
const CLASSIFICAZIONI = [
  'Pdm aperto - Avv. aperto',
  'Pdm aperto - Avv. chiuso',
  'Pdm aperto - Avv. mancante',
  'Pdm chiuso - Avv. aperto',
  'Pdm mancante - Avv. aperto',
];

interface TableColumn {
  key: keyof PdmV5Item;
  label: string;
  width: number;
}

/**
 * Le 20 colonne del `tableEx` nell'ordine del PBIR, con le larghezze esatte
 * estratte da `columnWidth` (PdM e Avviso usano `defaultColumnWidth: 90`).
 */
const TABLE_COLUMNS: TableColumn[] = [
  { key: 'pdm', label: 'PdM', width: 90 },
  { key: 'data_creazione', label: 'Data creazione', width: 68.18181818181819 },
  { key: 'data_scoperta', label: 'Data scoperta', width: 66.69028268559224 },
  { key: 'tolto_dop', label: "Tolto d'op.", width: 38.20606457660532 },
  { key: 'classe', label: 'Classe', width: 24.62934031845992 },
  { key: 'localita_tratta', label: 'Località/Tratta', width: 211.69648874077322 },
  { key: 'osservazioni', label: 'Osservazioni', width: 214.2824374681477 },
  { key: 'avviso', label: 'Avviso', width: 90 },
  { key: 'data_creaz_avviso', label: 'Data creaz. avviso', width: 65.45454545454545 },
  { key: 'km_linea', label: 'Km linea', width: 49.54545454545455 },
  { key: 'tipo_difetto', label: 'Tipo difetto', width: 50 },
  { key: 'pos_difetto', label: 'Pos. difetto', width: 48.02042141495105 },
  { key: 'esegui_to_da', label: 'Eseguito da', width: 43.56279059835603 },
  { key: 'id_sald', label: 'ID sald.', width: 49.13361813367091 },
  { key: 'gara_stato', label: 'Garanz.', width: 32.515144925291125 },
  { key: 'cod_stato', label: 'Cod. stato', width: 33.459567400984156 },
  { key: 'scadenza', label: 'Scadenza', width: 93.26716536321652 },
  { key: 'fine_richiesta', label: 'Fine Rich.', width: 66.79731766615885 },
  { key: 'stato_avviso', label: 'Stato avviso', width: 68.82381500196321 },
  { key: 'classificazione_stato', label: 'Classificazione stato', width: 164.54545454545453 },
];

const TABLE_WIDTH = TABLE_COLUMNS.reduce((sum, c) => sum + c.width, 0);

/** Converte una data "gg/mm/aaaa" in timestamp (le date vuote finiscono in coda). */
const parseDmy = (value?: string): number => {
  if (!value) return Number.POSITIVE_INFINITY;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime() : Number.POSITIVE_INFINITY;
};

/** Conditional formatting del `tableEx` (colori di testo per colonna). */
const cellColor = (key: keyof PdmV5Item, value: string): string | undefined => {
  switch (key) {
    case 'tolto_dop':
      if (value === 'N') return PBI_COLORS.accent;
      if (value === 'S') return PBI_COLORS.good;
      return undefined;
    case 'stato_avviso':
      return value.includes('MECO') ? PBI_COLORS.good : undefined;
    case 'scadenza':
      if (value.includes('<60')) return PBI_COLORS.mid;
      if (value.includes('<30')) return PBI_COLORS.warn;
      if (value.includes('<10')) return PBI_COLORS.accent;
      if (value.includes('MANCANTE')) return PBI_COLORS.accent;
      if (value.includes('SCADUTO')) return PBI_COLORS.accent;
      return undefined;
    case 'classificazione_stato':
      return value.toLowerCase().includes('mancante') ? PBI_COLORS.accent : undefined;
    default:
      return undefined;
  }
};

export const PageAvvisiV5: React.FC<PageAvvisiV5Props> = ({
  pdmList,
  dataAggiornamento,
  onNavigateToDrill,
  onOpenFileLoader,
  onLoadDemoData,
}) => {
  // Stato dei filtri (multi-selezione, come i visual originali)
  const [selectedDivisioni, setSelectedDivisioni] = useState<string[]>([]);
  const [selectedUM, setSelectedUM] = useState<string[]>([]);
  const [selectedClassi, setSelectedClassi] = useState<string[]>([]);
  const [selectedScadenze, setSelectedScadenze] = useState<string[]>([]);
  const [selectedLinee, setSelectedLinee] = useState<string[]>([]);
  const [selectedClassificazioni, setSelectedClassificazioni] = useState<string[]>([]);

  // Riga selezionata (target del drill-through)
  const [selectedRowId, setSelectedRowId] = useState<string>(pdmList[0]?.pdm ?? '');

  // Contenitore Leaflet
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Elenco linee InRete (master Power BI + eventuali valori a dataset)
  const lineeList = useMemo(() => {
    const set = new Set<string>(MASTER_LINEE_INRETE);
    pdmList.forEach((p) => { if (p.linea) set.add(p.linea); });
    return Array.from(set).sort();
  }, [pdmList]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  // Reset Filtri (bookmark "c04aaea21fcfd29747b3" del PBIR)
  const handleResetFilters = () => {
    setSelectedDivisioni([]);
    setSelectedUM([]);
    setSelectedClassi([]);
    setSelectedScadenze([]);
    setSelectedLinee([]);
    setSelectedClassificazioni([]);
  };

  const filtered = useMemo(() => pdmList.filter((item) => {
    if (selectedDivisioni.length > 0 && !selectedDivisioni.includes(item.divisione)) return false;
    if (selectedUM.length > 0 && !selectedUM.includes(item.lvu)) return false;
    if (selectedClassi.length > 0 && !selectedClassi.includes(item.classe)) return false;
    if (selectedScadenze.length > 0 && !selectedScadenze.includes(item.scadenza)) return false;
    if (selectedLinee.length > 0 && !selectedLinee.includes(item.linea)) return false;
    if (selectedClassificazioni.length > 0 && !selectedClassificazioni.includes(item.classificazione_stato)) return false;
    return true;
  }), [pdmList, selectedDivisioni, selectedUM, selectedClassi, selectedScadenze, selectedLinee, selectedClassificazioni]);

  const selectedItem = useMemo(
    () => filtered.find((p) => p.pdm === selectedRowId) ?? filtered[0] ?? pdmList[0],
    [filtered, selectedRowId, pdmList],
  );

  // Righe tabella ordinate per "Fine Rich." ascendente (sort del PBIR)
  const tableRows = useMemo(
    () => [...filtered].sort((a, b) => parseDmy(a.fine_richiesta) - parseDmy(b.fine_richiesta)),
    [filtered],
  );

  // Grafico a barre "Classe Provvedimento" (esclude la classe "-")
  const classeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    CLASSI.forEach((c) => { counts[c] = 0; });
    filtered.forEach((item) => {
      const c = item.classe || 'MANCANTE';
      if (c === '-') return;
      counts[c] = (counts[c] ?? 0) + 1;
    });
    return CLASSI.map((name) => ({ name, count: counts[name] ?? 0 }));
  }, [filtered]);

  // Inizializzazione mappa Leaflet (ESRI Dark Gray, referenceLayer geojson DOIT VE)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [45.58628692317441, 12.281390795000107],
      zoom: 7.22,
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

  // Aggiornamento marker (bubbleLayer: fill #F26D6D, raggio da 6 a 14)
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    const groups: Record<string, { lat: number; lng: number; count: number; name: string; items: PdmV5Item[] }> = {};
    filtered.forEach((item) => {
      const coords = item.lat && item.lng
        ? { lat: item.lat, lng: item.lng }
        : lookupGpsCoordinates(item.sede_tecnica, item.localita_tratta, item.km_linea, item.linea);
      const key = `${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}`;
      if (!groups[key]) groups[key] = { lat: coords.lat, lng: coords.lng, count: 0, name: item.localita_tratta, items: [] };
      groups[key].count++;
      groups[key].items.push(item);
    });

    Object.values(groups).forEach((g) => {
      const radius = Math.min(14, Math.max(6, 6 + Math.sqrt(g.count)));
      L.circleMarker([g.lat, g.lng], {
        radius,
        fillColor: PBI_COLORS.accent,
        fillOpacity: 0.7,
        color: PBI_COLORS.textPrimary,
        weight: 1,
      })
        .bindTooltip(
          `<div style="font-size:11px"><b>${g.name}</b><br/>Punti di misura: ${g.count}</div>`,
          { direction: 'top' },
        )
        .on('click', () => { if (g.items[0]) setSelectedRowId(g.items[0].pdm); })
        .addTo(markersLayerRef.current!);
    });
  }, [filtered]);

  return (
    <PbiCanvas>
      {/* ---------------- Sfondi ---------------- */}
      <PbiShape x={640} y={0} w={640} h={453.63636363636363} z={10} fill="#000000" radius={2} />
      <PbiShape x={0} y={479.09090909090907} w={1280} h={240.90909090909088} z={10} fill={PBI_COLORS.band} radius={5} />

      {/* Pannelli dei filtri */}
      <PbiShape x={0} y={65.6689342403628} w={169.04761904761904} h={85.714285714285708} z={20} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={0} y={142} w={650} h={85} z={20} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={158} y={66} w={299} h={85} z={20} fill={PBI_COLORS.card} radius={8} />
      <PbiShape x={0} y={216.15384615384616} w={650} h={90} z={20} fill={PBI_COLORS.card} radius={8} stroke={PBI_COLORS.tileBorder} strokeWidth={1} />

      {/* Pannelli contenuto */}
      <PbiShape x={0} y={296.15384615384613} w={210.76923076923077} h={193.07692307692307} z={21} fill={PBI_COLORS.card} radius={5} />
      <PbiShape x={201} y={296} w={256} h={193} z={21} fill={PBI_COLORS.panel} radius={5} />
      <PbiShape x={447} y={296} w={202} h={193} z={21} fill={PBI_COLORS.card} radius={5} />
      <PbiShape x={447} y={66} w={203} h={86} z={21} fill={PBI_COLORS.panel} radius={7} />

      {/* ---------------- Intestazione ---------------- */}
      <PbiBox x={10} y={4} w={200} h={58} z={18000}>
        <img
          src="/assets/logo_ufficiale.png"
          alt="RFI"
          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }}
        />
      </PbiBox>
      <PbiText x={220} y={4} w={380} h={28} z={16000}
        text="Difetti di binario - DOIT VE" sizePt={20} bold color={PBI_COLORS.accent} />
      <PbiText x={220} y={34} w={90} h={25} z={20000} text="Avvisi V5" sizePt={15} bold color={PBI_COLORS.textLight} />
      <PbiText x={315} y={33} w={55} h={26} z={19000} text="Dati al:" sizePt={11}
        color={PBI_COLORS.textMuted} align="right" vAlign="middle" />
      <PbiText x={375} y={33} w={150} h={26} z={17000} text={dataAggiornamento} sizePt={11}
        color={PBI_COLORS.textLight} vAlign="middle" />
      <PbiButton x={545} y={26} w={95} h={34} z={25000} label="Reset Filtri" onClick={handleResetFilters} />

      {/* ---------------- Etichette dei filtri ---------------- */}
      <PbiText x={28.571428571428566} y={86.190476190476176} w={112.38095238095238} h={18} z={9000}
        text="Divisione" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} padding={2} />
      <PbiText x={190.441} y={83.944} w={228.71066907775767} h={17.944444444444446} z={2000}
        text="Unità Manutentiva" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.slicerHeader} padding={2} />
      <PbiText x={28.75} y={161.875} w={590.625} h={16.875} z={5000}
        text="Classe Provvedimento" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.slicerHeader} padding={2} />
      <PbiText x={28.46153846153846} y={234.34319526627218} w={590} h={16.923076923076923} z={2000}
        text="Scadenza Avviso" sizePt={8} color={PBI_COLORS.textMuted} background={PBI_COLORS.canvas} padding={2} />

      {/* ---------------- Slicer a tile ---------------- */}
      <PbiTileSlicer x={11} y={107} w={147} h={28} z={7000}
        options={DIVISIONI} value={selectedDivisioni} onToggle={(v) => toggle(setSelectedDivisioni, v)} />
      <PbiTileSlicer x={169} y={104} w={277} h={30} z={1000}
        options={UNITA_MANUTENTIVE} value={selectedUM} onToggle={(v) => toggle(setSelectedUM, v)} />
      <PbiTileSlicer x={12} y={183} w={621} h={28} z={4000}
        options={CLASSI} value={selectedClassi} onToggle={(v) => toggle(setSelectedClassi, v)} />
      <PbiTileSlicer x={10} y={259.076923076923} w={628.46153846153845} h={28.46153846153846} z={1000}
        options={SCADENZE} value={selectedScadenze} onToggle={(v) => toggle(setSelectedScadenze, v)} />

      {/* ---------------- Slicer a elenco ---------------- */}
      <PbiListSlicer x={13.076923076923077} y={308} w={179.23076923076923} h={168} z={15000}
        title="Linea InRete" options={lineeList} value={selectedLinee} onToggle={(v) => toggle(setSelectedLinee, v)} />
      <PbiListSlicer x={455} y={308} w={178} h={128} z={27000}
        title="Classificazione stato" options={CLASSIFICAZIONI} value={selectedClassificazioni}
        onToggle={(v) => toggle(setSelectedClassificazioni, v)} itemColor={PBI_COLORS.textLight} />

      {/* ---------------- KPI Num. difetti ---------------- */}
      <PbiText x={457} y={70} w={175} h={22} z={22000} text="Num. difetti" sizePt={11} color={PBI_COLORS.textLight} align="center" />
      <PbiBox x={457} y={88} w={175} h={55} z={21000} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: fontSizePx(35), color: PBI_COLORS.accent, lineHeight: 1 }}>{filtered.length}</span>
      </PbiBox>

      {/* ---------------- Grafico a barre Classe Provvedimento ---------------- */}
      <PbiBox x={205} y={298} w={235} h={180} z={11000} style={{ overflow: 'hidden' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={classeChartData} margin={{ top: 5, right: 26, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={64}
              tick={{ fill: PBI_COLORS.textLight, fontSize: 11 }} />
            <Bar dataKey="count" fill={PBI_COLORS.accent} isAnimationActive={false} barSize={14}>
              <LabelList dataKey="count" position="right" fill={PBI_COLORS.textLight} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </PbiBox>

      {/* ---------------- Mappa ---------------- */}
      <PbiBox x={656.36363636363626} y={17.27272727272727} w={605.45454545454538} h={420} z={8000} style={{ overflow: 'hidden' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </PbiBox>

      {/* ---------------- Drill PdM/avviso ---------------- */}
      <PbiButton x={500} y={444} w={130} h={34} z={26500} variant="light"
        label="Drill PdM/avviso" disabled={!selectedItem} onClick={() => selectedItem && onNavigateToDrill(selectedItem)} />

      {/* ---------------- Tabella (20 colonne) ---------------- */}
      <PbiBox x={14.545454545454545} y={486} w={1250.9090909090908} h={222} z={24000}
        style={{ border: `2px solid ${PBI_COLORS.accent}`, overflow: 'hidden', background: PBI_COLORS.tableRowSecondary }}>
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
                      borderRight: `1px solid ${PBI_COLORS.accent}`,
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
              {tableRows.map((row, i) => {
                const isSelected = row.pdm === selectedRowId;
                return (
                  <tr
                    key={`${row.pdm}-${i}`}
                    onClick={() => setSelectedRowId(row.pdm)}
                    style={{
                      background: isSelected ? '#000000' : (i % 2 === 0 ? PBI_COLORS.tableRowPrimary : PBI_COLORS.tableRowSecondary),
                      cursor: 'pointer',
                    }}
                  >
                    {TABLE_COLUMNS.map((c) => {
                      const raw = row[c.key];
                      const value = raw === undefined || raw === null ? '' : String(raw);
                      const color = cellColor(c.key, value);
                      return (
                        <td
                          key={c.key}
                          title={value}
                          style={{
                            padding: '2px 4px',
                            color: color ?? PBI_COLORS.textPrimary,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            boxShadow: isSelected && c.key === 'pdm' ? `inset 2px 0 0 ${PBI_COLORS.accent}` : undefined,
                          }}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PbiBox>

      {/* ---------------- Stato vuoto (web app non alimentata) ---------------- */}
      {pdmList.length === 0 && (
        <PbiBox x={0} y={0} w={1280} h={720} z={30000}
          style={{ background: 'rgba(0,0,0,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <span style={{ color: PBI_COLORS.textPrimary, fontSize: 15, fontWeight: 700 }}>Web app non alimentata (0 record)</span>
          <span style={{ color: PBI_COLORS.textMuted, fontSize: 12 }}>
            Alimenta la web app con i file SAP (es. ZSTMAIA) oppure carica i dati demo.
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {onOpenFileLoader && (
              <button
                type="button"
                onClick={onOpenFileLoader}
                style={{ background: PBI_COLORS.accent, color: '#111', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
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
