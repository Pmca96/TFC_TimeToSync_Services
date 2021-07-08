const service = require("os-service")
const crypt = require("./src/classes/crypto")
const Mongo = require("./src/classes/mongodb")
const Connection_CheckNew = require("./src/chunks/Connection_CheckNew")
const Connection_Refresh = require("./src/chunks/Connection_Refresh")
const Connection_TaskCheck = require("./src/chunks/Connection_TaskCheck")
const Connection_FixStatusPendings = require("./src/chunks/Connection_FixStatusPendings")

const pingHealthy = require("./src/chunks/pingHealthy")
const { machineIdSync } = require("node-machine-id");
const os = require("os");
const path = require ("path");


if (process.argv.length == 3 && process.argv[2].contains["-h"] && process.argv[2].length <= 7) {
    console.log(".exe 'mongodbUri'");
    process.exit();
}

service.add(
    "TimeToSyncService",
    {
        displayName: "TimeToSyncService",
        programPath: path.resolve("./service.exe"),
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
    startTimers();
}


const startTimers = async () => {
    // Check new database connections to get structure
    // Check task
    // Ping for healty check up
    // every 15 seconds 
    
    // await pingHealthy(objectToDistribut);
    // await Connection_Refresh(objectToDistribut);
    // await Connection_CheckNew(objectToDistribut);

    //await Connection_TaskCheck(objectToDistribut);
    //await Connection_FixStatusPendings(objectToDistribut);
    await Connection_Notifications(objectToDistribut);
    setInterval(async function () {
    //    await pingHealthy(objectToDistribut);
    //    await Connection_CheckNew(objectToDistribut);
    
    //     await Connection_TaskCheck(objectToDistribut);
    //     await Connection_FixStatusPendings(objectToDistribut);
           await Connection_Notifications(objectToDistribut);
    }, 15000);

    // Redefines tables
    // every 30 minutes
    setInterval(async function () {
       await Connection_Refresh(objectToDistribut);
    }, 1830000);
}


initialize()


