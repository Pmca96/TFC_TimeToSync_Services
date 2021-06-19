
const {isWin, isMac} = require("./functions");
var service = require ("os-service");

SERVICE_NAME = "TimeToSyncService"

if (isMac()) {
  //await removeFileAsRoot(LAUNCHD_PLIST_PATH);
  console.log("Mac is not ready to remove services.");
  return;
}service.remove(process.env.SERVICE_NAME,
  function(error = null) {
    if (error && error != null) {
      console.log(`Please make sure to stop the service before removing it`);
      console.log("Error on service removing")
    } else {
      console.log("Service removed with success")
    }
  }
);