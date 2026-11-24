import { Pipe, PipeTransform } from "@angular/core";
import { ProductList } from "./types";

@Pipe({
    name: 'selected',
})
export class SelectedProductsPipe implements PipeTransform {
    transform(products: ProductList, ...args: any[]) : ProductList  {
        console.log('SelectedProductsPipe transform called');
        return products.filter(p => p.selected);
    }
}