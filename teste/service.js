const { Worker, isMainThread, parentPort } = require('worker_threads');
const workerList = [] 
let exitedWorkers = 0;
for (i = 1 ; i<5 ; i++) {
  const worker = new Worker("./worker.js", {
    workerData: {x:i}
  } );

  workerList.push(worker);
  worker.on('exit', (code) => {
    console.log(code);
    exitedWorkers++
  })
  
}



const checkThreadExited = setInterval(() => {
  if (exitedWorkers == workerList.length) {
    
    console.log("cleared List")
  clearInterval(checkThreadExited);
  }
}, 2000);

