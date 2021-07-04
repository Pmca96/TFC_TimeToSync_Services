const MongoClient = require('mongodb').MongoClient;

class Mongo {
    constructor(uri) {
      this.uri = uri;
      this.db = "TimeToSync"
    }
    
    async init() {
        this.client = new MongoClient(this.uri, { useUnifiedTopology: true, poolSize: 10});
        
        await this.client.connect()
        this.database = await this.client.db(this.db);
        return 
    }

   

    async insert ( collection, doc, isMany = 0) {
        let collectionSetted = this.database.collection(collection);
        let result
        if (isMany)
            result = await collectionSetted.insertMany(doc);
        else
            result = await collectionSetted.insertOne(doc);
        return result
    }
    
    async find ( collection, query = null, sort = null, limit = 0) {
        let collectionSetted = this.database.collection(collection);
        let result
        
        result = await collectionSetted.find(query).sort(sort).limit(limit);
        let data = result.toArray();
        return data;
    }

    async update( collection, setChanges, query = {}, isMany = false ) {
        let collectionSetted = this.database.collection(collection);
        let result

        if (isMany)
            result = await collectionSetted.updateMany(query, {$set: setChanges} )
        else
            result = await collectionSetted.updateOne(query, {$set: setChanges} )
        return result
    }

    async delete( collection, where = {}, isMany = false) {
        let collectionSetted = this.database.collection(collection);
        let result

        if (isMany)
            result = await collectionSetted.deleteMany(where )
        else
            result = await collectionSetted.deleteOne(where )
        return result
    }
    
    async close() {
        await this.client.close();
        return 
    }
}

module.exports = Mongo;


