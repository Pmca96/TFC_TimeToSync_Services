const { Worker } = require('worker_threads');
var parser = require('cron-parser');

const workerList = []
let exitedWorkers = 0;
let objectDataGlobal

const Connection_TaskCheck = async (objectData) => {
    objectDataGlobal = objectData;

    let dataConnection = [];
    dataConnection = await objectDataGlobal.mongoClient.find("Connections",
        { computers: objectDataGlobal.dataToWorkers.machineIdDB })

    // Pending tasks (from and to connections)

    let dataTasks = await objectDataGlobal.mongoClient.find("TasksHistory", {
        $or: [
            {
                $and: [
                    { status: 0 },
                    { fromComputer: objectDataGlobal.dataToWorkers.machineIdDB }
                ]
            },
            {
                and: [
                    { status: 2 },
                    { toComputer: objectDataGlobal.dataToWorkers.machineIdDB }
                ]
            }

        ]
    })
    let dataTasksFinal = [];
    let dataSynchronism = [];


    let dataTasksId = []
    if (dataTasks.length > 0 && dataConnection.length > 0) {
        dataTasks.map(i => dataTasksId.push(i.idTask))
        if (dataTasksId.length > 0) {
            dataTasksFinal = await objectDataGlobal.mongoClient.find("Synchronizations",
                { 'tasks._id': { $in: dataTasksId } }
                , null, 0, { _id: 1, tasks: 1 })
            dataSynchronism = await objectDataGlobal.mongoClient.find("Synchronizations",
                { 'tasks._id': { $in: dataTasksId } })
        }
    }
    if (dataTasksFinal.length > 0 && dataConnection.length > 0) {
        let conditionID = []
        dataTasksFinal.map(i => conditionID.push(i._id))
        await objectDataGlobal.mongoClient.update("Synchronizations", { status: 1, dateStatus: new Date() }, { _id: { $in: conditionID } }, true)
        await objectDataGlobal.mongoClient.update("Synchronizations", { 'tasks.$.status': 1, 'tasks.$.dateStatus': new Date() }, { 'tasks._id': { $in: dataTasksId } }, true)
        await objectDataGlobal.mongoClient.update("TasksHistory", { status: 1, dateStatus: new Date() }, { idTask: { $in: dataTasksId }, status: 0 }, true)
        await objectDataGlobal.mongoClient.update("TasksHistory", { status: 3, dateStatus: new Date() }, { idTask: { $in: dataTasksId }, status: 2 }, true)
        let dataTasksFinalNew = await prepareTasksRun(dataTasksFinal)
        await Promise.all(dataTasksFinalNew.map(data => getNewData(data.tasks, dataConnection, dataSynchronism)));
        await objectDataGlobal.mongoClient.update("Synchronizations", { status: 2, dateStatus: new Date() }, { _id: { $in: conditionID }, status: 1 }, true)
    }

    //------------------------------------------------------------------------------------------------------------------
    // Cron job for tasks (from and to connections)
    let dataSyncsTasks = await objectDataGlobal.mongoClient.find("Synchronizations", 
        {   status: { $in: [-2, 0, 2] } , 
            $or: [
                { computerFrom: objectDataGlobal.dataToWorkers.machineIdDB },
                { computerTo: objectDataGlobal.dataToWorkers.machineIdDB }
            ],
            "tasks.inactive": false,
             inactive: false 
    }, { idSync: 1 },  0)
    

    if (dataSyncsTasks.length > 0 && dataConnection.length > 0) {
        let dataSyncsTasksNew = await checkCronJob(dataSyncsTasks);
        let dataSyncsTasksActives = dataSyncsTasksNew
        if (dataSyncsTasksNew.length > 0) {
            dataSyncsTasksActives.map( (i,k) => {
                i.tasks.map((j, l )=> {
                    if (j.inactive == true )
                    delete dataSyncsTasksNew[k].tasks[l];
                })
                
            })
        }
   
        if  (dataSyncsTasksNew.length > 0) {
            let conditionID = []
            let conditionTasksID = []
            await Promise.all(dataSyncsTasksNew.map(async i => {
                conditionID.push(i._id)
                await Promise.all(i.tasks.map(async j => {
                    if (j.inactive == false) {
                        conditionTasksID.push(j._id)
                        await objectDataGlobal.mongoClient.insert("TasksHistory",
                            {
                                idSync: i._id,
                                fromComputer: i.computerFrom,
                                toComputer: i.computerTo,
                                idTask: j._id,
                                status: 1,
                                dateStatus: new Date(),
                                history: [{ status: 1, dateStatus: new Date() }]
                            })
                    }
                }))
            }))
            await objectDataGlobal.mongoClient.update("Synchronizations", { status: 1, dateStatus: new Date() }, {
                $and: [
                    { computerFrom: objectDataGlobal.dataToWorkers.machineIdDB },
                    { _id: { $in: conditionID } }
                ]
            }, true)

            await objectDataGlobal.mongoClient.update("Synchronizations", { 'tasks.$.status': 1, 'tasks.$.dateStatus': new Date() }, {
                $and: [
                    { computerFrom: objectDataGlobal.dataToWorkers.machineIdDB },
                    { 'tasks._id': { $in: conditionTasksID } }
                ]
            }, true)

            await Promise.all(dataSyncsTasksNew.map(data => getNewData(data.tasks, dataConnection, dataSyncsTasks)));

            await objectDataGlobal.mongoClient.update("Synchronizations", { status: 2, dateStatus: new Date() }, {
                $and: [
                    { computerFrom: objectDataGlobal.dataToWorkers.machineIdDB },
                    { _id: { $in: conditionID } },
                    { status: 1 },
                ]
            }, true)
        }
    }
}

