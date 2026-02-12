const CONFIG = {
  MASTER_SHEET: "MASTER",
  DATA_SHEET: "Production_Data",
};

/* ---------- WEB LOAD ---------- */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Production Report");
}

/* ---------- MASTER FETCH ---------- */
function getLineMaster() {

  const sh = SpreadsheetApp.getActive()
    .getSheetByName(CONFIG.MASTER_SHEET);

  if (!sh) throw new Error("MASTER sheet missing");

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const values = sh.getRange(2,1,lastRow-1,3).getValues();

  return values
    .filter(r => r[0])
    .map(r => ({
      line: String(r[0]).trim(),
      vin: String(r[1]).trim(),
      outputPerMan: Number(r[2]) || 0
    }));
}

/* ---------- Google Sheet Button ---------- */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Production Tools")
    .addItem("Build Missing Report", "buildMissingReport")
    .addToUi();
}

/* ---------- MAIN SAVE ---------- */
function submitData(payload) {

  try {

    const sheet = SpreadsheetApp.getActive()
      .getSheetByName(CONFIG.DATA_SHEET);

    if (!sheet) throw new Error("Production_Data sheet missing");

    const today = new Date();
    today.setHours(0,0,0,0);

    const inputDate = new Date(payload.date);
    inputDate.setHours(0,0,0,0);

    if (inputDate.getTime() !== today.getTime()) {
      return { ok:false, message:"Past date entry locked." };
    }

    if (!payload.line || !payload.shift ||
        !payload.manpower || !payload.achieved) {
      return { ok:false, message:"All fields are required." };
    }

    const master = getLineMaster();
    const lineObj = master.find(l => l.line === payload.line);

    if (!lineObj) {
      return { ok:false, message:"Invalid line selection." };
    }

    const outputPerMan = lineObj.outputPerMan;
    const deployedMP = Number(payload.manpower);
    const achievedNum = Number(payload.achieved);

    if (isNaN(deployedMP) || deployedMP <= 0) {
      return { ok:false, message:"Invalid manpower value." };
    }

    if (isNaN(achievedNum) || achievedNum < 0) {
      return { ok:false, message:"Invalid achieved value." };
    }

    const target = deployedMP * outputPerMan;

    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < values.length; i++) {
      const sheetDate = new Date(values[i][0]);
      sheetDate.setHours(0,0,0,0);

      if (sheetDate.getTime() === inputDate.getTime()
        && values[i][2] === payload.line) {
        rowIndex = i + 1;
        break;
      }
    }

    // Create new row if not found
    if (rowIndex === -1) {
      rowIndex = sheet.getLastRow() + 1;
      sheet.getRange(rowIndex,1,1,3)
        .setValues([[inputDate, lineObj.vin, payload.line]]);
    } else {
      // ✅ Always sync VIN (UPDATED LOGIC)
      sheet.getRange(rowIndex,2).setValue(lineObj.vin);
    }

    const shiftMap = {
      "1": { mp:4, target:5, ach:6, rem:7, rec:8 },
      "2": { mp:9, target:10, ach:11, rem:12, rec:13 },
      "3": { mp:14, target:15, ach:16, rem:17, rec:18 },
    };

    const map = shiftMap[payload.shift];
    if (!map) return { ok:false, message:"Invalid shift." };

    const lock = LockService.getScriptLock();

    try {
      lock.waitLock(5000);
    } catch (e) {
      return { ok:false, message:"System busy. Please try again." };
    }

    try {

      const existing = sheet.getRange(rowIndex,map.mp).getValue();
      if (existing !== "" && existing !== null) {
        return { ok:false, message:"Shift already submitted." };
      }

      sheet.getRange(rowIndex,map.mp).setValue(deployedMP);
      sheet.getRange(rowIndex,map.target).setValue(target);
      sheet.getRange(rowIndex,map.ach).setValue(achievedNum);

      const remarkCaps = (payload.remark || "").toUpperCase();
      sheet.getRange(rowIndex,map.rem).setValue(remarkCaps);
      sheet.getRange(rowIndex,map.rec).setValue(payload.recorder || "");

    } finally {
      lock.releaseLock();
    }

    return { ok:true, message:"Saved successfully." };

  } catch (err) {
    return { ok:false, message:"Error: " + err.message };
  }
}

/* ---------- SHIFT-AWARE MISSING REPORT ---------- */
function getMissingReports() {

  const today = new Date();
  today.setHours(0,0,0,0);

  const masterLines = getLineMaster().map(l => l.line);

  const sheet = SpreadsheetApp.getActive()
    .getSheetByName(CONFIG.DATA_SHEET);

  const values = sheet.getDataRange().getValues();

  const results = [];

  masterLines.forEach(line => {

    let row = null;

    for (let i = 1; i < values.length; i++) {

      const sheetDate = new Date(values[i][0]);
      sheetDate.setHours(0,0,0,0);

      if (sheetDate.getTime() === today.getTime()
          && values[i][2] === line) {
        row = values[i];
        break;
      }
    }

    if (!row) {
      results.push([line + " - Missing Shift 1 & 2"]);
      return;
    }

    const shift1 = row[3];  // Col D
    const shift2 = row[8];  // Col I

    if (!shift1 && !shift2) {
      results.push([line + " - Missing Shift 1 & 2"]);
    } else if (!shift1) {
      results.push([line + " - Missing Shift 1"]);
    } else if (!shift2) {
      results.push([line + " - Missing Shift 2"]);
    }

  });

  return results;
}

function buildMissingReport() {

  const ss = SpreadsheetApp.getActive();
  const missing = getMissingReports();

  const today = new Date();
  const dateStr = Utilities.formatDate(
    today,
    Session.getScriptTimeZone(),
    "dd/MM/yyyy"
  );

  let sheet = ss.getSheetByName("Missing_Report");

  if (!sheet) {
    sheet = ss.insertSheet("Missing_Report");
  } else {
    sheet.clearContents();
  }

  sheet.getRange(1,1).setValue("Missing Production Report");
  sheet.getRange(2,1).setValue("Date:");
  sheet.getRange(2,2).setValue(dateStr);

  sheet.getRange(4,1).setValue("Status");

  if (missing.length === 0) {
    sheet.getRange(5,1).setValue("All Lines Completed (Shift 1 & 2).");
  } else {
    sheet.getRange(5,1,missing.length,1).setValues(missing);
  }

  sheet.autoResizeColumns(1,2);
}
