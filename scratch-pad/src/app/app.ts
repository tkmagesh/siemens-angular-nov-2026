import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import Timer  from './timer/timer';
import { Counter } from './counter/counter';
import { Products } from './products/products';

@Component({
  imports: [RouterOutlet, Timer, Counter, Products],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',

})
export class App {
  protected readonly title = signal('my-scratch-pad-app');

  protected ChangeTitle() {
    this.title.set('my-scratch-pad-app - changed');
  }

  
}
