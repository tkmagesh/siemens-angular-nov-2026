/* 
import * as ProductModule from './Product';
// const Product = ProductModule.Product;
const { Product } = ProductModule;
*/

// import  Product  from './Product';
import Product, { ProductCategory, IPricingStrategy } from './Product';

export default class ElectronicProduct extends Product {
    private _warrantyPeriod: number; // in months

    constructor(id: number, name: string, price: number, warrantyPeriod: number) {
        super(id, name, price);
        this._warrantyPeriod = warrantyPeriod;
    }
    
    get warrantyPeriod(): number {
        return this._warrantyPeriod;
    }

    override calculateDiscountedPrice(discountPercentage: number): number {
        // Electronics have a maximum discount limit of 20%
        if (discountPercentage > 20) {
            discountPercentage = 20;
        }
        return super.calculateDiscountedPrice(discountPercentage);
    }
}