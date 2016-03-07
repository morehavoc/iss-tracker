require([
        "esri/Map",
        "esri/views/SceneView",
        "esri/PopupTemplate",
        "esri/layers/GraphicsLayer",
        "esri/Graphic",
        "esri/Color",
        "esri/geometry/Point",
        "esri/geometry/Polyline",
        "esri/symbols/PictureMarkerSymbol",
        "esri/symbols/SimpleLineSymbol",
        "dojo/domReady!"
    ], function(
        Map, 
        SceneView, 
        opupTemplate,
        GraphicsLayer, 
        Graphic, 
        Color,
        Point, 
        Polyline,
        PictureMarkerSymbol,
        SimpleLineSymbol
    ) 
    {
        //TODO: Get the "my_location" from the user some how
        // Split the map into two parts, the 3d globe that shows the orbit and the space station at that date.
        // The second map is 2d and shows you looking up at the space station from the ground
        // Need a nice little interface on the 2d map to show you the angle you are looking up and the direction you are looking
        var iss_line1 = '1 25544U 98067A   16065.66704861 -.00164486  00000-0 -25529-2 0  9992';
        var iss_line2 = '2 25544  51.6425 214.2760 0001760 240.1881 314.0084 15.53875330988875';
        var my_location = new Point(-95.556478, 29.7824019, 100);//60000);
        var map = new Map(
        {
            basemap: "satellite"
        });
        var start_position = getSateliteLocation(new Date(), iss_line1, iss_line2, 1000);
        var start_camera_position = start_position.clone();
        start_camera_position.z = start_camera_position.z * 100000;

        var view = new SceneView(
            {
                container: "viewDiv",
                map: map,
                camera: 
                {
                    position: start_camera_position
                },
                environment:
                {
                    atmosphere: "none"
                },
                // viewingMode: 'local',
                constraints: 
                {
                    altitude: 
                    {
                        max: 12000000000
                    }
                }
            });

        var issLayer = new GraphicsLayer();
        map.add([issLayer]);
        var new_date = new Date(2016, 02, 03, 6, 24, 00, 00);
        window.setTimeout(function(){zoomToSpace(new_date, iss_line1, iss_line2);}, 3000);
        window.setTimeout(function(){zoomToGround(new_date, my_location, iss_line1, iss_line2);}, 10000);
        // zoomToSpace(new_date);
        // var sat_point = getSateliteLocation(new_date, iss_line1, iss_line2, 100);
        // var look_angles = getLookAngles(my_location, new_date, iss_line1, iss_line2);
        // var new_camera = view.camera.clone();
        // new_camera.heading = look_angles.azimuth;
        // new_camera.tilt = 90 + look_angles.elevation;
        // view.set('camera', new_camera)
        // //var lighting = 

        // var line = getSatelitePath(new_date, 90, iss_line1, iss_line2, 100);
        //     last_path_graphic = new Graphic(line,
        //         new SimpleLineSymbol({
        //             color: [192, 192, 192, 0.5],
        //             width: 3
        //         }));
        //     issLayer.add(last_path_graphic);

        // var graphic = new Graphic({
        //         geometry: sat_point,
        //         symbol: new PictureMarkerSymbol({
        //             url: "iss-silhouette.png",
        //             width: 48,
        //             height: 48
        //         })
        //     });
        //     issLayer.add(graphic);

        function zoomToGround(date, location, line1, line2)
        {
        var sat_point = getSateliteLocation(date, line1, line2, 100);
        var look_angles = getLookAngles(location, date, line1, line2);
        var new_camera = view.camera.clone();
        new_camera.heading = look_angles.azimuth;
        new_camera.tilt = 90 + look_angles.elevation;
        new_camera.position = location;
        view.animateTo(new_camera);
        }

        function zoomToSpace(date, line1, line2)
        {
            issLayer.clear();

            var sat_point = getSateliteLocation(date, line1, line2, 1000);
            var line = getSatelitePath(date, 90, line1, line2, 1000);
            var last_path_graphic = new Graphic(line,
                new SimpleLineSymbol({
                    color: [192, 192, 192, 0.5],
                    width: 3
                }));
            issLayer.add(last_path_graphic);

            var graphic = new Graphic({
                    geometry: sat_point,
                    symbol: new PictureMarkerSymbol({
                        url: "iss-silhouette.png",
                        width: 48,
                        height: 48
                    })
                });
            issLayer.add(graphic);
            view.animateTo(graphic);

        }

        function getSatelitePath(date, delta, line1, line2, multiplier)
        {
            var points = [];
            var start_date = new Date(date.getTime() - delta*60000);
            for (var i=1; i < 2*delta*60+1; i++)
            {
                var temp_date = new Date(start_date.getTime() + i*60000/60);
                var loc = getSateliteLocation(temp_date, line1, line2, multiplier);
                points.push([loc.x, loc.y, loc.z]);
            }
            return new Polyline([points]);
        }

        function getLookAngles(location, date, line1, line2)
        {
            var satrec = satellite.twoline2satrec(line1, line2);
            var positionAndVelocity = satellite.propagate(
                satrec,
                date.getUTCFullYear(),
                date.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
                date.getUTCDate(),
                date.getUTCHours(),
                date.getUTCMinutes(),
                date.getUTCSeconds()
            );

            var gmst = satellite.gstimeFromDate(
                date.getUTCFullYear(),
                date.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
                date.getUTCDate(),
                date.getUTCHours(),
                date.getUTCMinutes(),
                date.getUTCSeconds()
            );

            var positionEcf    = satellite.eciToEcf(positionAndVelocity.position, gmst);


            deg2rad = Math.PI / 180;
            var observerGd = {
                longitude: location.x * deg2rad,
                latitude: location.y * deg2rad,
                height: location.z / 1000 //Convert to km
            };

            //var observerEcf   = satellite.geodeticToEcf(observerGd);
            var lookAngles    = satellite.ecfToLookAngles(observerGd, positionEcf);
            lookAngles.azimuth = lookAngles.azimuth * 180/Math.PI;
            lookAngles.elevation = lookAngles.elevation * 180/Math.PI;
            return lookAngles;
        }

        function getSateliteLocation(date, line1, line2, multiplier)
        {
            var satrec = satellite.twoline2satrec(line1, line2);
            var positionAndVelocity = satellite.propagate(
                satrec,
                date.getUTCFullYear(),
                date.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
                date.getUTCDate(),
                date.getUTCHours(),
                date.getUTCMinutes(),
                date.getUTCSeconds()
            );

            var gmst = satellite.gstimeFromDate(
                date.getUTCFullYear(),
                date.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
                date.getUTCDate(),
                date.getUTCHours(),
                date.getUTCMinutes(),
                date.getUTCSeconds()
            );

            var positionGd    = satellite.eciToGeodetic(positionAndVelocity.position, gmst);

            var longitude = positionGd.longitude;
            var latitude = positionGd.latitude;
            var height = positionGd.height;
            if (isNaN(longitude) || isNaN(latitude) || isNaN(height)) 
            {
                return null;
            }
            var rad2deg = 180 / Math.PI;
            while (longitude < -Math.PI) 
            {
                longitude += 2 * Math.PI;
            }
            while (longitude > Math.PI) 
            {
                longitude -= 2 * Math.PI;
            }
            return new Point(
              rad2deg * longitude,
              rad2deg * latitude,
              height * multiplier// * 1000 //convert km to m
            );
        }


    });