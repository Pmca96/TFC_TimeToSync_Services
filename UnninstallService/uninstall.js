
const {isWin, isMac} = require("./src/functions");
var service = require ("os-service");

if (isMac()) {
  console.log("Mac is not ready to remove services.");
  return;
}service.remove("TimeToSyncService",
  function(error = null) {
    if (error && error != null) {
      console.log(`Please make sure to stop the service before removing it`);
      console.log("Error on service removing  or requires admin privileges")
    } else {
      console.log("Service removed with success")
    }
  }
);