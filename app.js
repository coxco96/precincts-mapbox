/* MCCLATCHY PUBLIC ACCESS TOKEN */
mapboxgl.accessToken = 'pk.eyJ1IjoibWNjbGF0Y2h5IiwiYSI6ImNsOWl4MGQ1ZTRqMTczbnFtZWpxOWMzMzAifQ._hre1_Sc2dDfxT_X_L2k0w';

/* INITIALIZE MAP */
const map = new mapboxgl.Map({
    container: 'map', // add map to map div container
    style: 'mapbox://styles/mcclatchy/cl9rkqwal000n14middztqid0', // miami-gray-outline style
    center: [-80.427, 25.563], // miami-dade county view
    zoom: 8.75,
    maxBounds: [
        [-81.5, 25], // southwest
        [-79.5, 26] // northeast
    ],
    minZoom: 8.75,
    maxZoom: 12
});

/* DEFINE FILL COLOR VARIABLE */
const fillColor = [
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
]

/* SET HOVER STATE ID AND GEOCODERSTATUS FOR FEATURE-STATE USE */
let hoverStateId = null;
let geocoderId = null;



/* REQUEST PRECINCTS GEOJSON WITH RESULTS FROM DATA FOLDER, THEN LOAD MAP */
d3.json("data/TEST-precincts-with-party-winner.geojson").then(function (data) { // REPLACE WITH REAL ELECTION RESULTS FILE

    map.on('load', () => {

        /* ADD THE GEOJSON AS DATA SOURCE FOR THE MAP */
        map.addSource('precincts', {
            type: 'geojson',
            data: data,
            generateId: true // id attribute is necessary for feature-state to work
        })

        /* USE THE GEOJSON DATA AS MAP LAYERS */

        // fill. this layer is used to display the data and for hover effect.
        map.addLayer({
            id: 'precinct-fills',
            type: 'fill',
            source: 'precincts',
            paint: {
                'fill-color': fillColor,
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1, // full opacity if hovered over; .8 if not
                    0.8
                ]
            }
        });

        // lines (to control line-width)
        map.addLayer({
            id: 'precinct-lines',
            type: 'line',
            source: 'precincts',
            paint: {
                'line-color': 'white',
                'line-width': .7,
                'line-opacity': .5
            }
        })


        // fill. this layer is hidden except to highlight searched features
        map.addLayer({
            id: 'search-fill',
            type: 'fill',
            source: 'precincts',
            paint: {
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'ui-search'], false],
                    1, 0 // full opacity if geocoder has result; 0 opacity if not
                ],
                'fill-color': fillColor
            }
        });

        // lines (separate bc fill layer doesn't give control over line-width)
        map.addLayer({
            id: 'search-lines',
            type: 'line',
            source: 'precincts',
            paint: {
                'line-color': 'yellow',
                'line-width': .7,
                'line-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'ui-search'], false],
                    1, 0 // full opacity if geocoder has result; 0 opacity if not
                ]
            }
        })


        /* UPDATE FEATURE STATE WHEN MOUSE MOVES OVER FEATURE */
        map.on('mousemove', 'precinct-fills', (e) => {

            if (e.features.length > 0) {
                // reset all features to no hover effect
                if (hoverStateId !== null) {
                    map.setFeatureState({
                        source: 'precincts',
                        id: hoverStateId
                    }, {
                        hover: false
                    });
                }

                // set hoverStateId to whichever feature mouse is currently over
                hoverStateId = e.features[0].id;

                // set hover to true for current moused over feature
                map.setFeatureState({
                    source: 'precincts',
                    id: hoverStateId
                }, {
                    hover: true
                });
            }
        });

        /* REVERT HOVER STATE TO FALSE WHEN MOUSE LEAVES */
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


        /* INITIALIZE GEOCODER, RESTRICTING RESULTS TO MIAMI-DADE BOUNDING BOX */
        const geocoder = new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            types: 'address, neighborhood, locality, poi',
            countries: 'us',
            placeholder: "Search a Miami-Dade address to find its precinct",
            bbox: [-80.8735841733116, 25.137407706828, -80.0427585978358, 25.9794198631426],
            autocomplete: false // autocomplete is preferred but pricey
        });

        /* ADD GEOCODER TO DOM ELEMENT FOR UI SEARCH CAPABILITY */
        geocoder.addTo('#geocoder');

        /* GET CONTAINERS FOR RESULTS */
        const precinctText = document.getElementById('precinct-text');
        const partyText = document.getElementById('winning-party');

        /* WHEN GEOCODER RETURNS RESULT, FIND CORRESPONDING PRECINCT */
        geocoder.on('result', function (e) {
            // get result coordinates
            let searchCoords = e.result.geometry.coordinates;

            /* FLY TO SEARCHED POINT */
            map.flyTo({
                center: searchCoords,
                zoom: 11.5
            });

            /* LOOP THORUGH EACH PRECINCT */
            data.features.forEach(element => {
                if (element.geometry != null) {

                    /* GET POLYGON GEODATA */
                    let precinctPoly = turf.polygon(element.geometry.coordinates);

                    /* IF SEARCH POINT FALLS WITHIN THIS LOOP'S PRECINCT... */
                    if (turf.booleanPointInPolygon(searchCoords, precinctPoly)) {

                        /* ASSIGN RESULTS TO VARIABLES */
                        let precinctNum = element.properties['PRECINCT'];
                        let winningParty = element.properties['precinct-winner_leading-party'];

                        /* PRINT RESULTS TO INFO BOX */
                        precinctText.innerText = `Precinct ${precinctNum}`;
                        partyText.innerText = `Winning party: ${winningParty}`;

                        /* IF GEOCODER ID IS NOT NULL, RESET UI-SEARCH TO FALSE */
                        console.log(geocoderId);

                        if (geocoderId !== null) {
                            map.setFeatureState({
                                source: 'precincts',
                                id: geocoderId
                            }, {
                                'ui-search': false
                            });
                        }

                        /* ASSIGN GEOCODERID THE OBJECTID OF CORRESPONDING PRECICT */
                        geocoderId = element.properties['OBJECTID'];

                        /* SET UI-SEARCH TO TRUE FOR THIS ELEMENT */

                        map.setFeatureState({
                            source: 'precincts',
                            id: geocoderId
                        }, {
                            'ui-search': true
                        });

                        console.log(geocoderId);

                    } // end turf match

                }
            }) // end feature loop

            /* IF USER HITS RESET MAP BUTTON, FLY TO ORIG POSITION AND CLEAR GEOCODER */
            document.getElementById('clear-ui').addEventListener('click', () => {
                geocoderId = null;
                geocoder.clear();
                map.flyTo({
                    center: [-80.427, 25.563],
                    zoom: 8.75
                })
            })

            /* REVERT UI SEARCH HIGHLIGHT TO FALSE WHEN GEOCODER IS CLEARED */
            geocoder.on('clear', () => {
                geocoderId = null;
                    map.setFeatureState({
                        source: 'precincts',
                        id: geocoderId
                    }, {
                        'ui-search': false
                    });
                
                partyText.innerText = `Party: `;
                precinctText.innerText = `Precinct: `

            });
        }) // end geocoder.on('result')

    }) // end map.on('load')
})