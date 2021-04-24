
const {isWin, isMac} = require("./functions");
var service = require ("os-service");

SERVICE_NAME = "TimeToSyncService"

if (isMac()) {
  //await removeFileAsRoot(LAUNCHD_PLIST_PATH);
  console.log("Não está preparado para remover serviços do windows");
  return;
}service.remove(SERVICE_NAME,
  function(error = null) {
    if (error && error != null) {
      console.log(`Please make sure to stop the service before removing it`);
      console.log("Erro na removeção do serviço")
    } else {
      console.log("Seriço removido com sucesso")
    }
  }
);