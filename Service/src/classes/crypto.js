const crypto = require('crypto');
const serialize = require('node-serialize');
const fs = require("fs");
const path = require("path");

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
    try {
        return decrypt(fs.readFileSync(path.resolve("./assets/config.cnf"), 'utf8'))
    }
    catch (error) {
        console.log(".Couldn't read file config");
        process.exit();
    }
}

const writeConfig = (text) => {
    try {
        text = encrypt(text)
        let data = fs.writeFileSync(path.resolve("./assets/config.cnf"), text.content);

        return data;
    }
    catch (error) {
        console.log(".Couldn't write in file config");
        process.exit();
    }
}

module.exports = {
    encrypt,
    decrypt,
    readConfig,
    writeConfig
};
