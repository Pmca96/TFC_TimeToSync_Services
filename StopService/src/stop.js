const {isWin, isMac} = require("./functions");

SERVICE_NAME = "TimeToSyncService"
LAUNCHD_PLIST_PATH = ""

//stop service
if (isWin()) {
    cp.execSync(`net stop ${SERVICE_NAME}`);
} else if (isMac()) {
    console.log("Not ready for mac")
    //cp.execSync(`sudo launchctl unload ${LAUNCHD_PLIST_PATH}`);
} else {
    cp.execSync(`service ${SERVICE_NAME} stop`);
}