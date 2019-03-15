import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Geolocation, GeolocationOptions } from '@ionic-native/geolocation/ngx';
import * as NoSleep from 'nosleep.js';
import { Platform } from '@ionic/angular';
import { Coords } from 'src/models/coords';
import { LogService } from './log.service';

const webOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000
};
const bgOptions = {
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
  backgroundGeolocation: any;
  // last gathered location
  currentLocation: BehaviorSubject<any> = new BehaviorSubject({});
  // pointer to the nosleep object (browser only)
  noSleep: any;
  watch: Subscription;
  // location tracking
  tracking: BehaviorSubject<boolean> = new BehaviorSubject(false);
  trackingTime: number;
  track: BehaviorSubject<Coords[]> = new BehaviorSubject([]);

  constructor(
    private geolocation: Geolocation,
    private platform: Platform,
    private log: LogService
  ) {
    this.initService();
  }

  initService() {
    this.platform.ready().then(() => {
      if (this.platform.is('cordova')) {
        // access BackgroundGeolocation Cordova plugin via the global object
        // Ionic Native 5.2 is not working properly
        this.backgroundGeolocation = (<any>window).BackgroundGeolocation;

        this.log.append('[INFO] BackgroundGeolocation Configure');
        this.backgroundGeolocation.configure(bgOptions);

        this.backgroundGeolocation.on('location', geolocation => {
          const location = new Coords(geolocation);
          this.log.append('[INFO] location ' + JSON.stringify(location));
          this.setCurrentLocation(location);

          // to perform long running operation on iOS
          // you need to create background task
          this.backgroundGeolocation.startTask(taskKey => {
            // execute long running task
            // eg. ajax post location
            // IMPORTANT: task has to be ended by endTask
            this.backgroundGeolocation.endTask(taskKey);
          });
        });

        this.backgroundGeolocation.on('stationary', stationaryLocation => {
          // handle stationary locations here
          const location = new Coords(stationaryLocation);
          this.log.append('[INFO] stationary ' + JSON.stringify(location));
          this.setCurrentLocation(location);
        });

        this.backgroundGeolocation.on('error', error => {
          this.log.append(
            '[ERROR] BackgroundGeolocation error: ' + error.code + ' ' + error.message
          );
        });

        this.backgroundGeolocation.on('start', () => {
          this.log.append('[INFO] BackgroundGeolocation service has been started');
        });

        this.backgroundGeolocation.on('stop', () => {
          this.log.append('[INFO] BackgroundGeolocation service has been stopped');
        });

        this.backgroundGeolocation.on('authorization', status => {
          this.log.append('[INFO] BackgroundGeolocation authorization status: ' + status);
          if (status !== this.backgroundGeolocation.AUTHORIZED) {
            // we need to set delay or otherwise alert may not be shown
            setTimeout(() => {
              const showSettings = confirm(
                'App requires location tracking permission. Would you like to open app settings?'
              );
              if (showSettings) {
                return this.backgroundGeolocation.showAppSettings();
              }
            }, 1000);
          }
        });

        // if there are any locations collected whyle
        // the app is in background mode they must
        // be collected on application resume
        this.platform.resume.subscribe(() => {
          this.log.append('[IONIC] Resume app');
          if (this.tracking.value) {
            this.getBackgroundLocations();
          } else {
            this.startTracking();
          }
          this.backgroundGeolocation.configure({ debug: false });
        });
        // background/foreground event are available only in Android
        // so we are duplicating with platform events
        this.backgroundGeolocation.on('foreground', () => {
          this.log.append('[INFO] App is in foreground');
          this.getBackgroundLocations();
          this.backgroundGeolocation.configure({ debug: false });
        });

        // when app is getting to the background
        this.platform.pause.subscribe(() => {
          this.log.append('[IONIC] Pause app');
          this.backgroundGeolocation.configure({ debug: true });
        });
        this.backgroundGeolocation.on('background', () => {
          this.log.append('[INFO] App is in background');
          this.backgroundGeolocation.configure({ debug: true });
        });
      } else {
        // init nosleep in case of browser
        this.noSleep = new NoSleep.default();
      }
      // start foreground tracking to constantly get the user position
      this.watch = this.geolocation.watchPosition(webOptions).subscribe(fgLocation => {
        const location = new Coords(fgLocation);
        this.log.append('[INFO] Geolocation returned location ' + JSON.stringify(location));
        this.setCurrentLocation(location);
      });
    });
  }

  start() {
    if (!this.tracking.value) {
      // set tracking to true
      this.tracking.next(true);
      this.trackingTime = Date.now();
      // start new track
      if (this.currentLocation.value) {
        this.track.next([this.currentLocation.value]);
      } else {
        this.track.next([]);
      }
      // start tracking if it's not
      this.startTracking();

      // start nosleep for the browsers
      if (!this.platform.is('cordova')) {
        this.noSleep.enable();
      }
    }
  }

  stop() {
    this.tracking.next(false);
    this.stopTracking();
  }

  startTracking() {
    if (this.platform.is('cordova')) {
      this.backgroundGeolocation.checkStatus(status => {
        this.log.append('[INFO] BackgroundGeolocation service is running ' + status.isRunning);
        this.log.append(
          '[INFO] BackgroundGeolocation services enabled ' + status.locationServicesEnabled
        );
        this.log.append('[INFO] BackgroundGeolocation auth status: ' + status.authorization);
        // you don't need to check status before start (this is just the example)
        if (!status.isRunning) {
          this.backgroundGeolocation.start(); // triggers start on start event
        }
      });
    }
  }

  stopTracking() {
    if (this.platform.is('cordova')) {
      this.backgroundGeolocation.stop();
    }
  }

  setCurrentLocation(location) {
    if (
      location.latitude &&
      JSON.stringify(location) !== JSON.stringify(this.currentLocation.value)
    ) {
      this.addLocationToTrack(location);
      this.currentLocation.next(location);
    }
  }

  addLocationToTrack(location) {
    if (location) {
      if (this.tracking.value) {
        this.track.next([...this.track.value, location]);
      }
    }
  }

  getBackgroundLocations() {
    this.backgroundGeolocation.getValidLocations().then(
      locations => {
        if (locations) {
          // get last track record time
          let lastTime = this.trackingTime;
          if (this.track.value && this.track.value.length) {
            lastTime = this.track.value[this.track.value.length - 1].time;
          }
          // get all locations past `lastTime`
          locations.forEach(loc => {
            if (loc.time && loc.time > lastTime) {
              const location = new Coords(loc);
              this.addLocationToTrack(location);
            }
          });
        }
      },
      err => {
        this.log.append('[ERROR] Error getting valid locations ' + JSON.stringify(err));
      }
    );
  }
}
