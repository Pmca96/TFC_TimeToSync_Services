const Mongo = require("../classes/mongodb")

var objectDataGlobal 

const pingHealthy = async (objectData) => {
    objectDataGlobal = objectData
    await objectDataGlobal.mongoClient.update("Computers",
        {isService: 1, lastServiceActive: new Date()},
        { idMaquina: objectDataGlobal.dataToWorkers.machineId }
      );

    
}


module.exports = pingHealthy;