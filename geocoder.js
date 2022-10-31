// mapbox access token
mapboxgl.accessToken = "pk.eyJ1IjoibWNjbGF0Y2h5IiwiYSI6ImNsOWl4MGQ1ZTRqMTczbnFtZWpxOWMzMzAifQ._hre1_Sc2dDfxT_X_L2k0w";

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

// Get the geocoder results container.
const results = document.getElementById('result');

geocoder.on('result', function (e) {

    let searchCoords = e.result.geometry.coordinates;

    d3.json("data/TEST-precincts-with-party-winner.geojson").then(function (data) {

        // loop through each precinct polygon to until match is found

            data.features.forEach(element => {

                if (element.geometry != null) {

                    let precinctNum = element.properties['PRECINCT'];
                    let precinctPoly = turf.polygon(element.geometry.coordinates);

                    // if the point is within a precinct, display the precinct in the results box
                    if (turf.booleanPointInPolygon(searchCoords, precinctPoly)) {
                        console.log(precinctNum);
                        results.innerText = `Precinct ${precinctNum}`;
                        validAddress = true;

                        // highlight element here
                        map.addLayer()

                        
                        


                    }
                }
            });
            // if (validAddress == false) {
            //     results.innerText = `Precinct not found. Invalid address?}`;
            // }

        

    })
});


// Clear results container when search is cleared.
geocoder.on('clear', () => {
    results.innerText = '';
});