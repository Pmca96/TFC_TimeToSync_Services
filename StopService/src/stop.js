require('dotenv').config({path:"../../.env"})
const {isWin, isMac} = require("./functions");



//stop service
if (isWin()) {
    cp.execSync(`net stop ${process.env.SERVICE_NAME}`);
} else if (isMac()) {
    console.log("Not ready for mac")
    //cp.execSync(`sudo launchctl unload ${LAUNCHD_PLIST_PATH}`);
} else {
    cp.execSync(`service ${process.env.SERVICE_NAME} stop`);
}