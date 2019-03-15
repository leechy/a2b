import { Component, OnInit } from '@angular/core';
import { LogService } from '../services/log.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page implements OnInit {
  messages: string[];

  constructor(private log: LogService) {}

  ngOnInit() {
    this.log.messages.subscribe(messages => {
      this.messages = messages;
    });
  }
}
