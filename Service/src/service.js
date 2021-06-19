require('dotenv').config({ path: "../../.env" })

const service = require("os-service")
const crypt = require("./classes/crypto")
const Mongo = require("./classes/mongodb")
const Connection_CheckNew = require("./chunks/Connection_CheckNew")
const pingHealthy = require("./chunks/pingHealthy")
const { machineIdSync } = require("node-machine-id");
const os = require("os");
const { start } = require("microjob");


service.add(
    process.env.SERVICE_NAME,
    {
        displayName: process.env.SERVICE_NAME,
        programPath: process.env.PROGRAM_PATH,
        programArgs: "",
        username: "", // the username to run the service as
        password: ""
    },
    function (error) {
        if (error) {
            console.log("Service already exists");
        } else {
            console.log("Complete")
        }
    }
);

service.run(function () {
    service.stop(0);
});

var objectToDistribut = {
    maxWorkers: 3,
    mongoClient: null,
    dataToWorkers: {
        mongoDBuri: null,
        machineIdDB: null,
        machineId: machineIdSync(),
        
    }
}


const initialize = async function () {
    // cmd path, exec, mongodbURI 
    if (process.argv.length == 3) {
        await crypt.writeConfig(process.argv[2]);
        objectToDistribut.dataToWorkers.mongoDBuri = process.argv[2]
    } else
        objectToDistribut.dataToWorkers.mongoDBuri = await crypt.readConfig()
    objectToDistribut.mongoClient = new Mongo(objectToDistribut.dataToWorkers.mongoDBuri )
    await objectToDistribut.mongoClient.init()

    //Get computer id, if doesnt exist id, create it
    let data = await objectToDistribut.mongoClient.find("Computers", { idMaquina: objectToDistribut.dataToWorkers.machineId })
    if (data.length > 0)
        objectToDistribut.dataToWorkers.machineIdDB = data[0]._id + "";
    else {
        let dataInsert = await objectToDistribut.mongoClient.insert("Computers", {
            idMaquina: objectToDistribut.dataToWorkers.machineId,
            hostname: os.hostname(),
            isService: 1,
            lastServiceActive: new Date(),
        });
        objectToDistribut.dataToWorkers.machineIdDB = dataInsert.insertedId;
    }

    // start worker pool
    await start({ maxWorkers: objectToDistribut.maxWorkers });
    startTimers();
    
}


const startTimers = () => {
    // Check new database connections to get structure
    // Check task
    // Ping for healty check up
    // every 15 seconds 
    Connection_CheckNew(objectToDistribut);
    pingHealthy(objectToDistribut);
    
    setInterval(async function () {
        Connection_CheckNew(objectToDistribut);
        pingHealthy(objectToDistribut);
    }, 15000);

    // Redefines tables
    // every 30 minutes
    setInterval(async function () {

    }, 1800000);
}


initialize()


