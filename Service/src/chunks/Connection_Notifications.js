

const crypt = require(__dirname+"/../classes/crypto")
const nodemailer = require("nodemailer")
const { ObjectID } = require("mongodb");

let objectDataGlobal

const Connection_Notifications = async (objectData) => {
    objectDataGlobal = objectData;
    
    try {
        let dataSMTP = await objectDataGlobal.mongoClient.find("Configuration")
        if (dataSMTP.length  != 0 && dataSMTP[0]['smtpHost'] != "" && dataSMTP[0]['smtpPort'] != ""
        && dataSMTP[0]['smtpUser'] != "" && dataSMTP[0]['smtpPass'] != "" ) {

            let dataRecieversTask = await objectDataGlobal.mongoClient.find("Settings", {notificationOnTaskFailed:true})

            if (dataRecieversTask.length > 0 ) {
                let textToSend =""
                let stringRecieversTask = "";
                dataRecieversTask.map(i=> {
                    stringRecieversTask += i.email+";";
                })

                //3 - Synchronism failed
                //4 - TaskHistory failed

                let Synchronism = await objectDataGlobal.mongoClient.find("Synchronizations")
                let SynchronismFailed = []
                if (Synchronism.length > 0) {
                    await Promise.all(Synchronism.map(async j => {
                        let dataNotifications = await objectDataGlobal.mongoClient.find("Notifications", {type: 3, idType: ObjectID(j._id)  })
                        if (dataNotifications.length == 0) {
                            await objectDataGlobal.mongoClient.insert("Notifications", {type: 3, idType:ObjectID(j._id), status: j.status, dateStatus:j.dateStatus  })
                            if (j.status == -2)
                                SynchronismFailed.push(j)
                        } else {
                            await objectDataGlobal.mongoClient.update("Notifications", {status: j.status, dateStatus:j.dateStatus  }, {type: 3, idType:ObjectID(j._id)})
                            if (j.status == -2 && dataNotifications[0].status != -2) 
                                SynchronismFailed.push(j)
                        }
                        
                    }))
                    if (SynchronismFailed.length > 0) {
                        textToSend +="\nSynchronizations failed: "
                        await Promise.all(SynchronismFailed.map(async i => {
                            textToSend +="\n"+i.name;
                            let tasksFailed = [];
                            if (i.tasks.length > 0) {
                                await Promise.all(i.tasks.map(async j => {
                                    let dataNotifications = await objectDataGlobal.mongoClient.find("Notifications", {type: 4, idType:j._id  })
                                    if (dataNotifications.length == 0) {
                                        await objectDataGlobal.mongoClient.insert("Notifications", {type: 4, idType:j._id, status: j.status, dateStatus:j.dateStatus  })
                                        if (j.status == -2)
                                            tasksFailed.push(j)
                                    } else {
                                        await objectDataGlobal.mongoClient.update("Notifications", {status: j.status, dateStatus:j.dateStatus  }, {type: 4, idType:j._id})
                                        if (j.status == -2 && dataNotifications[0].status != -2) 
                                            tasksFailed.push(j)
                                    }
                                }))
                                if (tasksFailed.length > 0) {
                                    textToSend += "\n\tTasks failed:"
                                    tasksFailed.map(j => textToSend +="\n\t\t"+j.taskNumber + " - "+ j.name)
                                }
                            }
                
                        }))
                    }

                    await Promise.all(Synchronism.map(async i => {
                        await Promise.all(i.tasks.map(async j => {
                            let dataNotifications = await objectDataGlobal.mongoClient.find("Notifications", {type: 4, idType:j._id  })
                            if (dataNotifications.length == 0) {
                                await objectDataGlobal.mongoClient.insert("Notifications", {type: 4, idType:j._id, status: j.status, dateStatus:j.dateStatus  })
                            } else {
                                await objectDataGlobal.mongoClient.update("Notifications", {status: j.status, dateStatus:j.dateStatus  }, {type: 4, idType:j._id})
                            }
                        }))
                    }))
                }
                await objectDataGlobal.mongoClient.update("Notifications", {date: new Date() }, {type:4})
                
                sendEmail(dataSMTP,stringRecieversTask,"TimeToSync Synchornism and Tasks failed",textToSend )
            }


            let dataRecieversService = await objectDataGlobal.mongoClient.find("Settings", {notificationOnServiceFailed:true})
            if (dataRecieversService.length > 0 ) {
                let textToSend = "";
                let stringRecieversService = "";
                dataRecieversService.map(i=> {
                    stringRecieversService += i.email+";";
                })

                //1 - Service failed
                //2 - Connection failed

                let dataServices = await objectDataGlobal.mongoClient.find("Computers", {isService: 1})
                let ServicesFailed = []
                if (dataServices.length > 1) {
                    await Promise.all(dataServices.map(async i => {
                        let dataNotifications = await objectDataGlobal.mongoClient.find("Notifications", {type: 1, idType:ObjectID(i._id)  })
                        if (dataNotifications.length == 0) {
                            
                            if ((new Date().getTime() - i.lastServiceActive.getTime()) / 1000 > 600) // 10 minutes 
                            {
                                ServicesFailed.push(i)
                                await objectDataGlobal.mongoClient.insert("Notifications", {type: 1, idType:ObjectID(i._id), dateStatus:new Date(), status:0  })
                            } else 
                                await objectDataGlobal.mongoClient.insert("Notifications", {type: 1, idType:ObjectID(i._id), dateStatus:new Date() , status:-1 })
                                
                            
                        } else {
                            if ((new Date().getTime() - i.lastServiceActive.getTime()) / 1000 > 600 && dataNotifications[0].status != -1) { 
                                ServicesFailed.push(i)
                                await objectDataGlobal.mongoClient.update("Notifications", {status: -1, dateStatus:new Date()  }, {type: 1, idType:ObjectID(i._id)})
                            }
                            else if ((new Date().getTime() - i.lastServiceActive.getTime()) / 1000 < 600 && dataNotifications[0].status == -1)
                                await objectDataGlobal.mongoClient.update("Notifications", { status: 0, dateStatus:new Date() }, {type: 1, idType:ObjectID(i._id)})
                            else if ((new Date().getTime() - i.lastServiceActive.getTime()) / 1000 < 600 )
                                await objectDataGlobal.mongoClient.update("Notifications", {  dateStatus:new Date() }, {type: 1, idType:ObjectID(i._id)})
                        }
                    }))
                    if (ServicesFailed.length > 0) {
                        textToSend +="\nServices failed: "
                        await Promise.all(ServicesFailed.map(async i => {
                            textToSend +="\n"+i.hostname;
                        }))
                    }
                }
                
                let Connections = await objectDataGlobal.mongoClient.find("Connections")
                let ConnectionsFailed = []
                if (Connections.length > 0) {
                    await Promise.all(Connections.map(async j => {
                        let dataNotifications = await objectDataGlobal.mongoClient.find("Notifications", {type: 2, idType: ObjectID(j._id)  })
                       
                        if (dataNotifications.length == 0) {
                            await objectDataGlobal.mongoClient.insert("Notifications", {type: 2, idType:ObjectID(j._id), status: j.status, dateStatus:j.dateStatus  })
                            
                            if (j.status == -1)
                                ConnectionsFailed.push(j)
                        } else {
                            await objectDataGlobal.mongoClient.update("Notifications", {status: j.status, dateStatus:j.dateStatus  }, {type: 2, idType:ObjectID(j._id)})
                            if (j.status == -1 && dataNotifications[0].status != -1) 
                                ConnectionsFailed.push(j)
                        }
                        
                    }))
                    if (ConnectionsFailed.length > 0) {
                        textToSend +="\n\nConnections failed: "
                        await Promise.all(ConnectionsFailed.map(async i => {
                            textToSend +="\n"+i.name;
                        }))
                    }
                }
                sendEmail(dataSMTP,stringRecieversService,"TimeToSync Services and Connections failed",textToSend )
            }
        }

    } catch (err) {
        console.log(err);
    }
}

async function sendEmail (dataSMTP, toEmails, subject, text) {
    if (text.length == 0) 
        return;
    let transporter = nodemailer.createTransport({
        host: dataSMTP[0].smtpHost,
        port: dataSMTP[0].smtpPort,
        secure: dataSMTP[0].smtpSecure, // true for 465, false for other ports
        auth: {
          user: dataSMTP[0].smtpUser, // generated ethereal user
          pass: crypt.decrypt(dataSMTP[0].smtpPass), // generated ethereal password
        },
      });
      // send mail with defined transport object
      await transporter.sendMail({
        from: '"TimeToSync Notification " ' + dataSMTP[0].smtpUser, // sender address
        bcc: toEmails, // list of receivers
        subject: subject, // Subject line
        text: text, // plain text body
      });
}

module.exports = Connection_Notifications;