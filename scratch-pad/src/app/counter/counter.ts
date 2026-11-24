import { Component, signal } from "@angular/core";

@Component({
  selector: 'app-counter',
  template: `
    <div>
        <h1>Counter</h1>
        <button (click)="Decrement()">Decrement</button>
        <span> [ {{ counter() }} ] </span>
        <button (click)="Increment()">Increment</button>
    </div>
  `
})
export class Counter {

    protected readonly counter = signal(0);
  
    protected Increment() {
        this.counter.set(this.counter() + 1);
    }

    protected Decrement() {
        this.counter.set(this.counter() - 1);
    }
}