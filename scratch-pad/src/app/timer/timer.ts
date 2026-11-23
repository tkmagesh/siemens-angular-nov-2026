import { Component, signal } from "@angular/core";

@Component({
  selector: 'app-timer',
  template: `
    <h1>Timer Component</h1>
    <h3>{{ time() }}</h3>
  `,
})
export class Timer {
    protected readonly time = signal(new Date().toLocaleTimeString());
    
    constructor() {
    setInterval(() => {
      this.time.set(new Date().toLocaleTimeString());
    }, 1000);
  }
}