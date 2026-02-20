/**
 * LEAVE MANAGER & TASK MANAGER WEB APP SCRIPT
 * Handles POST requests for leave submissions, manager decisions, and task submissions.
 * Handles GET requests for manager approval/rejection links.
 */
// --- UTILITY FUNCTIONS ---
function withCors_(output) {
  try {
    if (output && typeof output.setHeader === 'function') {
      return output
        .setHeader("Access-Control-Allow-Origin", "*")
        .setHeader("Access-Control-Allow-Headers", "Content-Type")
        .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    }
  } catch (e) {
    Logger.log("CORS header error: " + e.toString());
  }
  return output;
}
function ensureLogHeader_(sheet) {
  const desiredHeader = [
    "Timestamp", "Request ID", "Type", "Status", "Employee Name",
    "Employee Email", "Employee ID", "Dates", "Reason", "Manager Comment",
    "Manager Action", "Permission Type", "Leave Type", "Requested InTime", "Requested OutTime",
    "Alternate Staff"
  ];
  const header = sheet.getRange(1, 1, 1, desiredHeader.length).getValues()[0];
  const hasAnyHeader = header.some(function(v) { return v && String(v).trim(); });
  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, desiredHeader.length).setValues([desiredHeader]);
    return;
  }
  var changed = false;
  for (var i = 0; i < desiredHeader.length; i++) {
    if (!header[i] || !String(header[i]).trim()) {
      header[i] = desiredHeader[i];
      changed = true;
    }
  }
  if (changed) {
    sheet.getRange(1, 1, 1, desiredHeader.length).setValues([header]);
  }
}
function ensureTaskLogHeader_(sheet) {
  const desiredHeader = [
    "Timestamp", "Employee Name", "Employee Email", "Company",
    "Platform", "Fulfillment", "Task", "Quantity", "Claimed Quantity"
  ];
  const header = sheet.getRange(1, 1, 1, desiredHeader.length).getValues()[0];
  const hasAnyHeader = header.some(function(v) { return v && String(v).trim(); });
  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, desiredHeader.length).setValues([desiredHeader]);
    return;
  }
  var changed = false;
  for (var i = 0; i < desiredHeader.length; i++) {
    if (!header[i] || !String(header[i]).trim()) {
      header[i] = desiredHeader[i];
      changed = true;
    }
  }
  if (changed) {
    sheet.getRange(1, 1, 1, desiredHeader.length).setValues([header]);
  }
}
function logTaskEntry_(ss, data) {
  var taskSheet = ss.getSheetByName('TaskLogs');
  if (!taskSheet) {
    taskSheet = ss.insertSheet('TaskLogs');
  }
  ensureTaskLogHeader_(taskSheet);
  var timestamp = new Date(data.timestamp || Date.now());
  taskSheet.appendRow([
    timestamp,
    data.employeeName || '',
    data.employeeEmail || '',
    data.company || '',
    data.platform || '',
    data.fulfillment || '',
    data.task || '',
    data.quantity || 0,
    data.claimedQuantity || 0
  ]);
}
function newRequestId_() {
  return "REQ-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}
function getWebAppUrl_() {
  var url = PropertiesService.getScriptProperties().getProperty("WEB_APP_URL");
  return (url || "").trim() || "https://employee-ledger.vercel.app/";
}
function findLogRowByRequestId_(sheet, requestId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || "").trim() === requestId) {
      return i + 2;
    }
  }
  return -1;
}
// --- MAIN HANDLERS ---
function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return withCors_(
      ContentService.createTextOutput(
        "Error: No POST data received."
      ).setMimeType(ContentService.MimeType.TEXT)
    );
  }
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActive();
    var payloadType = (data.type || "request").toString().toLowerCase();
    // --- TASK SUBMISSION ---
    if (payloadType === "task") {
      var taskLogSheet = ss.getSheetByName("TaskLogs");
      logTaskEntry_(ss, data);
      return withCors_(
        ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT)
      );
    }
    // --- LEAVE MANAGER LOGIC ---
    var logSheet = ss.getSheetByName("Logs");
    ensureLogHeader_(logSheet);
    if (payloadType === "decision") {
      var requestId = String(data.requestId || data.rid || "").trim();
      if (!requestId) {
        return withCors_(
          ContentService.createTextOutput("Error: Missing requestId").setMimeType(ContentService.MimeType.TEXT)
        );
      }
      var rowIndex = findLogRowByRequestId_(logSheet, requestId);
      if (rowIndex === -1) {
        return withCors_(
          ContentService.createTextOutput("Error: Request ID not found").setMimeType(ContentService.MimeType.TEXT)
        );
      }
      var row = logSheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
      var status = String(data.status || "").toUpperCase() || "PENDING";
      var managerComment = String(data.managerComment || "").trim();
      var managerAction = status === "APPROVED" ? "APPROVE" : status === "REJECTED" ? "DENY" : "";
      logSheet.getRange(rowIndex, 4).setValue(status);
      logSheet.getRange(rowIndex, 10).setValue(managerComment);
      logSheet.getRange(rowIndex, 11).setValue(managerAction);
      if (row[5]) {
        var finalAction = status === "APPROVED" ? "approved" : "rejected";
        MailApp.sendEmail(
          row[5],
          "Your leave request (" + requestId + ") has been " + finalAction,
          "Your leave request was " + finalAction + ".\n\nStatus: " + status
        );
      }
      return withCors_(
        ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT)
      );
    }
    // --- NEW LEAVE REQUEST ---
    var requestId = newRequestId_();
    var dates = data.startDate + " - " + data.endDate;
    logSheet.appendRow([
      new Date(),
      requestId,
      "request",
      data.status || "PENDING",
      data.employeeName,
      data.employeeEmail,
      data.employeeId,
      dates,
      data.reason,
      data.managerComment || "",
      "",
      data.permissionType || "",
      data.leaveType || "",
      data.requestedInTime || "",
      data.requestedOutTime || "",
      data.alternateStaff || ""
    ]);
    var webAppUrl = getWebAppUrl_();
    var joiner = webAppUrl.indexOf("?") === -1 ? "?" : "&";
    var reviewUrl = webAppUrl + joiner + "view=manager&rid=" + encodeURIComponent(requestId);
    var managerEmail = "ganesh.m@datapower.co.in";
    MailApp.sendEmail(
      managerEmail,
      "New leave request from " + data.employeeName,
      "A new leave request has been submitted.\n\nReview here:\n" + reviewUrl
    );
    return withCors_(
      ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT)
    );
  } catch (err) {
    return withCors_(
      ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT)
    );
  }
}
function doGet(e) {
  if (e.parameter && e.parameter.method === "OPTIONS") {
    return withCors_(ContentService.createTextOutput());
  }
  if (!e || !e.parameter.action || !e.parameter.rid) {
    return ContentService.createTextOutput(
      "<h1>Invalid Request</h1>"
    ).setMimeType(ContentService.MimeType.HTML);
  }
  var action = (e.parameter.action || "").toUpperCase();
  var rid = e.parameter.rid;
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName("Logs");
  var data = sheet.getDataRange().getValues();
  var found = false;
  var employeeEmail = "";
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === rid) {
      sheet.getRange(i + 1, 4).setValue(action === "APPROVE" ? "APPROVED" : "REJECTED");
      sheet.getRange(i + 1, 11).setValue(action);
      employeeEmail = data[i][5];
      found = true;
      break;
    }
  }
  if (!found) {
    return ContentService.createTextOutput(
      "<h1>Request Not Found</h1>"
    ).setMimeType(ContentService.MimeType.HTML);
  }
  if (employeeEmail) {
    var finalAction = action === "APPROVE" ? "approved" : "rejected";
    MailApp.sendEmail(
      employeeEmail,
      "Your leave request has been " + finalAction,
      "Your request (" + rid + ") was " + finalAction + "."
    );
  }
  return ContentService.createTextOutput(
    "<h1>Success</h1><p>Request " + rid + " has been processed.</p>"
  ).setMimeType(ContentService.MimeType.HTML);
}