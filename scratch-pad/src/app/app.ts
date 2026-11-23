import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Timer } from './timer/timer';

@Component({
  imports: [RouterOutlet, Timer],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',

})
export class App {
  protected readonly title = signal('my-scratch-pad-app');
  
  protected readonly counter = signal(0);
  
  protected Increment() {
    this.counter.set(this.counter() + 1);
  }

  protected Decrement() {
    this.counter.set(this.counter() - 1);
  }

  protected ChangeTitle() {
    this.title.set('my-scratch-pad-app - changed');
  }

  
}
