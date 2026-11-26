import { Component, computed, inject, Inject, Signal, signal, WritableSignal } from "@angular/core";
import { Product, ProductList } from "./types";
import { SelectedProductsPipe } from "./selected-products.pipe";
import { JsonPipe } from "@angular/common";
import { AddProduct } from "./add-product/add-product";
import { ProductsList } from "./products-list/products-list";
import { SelectedProductsList } from "./selected-products-list/selected-products-list";
import { ProductsService, ProductsServiceBase } from "./products.service";

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
    
    constructor(private ps : ProductsService){

    }

    get productNames() : Array<Product> {
        return this.ps.products;
    } 


    get selectedProducts() : Array<Product> {
        return this.ps.selected
    }

    /* // Method to handle the addition of a new product (from add-product component)
    onAddProduct(newProduct: Product) {
        this.ps.add(newProduct)
    } */

    removeProduct(idx : number){
        this.ps.remove(idx)
    }

    updateProductSelection(idx : number, selected : boolean) {
        let p = this.ps.getByIdx(idx)
        let updatedProduct = {...p, selected }
        this.ps.update(updatedProduct)
    }   

    
}