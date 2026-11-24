import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/* 
import * as calc from './app/calculator'
console.log(calc.add(10, 20));
console.log(calc.pi)
console.log(calc.app_info.name) 
*/

/* 
import * as calc from './app/calculator'
let add = calc.add;
console.log(add(10, 20)); 
*/

/* 
import * as calc from './app/calculator'
let {add} = calc;
console.log(add(10, 20)); 
*/

import { add } from './app/calculator'
import ClothingProduct from './app/ClothingProduct';

console.log(add(10, 20));

let shirt = new ClothingProduct(1, "T-Shirt", 20, "M");

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