const getNewData = async (data, connection, synchronization) => {
    try {
        let dataPrepared = await prepareDependencies(data.filter(el => { return el != null}))
        let error = [];
        if (dataPrepared.length > 0)
            await Promise.all(dataPrepared.map(async dataDependencie => {
                await Promise.all(dataDependencie.map(async task => {
                    let worker
                    worker = new Worker(__dirname + "/Connection_TaskRun.js", {
                        workerData: [task, connection, synchronization, objectDataGlobal.dataToWorkers]
                    });
                    workerList.push(worker);
                    worker.on('exit', (code) => {
                        if (code == 1)
                            error.push(task);
                        exitedWorkers++;
                        
                    })
                }))
            }))

        await new Promise((resolve) => interv = setInterval(() => {
            if (exitedWorkers == workerList.length) {
                clearInterval(interv);
                resolve()
            }
        }, 100));

        //validar
        if (error.length > 0) {
         
            let conditionIDTasksErrors = []
            error.map(async i => conditionIDTasksErrors.push(i._id));
            if (conditionIDTasksErrors.length > 0) {
                await objectDataGlobal.mongoClient.update("Synchronizations", { status: -2, dateStatus: new Date() }, {
                    "tasks._id": { $in: conditionIDTasksErrors },
                    $or: [{ status: 1 }, { status:2 },{ status: 3 }]
                }, true)

                await objectDataGlobal.mongoClient.update("Synchronizations", { 'tasks.$.status': -2, 'tasks.$.dateStatus': new Date() },
                    { 'tasks._id': { $in: conditionIDTasksErrors } }
                    , true)

                await objectDataGlobal.mongoClient.push(
                    "TasksHistory",
                    { history: { status: 5, dateStatus: new Date() } },
                    { idTask: { $in: conditionIDTasksErrors }, status: { $in: [1, 3] } }
                );

                await objectDataGlobal.mongoClient.update("TasksHistory", { status: 5, dateStatus: new Date() },
                    { idTask: { $in: conditionIDTasksErrors }, status: { $in: [1, 3] } }
                    , true)
            }
        }

    } catch (err) {
        console.error(err);
    }
}

const checkCronJob = async (data) => {
    let dataToRun = [];
    data.map(i => {
        var interval = parser.parseExpression(
            " 0 " + i.crontab.minute + " " + i.crontab.hour + " " + i.crontab.dayMonth + " " + i.crontab.month + " " + i.crontab.dayWeek
        );
        let prevDateRunned = interval.prev();
        
        if (new Date().getTime() - prevDateRunned.getTime() <= 18000)
            dataToRun.push(i);
    })
    return dataToRun;
}

const prepareDependencies = async (data) => {
    let dataDependencies = []
    let totalNodes = data.length
    let currentNode = 0
    let maxIterator = 10
    let currIterator = 0
    while (totalNodes != currentNode && maxIterator != currIterator) {
        data.map((i, k) => {
            if (typeof i.alreadyAssociated == "undefined") {
                let toPass = 1
                data.map((j, l) => {
                    if ((typeof j.alreadyAssociated == "undefined" || j.alreadyAssociated == currIterator) && typeof i.dependencies != "undefined" && i.dependencies.includes(j._id)) {
                        toPass = 0
                    }
                })
                if (toPass == 1) {
                    if (dataDependencies.length != currIterator + 1)
                        dataDependencies.push([]);
                    dataDependencies[currIterator].push(i)
                    i.alreadyAssociated = currIterator;
                    currentNode++;
                }
            }
        })
        currIterator++;
    }
    if (currIterator == 10)
        dataDependencies = [];

    return dataDependencies;
}

const prepareTasksRun = async(data) => {
    
    let syncTasks = []
    data.map(i => {
        let exitsId = false
        syncTasks.map( j => {
            if (j._id == i._id) {
                exitsId = true
                j.tasks.push(i.tasks)
            }
        })
        if (! exitsId) {
            syncTasks.push({_id:i._id, tasks:[i.tasks]})
        }
    })
    return syncTasks;

}

module.exports = Connection_TaskCheck;