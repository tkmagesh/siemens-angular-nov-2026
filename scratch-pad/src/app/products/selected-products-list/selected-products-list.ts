import { JsonPipe } from "@angular/common";
import { Component } from "@angular/core";

@Component({
    imports : [JsonPipe],
    selector : "selected-products-list",
    templateUrl : "selected-products-list.html"
})
export class SelectedProductsList {
}