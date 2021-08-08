const MySQL = require(__dirname+"/../classes/mysql")
const crypt = require(__dirname+"/../classes/crypto")
const conditionToQuery = require(__dirname+"/ConditionToQuery")
const hash = require('object-hash');

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
            return [{error:1, msg:resultDatabases.msg + "\n"+ query}, resultDatabases];
        else
            return [{error:0, msg:0}, resultDatabases];
    } catch (e) {
        console.log(e);
        return [{error:1, msg:query}];
    }
}

const Connection_MySQL_SendTaskData = async (data, connection, task)  => {
    try {
        let ConnectionPassword = await  crypt.decrypt(connection.pass)
        clientMysql = new MySQL(connection.host, connection.port, connection.user,ConnectionPassword )
        await clientMysql.init();
        await clientMysql.close();

        await clientMysql.initPool();

        let query = "Select * from "+task.databaseToName+"."+task.tableTo;
        let resultDatabases = await clientMysql.queryPool(query);
        if (typeof resultDatabases.error != "undefined")
            return [{error:1, msg:resultDatabases.msg + "\n"+query}];

        let hashedData = hash(resultDatabases)
      
        let queryData = "";

        let updated = 0;
        let inserted = 0;

        if (hashedData != data.hash.hash) {
            await Promise.all(data.data.map(async i => {
                let found = false;
                let columns = ""
                let valueColumns = ""
                found = await resultDatabases.find(element => {
                    return i.hash == hash(element)
                })

                if (typeof found == "undefined") {
                    found = await resultDatabases.find(element => {
                        let sizeKeys = 0
                        let sizeKeysAcc = 0
                        
                        for (const [key1, value1] of Object.entries(i.key)) {
                            sizeKeys++;
                            for (const [key2, value2] of Object.entries(element)) {
                                if (key1 == key2 && value1 == value2) {
                                    sizeKeysAcc++;
                                    continue;
                                } else if (key1 == key2)
                                    continue;
                            }   
                        }
                        if (sizeKeys == sizeKeysAcc)
                            return true;
                        else
                            return false
                    })

                    if (typeof found == "undefined")
                    {
                        [columns, valueColumns] = await constructQueryIns(i.key, columns, valueColumns);
                        [columns, valueColumns] = await constructQueryIns(i.data, columns, valueColumns);
                        queryData += "INSERT INTO "+task.databaseToName+"."+task.tableTo + " ("+columns+") values ("+valueColumns+");";
                        inserted++;
                    } else {
                        [columns, valueColumns] = await constructQueryUpd(i.key, columns, valueColumns, 0);
                        [columns, valueColumns] = await constructQueryUpd(i.data, columns, valueColumns, 1);
                        queryData += "UPDATE "+task.databaseToName+"."+task.tableTo + " SET "+valueColumns+" "+columns+";";
                        updated++;
                    }
                }

            }))
        } else 
            resultDatabases = undefined
        if (queryData != "")
            resultDatabases = await  clientMysql.queryPool(queryData);
        if (typeof resultDatabases.error != "undefined")
            return [{error:1, msg:resultDatabases.msg + "\n"+queryData}];
        else
            return [{error:0, msg:0, inserted:inserted, updated:updated}, resultDatabases];
        

    } catch (e) {
        console.log(e);
        return [{error:1, msg:e.message}];
    }

}


const constructQueryIns = async (objectValues, columns, valueColumns ) =>  {
    for (const [name, value] of Object.entries(objectValues)) {
        if (columns == "")
            columns += name;
        else
            columns += ","+name;
        if (valueColumns == "")
            valueColumns += await checkTypeOf(value);
        else
            valueColumns += ","+ await checkTypeOf(value);
    }
    return [columns, valueColumns];
}

const constructQueryUpd = async (objectValues, columns, valueColumns, type ) =>  {
    for (const [name, value] of Object.entries(objectValues)) {
       
    if (type == 1)
        if (valueColumns == "")
            valueColumns += name+" = "+await checkTypeOf(value);
        else
            valueColumns += ","+ name+" = "+ await checkTypeOf(value);
    else
        if (columns == "")
            columns += "WHERE "+name+" = "+await checkTypeOf(value);
        else
            columns += " and "+ name+" = "+ await checkTypeOf(value);
    }
    return [columns, valueColumns];
}

const checkTypeOf = (value) => {

    if (typeof value == "string")
        return "'"+value.replace("'","\\'")+"'";
    else if (value instanceof Date) {
        return formatDate(value)
    }
        return value;
}

function formatDate(date) {
    var d = new Date(date)
    month = '' + (d.getMonth() + 1)
    day = '' + d.getDate()
    year = d.getFullYear()
    hour = d.getHours()
    minute = d.getMinutes()
    second = d.getSeconds()
    mili = d.getMilliseconds()

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;
    if (hour.length < 2) 
        hour = '0' + hour;
    if (minute.length < 2) 
        minute = '0' + minute;
    if (second.length < 2) 
        second = '0' + second;
    return "'"+ [year, month, day].join('-')+" "+[hour, minute, second].join(':')+"."+mili+"'";
}

exports.SendTaskData = Connection_MySQL_SendTaskData;
exports.GetTaskData = Connection_MySQL_GetTaskData;
