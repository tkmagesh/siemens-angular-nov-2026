import { Component } from "@angular/core";

@Component({
    selector: 'app-products',
    styles:`
        ul {
            width: 400px;
        }
        li {
            list-style: none;
            --webkit-padding-start: 0px;
        }
        .odd {
            background-color: #f0f0f0;
        }
        .even {
            background-color: #e0e0e0;
        }
    `,
    template :`
    <h1>Products</h1>
    <ul>
        @for (productName of productNames; track $index;) {
            <li [class]=" $even ? 'even' : 'odd'">
                [ {{ $index + 1 }} / {{ $count }} ] - {{ productName }}
            </li>
        }
    </ul>
    `
})
export class Products {
    productNames : Array<string> = ['Pen', 'Pencil', 'Marker', 'Eraser', 'Sharpener', 'Scale', 'Notebook', 'Diary'];
}