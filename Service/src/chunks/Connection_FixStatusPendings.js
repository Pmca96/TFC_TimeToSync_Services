let objectDataGlobal

const Connection_FixStatusPendings = async (objectData) => {
    objectDataGlobal = objectData;
    // 1000 = 1 seg
    let pastDates = new Date(new Date().getTime() - 60000);
    await objectDataGlobal.mongoClient.update("Connections", {status:-1, dateStatus: new Date()},
        { status:1,   dateStatus: { $lte: pastDates } })

        
        await objectDataGlobal.mongoClient.push(
            "TasksHistory",
            { history: { status: 5, dateStatus: new Date() } },
            {  dateStatus: { $lte: pastDates }, status: { $in: [1, 3] } }
        );

    await objectDataGlobal.mongoClient.update("TasksHistory", {status:5, dateStatus: new Date()},
        { status: { $in: [1, 3] } ,   dateStatus: { $lte: pastDates } })

    await objectDataGlobal.mongoClient.update("Synchronizations", {status:-2, dateStatus: new Date()},
        { status:1,   dateStatus: { $lte: pastDates } })

    await objectDataGlobal.mongoClient.update("Synchronizations", {"tasks.$.status":-2, "tasks.$.dateStatus": new Date()},
        { "tasks.status":1,   "tasks.dateStatus": { $lte: pastDates } })
}

module.exports = Connection_FixStatusPendings;