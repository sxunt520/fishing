const fs = require('fs');
const path = require('path');

const file = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-gaode-map',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'gaodemap',
  'ExpoGaodeMapView.kt',
);

if (!fs.existsSync(file)) {
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8');
source = source
  .replace('import com.amap.api.maps.TextureMapView', 'import com.amap.api.maps.MapView')
  .replace('private lateinit var mapView: TextureMapView', 'private lateinit var mapView: MapView')
  .replace('mapView = TextureMapView(context)', 'mapView = MapView(context)')
  .replaceAll('child is TextureMapView', 'child is MapView');

fs.writeFileSync(file, source);
