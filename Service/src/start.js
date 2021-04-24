
const {isWin, isMac} = require("./functions");

//start service
if (isWin()) {
    cp.execSync(`net start ${SERVICE_NAME}`);
} else if (isMac()) {
    cp.execSync(`sudo launchctl load ${LAUNCHD_PLIST_PATH}`);
} else {
    cp.execSync(`service ${SERVICE_NAME} start`);
}
