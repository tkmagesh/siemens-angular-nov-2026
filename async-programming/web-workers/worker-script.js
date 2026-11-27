console.log('worker script loaded')

function doWork(){
    for(let i = 0; i < 10000; i++){
        for(let j = 0; j < 3000; j++){
            for (let k = 0; k < 1000; k++){

            }
        }
        if (i % 100 === 0) {
            let percentCompleted = i / 100
            self.postMessage({type : 'progress', percentCompleted : percentCompleted})
        }
    }
}

self.addEventListener('message', (evt) => {
    console.log(`[@worker] evt.data => `, evt.data)
    if (evt.data.type === 'start'){
        doWork()
        self.postMessage({type : 'done'})
    }
})