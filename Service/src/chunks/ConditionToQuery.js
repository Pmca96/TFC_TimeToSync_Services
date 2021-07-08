
const  conditionToQuery = (task) => {
    let dataQuery = "";
    task.select.map((i) => {
      if (typeof i.query != "undefined" && i.query != "") {
        if (dataQuery == "") dataQuery = "SELECT " + i.query;
        else dataQuery += " , " + i.query;
      }

      if (typeof i.database != "undefined" && i.database != "") {
        if (dataQuery == "")
          dataQuery = "SELECT " + i.database + "." + i.table + "." + i.column;
        else dataQuery += " , " + i.database + "." + i.table + "." + i.column;
      }
    });
    
    if (dataQuery == "") 
        return dataQuery;

    task.from.map((i, k) => {
      if (typeof i.query != "undefined" && i.query != "") {
        if (k == 0) dataQuery += " \nFROM " + i.query;
        else dataQuery += " \n\t" + i.query;
      }
      if (typeof i.onCondition == "undefined") i.onCondition = "";

      if (typeof i.database != "undefined" && i.database != "") {
        if (k == 0) dataQuery += " \nFROM " + i.database + "." + i.table;
        else
          dataQuery +=
            " \n\t" +
            i.type +
            " " +
            i.database +
            "." +
            i.table +
            " ON " +
            i.onCondition;
      }
    });

    task.where.map((i, k) => {
      if (typeof i.query != "undefined" && i.query != "") {
        if (k == 0) dataQuery += " \n\tWHERE " + i.query;
        else dataQuery += " AND " + i.query;
      }
    });

    task.groupBy.map((i, k) => {
      if (typeof i.query != "undefined" && i.query != "") {
        if (k == 0) dataQuery += " \n\tGROUP BY " + i.query;
        else dataQuery += " , " + i.query;
      }
      if (typeof i.database != "undefined" && i.database != "") {
        if (k == 0)
          dataQuery +=
            " \n\tGROUP BY " + i.database + "." + i.table + "." + i.column;
        else dataQuery += " , " + i.database + "." + i.table + "." + i.column;
      }
    });

    task.having.map((i, k) => {
      if (typeof i.query != "undefined" && i.query != "") {
        if (k == 0) dataQuery += " \n\tHAVING " + i.query;
        else dataQuery += " AND " + i.query;
      }
    });

    task.orderBy.map((i, k) => {
      if (typeof i.query != "undefined" && i.query != "") {
        if (k == 0) dataQuery += " \n\tORDER BY " + i.query;
        else dataQuery += " , " + i.query;
      }
      if (typeof i.database != "undefined" && i.database != "") {
        if (k == 0)
          dataQuery +=
            " \n\tORDER BY " +
            i.database +
            "." +
            i.table +
            "." +
            i.column +
            " " +
            i.order;
        else
          dataQuery +=
            " , " +
            i.database +
            "." +
            i.table +
            "." +
            i.column +
            " " +
            i.order;
      }
    });

    return dataQuery;

}


exports.conditionToQuery = conditionToQuery;