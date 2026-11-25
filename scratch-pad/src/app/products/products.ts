import { Component, computed, Signal, signal, WritableSignal } from "@angular/core";
import { Product, ProductList } from "./types";
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

    // Method to handle the addition of a new product (from add-product component)
    onAddProduct(newProduct: Product) {
        this.productNames.update(products => [...products, newProduct]);
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