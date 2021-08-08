const Mongo = require(__dirname+"/../classes/mongodb")
const SqlServer_TaskData = require(__dirname+"/../chunks/Connection_SqlServer_TaskData")
const MySQL_TaskData = require(__dirname+"/../chunks/Connection_MySQL_TaskData")
const { workerData} = require('worker_threads');
const hash = require('object-hash');
const { ObjectId } = require('mongodb');

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
        let connection = []

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

        containsFrom = 0;
        containsTo = 0;
        conections.map(i => {
            i._id = Buffer.from(i._id.id).toString("hex")
            if ((syncMode == 1 || syncMode == 2) && containsFrom == 0) 
                if (i._id == synchronization.computerFromConnection) 
                    containsFrom = i;
            
            if ((syncMode == 1 || syncMode == 3) && containsTo == 0 ) 
                if (i._id == synchronization.computerToConnection) 
                    containsTo = i;
        })
        connection.push(containsFrom);
        connection.push(containsTo);
        
        // mudar para status == 4
        defaultData = await clientMongo.find("TasksHistory", { status: 5 }, {dateStatus: -1}, 1 )
        if (defaultData.length == 0)
            defaultData = [{dateStatus: new Date(1980,00,01)}];

            
        // --------------------------------------------------------------------------------------------
        // ---------------------------------GET DATA -- MUDAR CODIGO ( if (syncMode != 2) ) => ( if (syncMode == 2) )
        let data = [];
        if (syncMode == 1 || syncMode == 2) {
            if (connection[0].typeDB == 'MySQL')
                data = await MySQL_TaskData.GetTaskData(task, connection[0],defaultData)
            else if(connection[0].typeDB == 'SQL Server')
                data = await SqlServer_TaskData.GetTaskData(task, connection[0], defaultData)
            
            if (typeof data[0].error != "undefined" && data[0].error == 1 ) {
                
                await clientMongo.push( "TasksHistory",
                { history: { status: 5, dateStatus: new Date(),  msg: data[0].msg } },
                { idTask: task._id, status:  { $in: [1, 3] }  });

                await clientMongo.update("TasksHistory", { status: 5, dateStatus: new Date(), msg: data[0].msg },
                { idTask: task._id, status: { $in: [1, 3] } }
                , true)
           
                process.exit(1);
            }

            if (data[1].length != 0 ) {
                data[1] = await transformData(data[1], task)
                let hashTag = data[1][data[1].length-1]
                delete data[1][data[1].length-1]

                data[1] = {idTask:task._id, hash:hashTag ,data: data[1].filter((a) => a) }
                
                if (syncMode == 2) {
                    await saveDataToMongo(data[1], task, clientMongo)

                    await clientMongo.push( "TasksHistory",
                        { history: { status: 2, dateStatus: new Date() } },
                        { idTask: task._id, status: 1 }
                    );
                    await clientMongo.update("TasksHistory", { status: 2, dateStatus: new Date() },
                        { idTask: task._id, status: 1 }
                        , true)
                }
                else {
                    await clientMongo.push( "TasksHistory",
                        { history: { status: 3, dateStatus: new Date() } },
                        { idTask: task._id, status: 1 }
                    );
                    await clientMongo.update("TasksHistory", { status: 3, dateStatus: new Date() },
                        { idTask: task._id, status: 1 }
                        , true)
                }
                
            }

        }

        // ---------------------------------SEND DATA
        // ------ MUDAR CODIGO ( if (syncMode != 3) ) => ( if (syncMode == 3) )
        if (syncMode == 1 || syncMode == 3) {
            if (connection.length == 2) {
                delete connection[0]
                connection  = connection.filter(el => { return el != null})
            }

            if (syncMode == 3) 
                data[1] = await getDataFromMongo(task, clientMongo)
            let response = [{error:0, msg:""}]
            if (typeof data[1].data != "undefined" && data[1].data.length > 0 ) {
                let databaseTo = await clientMongo.find("Databases", {_id: ObjectId(task.databaseTo)})
                if (databaseTo.length == 1 ) {
                    task.databaseToName = databaseTo[0].database;
                    
                    if (connection[0].typeDB == 'MySQL')
                        response = await MySQL_TaskData.SendTaskData(data[1], connection[0], task)
                    else if(connection[0].typeDB == 'SQL Server')
                        response = await SqlServer_TaskData.SendTaskData(data[1], connection[0],task)
                } else 
                    reponse = [{error:1, msg:"Database not found"}];
            }
            if (typeof response[0].error != "undefined" && response[0].error == 1 ) {
                await clientMongo.update("TasksHistory", { status: 5, dateStatus: new Date(), msg: response[0].msg },
                { idTask: task._id, status: { $in: [1, 3] } } )
                process.exit(1);
            }

            await clientMongo.push( "TasksHistory",
                { history: { status: 4, dateStatus: new Date() } },
                { idTask: task._id, status: { $in: [2,3] } }
            );

            await clientMongo.update("TasksHistory", { status: 4, dateStatus: new Date(), inserted: response[0].inserted, updated:response[0].updated },
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
    let keyValue = 0; 
   
    for (const [key, value] of Object.entries(data[0])) {
        mappingTranformation[key] = {};
        await Promise.all(task.columnFrom.map((i,k) => {
            if (i.name.endsWith(key)){
                mappingTranformation[key].unique = task.columnFrom[k].unique
                mappingTranformation[key].transform = task.columnFrom[k].transform
                mappingTranformation[key].columnAss = task.columnTo[k]
            }
        } ))
        keyValue ++;
    }

    await Promise.all(data.map( async (i,k) => {
        let x = {};
        //https://stackoverflow.com/questions/12491188/run-javascript-function-from-string-variable-and-pass-parameters
        for (const [key, value] of Object.entries(i)) {
            if (typeof mappingTranformation[key].transform != "undefined" && mappingTranformation[key].transform.trim() != "") {
                let adder = new Function("value",mappingTranformation[key].transform);
                i[key] = await adder(value)
            }
            if (typeof mappingTranformation[key].columnAss != "undefined")
                x[mappingTranformation[key].columnAss] = i[key];
        }
        dataResult.push(x);
        
    }))
    
    let mappingTransformationNew = {};
    for (const [key, value] of Object.entries(data[0])) {
        mappingTransformationNew[mappingTranformation[key].columnAss] =  {};
        mappingTransformationNew[mappingTranformation[key].columnAss] =  mappingTranformation[key]
    }
    dataResult.push({hash:hash(dataResult)});
    dataResultFinal = [];
    await Promise.all(dataResult.map( async (i,k) => {
        if (dataResult.length - 1 == k ) {
            dataResultFinal.push(i);
            return;
        }

        let objData = {};
        objData.data = i;
        objData.key = {};
        
        objData.hash = hash(objData.data)

        for (const [key, value] of Object.entries(i)) {
            if (mappingTransformationNew[key].unique == true) 
                objData.key[key] = objData.data[key];
        }

        for (const [key, value] of Object.entries(i)) 
            if (mappingTransformationNew[key].unique == true) 
               delete objData.data[key];

        dataResultFinal.push(objData);
        
    })) 
    return dataResultFinal
}

async function saveDataToMongo(data, task, clientMongo) {
    // mudar para status == 4
    await clientMongo.delete("TasksHistoryDataTemp", {idTask: task._id})
    await clientMongo.insert("TasksHistoryDataTemp", data)
    return
}

async function getDataFromMongo(task, clientMongo) {
    let data =  await clientMongo.find("TasksHistoryDataTemp", {idTask:task._id})
    if (data.length > 0 )
        return data[0];
    else 
        return [];
}

Connection_TaskRun(workerData[0],workerData[1],workerData[2],workerData[3]);
