import moment from "moment";
import sql from "mssql";
import {
  getUserInfo,
  generateNotePdf,
  renameProperties,
  FileData,
} from "../utils";

import db from "../db";

const getNoteType = async (sessionId, isTherapy, user) => {
  const sessionRequest = db.newRequest(user);

  if (!isTherapy) {
    const {
      recordset: [{ noteType }],
    } = await sessionRequest.query(`
      SELECT noteType
      FROM HCBSHrsEmp H
      JOIN CompanyServices CompS ON H.serviceId = CompS.serviceId
      WHERE HCBSHrsEmpID = ${sessionId}
    `);
    return noteType;
  }

  return null;
};

const getClientNoteBySessionId = async ({ sessionId, isTherapy }, { user }) => {
  const noteType = await getNoteType(sessionId, isTherapy, user);

  const getNoteRequest = db.newRequest(user);
  let noteResponse = {};
  let note = {};
  if (noteType === "RSPNote") {
    getNoteRequest.input("staffSessionHcbsId", sessionId);
    const { recordset } = await getNoteRequest.execute(
      "sp_TaskGetSessionRSPNote"
    );
    note = recordset[0];
  } else if (noteType === "ATCNote") {
    getNoteRequest.input("staffSessionHcbsId", sessionId);
    const { recordset, recordsets } = await getNoteRequest.execute(
      "sp_TaskGetSessionAtcNote"
    );
    note = recordset[0];

    note.careAreas = recordsets[1].map((spR) => ({
      careId: Number(spR.careId),
      careArea: spR.careArea,
      score: spR.score || "",
      lastDate: spR.lastDate
        ? moment(spR.lastDate).format("MM/DD/YYYY")
        : "Never",
    }));
    note.scoring = recordsets[2].map((spR) => ({
      value: spR.scoreValue,
      label: spR.scoreName,
    }));
  } else if (noteType === "HAHNote") {
    getNoteRequest.input("staffSessionHcbsId", sessionId);
    const { recordset, recordsets } = await getNoteRequest.execute(
      "sp_TaskGetSessionHabilitationNote"
    );
    note = recordset[0];

    note.longTermObjectives = recordsets[1].map((spR) => ({
      objectiveId: Number(spR.objectiveId[0]),
      longTermVision: spR.longTermVision,
      longTermGoal: spR.longTermGoal,
    }));
    note.longTermObjectives.forEach((o) => {
      o.shortTermGoals = recordsets[1]
        .filter((spR) => spR.objectiveId[0] === o.objectiveId)
        .map((spR) => ({
          goalId: Number(spR.goalId[0]),
          shortTermGoal: spR.shortTermGoal[0],
          teachingMethod: spR.teachingMethod[0],
          score: spR.score,
          trialPct: spR.trialPct || "0",
        }));
    });
    note.scoring = recordsets[2].map((spR) => ({
      value: spR.scoreValue,
      label: spR.scoreName,
    }));
  } else {
    getNoteRequest.input("clientSessionTherapyId", sessionId);
    const { recordset, recordsets } = await getNoteRequest.execute(
      "sp_TaskGetSessionTherapyNote"
    );

    note = recordset[0];
    if (note.completed && !note.verified) {
      note.verification = true;
    } else {
      note.verification = false;
    }
    note.longTermObjectives = recordsets[1].map((spR) => ({
      objectiveId: Number(spR.objectiveId[0]),
      longTermVision: spR.longTermVision,
      longTermGoal: spR.longTermGoal,
    }));
    note.longTermObjectives.forEach((o) => {
      o.shortTermGoals = recordsets[1]
        .filter((spR) => spR.objectiveId[0] === o.objectiveId)
        .map((spR) => ({
          goalId: Number(spR.goalId),
          shortTermGoal: spR.shortTermGoal[0],
          teachingMethod: spR.teachingMethod[0],
          frequency: spR.frequency,
          score: spR.score,
          trialPct: spR.trialPct || "0",
        }));
    });
    note.scoring = recordsets[2].map((spR) => ({
      value: spR.scoreValue,
      label: spR.scoreName,
    }));
  }

  renameProperties(note, {
    clsvId: "clientId",
    cnm: "clientName",
    prId: "providerId",
    fileExtension: "extension",
  });
  note.docId = note.staffSessionHcbsId || note.clientSessionTherapyId;

  return note;
};

