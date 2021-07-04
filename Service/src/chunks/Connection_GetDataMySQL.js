const Mongo = require("../classes/mongodb")
const { ObjectID } = require("mongodb");
const MySQL = require("../classes/mysql")
const crypt = require("../classes/crypto")


const Connection_GetDataMySQL = async (dataConnection, dataMongo) => {
    try {
        dataConnection.pass = await crypt.decrypt(dataConnection.pass)
        let clientMysql = null
        let clientMongo = null
        clientMongo = new Mongo(dataMongo.mongoDBuri)
        await clientMongo.init();

        clientMysql = new MySQL(dataConnection.host, dataConnection.port, dataConnection.user, dataConnection.pass)

        await clientMysql.init();
        await clientMysql.close();
        

        clientMysql.initPool();

        let resultDatabases = await clientMysql.queryPool("SELECT `schema_name` as `Database` from INFORMATION_SCHEMA.SCHEMATA " +
         " WHERE schema_name NOT IN('information_schema', 'mysql', 'performance_schema', 'sys');");

        await Promise.all( resultDatabases.map(async (i) => {
            let objectToInsert = {};
            objectToInsert.database = i.Database;
            objectToInsert.idConnection = Buffer.from(dataConnection._id.id).toString("hex")
            objectToInsert.dateLastUpdate = new Date()
            objectToInsert.tables = [];
            let resultTables = await clientMysql.queryPool("SELECT table_name as tableName FROM information_schema.tables WHERE table_schema = '" + i.Database + "';");
            await Promise.all(resultTables.map(async (j) => {
                let resultColumns = await clientMysql.queryPool(await getColumns(i.Database, j.tableName));
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

        await clientMongo.close();
        return 1;
    } catch (e) {
        console.log(e)
        throw new Error('exception!');
    }

}


async function getColumns(database, table) {
    return "SELECT " +
       // "  t.table_schema AS 'Database', " +
        "  t.table_name AS 'tableName' " +
        "  ,c.column_name AS 'columnName' " +
        "  ,c.column_type AS 'columnType' " +
        "  ,c.is_nullable AS 'isNullable' " +
        "  ,c.ordinal_position AS 'position ' " +
        "  ,c.column_key AS 'key' " +
        "  ,k.constraint_name AS 'constraint' " +
        "  ,k.table_name AS 'tableReference' " +
        "  ,k.column_name AS 'columnReference' " +
        "FROM information_schema.tables t " +
        "JOIN information_schema.columns c ON t.table_schema = c.table_schema AND t.table_name = c.table_name " +
        "left JOIN information_schema.key_column_usage k ON t.table_schema = k.referenced_table_schema " +
        " 	AND t.table_name = k.referenced_table_name AND c.column_name = k.referenced_column_name " +
        "WHERE t.table_schema = '" + database + "' and t.table_name = '" + table + "' " +
        "ORDER BY t.table_schema,t.table_type,t.table_name,c.ordinal_position;"
}



//https://www.artfulsoftware.com/infotree/queries.php

// -- For column tables
// SELECT
//   t.table_schema AS 'Database'
//   ,t.table_name AS 'Table'
//   ,c.column_name AS 'Column'
//   ,c.column_type AS 'Column Type'  
//   ,c.is_nullable AS 'IS_NULLABLE'  
//   ,c.column_key AS 'Column Key'
//   ,c.ordinal_position AS 'Position'
//   ,k.constraint_name AS 'Constraint'\
//   ,k.table_name AS 'tableReference'
//   ,k.column_name AS 'columnReference'
// FROM information_schema.tables t
// JOIN information_schema.columns c ON t.table_schema = c.table_schema AND t.table_name = c.table_name
// left JOIN information_schema.key_column_usage k ON t.table_schema = k.referenced_table_schema 
// 	AND t.table_name = k.referenced_table_name AND c.column_name = k.referenced_column_name
// WHERE t.table_schema NOT IN( 'mysql','information_schema','performance_schema')
// ORDER BY t.table_schema,t.table_type,t.table_name,c.ordinal_position;


// -- To dont check foreign when inserting
// -- Specify to check foreign key constraints (this is the default)
// SET FOREIGN_KEY_CHECKS = 1;
// -- Do not check foreign key constraints
// SET FOREIGN_KEY_CHECKS = 0;


// -- For create table
//show create table employees;

module.exports = Connection_GetDataMySQL;