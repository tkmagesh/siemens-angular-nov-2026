export function add(x : number,y:number) :number{
    return x+y;
}

export function subtract(x : number,y:number) :number{
    return x-y;
}

export const pi = 3.14159;

export let app_info = {
    name : "Calculator",
    version : "1.0.0"
}

function multiply(x : number,y:number) :number{
    return x*y;
}

function divide(x : number,y:number) :number{
    if(y==0){
        throw new Error("Division by zero is not allowed");
    }
    return x/y;
}