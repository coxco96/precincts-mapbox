/* MCCLATCHY PUBLIC ACCESS TOKEN */
mapboxgl.accessToken = 'pk.eyJ1IjoibWNjbGF0Y2h5IiwiYSI6ImNsOWl4MGQ1ZTRqMTczbnFtZWpxOWMzMzAifQ._hre1_Sc2dDfxT_X_L2k0w';

/* INITIALIZE MAP */
const map = new mapboxgl.Map({
    container: 'map', // add map to map div container
    style: 'mapbox://styles/mcclatchy/cla76pdyc003p15rtjy7ek1z4', // darker
    center: [-80.427, 25.563], // miami-dade county view
    zoom: 8.0,
    minZoom: 8.0,
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
    ['get', 'lead-party'],
    'DEM',
    '#04639f', // blue
    'REP',
    '#b82114', // red
    'TIED',
    'lightgray', // lightgray
    '#222732' // darkgray
]

/* SET HOVER STATE ID AND GEOCODERSTATUS FOR FEATURE-STATE USE */
let hoverStateId = null;
let geocoderId = null;



/* REQUEST PRECINCTS GEOJSON WITH RESULTS FROM DATA FOLDER, THEN LOAD MAP */
d3.json("data/final-gov.json").then(function (data) { // REPLACE WITH REAL ELECTION RESULTS FILE

    map.on('load', () => {
        console.log(data);

        /* FIND PLACE LABELS LAYER IN ORDER TO GET IT ON TOP */
        const layers = map.getStyle().layers;
        // find the index of the first symbol layer in the map style.
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
                        .8, // full opacity with no hover; 0.8 with hover
                        ['boolean', ['feature-state', 'ui-search'], false],
                        .8,
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
                    'line-color': '#FEFBEA',
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
                        .8,
                        0 // full opacity if geocoder has result; 0 opacity if not
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
                    'line-color': '#FAF991',
                    'line-width': 1.4,
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
        const precinctNumDiv = document.getElementById('precinct');
        const winnerNameDiv = document.getElementById('winner-name');
        const desantisPercentDiv = document.getElementById('desantis-percent');
        const cristPercentDiv = document.getElementById('crist-percent');
        const winner2018Div = document.getElementById('2018-winner');
        const margin2018Div = document.getElementById('2018-margin');
        const republicanDemographicDiv = document.getElementById('republican-demographic');
        const democratDemographicDiv = document.getElementById('democrat-demographic');
        const racialDemographicDiv = document.getElementById('racial-demographic');


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
                        let precinctNum = element.properties['merge-precinct'];
                        let winnerName = element.properties['lead-candidate'];
                        let desantisPercent = element.properties['desantis-percent'];
                        let cristPercent = element.properties['crist-percent'];
                        let winner2018 = element.properties['2018-winner'];
                        let margin2018 = element.properties['2018-margin'];
                        let republicanDemographic = element.properties['REPUBLICAN_SHARE'];
                        let democratDemographic = element.properties['DEMOCRAT_SHARE'];
                        let racialDemographic = element.properties['RACE'];



                        const partyColor = (winningParty) => {
                            if (winningParty == 'DEM') {
                                return '#04639f'
                            } else if (winningParty == 'REP') {
                                return '#b82114'
                            } else {
                                return '#222732'
                            }
                        }

                        /* PRINT RESULTS TO INFO BOX */
                        precinctNumDiv.innerText = precinctNum;
                        winnerNameDiv.innerText = winnerName
                        desantisPercentDiv.innerText = desantisPercent + "%";
                        cristPercentDiv.innerText = cristPercent + "%";
                        winner2018Div.innerText = winner2018 + " by a margin of ";
                        margin2018Div.innerText = margin2018 + "%.";
                        republicanDemographicDiv.innerText = republicanDemographic+"%";
                        democratDemographicDiv.innerText = democratDemographic+"%";
                        racialDemographicDiv.innerText = racialDemographic;

                        /* ASSIGN GEOCODERID THE OBJECTID OF CORRESPONDING PRECICT */
                        geocoderId = element.properties['PRECINCT'];

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

                map.fitBounds([
                    [-81.4, 25.0], // southwest
                    [-79.4, 26.0] // northeast
                ])

                precinctNumDiv.innerText = "";
                winnerNameDiv.innerText = "";
                desantisPercentDiv.innerText = "";
                cristPercentDiv.innerText = "";
                winner2018Div.innerText = "";
                margin2018Div.innerText = "";
                republicanDemographicDiv.innerText = "";
                democratDemographicDiv.innerText = "";
                racialDemographicDiv.innerText = "";

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