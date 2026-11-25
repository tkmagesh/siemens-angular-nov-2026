import { Component, Input } from "@angular/core";
import { Product } from "../types";

@Component({
    selector : 'products-list',
    templateUrl : './products-list.html'
})
export class ProductsList {

    @Input()
    list : Array<Product> = [];

}