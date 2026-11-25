import { Injectable } from "@angular/core";
import { IGreeterService } from "./IGreeterService";

@Injectable({
    providedIn : 'root'
})
export class GreeterService implements IGreeterService   {
    greet(name: string): string {
        return `Hello, ${name}! Welcome to our application.`;
    } 
}