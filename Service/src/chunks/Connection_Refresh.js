const { Worker } = require('worker_threads');
const Mongo = require("../classes/mongodb")
const workerList = []
let exitedWorkers = 0;
let objectDataGlobal


const Connection_Refresh = async (objectData) => {
    objectDataGlobal = objectData;
    let data = await objectDataGlobal.mongoClient.find("Connections",  {status: 2 ,  computers: objectDataGlobal.dataToWorkers.machineIdDB }) // set to false

    if (data.length > 0) {
        let conditionID = []
        
        data.map(i => conditionID.push(i._id))
        await objectDataGlobal.mongoClient.update("Connections", { status: 1 , dateStatus : new Date()}, { $and: [
            { computers: objectDataGlobal.dataToWorkers.machineIdDB }, 
            {_id : { $in:  conditionID }}
        ] }, true)
        getNewData(data, conditionID)
    }
}

const getNewData = async (data, conditionID) => {
    try {
        // this function will be executed in another thread
        // the requires will only belong to the new thread
        let error = false;
        data.map(async (i) => {
            try {
                let worker
                if (i.typeDB == "SQL Server")
                    worker = new Worker(__dirname+"/Connection_GetDataSqlServer.js", {
                        workerData: [i, objectDataGlobal.dataToWorkers]
                    });
                else if (i.typeDB == "MySQL")
                    worker = new Worker(__dirname+"/Connection_GetDataMySQL.js", {
                        workerData: [i, objectDataGlobal.dataToWorkers]
                    });
                else
                    throw new Error('exception!');

                workerList.push(worker);
                worker.on('exit', (code) => {
                    if (code == 0)
                        error=true;
                    exitedWorkers++;
                })
            }
            catch (e) {
                throw new Error(e);
            }
        })

        // aguarda o feicho das threads
        await new Promise((resolve) => interv = setInterval(() => {
            if (exitedWorkers == workerList.length) {
                clearInterval(interv);
                resolve()
            }
        }, 100));

        if (error == true) {
            let clientMongo = new Mongo(objectDataGlobal.dataToWorkers.mongoDBuri);
            await clientMongo.init();
            // Set connection status to complete Invalid the ones in pending status
            await clientMongo.update("Connections", { status: -1, dateStatus: new Date() }, {
                $and: [
                    { computers: objectDataGlobal.dataToWorkers.machineIdDB },
                    { status: 1 },
                    { _id: { $in: conditionID } }
                ]
            }, true)
        }

    } catch (err) {
        console.error(err);
    }
}


module.exports = Connection_Refresh;