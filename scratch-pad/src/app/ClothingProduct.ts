import Product from "./Product";

//inherited class example
export default class ClothingProduct extends Product {
    public readonly size: string;

    constructor(id: number, name: string, price: number, size: string) {
        super(id, name, price);
        this.size = size;
    }

    override calculateDiscountedPrice(discountPercentage: number): number {
        // Clothing can have a maximum discount of 50%
        if (discountPercentage > 50) {
            discountPercentage = 50;
        }
        return super.calculateDiscountedPrice(discountPercentage);
    }
}