import gpsDataRaw from './gps_reference.json';
import rfiTracksGeoJsonRaw from './rfi_tracks_doit_ve.json';

export interface GpsRecord {
  sete: string;
  desc: string;
  div: string;
  km_ini: number;
  km_fine: number;
  lat: number;
  lng: number;
  lat_ini: number;
  lng_ini: number;
  lat_fine: number;
  lng_fine: number;
  type: 'LOCALITA' | 'TRATTA';
}

export const gpsLookupTable = gpsDataRaw as Record<string, GpsRecord>;
export const rfiTracksGeoJson = rfiTracksGeoJsonRaw;

/**
 * Open, zero-key Basemaps for Leaflet (No API Key, No Watermark)
 */
export const OPEN_BASEMAPS = {
  esriDark: {
    name: 'ESRI Dark Gray (Power BI GIS - No API Key)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    subdomains: '',
    maxZoom: 16,
  },
  openRailwayMap: {
    name: 'OpenRailwayMap (Infrastruttura Ferroviaria Mondiale)',
    url: 'https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
    attribution: 'Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Style &copy; <a href="https://www.OpenRailwayMap.org">OpenRailwayMap</a>',
    subdomains: 'abc',
    maxZoom: 19,
  },
  osmStandard: {
    name: 'OpenStreetMap Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: '',
    maxZoom: 19,
  },
  esriLight: {
    name: 'ESRI Light Gray (Chiara)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    subdomains: '',
    maxZoom: 16,
  },
};

export const DEFAULT_DARK_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
export const DEFAULT_DARK_TILE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';

/**
 * Extracts base Sede Tecnica code (e.g. "LO0364-AB-01" -> "LO0364", "TR0148/BIN1" -> "TR0148")
 */
export function extractBaseSede(input?: string): string | null {
  if (!input) return null;
  const match = input.toUpperCase().match(/\b(LO\d{4}|TR\d{4}|TR\d{3}|LO\d{3})\b/);
  return match ? match[1] : null;
}

/**
 * Parse Italian or standard decimal number from string (e.g. "230,618" -> 230.618)
 */
export function parseItalianNumber(val?: string | number): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = String(val).trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

/**
 * Lookup GPS coordinates for any SAP item by:
 * 1. Base Sede Tecnica (LOxxxx / TRxxxx)
 * 2. If it's a TRATTA and km is provided, linear interpolation between start and end
 * 3. Text description / station name match
 * 4. Fallback line center if nothing else matches
 */
export function lookupGpsCoordinates(
  sedeTecnica?: string,
  localitaOrDesc?: string,
  kmVal?: string | number,
  linea?: string
): { lat: number; lng: number; matchedBy: string; sete: string } {
  // 1. Direct or extracted Sede Tecnica code
  const baseCode = extractBaseSede(sedeTecnica);
  if (baseCode && gpsLookupTable[baseCode]) {
    const rec = gpsLookupTable[baseCode];

    // If it's a Tratta and we have km coordinates, interpolate!
    const km = parseItalianNumber(kmVal);
    if (
      rec.type === 'TRATTA' &&
      km > 0 &&
      rec.km_ini > 0 &&
      rec.km_fine > rec.km_ini &&
      rec.lat_ini !== 0 &&
      rec.lat_fine !== 0
    ) {
      const clampedKm = Math.max(rec.km_ini, Math.min(rec.km_fine, km));
      const ratio = (clampedKm - rec.km_ini) / (rec.km_fine - rec.km_ini);
      const lat = rec.lat_ini + (rec.lat_fine - rec.lat_ini) * ratio;
      const lng = rec.lng_ini + (rec.lng_fine - rec.lng_ini) * ratio;
      return {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        matchedBy: `TRATTA_KM_${clampedKm}`,
        sete: rec.sete,
      };
    }

    if (rec.lat !== 0 && rec.lng !== 0) {
      return {
        lat: rec.lat,
        lng: rec.lng,
        matchedBy: `SEDE_${rec.sete}`,
        sete: rec.sete,
      };
    }
  }

  // 2. Direct match on localitaOrDesc (e.g. "VENEZIA MESTRE", "ABANO TERME", "ROVIGO")
  if (localitaOrDesc) {
    const normalized = localitaOrDesc.toUpperCase().replace(/[`']/g, "'").trim();
    if (gpsLookupTable[normalized]) {
      const rec = gpsLookupTable[normalized];
      return {
        lat: rec.lat,
        lng: rec.lng,
        matchedBy: `LOCALITA_${rec.desc}`,
        sete: rec.sete,
      };
    }

    // Try finding by station keyword
    for (const key of Object.keys(gpsLookupTable)) {
      if (key.length > 4 && (normalized.includes(key) || key.includes(normalized))) {
        const rec = gpsLookupTable[key];
        if (rec.lat !== 0 && rec.lng !== 0) {
          return {
            lat: rec.lat,
            lng: rec.lng,
            matchedBy: `KEYWORD_${rec.desc}`,
            sete: rec.sete,
          };
        }
      }
    }
  }

  // 3. Fallback based on Line name in Veneto region
  const lin = (linea || '').toUpperCase();
  if (lin.includes('MESTRE') || lin.includes('VENEZIA')) {
    return { lat: 45.4821, lng: 12.2321, matchedBy: 'LINEA_VE', sete: 'LO3002' };
  }
  if (lin.includes('PADOVA')) {
    return { lat: 45.4178, lng: 11.8808, matchedBy: 'LINEA_PD', sete: 'LO2000' };
  }
  if (lin.includes('TREVISO')) {
    return { lat: 45.6596, lng: 12.2462, matchedBy: 'LINEA_TV', sete: 'LO2922' };
  }
  if (lin.includes('ROVIGO') || lin.includes('BOLOGNA')) {
    return { lat: 45.0770, lng: 11.7809, matchedBy: 'LINEA_RO', sete: 'LO2445' };
  }
  if (lin.includes('BELLUNO') || lin.includes('CALALZO') || lin.includes('CADORE')) {
    return { lat: 46.1416, lng: 12.2097, matchedBy: 'LINEA_BL', sete: 'LO0625' };
  }
  if (lin.includes('TRIESTE') || lin.includes('PORTOGRUARO')) {
    return { lat: 45.7814, lng: 12.8324, matchedBy: 'LINEA_TS', sete: 'LO2261' };
  }

  // DOIT Venezia geographical centroid
  return { lat: 45.485, lng: 12.215, matchedBy: 'DEFAULT_DOIT_VE', sete: 'LO3002' };
}

/**
 * Master List of all 19 Linee InRete for DOIT Venezia from Power BI
 */
export const MASTER_LINEE_INRETE = [
  'Bologna-Padova',
  'Calalzo-Castelfranco',
  'Camposampiero-Bassano',
  'Castelfranco-Mestre',
  'Castelfranco-Padova',
  'Confluenza Milano-Trento',
  'Mestre-Trieste',
  'Mestre-Udine',
  'Milano-Venezia',
  'Milano-Venezia (AC/AV)',
  'Montebelluna-Treviso',
  'Nodo di Padova',
  'Ponte nelle Alpi-Conegliano',
  'Rovigo-Chioggia',
  'Scali Venezia Mestre',
  'Trento-Castelfranco',
  'Treviso-Portogruaro',
  'Venezia Marittima-Venezia',
  'Vicenza-Treviso'
];
