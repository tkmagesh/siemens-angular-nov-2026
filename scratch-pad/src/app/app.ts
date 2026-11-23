import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('my-scratch-pad-app');
  protected readonly time = signal(new Date().toLocaleTimeString());

  protected ChangeTitle() {
    this.title.set('my-scratch-pad-app - changed');
  }

  constructor() {
    setInterval(() => {
      this.time.set(new Date().toLocaleTimeString());
    }, 1000);
  }
}
