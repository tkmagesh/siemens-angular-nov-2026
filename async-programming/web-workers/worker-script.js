console.log('worker script loaded')

importScripts('work.js')

self.addEventListener('message', (evt) => {
    console.log(`[@worker] evt.data => `, evt.data)
    if (evt.data.type === 'start'){
        doWork()
        self.postMessage({type : 'done'})
    }
})