const getHCBSNotePdf = async (user, docId, noteType) => {
  const request = db.newRequest(user);
  request.input("StaffSessionHcbsId", db.sql.Int, docId);
  let spName;
  if (noteType === "RSPNote") {
    spName = "sp_TaskGetSessionRspNotePdf";
  } else if (noteType === "ATCNote") {
    spName = "sp_TaskGetSessionAtcNotePdf";
  } else if (noteType === "HAHNote") {
    spName = "sp_TaskGetSessionHabilitationNotePdf";
  }
  const { recordset } = await request.execute(spName);

  const dr = recordset[0];
  const r = {};
  r.completedBy = dr["completedByFn"] + " " + dr["completedByLn"];
  r.completedByCredentials =
    dr["completedByTitle"] +
    (dr["completedBynpi"] != "" ? " (NPI: " + dr["completedBynpi"] + ")" : "");
  r.timeOfService =
    moment(dr["utcIn"]).format("h:mm A") +
    " - " +
    moment(dr["utcOut"]).format("h:mm A");
  r.agency = user.CompanyName;
  r.npi = user.NPI;
  r.clientName = dr["cnm"];
  r.svc = dr["svc"];
  r.serviceName = dr["serviceName"];
  r.dt = moment(dr["dt"]).format("MM/DD/YYYY");

  r.note = dr["note"] || "";
  r.noShow = dr["noShow"];
  // XXXX New statuses to be used with note
  r.designeeUnableToSign = dr["designeeUnableToSign"];
  r.designeeRefusedToSign = dr["designeeRefusedToSign"];
  r.clientRefusedService = dr["clientRefusedService"];
  r.unsafeToWork = dr["unsafeToWork"];
  r.guardianId = dr["guardianId"];
  r.designeeId = dr["designeeId"];
  r.IsEVV = dr["IsEvv"] || false;
  // XXXX end new Stuff
  r.supervisorPresent = dr["supervisorPresent"] || false;
  r.dob = dr.dob ? moment(dr.dob).format("MM/DD/YYYY") : "";
  r.clId = dr["clId"] || "";
  r.clientWorker = dr["clwNm"] || "";

  return r;
};

const saveHCBSNotePdf = async (user, docId, noteType) => {
  let templateName;
  if (noteType === "RSPNote") {
    templateName = "document-note-rsp";
  } else if (noteType === "ATCNote") {
    templateName = "document-note-atc";
  } else if (noteType === "HAHNote") {
    templateName = "document-note-habilitation";
  }

  const session = await getHCBSNotePdf(user, docId, noteType);
  const pdfData = await generateNotePdf({
    templateName,
    session,
  });
  const fileNameId = String(docId).padStart(16, "0");
  const fileName = `HCBS_${fileNameId}.pdf`;

  const f = new FileData("sessionnotes", user.blobStorage);
  f.storeFile(pdfData, fileName);

  return fileName;
};

