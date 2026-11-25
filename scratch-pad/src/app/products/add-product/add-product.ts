import { Component, EventEmitter, Output, signal } from "@angular/core";
import { Product } from "../types";

@Component({
    selector: "add-product",
    templateUrl: "./add-product.html"
})
export class AddProduct {
    newProduct = signal('');
    selected = signal(false);

    @Output()
    onAdd = new EventEmitter<Product>();

     addProduct() : void {
        if(this.newProduct().trim() !== '') {
            // Emit the new product name to the parent component
            this.onAdd.emit({ name: this.newProduct(), selected: this.selected() });
            this.newProduct.set('');
            this.selected.set(false);
        }
    }
}