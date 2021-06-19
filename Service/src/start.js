
const {isWin, isMac} = require("./classes/functions");
const path = require ("path");
const crypt = require("./classes/crypto")
const Mongo = require("./classes/mongodb")

crypt.writeConfig("mongodb+srv://admin:admin@cluster0.2vlbl.mongodb.net/TimeToSync");
var uri = crypt.readConfig()


let mongoClient = new Mongo(uri)
const start = async function() {
    await mongoClient.init()
 
    await program()

    await end()
}

const program = async function() {
    let response
    //await mongoClient.insert("Computers", {name:"PC-Pedro",address:"Portugal"}, false)
    
    //await mongoClient.update("Computers",  {name:"PC-Miguel"}, {}, false)

    //await mongoClient.delete("Computers",  {name:"PC-Miguel"},  true)

    // response = await mongoClient.find("Computers")
    // console.log(await response.toArray())
   
}

const end = async function() {
    await mongoClient.close()
    console.log("closed")
}

start()


//start service
// if (isWin()) {
//     cp.execSync(`net start ${SERVICE_NAME}`);
// } else if (isMac()) {
//     cp.execSync(`sudo launchctl load ${LAUNCHD_PLIST_PATH}`);
// } else {
//     cp.execSync(`service ${SERVICE_NAME} start`);
// }
