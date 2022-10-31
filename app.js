// mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoibWNjbGF0Y2h5IiwiYSI6ImNsOWl4MGQ1ZTRqMTczbnFtZWpxOWMzMzAifQ._hre1_Sc2dDfxT_X_L2k0w';

// initialize map from studio style
const map = new mapboxgl.Map({
    container: 'map', // add map to map div container
    style: 'mapbox://styles/mcclatchy/cl9rkqwal000n14middztqid0', // miami-gray-outline
    // style: 'mapbox://styles/mapbox/streets-v11',
    center: [-80.427, 25.563], // miami-dade county view
    zoom: 8.75,
});

// set map and min zoom
map.setMinZoom(8.75).setMaxZoom(11);
let hoverStateId = null;


// request miami precinct geojson file (without results)

// change file name HERE for real geojson
d3.json("data/TEST-precincts-with-party-winner.geojson").then(function (data) {


    map.on('load', () => {

        // initiliaize geocoder
        const geocoder = new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            types: 'address, neighborhood',
            countries: 'us', // limit results to US
            placeholder: "Search a Miami-Dade address to find its precinct",
            bbox: [-80.8735841733116, 25.137407706828, -80.0427585978358, 25.9794198631426] // miami-dade bounding box
        });

        // add geocoder to dom element
        geocoder.addTo('#geocoder');

        // get the geocoder results container
        const results = document.getElementById('result');

        geocoder.on('result', function (e) {
            let searchCoords = e.result.geometry.coordinates; // coordinates of searched address

            // loop through each precinct polygon to until match is found
            data.features.forEach(element => {

                if (element.geometry != null) {

                    let precinctNum = element.properties['PRECINCT'];
                    let precinctPoly = turf.polygon(element.geometry.coordinates);

                    // if the point is within a precinct, display the precinct in the results box
                    if (turf.booleanPointInPolygon(searchCoords, precinctPoly)) {

                        results.innerText = `Precinct ${precinctNum}`;
                        validAddress = true;

                        // highlight element here // NEEDS CHANGING
                        map.addLayer({
                            id: 'search-feature',
                            type: 'line',
                            source: 'precincts',
                            filter: ['==', ['get', 'PRECINCT'], precinctNum],
                            paint: {
                                'line-color': 'yellow'
                            }

                        })
                    }
                }
            });


        });


        // Clear results container when search is cleared and revert feature back to original style
        geocoder.on('clear', () => {
            results.innerText = '';
            map.addLayer({
                id: 'search-feature',
                type: 'line',
                source: 'precincts',
                filter: ['==', ['get', 'PRECINCT'], precinctNum],
                paint: {
                    'line-color': 'white'
                }

            })
        });





        // add geojson as data source for map
        map.addSource('precincts', {
            type: 'geojson',
            data: data, // no results included
            generateId: true // id attribute is necessary for hover state to work
        })


        // add data source as layer    
        map.addLayer({
            id: 'precinct-fills',
            type: 'fill', // maybe line?
            source: 'precincts',
            paint: {
                'fill-color': [
                    'match',
                    ['get', 'precinct-winner_leading-party'],
                    'DEM',
                    '#15607A', // blue
                    'REP',
                    '#C71E1D', // red
                    'TIED',
                    '#9E6195', // purple
                    'N/A',
                    '#CFCFCF', // gray
                    'black' // other
                ],
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1, // full opacity if hovered over; .5 if not
                    0.8
                ]

            }
        })


        // add lines separately
        map.addLayer({
            id: 'precinct-lines',
            type: 'line',
            source: 'precincts',
            paint: {
                'line-color': 'white',
                'line-width': 1
            }
        })



        // update feature state when mouse moves over layer
        map.on('mousemove', 'precinct-fills', (e) => {

            if (e.features.length > 0) {
                if (hoverStateId !== null) {
                    map.setFeatureState({
                        source: 'precincts',
                        id: hoverStateId
                    }, {
                        hover: false
                    });
                }
                hoverStateId = e.features[0].id;
                map.setFeatureState({
                    source: 'precincts',
                    id: hoverStateId
                }, {
                    hover: true
                });
            }
        });

        // when mouse leaves the layer, update feature state of previously hovered feature

        map.on('mouseleave', 'precinct-fills', () => {
            if (hoverStateId !== null) {
                map.setFeatureState({
                    source: 'precincts',
                    id: hoverStateId
                }, {
                    hover: false
                });
            }
            hoverStateId = null;
        });



    });

})