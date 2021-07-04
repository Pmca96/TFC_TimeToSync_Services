const mysql = require("mysql");

class MySQL {
  constructor(host, port, user, pass) {
    this.host = host;
    this.port = port;
    this.user = user;
    this.pass = pass;
  }

  async init() {
    this.client = mysql.createConnection({
      host: this.host,
      port: this.port,
      user: this.user,
      password: this.pass,
    });
    let self = this;

    try {
      return new Promise(function (resolve, reject) {
        self.client.connect(function (err) {
          if (err)
            reject({ state: "disconnected", err: err });
          else
            resolve({ state: "authenticated" });
        });
      });
    } catch (e) {
      console.log(e);
      return e;
    }
  }

  async initPool() {
    this.pool = mysql.createPool({
      connectionLimit: 10,
      host: this.host,
      port: this.port,
      user: this.user,
      password: this.pass,
    });
  }

  async query(queryString) {
    let self = this;
    try {
      return new Promise(function (resolve, reject) {
        self.client.query(queryString, function (err, result, field) {
          if (err) reject({ state: "disconnected", err: err });
          resolve(result);
        });
      });
    } catch (e) {
      return e;
    }

  }

  async queryPool(queryString) {
    let self = this;
    try {
      return new Promise(function (resolve, reject) {
        self.pool.query(queryString, function (err, result, fields) {
          if (err) reject(err); // not connected!
          resolve(result)
        });
      })
    } catch (e) {
      return e;
    }
  }

  async close() {
    await this.client.destroy();
    return;
  }
}


module.exports = MySQL
