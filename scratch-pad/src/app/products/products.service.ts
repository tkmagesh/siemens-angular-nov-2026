import { computed, Injectable, Service, signal } from "@angular/core";
import { Product, ProductList } from "./types";


export abstract class ProductsServiceBase {

}

@Service()
export class ProductsService extends ProductsServiceBase {
    private productNames = signal<ProductList>([
        {name : 'Pen', selected : false},
        {name : 'Pencil', selected : false},
        {name : 'Marker', selected : false},
        {name : 'Eraser', selected : false},
        {name : 'Sharpener', selected : false},
        {name : 'Scale', selected : false},
        {name : 'Notebook', selected : false},
        {name : 'Diary', selected : false}
    ]);

    private selectedProducts = computed(() => {
        console.log('Products.selectedProducts computed called');
        return this.productNames().filter(p => p.selected);
    })

    get products() : Array<Product> {
        return [...this.productNames()]
    }

    get selected() : Array<Product> {
        return [...this.selectedProducts()]   
    }
    

    getByIdx(idx : number) : Product {
        return this.productNames()[idx]
    }

    add(newProduct : Product){
        this.productNames.update(products => [...products, newProduct]);
    }

    remove(idx : number){
        this.productNames.update(products => products.filter((_, i) => i !== idx));
    }

    update(p : Product){
        this.productNames.update(products => products.map(p1 => p.name === p1.name ? p : p1))
    }

}