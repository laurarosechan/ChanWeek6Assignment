var Main;

import Map from "https://js.arcgis.com/5.1/@arcgis/core/Map.js";
import Graphic from "https://js.arcgis.com/5.1/@arcgis/core/Graphic.js";
import GraphicsLayer from "https://js.arcgis.com/5.1/@arcgis/core/layers/GraphicsLayer.js";
import ElevationLayer from "https://js.arcgis.com/5.1/@arcgis/core/layers/ElevationLayer.js";
import SceneView from "https://js.arcgis.com/5.1/@arcgis/core/views/SceneView.js";

Main = (function () {

    const elevationLayer = new ElevationLayer({
        url: "http://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer"
    });

    const map = new Map({
        basemap: "hybrid",
        ground: {
            layers: [elevationLayer]
        }
    });

    const view = new SceneView({
        container: "map",
        viewingMode: "local",
        map: map,
        camera: {
            position: {
                x: -105.503,
                y: 45.719,
                z: 15000000,
                spatialReference: {
                    wkid: 4326
                }
            },
            heading: 0,
            tilt: 0
        },
        popup: {
            dockEnabled: true,
            dockOptions: {
                breakpoint: false
            }
        },
        environment: {
            lighting: {
                directShadowsEnabled: false
            }
        }
    });

    const graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);

    function distance(p1, p2) {

        const dx = p1.coord[0] - p2.coord[0];
        const dy = p1.coord[1] - p2.coord[1];

        return Math.sqrt(dx * dx + dy * dy);
    }

    function buildClusters() {

        graphicsLayer.removeAll();

        const threshold = 0.10;
        const clusters = [];

        // Build cluster array
        for (const [name, place] of Object.entries(Places)) {

            let foundCluster = false;

            for (const cluster of clusters) {

                if (distance(cluster.center, place) < threshold) {

                    cluster.places.push({
                        name,
                        ...place
                    });

                    foundCluster = true;
                    break;
                }
            }

            if (!foundCluster) {

                clusters.push({
                    center: place,
                    places: [{
                        name,
                        ...place
                    }]
                });
            }
        }

        // Draw clusters/singles
        for (const cluster of clusters) {

            // Single location
            if (cluster.places.length === 1) {

                const place = cluster.places[0];

                const graphic = new Graphic({
                    geometry: {
                        type: "point",
                        x: place.coord[0],
                        y: place.coord[1],
                        z: 10000
                    },
                    symbol: {
                        type: "simple-marker",
                        style: "cross",
                        color: "red",
                        size: 15,
                        outline: {
                            color: "red",
                            width: 1
                        }
                    },
                    attributes: {
                        place: place.name,
                        city: place.city,
                        state: place.state,
                        about: place.about,
                        latitude: place.coord[1],
                        longitude: place.coord[0],
                        isCluster: false
                    },
                    popupTemplate: {
                        title: "{place}",
                        content: `
                            <b>Location:</b> {city}, {state}<br><br>
                            <b>About:</b><br>
                            {about}<br><br>
                            <b>Coordinates:</b><br>
                            {latitude}, {longitude}
                        `
                    }
                });

                graphicsLayer.add(graphic);
            }

            // Cluster
            else {

                const graphic = new Graphic({
                    geometry: {
                        type: "point",
                        x: cluster.center.coord[0],
                        y: cluster.center.coord[1],
                        z: 10000
                    },
                    symbol: {
                        type: "simple-marker",
                        style: "circle",
                        color: "orange",
                        size: 30,
                        outline: {
                            color: "white",
                            width: 2
                        }
                    },
                    attributes: {
                        isCluster: true,
                        count: cluster.places.length
                    },
                    popupTemplate: {
                        title: "{count} Locations",
                        content: cluster.places
                            .map(p =>
                                `<b>${p.name}</b><br>${p.city}, ${p.state}<br><br>`
                            )
                            .join("")
                    }
                });

                graphicsLayer.add(graphic);
            }
        }
    }

    buildClusters();

    function searchCity() {

        const cityName = document
            .getElementById("citySearch")
            .value
            .trim()
            .toLowerCase();

        const place = Object.entries(Places).find(
            ([key, value]) =>
                value.city.toLowerCase() === cityName
        );

        if (!place) {
            alert("City not found");
            return;
        }

        const [, value] = place;

        view.goTo({
            target: {
                type: "point",
                x: value.coord[0],
                y: value.coord[1]
            },
            scale: 50000,
            tilt: 0
        }, {
            duration: 2000
        });
    }

    document
        .getElementById("searchBtn")
        .addEventListener("click", searchCity);

    document
        .getElementById("citySearch")
        .addEventListener("keypress", function (e) {

            if (e.key === "Enter") {
                searchCity();
            }
        });

    view.on("click", async (event) => {

        const hit = await view.hitTest(event);

        const result = hit.results.find(
            r => r.graphic?.attributes
        );

        if (!result) {
            return;
        }

        const attrs = result.graphic.attributes;

        if (attrs.isCluster) {

            view.goTo({
                target: result.graphic.geometry,
                scale: 10000,
                tilt: 0
            }, {
                duration: 1500
            });

            return;
        }

        view.goTo({
            target: result.graphic.geometry,
            scale: 50000,
            tilt: 0
        }, {
            duration: 3000
        });
    });

    return {};

})();