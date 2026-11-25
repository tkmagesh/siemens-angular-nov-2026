import { Component, computed, Signal, signal, WritableSignal } from "@angular/core";
import { ProductList } from "./types";
import { SelectedProductsPipe } from "./selected-products.pipe";
import { JsonPipe } from "@angular/common";
import { AddProduct } from "./add-product/add-product";
import { ProductsList } from "./products-list/products-list";
import { SelectedProductsList } from "./selected-products-list/selected-products-list";

@Component({
    selector: 'app-products',
    imports: [
        SelectedProductsPipe
        , JsonPipe
        ,AddProduct
        ,ProductsList
        ,SelectedProductsList
    ],
    templateUrl: './products.html',
    styleUrls: ['./products.css']
})
export class Products {
    newProduct = signal('');

    productNames = signal<ProductList>([
        {name : 'Pen', selected : false},
        {name : 'Pencil', selected : false},
        {name : 'Marker', selected : false},
        {name : 'Eraser', selected : false},
        {name : 'Sharpener', selected : false},
        {name : 'Scale', selected : false},
        {name : 'Notebook', selected : false},
        {name : 'Diary', selected : false}
    ]);

    selectedProducts = computed(() => {
        console.log('Products.selectedProducts computed called');
        return this.productNames().filter(p => p.selected);
    });

    addProduct() : void {
        if(this.newProduct().trim() !== '') {
            this.productNames.update(products => [...products, {name : this.newProduct(), selected : false}]);
            this.newProduct.set('');
        }
    }

    removeProduct(idx : number){
        this.productNames.update(products => products.filter((_, i) => i !== idx));
    }

    updateProductSelection(idx : number, selected : boolean) {
        this.productNames.update(products => {
            const updatedProducts = [...products];
            updatedProducts[idx] = { ...updatedProducts[idx], selected };
            return updatedProducts;
        });
    }   

    
}