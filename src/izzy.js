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
    PopupTemplate,
    GraphicsLayer, 
    Graphic, 
    Color,
    Point, 
    Polyline,
    PictureMarkerSymbol,
    SimpleLineSymbol
    ) {
      var satTwoLine = {lineone: '1 25544U 98067A   16065.66704861 -.00164486  00000-0 -25529-2 0  9992', 
      linetwo:'2 25544  51.6425 214.2760 0001760 240.1881 314.0084 15.53875330988875'};

      var map = new Map({basemap: 'satellite'});
      var satLayer = new GraphicsLayer();
      map.add([satLayer]);

      if (MAP_TYPE == '2D') {
        var scene = new SceneView({
          container: "mapDiv", 
          map: map, 
          viewingMode: 'local'});
      }
      else {
        var scene = new SceneView({container: "mapDiv", map: map,});
      }
      window.setTimeout(start, 1000);
      window.setTimeout(zoom, 5*1000);

      function start() {
        var l = getSatellitePath(new Date(), 45, satTwoLine, 1000);
        var path = new Graphic(l,
          new SimpleLineSymbol({
          color: [192, 192, 192, 0.5],
          width: 3
        }));
        satLayer.add(path);

        var p = getSatelliteLocation(new Date(), satTwoLine, 1000);
        var g = pointToGraphic(p);
        satLayer.add(g);
        scene.animateTo(g);
      }

      function zoom() {
        var my_location = new Point(-95.556478, 29.7824019, 100);
        var new_date = new Date(2016, 02, 03, 6, 24, 00, 00);
        zoomToSpace(new_date, satTwoLine);
        if (MAP_TYPE == '2D') {
          zoomToGround(new_date, my_location, satTwoLine)
        }
      }


      function zoomToGround(date, location, satLine) {
        var look_angles = getLookAngles(location, date, satLine);
        var new_camera = scene.camera.clone();
        new_camera.heading = look_angles.azimuth;
        new_camera.tilt = 90 + look_angles.elevation;
        new_camera.position = location;
        scene.animateTo(new_camera);
      }

      function zoomToSpace(date, satLine) {
        satLayer.clear();

        var sat_point = getSatelliteLocation(date, satLine, 1000);
        var line = getSatellitePath(date, 45, satLine, 1000);
        var last_path_graphic = new Graphic(line,
          new SimpleLineSymbol({
            color: [192, 192, 192, 0.5],
            width: 3
          }));
        satLayer.add(last_path_graphic);

        var graphic = pointToGraphic(sat_point);
        satLayer.add(graphic);
        scene.animateTo(graphic);
        scene.environment.lighting.set('date', date);
      }




      function pointToGraphic(point) {
        return new Graphic({
          geometry: point,
          symbol: new PictureMarkerSymbol({
            url: "iss-silhouette.png",
            width: 48,
            height: 48
          })
        });
      }

      function getLookAngles(location, date, satLine) {
        line1 = satLine.lineone;
        line2 = satLine.linetwo;
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

      function getSatellitePath(date, delta, satLine, multiplier) {
        line1 = satLine.lineone;
        line2 = satLine.linetwo;
        var points = [];
        var start_date = new Date(date.getTime() - delta*60000);
        for (var i=1; i < 2*delta*60+1; i++) {
          var temp_date = new Date(start_date.getTime() + i*60000/60);
          var loc = getSatelliteLocation(temp_date, satLine, multiplier);
          points.push([loc.x, loc.y, loc.z]);
        }
        return new Polyline([points]);
      }

      function getSatelliteLocation(date, satLine, multiplier) {
        line1 = satLine.lineone;
        line2 = satLine.linetwo;
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

        var positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);

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