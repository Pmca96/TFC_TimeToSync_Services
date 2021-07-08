const MySQL = require(__dirname+"/../classes/mysql")
const crypt = require(__dirname+"/../classes/crypto")
const conditionToQuery = require(__dirname+"/ConditionToQuery")

const Connection_MySQL_GetTaskData = async (task, connection, defaultData) => {

    try {

        let ConnectionPassword = await  crypt.decrypt(connection.pass)
        clientMysql = new MySQL(connection.host, connection.port, connection.user,ConnectionPassword )

        await clientMysql.init();
        await clientMysql.close();

        clientMysql.initPool();

        let query = await conditionToQuery.conditionToQuery(task);

        let resultDatabases = await clientMysql.queryPool(query);
        if (typeof resultDatabases.error != "undefined")
            return [resultDatabases];
        else
            return [{error:0, msg:0}, resultDatabases];
    } catch (e) {
        console.log(e);
        return [{error:1, msg:query}];
    }
}

const Connection_MySQL_SendTaskData = async (task, connection)  => {
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    const array1 = [{n:5}, {n:12, g:10}, {n:8}, {n:130}, {n:44}];

    const found = array1.find(element => element.n == 12);

    console.log(found);
}

exports.SendTaskData = Connection_MySQL_SendTaskData;
exports.GetTaskData = Connection_MySQL_GetTaskData;
