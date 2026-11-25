import { Component, EventEmitter, Output, signal } from "@angular/core";

@Component({
    selector: "add-product",
    templateUrl: "./add-product.html"
})
export class AddProduct {
    newProduct = signal('');

    @Output()
    onAdd = new EventEmitter<string>();

     addProduct() : void {
        if(this.newProduct().trim() !== '') {
            // Emit the new product name to the parent component
            this.onAdd.emit(this.newProduct());
            this.newProduct.set('');
        }
    }
}