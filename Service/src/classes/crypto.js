const crypto = require('crypto');
const serialize = require('node-serialize');
const fs = require ("fs");
const path = require ("path");

const algorithm = 'aes-256-ctr';
const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3';
//const iv =crypto.randomBytes(16);
const iv = Buffer.alloc(16);

const encrypt = (text) => {
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
};

const decrypt = (hash) => {
    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(iv.toString('hex'), 'hex'));
    
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash, 'hex')), decipher.final()]);
    
    return decrpyted.toString();
};

const readConfig = () => {
    return decrypt(fs.readFileSync(path.resolve(__dirname+"/../../assets/config.cnf"), 'utf8' ))
}

const writeConfig = (text) => {
    text = encrypt(text)
    let data = fs.writeFileSync(__dirname+"/../../assets/config.cnf", text.content);
    
    return data;
}

module.exports = {
    encrypt,
    decrypt,
    readConfig,
    writeConfig
};


// const MongoClient = require('mongodb').MongoClient;
// const uri = "mongodb+srv://admin:admin@cluster0.2vlbl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
// client.connect(err => {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// });