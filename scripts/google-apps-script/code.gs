/**
 * LEAVE MANAGER WEB APP SCRIPT
 * Handles POST requests for new leave submissions and
 * GET requests for manager approval/rejection links.
 * Fixes: ReferenceError, 403 Forbidden, and TypeError: Cannot read properties of undefined (reading 'postData').
 */

// --- UTILITY FUNCTIONS ---

/**
 * Applies necessary CORS headers for cross-origin requests.
 * @param {GoogleAppsScript.Content.TextOutput} output The content output object.
 * @return {GoogleAppsScript.Content.TextOutput} The output object with CORS headers.
 */
function withCors_(output) {
  return output
    .setHeader("Access-Control-Allow-Origin", "*") // Allows requests from any origin
    .setHeader("Access-Control-Allow-Headers", "Content-Type")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS"); // Essential for POST pre-flight
}

/**
 * Ensures the 'Logs' sheet has the correct header row.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The Logs sheet object.
 */
function ensureLogHeader_(sheet) {
  // We use 15 columns (A:O). New fields are appended at the end to avoid breaking
  // existing column indexes used by the approval link handler (doGet).
  const desiredHeader = [
    "Timestamp", // A
    "Request ID", // B
    "Type", // C (request / decision)
    "Status", // D
    "Employee Name", // E
    "Employee Email", // F
    "Employee ID", // G
    "Dates", // H
    "Reason", // I
    "Manager Comment", // J
    "Manager Action", // K
    "Permission Type", // L (NEW)
    "Leave Type", // M (NEW)
    "Requested InTime", // N (NEW)
    "Requested OutTime", // O (NEW)
  ];

  const header = sheet.getRange(1, 1, 1, desiredHeader.length).getValues()[0];
  const hasAnyHeader = header.some((v) => v && String(v).trim());

  // If the header row is completely empty, write the full header.
  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, desiredHeader.length).setValues([desiredHeader]);
    return;
  }

  // Otherwise, backfill any missing header cells (especially the new columns).
  let changed = false;
  for (let i = 0; i < desiredHeader.length; i++) {
    if (!header[i] || !String(header[i]).trim()) {
      header[i] = desiredHeader[i];
      changed = true;
    }
  }
  if (changed) {
    sheet.getRange(1, 1, 1, desiredHeader.length).setValues([header]);
  }
}

/**
 * Generates a new unique request ID.
 * @return {string} A new unique request ID.
 */
function newRequestId_() {
  return "REQ-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

/**
 * Returns the deployed website URL where managers can review/approve/deny.
 * Configure this in Apps Script Project Settings -> Script properties:
 *   WEB_APP_URL = https://your-site-domain/
 * @return {string}
 */
function getWebAppUrl_() {
  const url =
    PropertiesService.getScriptProperties().getProperty("WEB_APP_URL");
  return (url || "").trim() || "https://your-app-url-here";
}

/**
 * Email settings (Script properties):
 * - MANAGER_EMAIL: where new requests are sent
 * - FROM_EMAIL: optional "send as" email (must be configured as an alias on the script owner's Gmail/Workspace account)
 * - FROM_NAME: optional sender display name
 * - REPLY_TO: optional reply-to address
 */
function getMailSettings_() {
  const props = PropertiesService.getScriptProperties();
  return {
    managerEmail: (props.getProperty("MANAGER_EMAIL") || "").trim(),
    fromEmail: (props.getProperty("FROM_EMAIL") || "").trim(),
    fromName: (props.getProperty("FROM_NAME") || "").trim(),
    replyTo: (props.getProperty("REPLY_TO") || "").trim(),
  };
}

function getManagerEmail_() {
  const s = getMailSettings_();
  // fallback to previous hardcoded value if not configured
  return s.managerEmail || "ganesh.m@datapower.co.in";
}

/**
 * Sends email using configured sender name/reply-to, and "from" only if it's a permitted alias.
 * Note: Apps Script cannot send from arbitrary addresses; FROM_EMAIL must be one of GmailApp.getAliases().
 */
function sendTextEmail_(to, subject, body) {
  const s = getMailSettings_();

  // Common options supported by both MailApp and GmailApp
  const options = {};
  if (s.fromName) options.name = s.fromName;
  if (s.replyTo) options.replyTo = s.replyTo;

  // Try GmailApp "from" if configured and allowed
  if (s.fromEmail) {
    try {
      const aliases = GmailApp.getAliases();
      const isAllowed = aliases.indexOf(s.fromEmail) !== -1;
      if (isAllowed) {
        options.from = s.fromEmail;
        GmailApp.sendEmail(to, subject, body, options);
        return;
      }
    } catch (e) {
      // Fall back to MailApp if GmailApp aliases aren't available / scope not granted.
    }
  }

  MailApp.sendEmail(to, subject, body, options);
}

/**
 * Finds the 1-based row index for a request id in Logs sheet (col B).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} requestId
 * @return {number} row index (1-based), or -1 if not found
 */
function findLogRowByRequestId_(sheet, requestId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // col B
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || "").trim() === requestId) {
      return i + 2; // offset for header
    }
  }
  return -1;
}

