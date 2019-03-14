/**
 * Homemade class/type for Coordinates
 *
 * navigator.geolocation and Cordova Background Geolocation plugin
 * are returning data in different types. It's unifying it.
 */
export class Coords {
  time = 0;
  latitude = 0;
  longitude = 0;

  // optional fields
  accuracy = -1;
  altitude = -1;
  altitudeAccuracy = -1;
  bearing = -1;
  heading = -1;
  speed = 0;

  constructor(params) {
    params = Coords.getCoords(params);
    // console.log('Coords.constructor', params);
    Object.keys(params).forEach(param => {
      if (this.hasOwnProperty(param)) {
        this[param] = params[param];
      }
    });
  }

  static getCoords(position: any) {
    const precision = 100000;
    if (position.coords) {
      // data coming from watchPosition
      // ... and no, we cannot transpile Coordinates object easier
      return {
        latitude: Math.round(position.coords.latitude * precision) / precision,
        longitude:
          Math.round(position.coords.longitude * precision) / precision,
        accuracy: position.coords.accuracy,
        altitude: Math.round(position.coords.altitude * precision) / precision,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        time: position.timestamp
      };
    } else {
      // data coming from backgroundGeolocation
      return {
        ...position
      };
    }
  }
}
