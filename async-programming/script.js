
(() => {
    function addSync(x,y){
        console.log(`   [@service] processing ${x} and ${y}`)
        let result = x + y
        console.log(`   [@service] returning result`)
        return result
    }

    function addSyncClient(x,y){
        console.log(`[@client] invoking the service`)
        let result = addSync(x,y)
        console.log(`[@client] result = ${result}`)
    }

    window['addSyncClient'] = addSyncClient;

    function addAsyncCallback(x,y, cb){
        console.log(`   [@service] processing ${x} and ${y}`)
        setTimeout(() => {
            let result = x + y
            console.log(`   [@service] returning result`)
            cb(result)
        }, 4000)
    }

    function addAsyncCallbackClient(x,y){
        console.log(`[@client] invoking the service`)
        addAsyncCallback(x,y, function(result){
            console.log(`[@client] result = ${result}`)
        })
        
    }

    window['addAsyncCallbackClient'] = addAsyncCallbackClient;

    function addAsyncPromise(x,y){
        console.log(`   [@service] processing ${x} and ${y}`)
        let p = new Promise(function(resolveFn, rejectFn){
            setTimeout(() => {
                let result = x + y
                console.log(`   [@service] returning result`)
                resolveFn(result)
            }, 4000)
        })
        return p;
    }

    function addAsyncPromiseClient(x,y){
        console.log(`[@client] invoking the service`);
        let p = addAsyncPromise(x,y);
        setTimeout(() => {
            processResult(p)
        },4000)
    }

    function processResult(p){
        p.then(function(result){
            console.log(`[@client] result = ${result}`);
        })
    }

    window['addAsyncPromiseClient'] = addAsyncPromiseClient;

    function divideAsyncPromise(x,y){
        console.log(`   [@service] processing ${x} and ${y}`)
        let p = new Promise(function(resolveFn, rejectFn){
            setTimeout(() => {
                if (y == 0){
                    return rejectFn(new Error('divide by zero error'))
                }
                let result = x / y
                console.log(`   [@service] returning result`)
                resolveFn(result)
            }, 4000)
        })
        return p;
    }

    function divideAsyncPromiseClient(x,y){
        console.log(`[@client] invoking the service`);
        let p = divideAsyncPromise(x,y);
        p.then(function(result){
            console.log(`[@client] result = ${result}`);
        }).catch(function(err){
            console.log(`[@client] err : ${err}`)
        })
    }

    window['divideAsyncPromiseClient'] = divideAsyncPromiseClient

})()