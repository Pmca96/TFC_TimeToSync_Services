const Mongo = require("../classes/mongodb")
const { ObjectID } = require("mongodb");
const SqlServer = require("../classes/sqlserver")
const crypt = require("../classes/crypto")
const { workerData} = require('worker_threads');


const Connection_GetDataSqlServer = async (dataConnection, dataMongo) => {
    try {
        dataConnection.pass = await crypt.decrypt(dataConnection.pass)
        let clientSql = null
        let clientMongo = null
        let responsePings = null
        clientMongo = new Mongo(dataMongo.mongoDBuri)
        responsePings = await clientMongo.init();

        clientSql = new SqlServer(dataConnection.host, dataConnection.port, dataConnection.user, dataConnection.pass)
        await clientSql.init();


        let resultDatabases = await clientSql.query("SELECT name as 'Database' FROM sys.databases WHERE name NOT IN ('master', 'tempdb','model', 'msdb');");

        await Promise.all(resultDatabases.map(async (i, k) => {
            let objectToInsert = {};
            objectToInsert.database = i.Database;
            objectToInsert.idConnection = Buffer.from(dataConnection._id.id).toString("hex")
            objectToInsert.dateLastUpdate = new Date()
            objectToInsert.tables = [];
            // console.log("SELECT table_name as tableName FROM information_schema.tables WHERE table_schema = '"+i.Database+"';");
            let resultTables = await clientSql.query("SELECT TABLE_NAME as tableName, TABLE_SCHEMA as tableSchema FROM " + i.Database + ".INFORMATION_SCHEMA.TABLES  WHERE TABLE_TYPE = 'BASE TABLE'");

            await Promise.all(resultTables.map(async (j) => {
                let resultColumns = await clientSql.query(await getColumns(i.Database, j.tableSchema + "." + j.tableName), i.Database);

                let columnsToObj = []
                await Promise.all(resultColumns.map((m) =>
                    columnsToObj.push(m)
                ))
                objectToInsert.tables.push({ name: j.tableName, columns: columnsToObj })
            }));

            let dataFound = await clientMongo.find("Databases", {idConnection:  objectToInsert.idConnection  , database:  objectToInsert.database})
            if (dataFound.length > 0) 
                await clientMongo.update("Databases", objectToInsert, {idConnection:  objectToInsert.idConnection  , database:  objectToInsert.database})
            else
                await clientMongo.insert("Databases", objectToInsert)
        }))

        // Set connection status to complete
        await clientMongo.update("Connections", { status: 2,  dateStatus: new Date() }, { $and: [
            { computers: dataMongo.machineIdDB },
            { status: 1 },
            {_id : ObjectID(Buffer.from(dataConnection._id.id).toString("hex"))}
         ] }, true)
        await clientSql.closePools();
        await clientMongo.close();
        process.exit("1");
    } catch (e) {
        throw new Error(e);
    }
}

async function getColumns(database, table) {
    return "SELECT " +
        " t.name tableName  " +
        ", C.name columnName " +
        ", S.name dataType " +
        ", C.max_length 'Max Length' " +
        ", C.precision  " +
        ", C.scale  " +
        ",C.is_nullable isNullable" +
        ", C.column_id position " +
        ",ISNULL(i.is_primary_key, 0) 'key' " +
        ", tf.name ParentTableName " +
        ", CF.name ParentColumnName " +
        "FROM sys.tables T " +
        "INNER JOIN sys.columns C ON T.object_id = C.object_id " +
        "INNER JOIN sys.types S ON C.system_type_id = S.system_type_id AND s.name NOT LIKE 'sysname' " +
        "LEFT JOIN sys.foreign_key_columns FSK ON FSK.parent_object_id = t.object_id  AND FSK.parent_column_id = C.column_id " +
        "LEFT JOIN SYS.columns CF ON FSK.referenced_object_id = CF.object_id AND FSK.referenced_column_id = CF.column_id " +
        "LEFT JOIN SYS.tables TF ON cf.object_id = TF.object_id " +
        "LEFT OUTER JOIN sys.index_columns ic ON ic.object_id = C.object_id AND ic.column_id = C.column_id " +
        "LEFT OUTER JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id " +
        "where " +
        "c.object_id = OBJECT_ID('" + database + "." + table + "') order by c.column_id ";
}

Connection_GetDataSqlServer(workerData[0],workerData[1]);

// -- Get creation procedures and functions and triggers
// select object_definition(object_id)
// from sys.objects
// where type_desc IN ('SQL_SCALAR_FUNCTION',
// 'SQL_STORED_PROCEDURE',
// 'SQL_TABLE_VALUED_FUNCTION',
// 'SQL_TRIGGER',
// 'VIEW')









module.exports = Connection_GetDataSqlServer;