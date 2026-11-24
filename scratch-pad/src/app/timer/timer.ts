import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-timer',
  imports: [CommonModule],
  styles: [`
    .visible {
      display: block;
    }
    .hidden {
      display: none;
    }
  `],
  template: `
    <div>
      <label>Show :</label>
      <input type="checkbox" (change)="toggleTimer($event)" [checked]="showTimer()" />
      
      <!--
      <div *ngIf="showTimer()">
        <h1>Timer Component</h1>
        <h3>{{ time() }}</h3>
      </div> 
      -->

      @if (showTimer()) {
        <div>
          <h1>Timer Component</h1>
          <h3>{{ time() }}</h3>
        </div>
      }

      <!-- <div [class.visible]="showTimer()" [class.hidden]="!showTimer()"> -->
      <!-- <div [ngClass]="{'visible': showTimer(), 'hidden': !showTimer()}">
        <h1>Timer Component</h1>
        <h3>{{ time() }}</h3>
      </div> 
      -->
    </div>
  `,
})
export default class Timer {
    protected readonly time = signal(new Date().toLocaleTimeString());
    protected readonly showTimer = signal(true);

  protected toggleTimer(event: any) {
    console.log(event)
    this.showTimer.set(event.target.checked);
  }

    constructor() {
      setInterval(() => {
        this.time.set(new Date().toLocaleTimeString());
      }, 1000);
  }
}