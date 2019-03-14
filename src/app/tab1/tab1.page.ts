import { Component, OnInit } from '@angular/core';
import { TrackingService } from '../services/tracking.service';
import { Coords } from 'src/models/coords';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit {
  tracking = false;
  track: Coords[] = [];

  constructor(private trackingService: TrackingService) {}

  ngOnInit() {
    this.trackingService.tracking.subscribe(tracking => (this.tracking = tracking));

    this.trackingService.track.subscribe(data => {
      this.track = data;
    });
  }

  startTracking() {
    this.trackingService.start();
  }

  stopTracking() {
    this.trackingService.stop();
  }
}
