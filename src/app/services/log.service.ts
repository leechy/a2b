import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LogService {
  messages: BehaviorSubject<string[]> = new BehaviorSubject([]);

  constructor() {}

  append(message) {
    if (message && message !== '') {
      this.messages.next([...this.messages.value, message]);
    }
  }
}
