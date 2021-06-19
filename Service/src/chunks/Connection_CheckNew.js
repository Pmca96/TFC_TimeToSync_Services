const { job } = require("microjob");

var objectDataGlobal

const Connection_CheckNew = async (objectData) => {
    objectDataGlobal = objectData;
    data = await objectDataGlobal.mongoClient.find("Connections", { $and: [
        { $or: [ 
            {status: { $exists: false } },
            {status: 0 },
        ] },
        { computers: objectDataGlobal.dataToWorkers.machineIdDB }
    ] }) // set to false
    if (data.length > 0) {
        let conditionID = []
        data.map(i => conditionID.push(i._id))
        let x = await objectDataGlobal.mongoClient.update("Connections", { status: 1 }, { $and: [
            { computers: objectDataGlobal.dataToWorkers.machineIdDB }, 
            {_id : { $in:  conditionID }}
        ] }, true)
        getNewData(data, conditionID)
    }
}




const getNewData = async (dataOutter,conditionID) => {
    try {
        // this function will be executed in another thread
        // the requires will only belong to the new thread
        await job(async data => {
            const Connection_GetDataMySQL = require("./chunks/Connection_GetDataMySQL")
            const Connection_GetDataSqlServer = require("./chunks/Connection_GetDataSqlServer")
            const Mongo = require("./classes/mongodb")
            let error = false;
            let response;
            await Promise.all(data.data.map(async (i) => {
                try {
                    if (i.typeDB == "SQL Server")
                        response = await Connection_GetDataSqlServer(i, data.ToWorkers)
                    else if (i.typeDB == "MySQL")
                        response = await Connection_GetDataMySQL(i, data.ToWorkers)
                    else
                        throw new Error('exception!');
                }
                catch (e) {
                    error = true;
                }
            }))

            let clientMongo = new Mongo(data.ToWorkers.mongoDBuri);
            await clientMongo.init();
            // Set connection status to complete Invalid the ones in pending status
            await clientMongo.update("Connections", { status: -1,  dateStatus: new Date()}, { $and: [
                { computers: data.ToWorkers.machineIdDB },
                { status: 1 },
                {_id : { $in:  data.conditionID }}
            ] }, true)
            


        }, { data: { data: dataOutter, ToWorkers: objectDataGlobal.dataToWorkers, conditionID:conditionID } }
        );

    } catch (err) {
        console.error(err);
    }


}


module.exports = Connection_CheckNew;