import { IGreeterService } from "./IGreeterService";

export class GreeterV2Service implements IGreeterService {
    greet(name: string): string {
        return `Hello, ${name}! Have a wonderful evening!`;
    } 
}