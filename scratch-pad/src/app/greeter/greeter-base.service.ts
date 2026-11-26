import { Injectable } from "@angular/core";
import { IGreeterService } from "./IGreeterService";

@Injectable({
    providedIn : 'root'
})
export abstract class GreeterBaseService implements IGreeterService   {
    greet(name: string): string {
        return ""
    } 
}