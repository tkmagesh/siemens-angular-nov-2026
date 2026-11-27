import { AsyncPipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, signal } from "@angular/core";
import { Observable } from "rxjs";

interface Item {
    "id": number,
    "name": string,
    "description": string,
    "category": string,
    "brand": string,
    "price": number,
    "rating": number,
    "stock": number,
    "tags": string[]
}

@Component({
    selector : 'app-search',
    templateUrl : './search.component.html',
    imports : [AsyncPipe]
})
export class SearchComponent{
    items$! : Observable<Item[]>

    constructor(private httpClient : HttpClient){

    }
    onBtnLoadClick(){
        this.items$ = this.httpClient
            .get<Item[]>('http://localhost:3000/products')
            
    }
}