// --- MAIN HANDLERS ---

/**
 * Handles incoming POST requests (Leave Submission).
 * @param {GoogleAppsScript.Events.DoPost} e The event object containing POST data.
 * @return {GoogleAppsScript.Content.TextOutput} The response.
 */
function doPost(e) {
  // 1. CHECK FOR POST DATA BEFORE READING IT
  // This prevents the "Cannot read properties of undefined (reading 'postData')" error.
  if (!e || !e.postData || !e.postData.contents) {
    // If the data is missing, return a specific error message.
    return withCors_(
      ContentService.createTextOutput(
        "Error: No POST data received. Ensure your client app is sending a POST request with a Content-Type: application/json header and a JSON body."
      ).setMimeType(ContentService.MimeType.TEXT)
    );
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActive();
    const logSheet = ss.getSheetByName("Logs");
    ensureLogHeader_(logSheet);

    const payloadType = (data.type || "request").toString().toLowerCase();

    // --- MANAGER DECISION (from website) ---
    if (payloadType === "decision") {
      const requestId = String(data.requestId || data.rid || "").trim();
      if (!requestId) {
        return withCors_(
          ContentService.createTextOutput(
            "Error: Missing requestId for decision."
          ).setMimeType(ContentService.MimeType.TEXT)
        );
      }

      const rowIndex = findLogRowByRequestId_(logSheet, requestId);
      if (rowIndex === -1) {
        return withCors_(
          ContentService.createTextOutput(
            "Error: Request ID not found in Logs: " + requestId
          ).setMimeType(ContentService.MimeType.TEXT)
        );
      }

      // Read existing row (A:O) so we can email the employee with full details
      const row = logSheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
      const employeeName = row[4] || "";
      const employeeEmail = row[5] || "";
      const employeeId = row[6] || "";
      const dates = row[7] || "";
      const reason = row[8] || "";
      const permissionType = row[11] || "";
      const leaveType = row[12] || "";
      const requestedInTime = row[13] || "";
      const requestedOutTime = row[14] || "";

      const status = String(data.status || "").toUpperCase() || "PENDING";
      const managerComment = String(data.managerComment || "").trim();
      const managerAction =
        status === "APPROVED"
          ? "APPROVE"
          : status === "REJECTED"
          ? "DENY"
          : String(data.managerAction || "").toUpperCase();

      // Update the same row (keep Request ID stable)
      logSheet.getRange(rowIndex, 4).setValue(status); // D Status
      logSheet.getRange(rowIndex, 10).setValue(managerComment); // J Manager Comment
      logSheet.getRange(rowIndex, 11).setValue(managerAction); // K Manager Action

      // Notify employee via email
      if (employeeEmail) {
        const finalAction =
          status === "APPROVED"
            ? "approved"
            : status === "REJECTED"
            ? "rejected"
            : "updated";
        const subject = `Your leave request (${requestId}) has been ${finalAction}`;
        const body =
          "Hello " +
          (employeeName || "") +
          ",\n\n" +
          `Your leave request (${requestId}) was ${finalAction}.\n\n` +
          "Employee: " +
          employeeName +
          " (" +
          employeeId +
          ")\n" +
          "Dates: " +
          dates +
          "\n" +
          (permissionType ? "Permission Type: " + permissionType + "\n" : "") +
          (leaveType ? "Leave Type: " + leaveType + "\n" : "") +
          (requestedInTime
            ? "Requested InTime: " + requestedInTime + "\n"
            : "") +
          (requestedOutTime
            ? "Requested OutTime: " + requestedOutTime + "\n"
            : "") +
          "Reason: " +
          (reason || "-") +
          "\n" +
          (managerComment ? "\nManager Note: " + managerComment + "\n" : "\n") +
          "Status: " +
          status +
          "\n\n" +
          "This message was generated automatically.";

        sendTextEmail_(employeeEmail, subject, body);
      }

      return withCors_(
        ContentService.createTextOutput("OK").setMimeType(
          ContentService.MimeType.TEXT
        )
      );
    }

    // --- NEW REQUEST (employee submission) ---
    const requestId = newRequestId_();
    const dates = data.startDate + " - " + data.endDate;

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
    ]);

    const webAppUrl = getWebAppUrl_();
    const joiner = webAppUrl.indexOf("?") === -1 ? "?" : "&";
    const reviewUrl =
      webAppUrl + joiner + "view=manager&rid=" + encodeURIComponent(requestId);

    const managerEmail = getManagerEmail_();

    const subject = "New leave request from " + data.employeeName;
    const body =
      "A new leave request has been submitted.\n\n" +
      "Employee: " +
      data.employeeName +
      " (" +
      data.employeeId +
      ")\n" +
      "Email: " +
      data.employeeEmail +
      "\n" +
      (data.permissionType
        ? "Permission Type: " + data.permissionType + "\n"
        : "") +
      (data.leaveType ? "Leave Type: " + data.leaveType + "\n" : "") +
      (data.requestedInTime
        ? "Requested InTime: " + data.requestedInTime + "\n"
        : "") +
      (data.requestedOutTime
        ? "Requested OutTime: " + data.requestedOutTime + "\n"
        : "") +
      "Dates: " +
      dates +
      "\n" +
      "Reason: " +
      data.reason +
      "\n\n" +
      "Review & take action (Approve/Deny) here:\n" +
      reviewUrl +
      "\n";

    sendTextEmail_(managerEmail, subject, body);

    return withCors_(
      ContentService.createTextOutput("OK").setMimeType(
        ContentService.MimeType.TEXT
      )
    );
  } catch (err) {
    // Return a detailed error if JSON parsing or subsequent logic fails.
    return withCors_(
      ContentService.createTextOutput(
        "Error processing POST request: " + err.toString()
      ).setMimeType(ContentService.MimeType.TEXT)
    );
  }
}

