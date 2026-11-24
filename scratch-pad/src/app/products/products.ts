import { Component } from "@angular/core";

@Component({
    selector: 'app-products',
    templateUrl: './products.html',
    styleUrls: ['./products.css']
})
export class Products {
    productNames : Array<string> = ['Pen', 'Pencil', 'Marker', 'Eraser', 'Sharpener', 'Scale', 'Notebook', 'Diary'];
}