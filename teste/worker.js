const { workerData, isMainThread
} = require('worker_threads');

console.log(workerData)
let x = workerData.x;
for (i = 0; i < 1000000; i++) {
    for (i = 0; i < 1000000; i++) {
        for (i = 0; i < 500000000; i++) {
            x++;
        }

    }

}
console.log("exit thread - " + x)


