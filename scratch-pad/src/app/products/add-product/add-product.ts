import { Component, EventEmitter, Output, signal } from "@angular/core";
import { Product } from "../types";
import { ProductsService, ProductsServiceBase } from "../products.service";

@Component({
    selector: "add-product",
    templateUrl: "./add-product.html"
})
export class AddProduct {
    newProduct = signal('');
    selected = signal(false);

    /* 
    @Output()
    onAdd = new EventEmitter<Product>(); 
    */
    
    constructor (private ps : ProductsService){
        
    }

     addProduct() : void {
        if(this.newProduct().trim() !== '') {
            // Emit the new product name to the parent component
            // this.onAdd.emit();
            this.ps.add({ name: this.newProduct(), selected: this.selected() })
            this.newProduct.set('');
            this.selected.set(false);
        }
    }
}