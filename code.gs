function doGet() {
  
  setMainTrigger ();
  
  ScriptApp.newTrigger('main')
  .timeBased()
  .after(10)
  .create();
  
  return HtmlService.createHtmlOutputFromFile('index')
  .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function main() { 
  var time = new Date();
  var startTime = time.getTime();
  Logger.clear();
  Logger.log('Start time %s', startTime);
  
  setMainTrigger ();
  
  var user = Session.getActiveUser().getEmail();
  var root = DriveApp.getRootFolder(); 
  var folderToken = PropertiesService.getUserProperties().getProperty("folderToken");
  var fileToken = PropertiesService.getUserProperties().getProperty("fileToken");
  var lostfoundid = PropertiesService.getUserProperties().getProperty("lostfoundid");
  var lostfound;
  
  try {
    lostfound = DriveApp.getFolderById(lostfoundid);
    lostfound.setTrashed(false);
  }
  catch (e) {
    lostfound = DriveApp.createFolder("Lost+Found");
    lostfound.setStarred(true);
    root.removeFolder(lostfound);
    lostfoundid = lostfound.getId();
    PropertiesService.getUserProperties().setProperty("lostfoundid", lostfoundid);
  }
  
  lostfound.setStarred(true);
  
  var folderIterator;
  var fileIterator;
  
  try {
    folderIterator = DriveApp.continueFolderIterator(folderToken); 
  }
  catch (e) {
    folderIterator = DriveApp.getFolders(); 
    folderToken = folderIterator.getContinuationToken();
    PropertiesService.getUserProperties().setProperty("folderToken", folderToken);
  }
  
  try {
    fileIterator = DriveApp.continueFileIterator(fileToken); 
  }
  catch (e) {
    fileIterator = DriveApp.getFiles(); 
    fileToken = fileIterator.getContinuationToken();
    PropertiesService.getUserProperties().setProperty("fileToken", fileToken);
  }
  
  
  while (folderIterator.hasNext()){
    check(folderIterator.next().getId(), false, root, lostfound, user);
    var time = new Date();
    var now = time.getTime();
    Logger.log('Now %s', now-startTime);
    if (now-startTime > 5*60*1000){
      folderToken = folderIterator.getContinuationToken();
      PropertiesService.getUserProperties().setProperty("folderToken", folderToken);
 
      ScriptApp.newTrigger('main')
      .timeBased()
      .after(15*60*1000)
      .create();
      
      return;
    }
    
  }
  
  while (fileIterator.hasNext()){
    check(fileIterator.next().getId(),true, root, lostfound, user);
    var time = new Date();
    var now = time.getTime();
  Logger.log('Now %s', now-startTime);
    if (now-startTime > 5*60*1000){
      fileToken = folderIterator.getContinuationToken();
      PropertiesService.getUserProperties().setProperty("fileToken", fileToken);
      
      ScriptApp.newTrigger('main')
      .timeBased()
      .after(15*60*1000)
      .create();
      
      return;
    }  
  }
  
  folderToken = "0";
  PropertiesService.getUserProperties().setProperty("folderToken", folderToken);
  fileToken = "0";
  PropertiesService.getUserProperties().setProperty("fileToken", fileToken);
  
}

function check(id, isFile, root, lostfound, user) {
  // This is root or Lost+Found folder of us. They cannot be orphaned.
  if (id == root.getId() || id == lostfound.getId()) {
    return false;
  }
  var f;
  if (isFile)
    f = DriveApp.getFileById(id);
  else
    f = DriveApp.getFolderById(id);
  
  var parents = f.getParents();
  
  //It does not have parent, it may be orphan
  if (!parents.hasNext()) {
    //It is trashed, we cannot rescue it.
    if (f.isTrashed())
      return false;
    //Else it will be added to Lost+Found
  }
  //It has parents, but it may be orphan
  else {
    while(parents.hasNext()) {
      var parent = parents.next();
      // Its parent is not trashed.
      // If the parent is orphan, its turn will be come.
      // If the parent is not orphan, then this folder also not orphan.
      if (!parent.isTrashed())
        return false;
      
      // The parent is trashed and also owned by me.
      // It means the parent intentionaly deleted by me.
      // It is not lost, its deleted also.
      else if (parent.getOwner().getEmail() == user)
        return false;
      
      // Parent is not owned by me and it is trashed.
      // It means it is not deleted by me. Maybe I don't want it to be deleted.
      // This folder will be rescued.
      
    }
  }
  
  if(isFile)
    lostfound.addFile(f);
  else
    lostfound.addFolder(f);
  
  return true;
}

function setMainTrigger () {
  var triggers = ScriptApp.getProjectTriggers();
  for (var count = 0; count < triggers.length; count++){
    ScriptApp.deleteTrigger(triggers[count]); 
  }
  
  ScriptApp.newTrigger('main')
  .timeBased()
  .everyHours(12)
  .create();
  
}
