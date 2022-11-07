/* MCCLATCHY PUBLIC ACCESS TOKEN */
mapboxgl.accessToken = 'pk.eyJ1IjoibWNjbGF0Y2h5IiwiYSI6ImNsOWl4MGQ1ZTRqMTczbnFtZWpxOWMzMzAifQ._hre1_Sc2dDfxT_X_L2k0w';

/* INITIALIZE MAP */
const map = new mapboxgl.Map({
    container: 'map', // add map to map div container
    // style: 'mapbox://styles/mcclatchy/cla5w0jdv000114l328igfw51', // miami-outline-with-places
    style: 'mapbox://styles/mcclatchy/cl9rkqwal000n14middztqid0', // miami-gray-outline style
    center: [-80.427, 25.563], // miami-dade county view
    zoom: 8.2,
    // bounds: [
    //     [-81.4, 25.0], // southwest
    //     [-79.4, 26.0] // northeast
    // ],
    minZoom: 7,
    maxZoom: 14,
    trackResize: true
});

/* ADD ZOOM CONTROL BUTTONS */
map.addControl(new mapboxgl.NavigationControl({
    showCompass: false
}), 'top-right');

map.getCanvas().style.cursor = 'default';



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

                    /* FIND PLACE LABELS LAYER IN ORDER TO GET IT ON TOP */
                    const layers = map.getStyle().layers;
                    // Find the index of the first symbol layer in the map style.
                    let firstSymbolId;
                    for (const layer of layers) {
                        if (layer.type === 'symbol') {
                            firstSymbolId = layer.id;
                            break;
                        }
                    }


                        /* ADD THE GEOJSON AS DATA SOURCE FOR THE MAP */
                        map.addSource('precincts', {
                            type: 'geojson',
                            data: data,
                            generateId: true
                        })


                        /////* USE THE GEOJSON DATA AS MAP LAYERS */////

                        /* HOVER EFFECT LAYER */
                        map.addLayer({
                            id: 'precinct-fills',
                            type: 'fill',
                            source: 'precincts',
                            paint: {
                                'fill-color': fillColor,
                                'fill-opacity': [
                                    'case',
                                    ['boolean', ['feature-state', 'hover'], false],
                                    0.4, // full opacity with no hover; 0.8 with hover
                                    1
                                ]
                            }
                        },
                        firstSymbolId
                        );

                        // lines (to control line-width)
                        map.addLayer({
                            id: 'precinct-lines',
                            type: 'line',
                            source: 'precincts',
                            paint: {
                                'line-color': 'white',
                                'line-width': .2,
                                'line-opacity': .8
                            }
                        },
                        firstSymbolId
                        );


                        // fill. this layer is hidden except to highlight searched features
                        map.addLayer({
                            id: 'search-fill',
                            type: 'fill',
                            source: 'precincts',
                            paint: {
                                'fill-opacity': [
                                    'case',
                                    ['boolean', ['feature-state', 'ui-search'], false],
                                    .1, 0 // full opacity if geocoder has result; 0 opacity if not
                                ],
                                'fill-color': fillColor
                            }
                        },
                        firstSymbolId
                        );

                        // lines (separate bc fill layer doesn't give control over line-width)
                        map.addLayer({
                            id: 'search-lines',
                            type: 'line',
                            source: 'precincts',
                            paint: {
                                'line-color': 'yellow',
                                'line-width': 1.2,
                                'line-opacity': [
                                    'case',
                                    ['boolean', ['feature-state', 'ui-search'], false], // if ui-search returns true, opacity is 1; if not, it is 0
                                    1, 0
                                ]
                            }
                        },
                        firstSymbolId
                        );


                        /* GET CONTAINERS FOR RESULTS */
                        const precinctText = document.getElementById('precinct-text');
                        const partyText = document.getElementById('winning-party');

                        /* UPDATE FEATURE STATE WHEN MOUSE MOVES OVER FEATURE */
                        map.on('mousemove', 'precinct-fills', (e) => {
                            // change cursor for UI indicator
                            map.getCanvas().style.cursor = 'pointer';

                            const hoverCoords = e.lngLat.toArray();

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
                        }); // END on.mousemove

                        /* REVERT HOVER STATE TO FALSE WHEN MOUSE LEAVES AND REMOVE POPUP */
                        map.on('mouseleave', 'precinct-fills', () => {
                            // change cursor style and remove hover effect
                            map.getCanvas().style.cursor = 'default';

                            if (hoverStateId !== null) {
                                map.setFeatureState({
                                    source: 'precincts',
                                    id: hoverStateId
                                }, {
                                    hover: false
                                });
                            }
                            hoverStateId = null;
                        }); // END on.mouseleave

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


                        /* WHEN GEOCODER RETURNS RESULT, FIND CORRESPONDING PRECINCT */
                        geocoder.on('result', function (e) {

                            /* RESET FEATURE STATE TO GET RID OF OUTLINE ON PRIOR RESULTS */
                            map.setFeatureState({
                                source: 'precincts',
                                id: geocoderId
                            }, {
                                'ui-search': false
                            });


                            // result point coordinates
                            let searchCoords = e.result.geometry.coordinates;

                            /* LOOP THORUGH EACH PRECINCT TO FIND SEARCH POINT MATCH IN PRECINCTS */
                            data.features.forEach(element => {
                                if (element.geometry != null) {

                                    /* GET POLYGON GEODATA */
                                    let precinctPoly = turf.polygon(element.geometry.coordinates);
                                    let precinctCentroid = turf.centroid(precinctPoly).geometry.coordinates

                                    /* IF SEARCH POINT FALLS WITHIN THIS LOOP'S PRECINCT... */
                                    if (turf.booleanPointInPolygon(searchCoords, precinctPoly)) {

                                        /* FLY TO CENTER OF MATCHING PRECINCT */
                                        map.flyTo({
                                            center: precinctCentroid,
                                            zoom: 10.5
                                        });

                                        /* ASSIGN RESULTS TO VARIABLES */
                                        let precinctNum = element.properties['PRECINCT'];
                                        let winningParty = element.properties['precinct-winner_leading-party'];
                                        let winningCandidate = "winning candidate here"

                                        const partyColor = (winningParty) => {
                                            if (winningParty == 'DEM') {
                                                return 'blue'
                                            } else if (winningParty == 'REP') {
                                                return 'red'
                                            } else {
                                                return 'gray'
                                            }
                                        }

                                        /* PRINT RESULTS TO INFO BOX */
                                        precinctText.innerText = `Precinct: ${precinctNum}`;
                                        partyText.innerText = `<span style='color:'${partyColor(winningParty)}'>Winning candidate: ${winningCandidate}</span>`;

                                        /* ASSIGN GEOCODERID THE OBJECTID OF CORRESPONDING PRECICT */
                                        geocoderId = element.properties['OBJECTID'];

                                        /* SET UI-SEARCH TO TRUE FOR THIS ELEMENT */

                                        map.setFeatureState({
                                            source: 'precincts',
                                            id: geocoderId
                                        }, {
                                            'ui-search': true
                                        });

                                    } // end turf match

                                }
                            }) // end feature loop

                            /* REVERT UI SEARCH HIGHLIGHT TO FALSE WHEN GEOCODER IS CLEARED */
                            geocoder.on('clear', () => {
                                geocoderId = null;

                                partyText.innerText = `Party: `;
                                precinctText.innerText = `Precinct: `

                                map.setFeatureState({
                                    source: 'precincts',
                                    id: geocoderId
                                }, {
                                    'ui-search': false
                                });

                            });
                        }) // end geocoder.on('result')

                        /* IF USER HITS RESET MAP BUTTON, FLY TO ORIG POSITION AND CLEAR GEOCODER */
                        document.getElementById('clear-ui').addEventListener('click', () => {

                            /* REMOVE OUTLINE OF PRIOR RESULTS */
                            map.setFeatureState({
                                source: 'precincts',
                                id: geocoderId
                            }, {
                                'ui-search': false
                            });

                            geocoder.clear();
                            map.fitBounds([
                                [-81.4, 25.0], // southwest
                                [-79.4, 26.0] // northeast
                            ])
                        })


                        /* RESET BOUNDS OF MAP WHEN RESIZED */
                        map.on('resize', () => {
                            map.fitBounds([
                                [-81.4, 25.0], // southwest
                                [-79.4, 26.0] // northeast
                            ])
                        })

                    }) // end map.on('load')


            })