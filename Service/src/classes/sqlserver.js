const sql= require("mssql");

class SqlServer {
  constructor(host, port, user, pass) {
    this.host = host;
    this.port = port;
    this.user = user;
    this.pass = pass;
    this.pools = [];
    this.sqlConfig = {
      server: this.host,
      port: parseInt(this.port),
      user: this.user,
      password: this.pass,
      trustServerCertificate: true,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      },
    };
  }

  async init() {
    try {
      let pool = await sql.connect(this.sqlConfig);
      this.pools.push(pool);
    } catch (err) {
      return { state: "disconnected" };
    }
  }

  async query(queryString, database = "", type = "SELECT") {
    if (database != "")
      this.sqlConfig.database = database;
    let pool = new sql.ConnectionPool(this.sqlConfig);
    await pool.connect();
    let request = pool.request();
    let result = await request.query(queryString)
    this.pools.push(pool);
    return result.recordset;
  }

  async closePools() {
    this.pools.map(i=> i.close())
    return;
  }


  async close() {
    await sql.close();
    return;
  }
}

module.exports = SqlServer
