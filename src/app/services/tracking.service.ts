import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Geolocation, GeolocationOptions } from '@ionic-native/geolocation/ngx';
import {
  BackgroundGeolocation,
  BackgroundGeolocationConfig
} from '@ionic-native/background-geolocation/ngx';
import * as NoSleep from 'nosleep.js';
import { Platform } from '@ionic/angular';
import { Coords } from 'src/models/coords';

const webOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000
};
const bgOptions: BackgroundGeolocationConfig = {
  interval: 5000,
  desiredAccuracy: 20,
  stationaryRadius: 5,
  distanceFilter: 5,
  debug: true, //  enable this hear sounds for background-geolocation life-cycle.
  stopOnTerminate: true,
  stopOnStillActivity: false
};

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  currentLocation: BehaviorSubject<any> = new BehaviorSubject({});

  noSleep: any;
  watch: Subscription;
  watching = false;
  tracking: BehaviorSubject<boolean> = new BehaviorSubject(false);
  trackingTime: number;
  track: BehaviorSubject<Coords[]> = new BehaviorSubject([]);

  constructor(
    private backgroundGeolocation: BackgroundGeolocation,
    private geolocation: Geolocation,
    private platform: Platform
  ) {
    this.initService();
  }

  initService() {
    if (this.platform.is('cordova')) {
      // if there are any locations collected whyle
      // the app is in background mode they must
      // be collected on application resume
      this.platform.resume.subscribe(() => {
        window.alert('resume!');
        if (this.tracking.value) {
          this.getBackgroundLocations();
        }
      });
    } else {
      // init nosleep in case of browser
      this.noSleep = new NoSleep.default();
    }
    // start tracking to get the user position, but don't record track
    this.startTracking();
  }

  start() {
    if (!this.tracking.value) {
      // set tracking to true
      this.tracking.next(true);
      this.trackingTime = Date.now();
      // start new track
      this.track.next([this.currentLocation.value]);
      // start tracking if it's not
      this.startTracking();
      // start nosleep
      if (!this.platform.is('cordova')) {
        this.noSleep.enable();
      }
    }
  }

  stop() {
    this.tracking.next(false);
  }

  startTracking() {
    if (this.platform.is('cordova')) {
      // update watch subscription
      if (this.backgroundGeolocation.isLocationEnabled) {
        // update watch subscription
        if (!this.watch || this.watch.closed) {
          this.watch = this.backgroundGeolocation.configure(bgOptions).subscribe(
            location => {
              this.watchSubscription(location);
            },
            err => {
              if (this.tracking.value) {
                this.startTracking();
              }
              console.log('geolocation error', err);
            }
          );
        }

        if (!this.watching) {
          console.log('start backgroundGeolocation', this.watch);
          this.backgroundGeolocation.start().then(res => {
            this.watching = true;
          });
        }
      } else {
        console.log('geolocation not enabled');
      }
    } else {
      // start watch subscription
      if (!this.watching) {
        this.watch = this.geolocation
          .watchPosition(webOptions)
          .subscribe(location => this.watchSubscription(location));
        this.watching = true;
      }
    }
  }

  stopTracking() {
    if (this.platform.is('cordova')) {
      this.backgroundGeolocation.stop().then(res => {
        this.watching = false;
      });
    } else {
      if (this.watch) {
        this.watch.unsubscribe();
        this.watch = null;
        this.watching = false;
      }
    }
  }

  watchSubscription(location) {
    console.log('watch subscription', location);
    this.setCurrentLocation(location);
  }

  setCurrentLocation(position) {
    const location = new Coords(position);
    this.addLocationToTrack(location);
    if (location.latitude) {
      this.currentLocation.next(location);
    }
  }

  addLocationToTrack(position) {
    const location = new Coords(position);
    if (location) {
      if (this.tracking.value) {
        this.track.next([...this.track.value, location]);
      }
    }
  }

  getBackgroundLocations() {
    this.backgroundGeolocation.getValidLocations().then(locations => {
      if (locations) {
        locations.forEach(loc => {
          if (loc.time && loc.time > this.trackingTime) {
            this.addLocationToTrack(loc);
          }
        });
      }
    });
  }
}
