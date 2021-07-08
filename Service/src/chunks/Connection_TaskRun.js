const Mongo = require(__dirname+"/../classes/mongodb")
const SqlServer_TaskData = require(__dirname+"/../chunks/Connection_SqlServer_TaskData")
const MySQL_TaskData = require(__dirname+"/../chunks/Connection_MySQL_TaskData")
const { workerData} = require('worker_threads');
const hash = require('object-hash');

const Connection_TaskRun = async (task, conections, synchronizations, dataMongo) => {
    try {
        let clientMongo = null
        clientMongo = new Mongo(dataMongo.mongoDBuri)
        await clientMongo.init();

        //1 - Both ways
        //2 - Data and tranformation to mongodb
        //3 - Data to database
        let syncMode = 0 
        let synchronization = {}
        let connection = {}

        //INITIALIZATION 
        synchronizations.map(data=> {
            data.tasks.map(j => {
                if (j._id == task._id) {
                    synchronization = data
                    delete synchronization.tasks
                    if (data.computerFrom == data.computerTo && data.computerFrom == dataMongo.machineIdDB)
                    syncMode = 1
                    else  if ( data.computerFrom == dataMongo.machineIdDB)
                    syncMode = 2
                    else  if ( data.computerTo == dataMongo.machineIdDB)
                    syncMode = 3
                }
            })
        })

        conections.map(i => {
            i._id = Buffer.from(i._id.id).toString("hex")
            if (syncMode == 1 || syncMode == 2) { 
                if (i._id == synchronization.computerFromConnection)
                    connection = i;
            } else if ( syncMode == 3) {
                if (i._id == synchronization.computerToConnection)
                        connection = i;
            }
        })
        
        // mudar para status == 4
        defaultData = await clientMongo.find("TasksHistory", { status: 5 }, {dateStatus: -1}, 1 )
        if (defaultData.length == 0)
            defaultData = [{dateStatus: new Date(1980,00,01)}];

        // --------------------------------------------------------------------------------------------
        // ---------------------------------GET DATA
        let data = [];
        if (syncMode == 1 || syncMode == 2) {
            if (connection.typeDB == 'MySQL')
                data = await MySQL_TaskData.GetTaskData(task, connection,defaultData)
            else if(connection.typeDB == 'SQL Server')
                data = await SqlServer_TaskData.GetTaskData(task, connection, defaultData)

            if (typeof data[0].error != "undefined" && data[0].error == 1 ) {
                await clientMongo.update("TasksHistory", { status: 5, dateStatus: new Date(), msg: data[0].msg },
                { idTask: task._id, status: { $in: [1, 3] } }
                , true)
                process.exit(1);
            }
            if (data[1].length != 0 ) {

                data[1] = await transformData(data[1], task)
                data[1] = {idTask:task._id, hash:hash(data[1]) ,data:data[1]}
                if (syncMode == 2) 
                    await saveDataToMongo(data[1], task, clientMongo)

                await clientMongo.push( "TasksHistory",
                    { history: { status: 2, dateStatus: new Date() } },
                    { idTask: task._id, status: 1 }
                );
                
                await clientMongo.update("TasksHistory", { status: 2, dateStatus: new Date() },
                    { idTask: task._id, status: 1 }
                    , true)
            }
        }

        
        // ---------------------------------SEND DATA
        if (syncMode == 1 || syncMode == 3) {
            if (syncMode == 3) 
                data[1] = await getDataFromMongo(task, clientMongo)
            let response = {error:0, msg:""}
            
            if (data[1].length != 0 ) {
                if (connection.typeDB == 'MySQL')
                    response = await MySQL_TaskData.SendTaskData(data[1], connection)
                else if(connection.typeDB == 'SQL Server')
                    response = await SqlServer_TaskData.SendTaskData(data[1], connection)
            }

            await clientMongo.push( "TasksHistory",
                { history: { status: 4, dateStatus: new Date() } },
                { idTask: task._id, status: { $in: [2,3] } }
            );

            await clientMongo.update("TasksHistory", { status: 4, dateStatus: new Date() },
                { idTask: task._id, status: { $in: [2,3] } }
                , true)

            await clientMongo.update("Synchronizations", { status: 2, dateStatus: new Date() }, {
                "tasks._id": task._id,
                status: 1
            }, true)

            await clientMongo.update("Synchronizations", { 'tasks.$.status': 2, 'tasks.$.dateStatus': new Date() },
                { 'tasks._id': task._id }
                , true)
        }

        process.exit(0);
        
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
}

async function transformData(data, task) {
    
    let dataResult = [];

    let mappingTranformation = {};
    for (const [key, value] of Object.entries(data[0])) {
        
        associated = false
        task.columnFrom.map(i => {
            if (i.name.endsWith("."+value) && associated == false)   {
                mappingTranformation[key] = i.transform
                associated = true
            } else  if (i.name.endsWith(value) && associated == false) {
                mappingTranformation[key] = i.transform
                associated = true
            } 
        })       
        if (associated == false)
            mappingTranformation[key] = ""
    }
    
    await Promise.all(data.map( async (i,k) => {
        let objData= {}
        objData.data = i
        //https://stackoverflow.com/questions/12491188/run-javascript-function-from-string-variable-and-pass-parameters
        for (const [key, value] of Object.entries(i)) {
            if (mappingTranformation[key].trim() != "") {
                let adder = new Function("value", mappingTranformation[key].trim());
                value = await adder(value)
            }
        }
        objData.hash = hash(i)
        dataResult.push(objData);
    }))

    return dataResult
}

async function saveDataToMongo(data, task, clientMongo) {
    // mudar para status == 4
    await clientMongo.delete("TasksHistoryDataTemp", {idTask: task._id})
    await clientMongo.insert("TasksHistoryDataTemp", data)
    return
}

async function getDataFromMongo(task, clientMongo) {
    return await clientMongo.find("TasksHistoryDataTemp", {idTask:task._id})
}

Connection_TaskRun(workerData[0],workerData[1],workerData[2],workerData[3]);
