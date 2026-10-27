import json

with open('public/assets/aistudio/GPS_03569da7.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

header = [h.strip() for h in lines[0].split('\t')]
print('Header count:', len(header))
print('Header:', header)
print('Total lines:', len(lines))

def parse_num(val):
    if not val or not val.strip():
        return 0.0
    val = val.strip().replace(' ', '')
    # Handle European decimal: e.g. "45,35524569" or "113,254"
    val = val.replace(',', '.')
    try:
        return float(val)
    except:
        return 0.0

gps_lookup = {}
features = []

for line in lines[1:]:
    parts = [p.strip() for p in line.split('\t')]
    if len(parts) < 2:
        continue
    row = dict(zip(header, parts))
    sete = row.get('Sede tecnica', '').strip()
    desc = row.get('Definizione della sede tecnica', '').strip()
    div = row.get('Divis. ubic.', '').strip()
    km_ini = parse_num(row.get('Km. Inizio', ''))
    km_fine = parse_num(row.get('Km. Fine', ''))
    lat_ini = parse_num(row.get('Latitudine Inizio', ''))
    lng_ini = parse_num(row.get('Longitudine Inizio', ''))
    lat_fine = parse_num(row.get('Latitudine Fine', ''))
    lng_fine = parse_num(row.get('Longitudine Fine', ''))
    lat = parse_num(row.get('Latitudine', ''))
    lng = parse_num(row.get('Longitudine', ''))

    if lat == 0.0 and lat_ini != 0.0:
        lat = lat_ini
    if lng == 0.0 and lng_ini != 0.0:
        lng = lng_ini

    if sete and (lat != 0.0 or lat_ini != 0.0):
        entry = {
            'sete': sete,
            'desc': desc,
            'div': div,
            'km_ini': round(km_ini, 3),
            'km_fine': round(km_fine, 3),
            'lat': round(lat, 6),
            'lng': round(lng, 6),
            'lat_ini': round(lat_ini, 6),
            'lng_ini': round(lng_ini, 6),
            'lat_fine': round(lat_fine, 6),
            'lng_fine': round(lng_fine, 6),
            'type': 'TRATTA' if sete.startswith('TR') else 'LOCALITA'
        }
        gps_lookup[sete.upper()] = entry
        
        # Also index by description and words in description
        if desc:
            clean_desc = desc.upper().replace('`', "'").strip()
            gps_lookup[clean_desc] = entry

        # Build LineString for tratte with coordinates
        if sete.startswith('TR') and lat_ini != 0 and lng_ini != 0 and lat_fine != 0 and lng_fine != 0:
            coords = [[lng_ini, lat_ini]]
            if (lat != lat_ini or lng != lng_ini) and (lat != lat_fine or lng != lng_fine):
                coords.append([lng, lat])
            coords.append([lng_fine, lat_fine])
            
            features.append({
                'type': 'Feature',
                'properties': {
                    'sete': sete,
                    'desc': desc,
                    'div': div,
                    'km_ini': km_ini,
                    'km_fine': km_fine
                },
                'geometry': {
                    'type': 'LineString',
                    'coordinates': coords
                }
            })

print(f'Indexed {len(gps_lookup)} lookup entries')
print(f'Generated {len(features)} railway track features')

with open('src/data/gps_reference.json', 'w', encoding='utf-8') as f:
    json.dump(gps_lookup, f, indent=2, ensure_ascii=False)

geojson = {
    'type': 'FeatureCollection',
    'features': features
}
with open('src/data/rfi_tracks_doit_ve.json', 'w', encoding='utf-8') as f:
    json.dump(geojson, f, indent=2, ensure_ascii=False)
print('Done!')
