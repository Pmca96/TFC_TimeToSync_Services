const { Worker } = require('worker_threads');
const Mongo = require("../classes/mongodb")
var parser = require('cron-parser');

const workerList = []
let exitedWorkers = 0;
let objectDataGlobal

const Connection_CheckTasks = async (objectData) => {
    objectDataGlobal = objectData;

    // Pending tasks (from and to connections)

    let dataTasks = await objectDataGlobal.mongoClient.find("TasksHistory", {
        $or: [ 
            { $and : [
                { status: 0 },
                { fromComputer: objectDataGlobal.dataToWorkers.machineIdDB }
            ] },
            { $and : [
                { status: 2 },
                { toComputer: objectDataGlobal.dataToWorkers.machineIdDB }
            ] }
            
        ]
    })
    let dataTasksFinal = [];
    let dataTasksId = []
    if (dataTasks.length > 0 ) {
        dataTasks.map( i => dataTasksId.push(i.idTask)) 
        if (dataTasksId.length > 0 )
            dataTasksFinal = await objectDataGlobal.mongoClient.find("Synchronizations", 
            {'tasks._id': { $in:  dataTasksId} }
            , null, 0,  { _id: 0, tasks: 1 })
    }
    if (dataTasksFinal.length > 0) {
        let conditionID = []
        dataTasksFinal.map(i => conditionID.push(i._id))
        await objectDataGlobal.mongoClient.update("Synchronizations",  { status: 1, dateStatus : new Date() }, {_id: { $in:  conditionID} }, true)
        await objectDataGlobal.mongoClient.update("Synchronizations",  { 'tasks.$.status': 1, 'tasks.$.dateStatus': new Date() }, {'tasks._id': { $in:  dataTasksId} }, true)
        await objectDataGlobal.mongoClient.update("TasksHistory", { status: 1, dateStatus : new Date() }, {idTask: { $in:  dataTasksId} , status:0}, true)
        await objectDataGlobal.mongoClient.update("TasksHistory", { status: 3, dateStatus : new Date() }, {idTask: { $in:  dataTasksId} , status:2}, true)
        await getNewData(data, conditionID)
    }

    // Cron job for tasks (from and to connections)
    let dataSyncsTasks = await objectDataGlobal.mongoClient.find("Synchronizations", {
        $and: [
            { status: {$in : [2,0]}},
            { computerFrom: objectDataGlobal.dataToWorkers.machineIdDB },
            { "tasks.inactive": false },
            { inactive : false }
        ]
    }, {idSync:1})

    if (dataSyncsTasks.length > 0) {
        let dataSyncsTasksNew = await checkCronJob(dataSyncsTasks);
        if (dataSyncsTasksNew.length > 0 ) {
            let conditionID = []
            let conditionTasksID = []
            await Promise.all(dataSyncsTasksNew.map(async i => {
                conditionID.push(i._id)
                await Promise.all(i.tasks.map (async j => {
                    if (j.inactive == false)  {
                        conditionTasksID.push(j._id)
                        await objectDataGlobal.mongoClient.insert("TasksHistory", 
                        { 
                            idSync: i._id,
                            fromComputer: i.computerFrom,
                            toComputer: i.computerTo,
                            idTask: j._id,
                            status: 1, 
                            dateStatus : new Date() , 
                            history: [{status:1,dateStatus: new Date()}]
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

            await objectDataGlobal.mongoClient.update("Synchronizations", { 'tasks.$.status': 1, 'tasks.$.dateStatus': new Date() },  {
                $and: [
                    { computerFrom: objectDataGlobal.dataToWorkers.machineIdDB },
                    {'tasks._id': { $in: conditionTasksID } }
                ]
            }, true)
            
            console.log("here1")
            await Promise.all( dataSyncsTasksNew.map( data => getNewData(data.tasks, conditionID)));
            console.log("here2")
        }
    }
}

const getNewData = async (data, conditionID) => {
    try {
        let dataPrepared = await prepareDependencies(data)
        let error = false;
        if (dataPrepared.length > 0)
            await Promise.all( dataPrepared.map(async dataDependecie => {
                await Promise.all( dataDependecie.map( async task => {
                    let worker
                    worker = new Worker(__dirname+"/Connection_ResolveTask.js", {
                        workerData: [task, objectDataGlobal.dataToWorkers]
                    });
                    workerList.push(worker);
                    worker.on('exit', (code) => {
                        if (code == 0)
                            error=true;
                        exitedWorkers++;
                    })
                }))
                console.log("feito todas as dependencies")
            }))

        // aguarda o feicho das threads
        await new Promise((resolve) => interv = setInterval(() => {
            if (exitedWorkers == workerList.length) {
                clearInterval(interv);
                resolve()
            }
        }, 100));

        //modificar
        if (error == true) {
            let clientMongo = new Mongo(objectDataGlobal.dataToWorkers.mongoDBuri);
            await clientMongo.init();
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

const checkCronJob = async(data) => {
    let dataToRun = [];
    data.map(i => {
        var interval = parser.parseExpression(
            " 0 "+i.crontab.minute+" "+i.crontab.hour+" "+i.crontab.dayMonth+" "+i.crontab.month+" "+i.crontab.dayWeek
            );
        let prevDateRunned = interval.prev();

        if (new Date().getTime() - prevDateRunned.getTime()  <= 17000) 
            dataToRun.push(i);
        

    })
    return dataToRun;
}

const prepareDependencies = async(data) => {
    let dataDependencies = []
    let totalNodes =  data.length
    let currentNode =  0
    let maxIterator =  10
    let currIterator =  0
    while (totalNodes != currentNode && maxIterator != currIterator) {
        data.map((i,k) => {
            if (typeof i.alreadyAssociated == "undefined") {
                let toPass=1
                data.map((j,l) => {
                    if ((typeof j.alreadyAssociated == "undefined" || j.alreadyAssociated == currIterator ) && i.dependencies.includes(j._id)) {
                        toPass = 0
                    }
                })
                if (toPass == 1) {
                    if (dataDependencies.length != currIterator+1)
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

module.exports = Connection_CheckTasks;