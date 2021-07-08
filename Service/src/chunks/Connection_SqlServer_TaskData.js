
const crypt = require(__dirname+"/../classes/crypto")
const SqlServer = require(__dirname+"/../classes/sqlserver")

const Connection_SqlServer_GetTaskData = async (task, conections, defaultData)  => {
    try {

        let ConnectionPassword = await  crypt.decrypt(connection.pass)
        clientSql = new SqlServer(dataConnection.host, dataConnection.port, dataConnection.user, ConnectionPassword)
        await clientSql.init();

        let query = await conditionToQuery.conditionToQuery(task);

        let resultDatabases = await clientSql.query(query);
        if (typeof resultDatabases.error != "undefined")
            return [resultDatabases];
        else
            return [{error:0, msg:0}, resultDatabases];
    } catch (e) {
        console.log(e);
        return [{error:1, msg:query}];
    }
}
const Connection_SqlServer_SendTaskData = async (task, conections)  => {
    
}

exports.SendTaskData = Connection_SqlServer_SendTaskData;
exports.GetTaskData = Connection_SqlServer_GetTaskData;