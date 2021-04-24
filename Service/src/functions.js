

const isWin = () => {
    return process.platform === "win32";
}

const isMac = () => {
    return process.platform === "darwin";
}

exports.isWin = isWin;
exports.isMac = isMac;