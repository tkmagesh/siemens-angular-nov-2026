
import { Component, signal } from "@angular/core";
import { GreeterService } from "./greeter.service";
import { GreeterV2Service } from "./greeterv2.service";
import { IGreeterService } from "./IGreeterService";

let rudeGreeter = {
    greet(name : string) : string {
        return `Hey ${name}, Do I look like I care?`
    }
}

// 
class DateService{
    getCurrentTime() : Date {
        return new Date()
    }
}

function greeterFactory(ds : DateService){
    console.log('ds -> ', ds)
    return {
        greet(name : string) : string {
            if (ds.getCurrentTime().getHours() < 12) {
                return `Hi ${name}, Good Morning!`
            } else {
                return `Hi ${name}, Good Afternoon!`
            }
        }
    }
}


@Component({
    selector: 'app-greeter',
   /* 
    providers: [
        // GreeterService
        // { provide: GreeterService }
        // { provide: GreeterService, useClass: GreeterService }
        
        // {provide : GreeterService, useValue : rudeGreeter}
        
        { provide : GreeterService, useFactory : greeterFactory, deps :[DateService]},
        DateService,
        
    ], 
    */
    template: `
        <h1>Greeter Component</h1>
        <label for="name">Enter your name:</label>
        <input id="name" type="text" (input)="name.set($event.target.value)" />
        <button (click)="greet()">Greet Me!</button>
        <p>{{msg()}}</p>
    `,
})
export class Greeter {
    name = signal(''); // Signal to hold the user's name
    msg = signal(''); // Signal to hold the greeting message

    constructor(private greeterService: GreeterService) {

    }
    greet() {
        this.msg.set(this.greeterService.greet(this.name()));
    }
}