const service = require ("os-service");
const {isWin, isMac} = require("./functions");
var fs = require ("fs");
var path = require ("path");


// SERVICE_NAME = "TimeToSyncService"
// service.add(
//     SERVICE_NAME,
//     {
//       displayName:SERVICE_NAME,
//       programPath:"C:\snapshot\Service\package\service.exe",
//       programArgs:"",
//       username:"", // the username to run the service as
//       password:""
//     },
//     function(error) {
//       if (error) {
//         console.log(error)
//       } else {
//         console.log("Complete")
//       }
//     }
//   ); 

console.log(path.join( __dirname, 'test.log' ));

service.run (function () {
    service.stop (0);
});

setInterval (function () {
    console.log("write");
}, 1000);

setInterval (function () {
    console.log("write");
}, 1000);


