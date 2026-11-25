import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Product } from "../types";

@Component({
    selector : 'products-list',
    templateUrl : './products-list.html'
})
export class ProductsList {

    @Input()
    list : ReadonlyArray<Product> = [];

    @Output()
    onRemove = new EventEmitter<number>();
    
    onRemoveClick(idx : number) {
        this.onRemove.emit(idx);
    }

}