/**
 * Handles incoming GET requests.
 * 1. Handles the OPTIONS preflight request (for API calls).
 * 2. Handles the direct link clicks (Approve/Deny) from the manager email.
 * @param {GoogleAppsScript.Events.DoGet} e The event object containing URL parameters.
 * @return {GoogleAppsScript.Content.TextOutput} The response.
 */
function doGet(e) {
  // 1. --- HANDLE OPTIONS PREFLIGHT (API REQUEST) ---
  // The logic must explicitly check if the request is ONLY an OPTIONS method.
  if (e.parameter && e.parameter.method === "OPTIONS") {
    // If it's a preflight OPTIONS request, we MUST return CORS headers.
    return withCors_(ContentService.createTextOutput());
  }

  // --- HANDLE INVALID GET REQUESTS ---
  // Check if the required parameters (action and rid) are missing.
  // We should NOT call withCors_ for a direct browser request (like a link click).
  if (!e || !e.parameter.action || !e.parameter.rid) {
    const invalidMessage =
      "<h1>Invalid Request</h1><p>The link is missing the required action or request ID.</p>";
    // Return a simple HTML page to the browser.
    return ContentService.createTextOutput(invalidMessage).setMimeType(
      ContentService.MimeType.HTML
    );
  }

  // --- 2. HANDLE MANAGER DECISION (APPROVE/DENY LINK CLICK) ---

  const action = (e.parameter.action || "").toUpperCase(); // APPROVE or DENY
  const rid = e.parameter.rid;

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Logs");
  // NOTE: ensureLogHeader_ is assumed to be defined elsewhere in your project
  // ensureLogHeader_(sheet);

  const data = sheet.getDataRange().getValues();
  let found = false;
  let employeeEmail = "";
  let employeeName = "";
  let dates = "";
  let reason = "";

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === rid) {
      // column B = Request ID
      // Update the spreadsheet row
      sheet
        .getRange(i + 1, 4)
        .setValue(action === "APPROVE" ? "APPROVED" : "REJECTED"); // Status col D
      sheet.getRange(i + 1, 11).setValue(action); // Manager Action col K

      // Capture data for the notification email
      employeeName = data[i][4]; // col E
      employeeEmail = data[i][5]; // col F
      dates = data[i][7]; // col H
      reason = data[i][8]; // col I
      found = true;
      break;
    }
  }

  // Handle Request Not Found
  if (!found) {
    const notFoundMessage = `<h1>Request Not Found</h1><p>The request ID **${rid}** was not found or was already processed.</p>`;
    // Return a simple HTML page to the browser. DO NOT call withCors_
    return ContentService.createTextOutput(notFoundMessage).setMimeType(
      ContentService.MimeType.HTML
    );
  }

  // Send email notification to employee
  if (employeeEmail) {
    const finalAction = action === "APPROVE" ? "approved" : "rejected";
    const subject = `Your leave request has been ${finalAction}`;
    const body =
      "Hello " +
      (employeeName || "") +
      ",\n\n" +
      "Your leave request (" +
      rid +
      ") for " +
      (dates || "") +
      " was " +
      finalAction +
      ".\n\n" +
      "Reason: " +
      (reason || "-") +
      "\n" +
      "Status: " +
      finalAction.toUpperCase() +
      "\n\n" +
      "This message was generated automatically.";

    sendTextEmail_(employeeEmail, subject, body);
  }

  // --- FINAL SUCCESS RESPONSE (CRITICAL FIX) ---
  // When an email link is clicked, we must return simple HTML/Text
  // We MUST NOT call withCors_ here.
  const finalActionDisplay = action === "APPROVE" ? "APPROVED" : "REJECTED";
  const finalMessage = `
    <h1>Leave Request Processed Successfully</h1>
    <p>The request (ID: ${rid}) has been **${finalActionDisplay}**.</p>
    <p>The log has been updated and a confirmation email has been sent to the employee (${employeeEmail}).</p>`;

  // Return a simple HTML response without CORS headers.
  return ContentService.createTextOutput(finalMessage).setMimeType(
    ContentService.MimeType.HTML
  );
}
