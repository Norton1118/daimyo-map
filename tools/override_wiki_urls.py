import json
from pathlib import Path

p = Path('data/daimyo_castles.geojson')
with p.open('r', encoding='utf-8-sig') as f:
    gj = json.load(f)

hits = 0
for ft in gj.get('features', []):
    props = ft.get('properties', {})
    name  = (props.get('Han_Name') or props.get('Name') or '').lower()
    if name.startswith('itoigawa'):
        props['Wikipedia_URL'] = 'https://en.wikipedia.org/wiki/Itoigawa_Domain'
        hits += 1

with p.open('w', encoding='utf-8') as f:
    json.dump(gj, f, ensure_ascii=False, indent=2)

print(f'Updated {hits} feature(s).')
