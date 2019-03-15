import { Component, OnInit } from '@angular/core';
import { TrackingService } from '../services/tracking.service';
import { LogService } from '../services/log.service';
import { Coords } from 'src/models/coords';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit {
  tracking = false;
  track: Coords[] = [];

  constructor(private trackingService: TrackingService, private log: LogService) {}

  ngOnInit() {
    this.trackingService.tracking.subscribe(tracking => (this.tracking = tracking));

    this.trackingService.track.subscribe(data => {
      this.track = data;
    });
  }

  startTracking() {
    this.log.append('[APP] Start button pressed');
    this.trackingService.start();
  }

  stopTracking() {
    this.log.append('[APP] Stop button pressed');
    this.trackingService.stop();
  }
}
