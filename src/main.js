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
        var iss_line1 = '1 25544U 98067A   16065.66704861 -.00164486  00000-0 -25529-2 0  9992';
        var iss_line2 = '2 25544  51.6425 214.2760 0001760 240.1881 314.0084 15.53875330988875';
        var map = new Map(
        {
            basemap: "satellite"
        });
        start_position = getSateliteLocation(new Date(), iss_line1, iss_line2);
        start_camera_position = start_position.clone();
        start_camera_position.z = start_camera_position.z * 100000;

        var view = new SceneView(
            {
                container: "viewDiv",
                map: map,
                camera: 
                {
                    position: start_camera_position
                },
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
        //refreshIzzy();
        window.setInterval(refreshIzzy, 2000);
        var last_graphic = null;
        var last_path_graphic = null;
        

        function refreshIzzy()
        {
            if (last_graphic !== null)
            {
                issLayer.remove(last_graphic);
            }
            if (last_path_graphic !== null)
            {
                issLayer.remove(last_path_graphic);
            }
            var now = new Date();
            var line = getSatelitePath(now, 90, iss_line1, iss_line2);
            last_path_graphic = new Graphic(line,
                new SimpleLineSymbol({
                    color: [192, 192, 192, 0.5],
                    width: 3
                }));
            issLayer.add(last_path_graphic);


            var point = getSateliteLocation(now, iss_line1, iss_line2);
            last_graphic = new Graphic({
                geometry: point,
                symbol: new PictureMarkerSymbol({
                    url: "iss-silhouette.png",
                    width: 48,
                    height: 48
                })
            });
            issLayer.add(last_graphic);
            view.animateTo(last_graphic);
        }

        function getSatelitePath(date, delta, line1, line2)
        {
            var points = [];
            var start_date = new Date(date.getTime() - delta*60000);
            for (var i=1; i < 2*delta+1; i++)
            {
                var temp_date = new Date(start_date.getTime() + i*60000);
                var loc = getSateliteLocation(temp_date, line1, line2);
                points.push([loc.x, loc.y, loc.z]);
            }
            return new Polyline([points]);
        }

        function getSateliteLocation(date, line1, line2)
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
              height * 1000 //convert km to m
            );
        }



    });