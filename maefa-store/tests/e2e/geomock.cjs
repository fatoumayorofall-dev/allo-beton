const http = require('http');
http
  .createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    res.setHeader('Content-Type', 'application/json');
    if (u.pathname === '/api/') {
      const q = u.searchParams.get('q') || '';
      return res.end(
        JSON.stringify({
          features: [
            {
              geometry: { coordinates: [-17.4686, 14.7236] },
              properties: {
                name: 'Mosquée de Sacré-Cœur 3',
                district: 'Sacré-Cœur 3',
                city: 'Dakar',
                countrycode: 'SN',
                osm_value: 'place_of_worship',
              },
            },
            {
              geometry: { coordinates: [-17.461, 14.731] },
              properties: {
                name: q + ' — Pharmacie',
                street: 'VDN',
                city: 'Dakar',
                countrycode: 'SN',
                osm_value: 'pharmacy',
              },
            },
            {
              geometry: { coordinates: [-17.513, 14.745] },
              properties: { name: 'Almadies', city: 'Dakar', countrycode: 'SN', osm_value: 'suburb' },
            },
          ],
        }),
      );
    }
    if (u.pathname === '/reverse') {
      return res.end(
        JSON.stringify({
          display_name: 'x',
          address: { road: 'Rue SC-110', neighbourhood: 'Sacré-Cœur 3', city: 'Dakar' },
        }),
      );
    }
    if (u.pathname.startsWith('/route/v1/driving/')) {
      // Itinéraire factice en « L » : d'abord vers le nord/sud, puis vers l'est/ouest
      const [[x1, y1], [x2, y2]] = u.pathname
        .split('/')
        .pop()
        .split(';')
        .map(p => p.split(',').map(Number));
      const coords = [
        [x1, y1],
        [x1, (y1 + y2) / 2],
        [x1, y2],
        [(x1 + x2) / 2, y2],
        [x2, y2],
      ];
      const m = (Math.abs(y2 - y1) + Math.abs(x2 - x1)) * 111000;
      globalThis.routeHits = (globalThis.routeHits || 0) + 1;
      return res.end(
        JSON.stringify({
          code: 'Ok',
          routes: [{ distance: m, duration: m / 8.3, geometry: { type: 'LineString', coordinates: coords } }],
        }),
      );
    }
    if (u.pathname === '/api/interpreter') {
      // Overpass : lieux connus autour du point demandé (décalés de quelques dizaines de mètres)
      let body = '';
      req.on('data', c => (body += c));
      return req.on('end', () => {
        const q = decodeURIComponent(body.replace(/^data=/, '').replace(/\+/g, ' '));
        const m = q.match(/around:\d+,(-?[\d.]+),(-?[\d.]+)/);
        const lat = m ? +m[1] : 14.72,
          lng = m ? +m[2] : -17.47;
        const P = (dy, dx, tags) => ({ type: 'node', lat: lat + dy, lon: lng + dx, tags });
        res.end(
          JSON.stringify({
            elements: [
              P(0.0004, 0.0002, { amenity: 'place_of_worship', religion: 'muslim', name: 'Mosquée Omarienne' }),
              P(-0.0006, 0.0005, { amenity: 'pharmacy', name: 'Pharmacie Sacré-Cœur' }),
              P(0.0011, -0.0007, { amenity: 'school', name: 'École Mamadou Diop' }),
              P(-0.0002, -0.0009, { shop: 'mobile_phone', name: 'Boutique Wave – Orange Money' }),
              P(0.0016, 0.0012, { amenity: 'fuel', name: 'Station Total VDN' }),
              P(-0.0013, -0.0002, { highway: 'bus_stop', name: 'Arrêt Dakar Dem Dikk ligne 8' }),
            ],
          }),
        );
      });
    }
    if (u.pathname === '/route-hits') return res.end(JSON.stringify({ hits: globalThis.routeHits || 0 }));
    if (u.pathname.startsWith('/tiles')) {
      res.setHeader('Content-Type', 'image/png');
      return res.end(
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          'base64',
        ),
      );
    }
    res.statusCode = 404;
    res.end('{}');
  })
  .listen(9922, () => console.log('geomock 9922'));