export default [
  {
    key: "notesByClient",
    prototype:
      "(clientId: Int, isEVV: Boolean, startDate: String, endDate: String): [GuardianNote]",
    run: async ({ clientId, isEVV, startDate, endDate }, { user }) => {
      const request = db.newRequest(user);
      request.input("clientId", db.sql.VarChar(100), String(clientId));
      request.input("isEVV", db.sql.Bit, isEVV);
      request.input("localPeriodStart", db.sql.VarChar(10), String(startDate));
      request.input("localPeriodEnd", db.sql.VarChar(10), String(endDate));
      const { recordset } = await request.execute("sp_NotesGetByClient");
      return recordset.map(({ utcIn, utcOut, svc, guardianId, ...rest }) => ({
        svcDate: moment(utcIn).format("DD/MM/YYYY"),
        inTime: moment(utcIn).format("hh:mm a"),
        outTime: moment(utcOut).format("hh: mm a"),
        serviceName: svc,
        approvedNote: guardianId !== 0,
        guardianId,
        ...rest,
      }));
    },
  },
  {
    key: "approveNotesByGuardian",
    prototype:
      "(sessionId: Int, noteType: String, approved: Boolean, isEVV: Boolean, pin: Int, fromMobile: Boolean): GuardianNote",
    mutation: true,
    run: async (
      { sessionId, noteType, approved, isEVV, pin, fromMobile },
      { user }
    ) => {
      const request = db.newRequest(user);
      request.input(
        "guardianId",
        db.sql.VarChar(100),
        String(user.guardianUId)
      );
      request.input("sessionId", db.sql.VarChar(100), String(sessionId));
      request.input("noteType", db.sql.VarChar(100), noteType);
      request.input("approved", db.sql.Bit, approved);
      request.input("isEVV", db.sql.Bit, isEVV);
      request.input("pin", db.sql.Int, pin);
      request.input("fromMobile", db.sql.Bit, fromMobile);
      const { recordset } = await request.execute("sp_NotesApproveByGuardian");

      if (recordset[0].ERROR) {
        throw new Error(recordset[0].ERROR);
      }

      return {
        sessionId,
        guardianId: user.guardianUId,
        approvedNote: approved,
      };
    },
  },
  {
    key: "approveAllNotesByGuardian",
    prototype:
      "(approved: Boolean, clsvId: Int, startDate: String, endDate: String): Boolean",
    mutation: true,
    run: async ({ approved, clsvId, startDate, endDate }, { user }) => {
      const request = db.newRequest(user);
      request.input(
        "guardianId",
        db.sql.VarChar(100),
        String(user.guardianUId)
      );
      request.input("approved", db.sql.Bit, approved);
      request.input("clsvId", db.sql.Int, clsvId);
      request.input("startDate", db.sql.VarChar(100), startDate);
      request.input("endDate", db.sql.VarChar(100), endDate);
      const { recordset } = await request.execute(
        "sp_NotesApproveAllByGuardian"
      );
      return true;
    },
  },
  {
    key: "clientNoteBySessionId",
    prototype: "(sessionId: Int, isTherapy: Boolean): ClientNote",
    run: getClientNoteBySessionId,
  },
  {
    key: "setClientNoteBySessionId",
    prototype:
      "(sessionId: Int, isTherapy: Boolean, note: ClientNoteInput): ClientNote",
    mutation: true,
    run: async ({ sessionId, isTherapy, note }, { user }) => {
      const userInfo = await getUserInfo(user);
      const { prID, roleNominal } = userInfo;
      const noteType = await getNoteType(sessionId, isTherapy, user);

      const setNoteRequest = db.newRequest(user);
      let noteResponse = {};
      setNoteRequest.input("userLevel", roleNominal);
      setNoteRequest.input("userprId", prID);
      setNoteRequest.input("prId", note.providerId);
      setNoteRequest.input("staffSessionHcbsId", sessionId);
      setNoteRequest.input("noShow", note.noShow);

      // XXXX New
      setNoteRequest.input("clientRefusedService", note.clientRefusedService);
      setNoteRequest.input("designeeRefusedToSign", note.designeeRefusedToSign);
      setNoteRequest.input("designeeUnableToSign", note.designeeUnableToSign);
      setNoteRequest.input("unsafeToWork", note.unsafeToWork);
      setNoteRequest.input("guardianId", note.guardianId);
      setNoteRequest.input("designeeId", note.designeeId);
      setNoteRequest.input("designeeLat", note.designeeLat);
      setNoteRequest.input("designeeLon", note.designeeLon);
      setNoteRequest.input("designeeLocationId", note.designeeLocationId);
      setNoteRequest.input(
        "designeeLocationTypeId",
        note.designeeLocationTypeId
      );
      // XXX End New

      setNoteRequest.input("note", note.note);
      setNoteRequest.input("hasAttachment", note.hasAttachment);
      setNoteRequest.input("fileExtension", note.extension);
      setNoteRequest.input("completed", note.completed);

      if (noteType === "RSPNote") {
        noteResponse = await setNoteRequest.execute("sp_TaskSetSessionRspNote");
      } else if (noteType === "ATCNote") {
        const careAreaTable = new sql.Table();
        careAreaTable.columns.add("goalId", sql.Int);
        careAreaTable.columns.add("score", sql.VarChar(10));

        if (note.careAreas) {
          note.careAreas.forEach((careArea) => {
            if (careArea.score && careArea.score !== "NA") {
              careAreaTable.rows.add(careArea.careId, careArea.score);
            }
          });
        }

        setNoteRequest.input("supervisorPresent", note.supervisorPresent);
        setNoteRequest.input("careAreas", careAreaTable);

        noteResponse = await setNoteRequest.execute("sp_TaskSetSessionAtcNote");
      } else if (noteType === "HAHNote") {
        const longTermObjectiveTable = new sql.Table();
        longTermObjectiveTable.columns.add("goalId", sql.Int);
        longTermObjectiveTable.columns.add("score", sql.VarChar(10));
        longTermObjectiveTable.columns.add("trialPct", sql.VarChar(50));

        if (note.longTermObjectives) {
          note.longTermObjectives.forEach((longTerm) => {
            longTerm.shortTermGoals.forEach((shortTerm) => {
              if (shortTerm.score && shortTerm.score !== "NA") {
                longTermObjectiveTable.rows.add(
                  shortTerm.goalId,
                  shortTerm.score,
                  shortTerm.trialPct
                );
              }
            });
          });
        }

        setNoteRequest.input("teletherapy", note.teletherapy);
        setNoteRequest.input("goalScores", longTermObjectiveTable);

        noteResponse = await setNoteRequest.execute(
          "sp_TaskSetSessionHabilitationNote"
        );
      } else {
        // setNoteRequest.input('clientSessionTherapyId', sessionId);
        // noteResponse = await setNoteRequest.execute('sp_TaskGetSessionTherapyNote');
      }

      if (note.adjutcIn && note.adjutcOut) {
        if (isTherapy) {
          const request = db.newRequest(user);
          // TODO: add later
        } else {
          const readRequest = db.newRequest(user);
          const {
            recordset: [oldRow],
          } = await readRequest.query(`
            SELECT *
            FROM HCBSHrsEmp
            WHERE HCBSHrsEmpId = ${sessionId}
          `);
          const request = db.newRequest(user);
          const dayStart = new Date(oldRow.utcIn);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);
          const nextDayEnd = new Date(dayEnd);
          nextDayEnd.setDate(nextDayEnd.getDate() + 1);

          request.input("HCBSHrsEmpId", db.sql.Int, sessionId || 0);
          request.input("prId", db.sql.Int, oldRow.prid);
          request.input("clsvId", db.sql.Int, oldRow.clsvid);
          request.input("clsvidId", db.sql.Int, oldRow.clsvidid);
          request.input("serviceId", db.sql.Int, oldRow.serviceId);
          request.input("svc", db.sql.VarChar(10), oldRow.svc);
          request.input(
            "startLocationTypeId",
            db.sql.Int,
            oldRow.startlocationTypeId
          );
          request.input(
            "startClientLocationId",
            db.sql.Int,
            oldRow.startClientLocationId
          );
          request.input(
            "endLocationTypeId",
            db.sql.Int,
            oldRow.endLocationTypeId || 0
          );
          request.input(
            "endClientLocationId",
            db.sql.Int,
            oldRow.endClientLocationId || 0
          );
          request.input("startLat", db.sql.DECIMAL(10, 7), oldRow.startLat);
          request.input("startLon", db.sql.DECIMAL(10, 7), oldRow.startLon);
          request.input("endLat", db.sql.DECIMAL(10, 7), oldRow.endLat);
          request.input("endLon", db.sql.DECIMAL(10, 7), oldRow.endLon);
          request.input("date", db.sql.DATE, oldRow.dt);
          request.input("utcIn", db.sql.DATETIME, oldRow.utcIn);
          request.input("utcOut", db.sql.DATETIME, oldRow.utcOut);
          request.input(
            "adjutcIn",
            db.sql.DATETIME,
            new Date(note.adjutcIn * 1000)
          );
          request.input(
            "adjutcOut",
            db.sql.DATETIME,
            new Date(note.adjutcOut * 1000)
          );
          request.input("inCallType", db.sql.Int, oldRow.incallType);
          request.input("outCallType", db.sql.Int, oldRow.outcallType);
          request.input("callType", db.sql.Int, oldRow.callType);
          request.input(
            "utcPartition1Start",
            db.sql.DATETIME,
            oldRow.utcPartition1Start
          );
          request.input(
            "utcPartition1End",
            db.sql.DATETIME,
            oldRow.utcPartition1End
          );
          request.input(
            "utcPartition2Start",
            db.sql.DATETIME,
            oldRow.utcPartition2Start
          );
          request.input(
            "utcPartition2End",
            db.sql.DATETIME,
            oldRow.utcPartition2End
          );
          request.input("isEVV", db.sql.BIT, oldRow.isEVV);

          const {
            recordsets: [[{ HCBSHrsEmpId }]],
          } = await request.execute("sp_ApiInOutHCBSEmpUpdate");
        }
      }

      if (note.completed) {
        if (
          noteType === "RSPNote" ||
          noteType === "ATCNote" ||
          noteType === "HAHNote"
        ) {
          const pdfName = await saveHCBSNotePdf(user, sessionId, noteType);
          const setPdfRequest = db.newRequest(user);
          setPdfRequest.input("userLevel", roleNominal);
          setPdfRequest.input("userprId", prID);
          setPdfRequest.input("prId", note.providerId);
          setPdfRequest.input("staffSessionHcbsId", sessionId);
          setPdfRequest.input("fileName", pdfName);
          setPdfRequest.input("completedDt", moment.utc().format("MM/DD/YYYY"));

          let spName;
          if (noteType === "RSPNote") {
            spName = "sp_TaskSetSessionRspNoteApprove";
          } else if (noteType === "ATCNote") {
            spName = "sp_TaskSetSessionAtcNoteApprove";
          } else if (noteType === "HAHNote") {
            spName = "sp_TaskSetSessionHabilitationNoteApprove";
          }
          await setPdfRequest.execute(spName);
        } else {
          // TODO
        }
      }

      const clientNote = await getClientNoteBySessionId(
        { sessionId, isTherapy },
        { user }
      );
      return clientNote;
    },
  },
  {
    key: "pendingDocuments",
    prototype: ": [ClientNote]",
    run: async ({}, { user }) => {
      const pendingDocumentRequest = db.newRequest(user);
      const userInfo = await getUserInfo(user);
      const { prID } = userInfo;
      pendingDocumentRequest.input("userprId", prID);
      pendingDocumentRequest.input("prId", prID);
      let { recordset: notes } = await pendingDocumentRequest.execute(
        "sp_GetPendingDocumentation"
      );
      notes = notes
        .map((note) => {
          renameProperties(note, {
            clsvId: "clientId",
            prId: "providerId",
            fileExtension: "extension",
            noteType2: "noteType",
            dueDt: "dt",
          });
          note.clientName = `${note.cfn} ${note.cln}`;
          return note;
        })
        .sort((a, b) => Number(b.docId) - Number(a.docId));

      return notes;
    },
  },
];
