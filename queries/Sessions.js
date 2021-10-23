import _ from "lodash";
import moment from "moment";
import sql from "mssql";

import db from "../db";
import {
  getPrId,
  getView,
  calulateUnits15MinRule,
  renameProperties,
  getDayStart,
  getDateTime
} from "../utils";

export default [
  {
    key: "startSession",
    prototype: "(session: SessionInput): [Session]",
    mutation: true,
    run: async (
      {
        session: {
          ids,
          serviceId,
          clientIds,
          lat,
          lon,
          timestamp,
          clientLocationId,
          locationTypeId,
        },
      },
      { user }
    ) => {
      const prID = await getPrId(user);
      const responses = await Promise.all(
        clientIds.map((clientId, index) => {
          const id = (ids || [])[index];
          return new Promise(async (resolve, reject) => {
            try {
              const csRequest = db.newRequest(user);
              const {
                recordset: [{ svc, isTherapy, isHCBS, isEvaluation, clsvidId }],
              } = await csRequest.query(`
              SELECT CompS.svc, CompS.isTherapy, CompS.isHCBS, CompS.isEvaluation, CSR.clsvidId
              FROM CLientStaffRelationships as CSR
              JOIN Clients AS C ON C.clsvID=CSR.clsvId AND C.deleted=0
              JOIN ClientServices AS CS ON CS.id=CSR.clsvidId AND CS.deleted=0
              JOIN CompanyServices AS CompS ON CompS.serviceId=CS.serviceId
              WHERE CSR.prid = ${prID} AND
                    CSR.isActive <>0 AND
                    C.clsvID = ${clientId} AND
                    CompS.serviceId = ${serviceId}
            `);
              if (isTherapy || isEvaluation) {
                const request = db.newRequest(user);
                const { recordset } = await request.execute(
                  "sp_ApiInOutSetSessionTherapyHours"
                );
                return resolve({});
              } else {
                const request = db.newRequest(user);
                const dayStart = getDayStart(timestamp * 1000, user.Timezone);
                console.log(dayStart);
                const dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 1);
                const nextDayEnd = new Date(dayEnd);
                nextDayEnd.setDate(nextDayEnd.getDate() + 1);
                request.input("HCBSHrsEmpId", db.sql.Int, id || 0);
                request.input("prId", db.sql.Int, prID);
                request.input("clsvId", db.sql.Int, clientId);
                request.input("clsvidId", db.sql.Int, clsvidId);
                request.input("serviceId", db.sql.Int, serviceId);
                request.input("svc", db.sql.VarChar(10), svc);
                request.input(
                  "startLocationTypeId",
                  db.sql.Int,
                  locationTypeId || 0
                );
                request.input(
                  "startClientLocationId",
                  db.sql.Int,
                  clientLocationId || 0
                );
                request.input("endLocationTypeId", db.sql.Int, 0);
                request.input("endClientLocationId", db.sql.Int, 0);
                request.input("startLat", db.sql.DECIMAL(10, 7), lat);
                request.input("startLon", db.sql.DECIMAL(10, 7), lon);
                request.input("endLat", db.sql.DECIMAL(10, 7), null);
                request.input("endLon", db.sql.DECIMAL(10, 7), null);
                request.input("date", db.sql.VarChar(10), getDateTime(timestamp * 1000, user.Timezone).format("YYYY-MM-DD"));
                request.input(
                  "utcIn",
                  db.sql.DATETIME,
                  new Date(timestamp * 1000)
                );
                request.input("utcOut", db.sql.DATETIME, null);
                request.input("adjutcIn", db.sql.DATETIME, null);
                request.input("adjutcOut", db.sql.DATETIME, null);
                request.input("inCallType", db.sql.Int, 1);
                request.input("outCallType", db.sql.Int, 1);
                request.input("callType", db.sql.Int, 1);
                request.input("utcPartition1Start", db.sql.DATETIME, dayStart);
                request.input("utcPartition1End", db.sql.DATETIME, dayEnd);
                // request.input('utcPartition2Start', db.sql.DATETIME, moment(dayEnd).utc().format('YYYY-MM-DD HH:mm:ss.SSS'));
                // request.input('utcPartition2End', db.sql.DATETIME, moment(nextDayEnd).utc().format('YYYY-MM-DD HH:mm:ss.SSS'));
                request.input("utcPartition2Start", db.sql.DATETIME, null);
                request.input("utcPartition2End", db.sql.DATETIME, null);
                request.input("isEVV", db.sql.BIT, 1);
                // const { recordset: [{ HCBSHrsEmpId }] } = await request.execute('sp_ApiInOutHCBSEmpUpdate');
                const response = await request.execute(
                  "sp_ApiInOutHCBSEmpUpdate"
                );
                const {
                  recordset: [{ HCBSHrsEmpId }],
                } = response;
                const readRequest = db.newRequest(user);
                const {
                  recordset: [newRow],
                } = await readRequest.query(`
                SELECT *
                FROM HCBSHrsEmp
                WHERE HCBSHrsEmpId = ${HCBSHrsEmpId}
              `);
                newRow.isTherapy = isTherapy || isEvaluation;
                resolve(
                  renameProperties(newRow, {
                    HCBSHrsEmpID: "id",
                    clsvidId: "clientServiceId",
                    prid: "prId",
                  })
                );
              }
              resolve({});
            } catch (err) {
              reject(err);
            }
          });
        })
      );
      return responses;
    },
  },
  {
    key: "endSession",
    prototype: "(session: SessionInput): [Session]",
    mutation: true,
    run: async (
      {
        session: {
          ids,
          clientIds,
          serviceId,
          lat,
          lon,
          timestamp,
          clientLocationId,
          locationTypeId,
        },
      },
      { user }
    ) => {
      const prID = await getPrId(user);
      const responses = await Promise.all(
        clientIds.map((clientId, index) => {
          const id = (ids || [])[index];
          return new Promise(async (resolve, reject) => {
            try {
              const csRequest = db.newRequest(user);
              const {
                recordset: [{ svc, isTherapy, isHCBS, isEvaluation, clsvidId }],
              } = await csRequest.query(`
              SELECT CompS.svc, CompS.isTherapy, CompS.isHCBS, CompS.isEvaluation, CSR.clsvidId
              FROM CLientStaffRelationships as CSR
              JOIN Clients AS C ON C.clsvID=CSR.clsvId AND C.deleted=0
              JOIN ClientServices AS CS ON CS.id=CSR.clsvidId AND CS.deleted=0
              JOIN CompanyServices AS CompS ON CompS.serviceId=CS.serviceId
              WHERE CSR.prid = ${prID} AND
                    CSR.isActive <>0 AND
                    C.clsvID = ${clientId} AND
                    CompS.serviceId = ${serviceId}
            `);
              if (isTherapy || isEvaluation) {
                const request = db.newRequest(user);
                const { recordset } = await request.execute(
                  "sp_ApiInOutSetSessionTherapyHours"
                );
                resolve({});
              } else {
                const readRequest = db.newRequest(user);
                const {
                  recordset: [oldRow],
                } = await readRequest.query(`
                SELECT *
                FROM HCBSHrsEmp
                WHERE HCBSHrsEmpId = ${id}
              `);

                const request = db.newRequest(user);
                
                //const dayStart = getDayStart(timestamp * 1000, user.Timezone);  valxx removed
                const dayStart = getDayStart(oldRow.utcIn, user.Timezone); // valxx added


                const dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 1);
                const nextDayEnd = new Date(dayEnd);
                nextDayEnd.setDate(nextDayEnd.getDate() + 1);

                request.input("HCBSHrsEmpId", db.sql.Int, id || 0);
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
                  locationTypeId || 0
                );
                request.input(
                  "endClientLocationId",
                  db.sql.Int,
                  clientLocationId || 0
                );
                request.input(
                  "startLat",
                  db.sql.DECIMAL(10, 7),
                  oldRow.startLat
                );
                request.input(
                  "startLon",
                  db.sql.DECIMAL(10, 7),
                  oldRow.startLon
                );
                request.input("endLat", db.sql.DECIMAL(10, 7), lat);
                request.input("endLon", db.sql.DECIMAL(10, 7), lon);
                request.input("date", db.sql.DATE, oldRow.dt);
                request.input("utcIn", db.sql.DATETIME, oldRow.utcIn);
                request.input(
                  "utcOut",
                  db.sql.DATETIME,
                  new Date(timestamp * 1000)
                );
                request.input("adjutcIn", db.sql.DATETIME, null);
                request.input("adjutcOut", db.sql.DATETIME, null);
                request.input("inCallType", db.sql.Int, oldRow.incallType);
                request.input("outCallType", db.sql.Int, oldRow.outcallType);
                request.input("callType", db.sql.Int, oldRow.callType);
                request.input("utcPartition1Start", db.sql.DATETIME, dayStart);
                request.input("utcPartition1End", db.sql.DATETIME, dayEnd);
                const sameDay =
                  moment(dayStart).utc().format("YYYY-MM-DD HH:mm:ss.SSS") ===
                  oldRow.utcPartition1Start;
                if (!sameDay) {
                  request.input("utcPartition2Start", db.sql.DATETIME, dayEnd);
                  request.input(
                    "utcPartition2End",
                    db.sql.DATETIME,
                    nextDayEnd
                  );
                } else {
                  request.input("utcPartition2Start", db.sql.DATETIME, null);
                  request.input("utcPartition2End", db.sql.DATETIME, null);
                }
                request.input("isEVV", db.sql.BIT, oldRow.isEVV);

                const {
                  recordsets: [[{ HCBSHrsEmpId }], sessions],
                } = await request.execute("sp_ApiInOutHCBSEmpUpdate");
                if (Boolean(sessions)) {
                  const STARTTIME = 1;
                  const ENDTIME = 2;
                  const PROVIDERID = oldRow.prid;
                  const MASTERSERVICE = oldRow.svc;
                  const MASTERSERVICEID = oldRow.serviceId;
                  // create pivot table so we can calc actual client sessions
                  const PivotTable = new sql.Table();
                  PivotTable.columns.add("HCBSHrsEmpID", sql.Int);
                  PivotTable.columns.add("prId", sql.Int);
                  PivotTable.columns.add("clsvId", sql.Int);
                  PivotTable.columns.add("clsvidId", sql.Int);
                  PivotTable.columns.add("serviceId", sql.Int);
                  PivotTable.columns.add("svc", sql.VarChar(50));
                  PivotTable.columns.add("callType", sql.Int);
                  PivotTable.columns.add("TimeType", sql.Int);
                  PivotTable.columns.add("dt", sql.DateTime);
                  PivotTable.columns.add("TimeStamp", sql.DateTime);
                  PivotTable.columns.add("Lat", sql.Float);
                  PivotTable.columns.add("Lon", sql.Float);
                  PivotTable.columns.add("ClientLocationId", sql.Int);
                  PivotTable.columns.add("LocationTypeId", sql.Int);

                  // Create New Table to hold break up the sessions
                  const ClientSessionTable = new sql.Table();
                  ClientSessionTable.columns.add("HCBSHrsEmpID", sql.Int); //ZZZZZ
                  ClientSessionTable.columns.add("prId", sql.Int);
                  ClientSessionTable.columns.add("dt", sql.DateTime);
                  ClientSessionTable.columns.add("clsvId", sql.Int);
                  ClientSessionTable.columns.add("clsvidId", sql.Int);
                  ClientSessionTable.columns.add("serviceId", sql.Int);
                  ClientSessionTable.columns.add("svc", sql.VarChar(50));
                  ClientSessionTable.columns.add("utcIn", sql.DateTime);
                  ClientSessionTable.columns.add("utcOut", sql.DateTime);

                  ClientSessionTable.columns.add("startLat", sql.Float);
                  ClientSessionTable.columns.add("startLon", sql.Float);
                  ClientSessionTable.columns.add("endLat", sql.Float);
                  ClientSessionTable.columns.add("endLon", sql.Float);
                  ClientSessionTable.columns.add("ratio", sql.Int);
                  ClientSessionTable.columns.add("units", sql.Float);

                  ClientSessionTable.columns.add(
                    "StartClientLocationId",
                    sql.Int
                  );
                  ClientSessionTable.columns.add(
                    "StartLocationTypeId",
                    sql.Int
                  );
                  ClientSessionTable.columns.add(
                    "EndClientLocationId",
                    sql.Int
                  );
                  ClientSessionTable.columns.add("EndLocationTypeId", sql.Int);
                  ClientSessionTable.columns.add("ClientLocationId", sql.Int);
                  ClientSessionTable.columns.add("LocationTypeId", sql.Int);

                  // create billing table to hold records
                  const BillingTable = new sql.Table();
                  BillingTable.columns.add("prId", sql.Int);
                  BillingTable.columns.add("dt", sql.DateTime);
                  BillingTable.columns.add("clsvId", sql.Int);
                  BillingTable.columns.add("clsvidId", sql.Int);
                  BillingTable.columns.add("serviceId", sql.Int);
                  BillingTable.columns.add("svc", sql.VarChar(50));
                  BillingTable.columns.add("ratio", sql.SmallInt);
                  BillingTable.columns.add("timeOfDayModifier", sql.Int);
                  BillingTable.columns.add("units", sql.Float);
                  BillingTable.columns.add("onHold", sql.Bit);
                  BillingTable.columns.add("status", sql.Int);
                  BillingTable.columns.add("billAsGroup", sql.Int);
                  BillingTable.columns.add("billAsGroupRatio", sql.SmallInt);

                  const ClientServiceListTable = new sql.Table();
                  ClientServiceListTable.columns.add("clsvidId", sql.Int);
                  ClientServiceListTable.columns.add("prId", sql.Int);
                  ClientServiceListTable.columns.add("dt", sql.DateTime);
                  const SessionRecords = _.orderBy(
                    getView(sessions.toTable()),
                    ["ActualUtcIn", "ActualUtcOut"],
                    ["asc", "asc"]
                  );
                  SessionRecords.forEach(
                    ({
                      HCBSHrsEmpID,
                      prId,
                      clsvId,
                      clsvidId,
                      serviceId,
                      svc,
                      dt,
                      ActualUtcIn,
                      ActualUtcOut,
                      startlat,
                      EndLat,
                      startLon,
                      endLon,
                      StartClientLocationId,
                      EndClientLocationId,
                      StartLocationTypeId,
                      EndLocationTypeId,
                    }) => {
                      PivotTable.rows.add(
                        HCBSHrsEmpID,
                        prId,
                        clsvId,
                        clsvidId,
                        serviceId,
                        svc,
                        null,
                        STARTTIME,
                        dt,
                        ActualUtcIn,
                        startlat,
                        startLon,
                        StartClientLocationId,
                        StartLocationTypeId
                      );
                      PivotTable.rows.add(
                        HCBSHrsEmpID,
                        prId,
                        clsvId,
                        clsvidId,
                        serviceId,
                        svc,
                        null,
                        ENDTIME,
                        dt,
                        ActualUtcOut,
                        EndLat,
                        endLon,
                        EndClientLocationId,
                        EndLocationTypeId
                      );
                      ClientServiceListTable.rows.add(clsvidId, prId, dt);
                    }
                  );

                  // break up sessions for each client and get the ratio
                  const PivotDataView = _.orderBy(
                    getView(PivotTable),
                    ["dt", "TimeStamp", "TimeType"],
                    ["asc", "asc", "desc"]
                  );
                  let PreviousStartTime = null;
                  PivotDataView.forEach(
                    (
                      {
                        HCBSHrsEmpID,
                        prId,
                        dt,
                        clsvId,
                        clsvidId,
                        serviceId,
                        svc,
                        TimeStamp,
                        Lat,
                        Lon,
                        ClientLocationId,
                        LocationTypeId,
                        TimeType,
                      },
                      index
                    ) => {
                      const closeSession = (current = false) => {
                        ClientSessionTable.rows.forEach((row) => {
                          if (
                            (!current ||
                              ClientSessionTable.getProperty(
                                row,
                                "clsvidId"
                              ) === clsvidId) &&
                            !ClientSessionTable.getProperty(row, "utcOut")
                          ) {
                            ClientSessionTable.setProperty(
                              row,
                              "utcOut",
                              TimeStamp
                            );
                            ClientSessionTable.setProperty(row, "endLat", Lat);
                            ClientSessionTable.setProperty(row, "endLon", Lon);
                            ClientSessionTable.setProperty(
                              row,
                              "EndClientLocationId",
                              ClientLocationId
                            );
                            ClientSessionTable.setProperty(
                              row,
                              "EndLocationTypeId",
                              LocationTypeId
                            );
                            // all locations OK set default location to end Location
                            if (
                              Number(
                                ClientSessionTable.getProperty(
                                  row,
                                  "StartClientLocationId"
                                )
                              ) !== 0 &&
                              Number(
                                ClientSessionTable.getProperty(
                                  row,
                                  "EndClientLocationId"
                                )
                              ) !== 0
                            ) {
                              ClientSessionTable.setProperty(
                                row,
                                "ClientLocationId",
                                ClientSessionTable.getProperty(
                                  row,
                                  "EndClientLocationId"
                                )
                              );
                            }
                            if (
                              Number(
                                ClientSessionTable.getProperty(
                                  row,
                                  "StartLocationTypeId"
                                )
                              ) !== 0 &&
                              Number(
                                ClientSessionTable.getProperty(
                                  row,
                                  "EndLocationTypeId"
                                )
                              ) !== 0
                            ) {
                              ClientSessionTable.setProperty(
                                row,
                                "LocationTypeId",
                                ClientSessionTable.getProperty(
                                  row,
                                  "EndLocationTypeId"
                                )
                              );
                            }
                            const units = calulateUnits15MinRule(
                              ClientSessionTable.getProperty(row, "utcOut"),
                              ClientSessionTable.getProperty(row, "utcIn")
                            );
                            ClientSessionTable.setProperty(row, "units", units);
                          }
                        });
                      };
                      if (TimeType === STARTTIME) {
                        const OpenSessions = getView(ClientSessionTable).filter(
                          ({ utcOut }) => !Boolean(utcOut)
                        );
                        const ratio = OpenSessions.length + 1;
                        // if the start time does not equal previous start time close all sessions still open
                        // and create new sessions ZZZZ
                        if (PreviousStartTime !== TimeStamp) {
                          closeSession();
                          // create new sessions from the ones we closed
                          OpenSessions.forEach(
                            ({
                              HCBSHrsEmpID,
                              prId,
                              dt,
                              clsvId,
                              clsvidId,
                              serviceId,
                              svc,
                            }) => {
                              ClientSessionTable.rows.add(
                                HCBSHrsEmpID,
                                prId,
                                dt,
                                clsvId,
                                clsvidId,
                                serviceId,
                                svc,
                                TimeStamp,
                                null,
                                Lat,
                                Lon,
                                null,
                                null,
                                ratio,
                                null,
                                ClientLocationId,
                                LocationTypeId,
                                null,
                                null,
                                null,
                                null
                              );
                            }
                          );
                        } else {
                          // else just adjust the ratio ZZZZ
                          ClientSessionTable.rows.forEach((row) => {
                            if (
                              !ClientSessionTable.getProperty(row, "utcOut")
                            ) {
                              ClientSessionTable.setProperty(
                                row,
                                "ratio",
                                ratio
                              );
                            }
                          });
                        }
                        // Add new session moved here
                        ClientSessionTable.rows.add(
                          HCBSHrsEmpID,
                          prId,
                          dt,
                          clsvId,
                          clsvidId,
                          serviceId,
                          svc,
                          TimeStamp,
                          null,
                          Lat,
                          Lon,
                          null,
                          null,
                          ratio,
                          null,
                          ClientLocationId,
                          LocationTypeId,
                          null,
                          null,
                          null,
                          null
                        );
                        PreviousStartTime = TimeStamp;
                      } else {
                        // this is an end time
                        // close current session
                        closeSession(true);
                        // get remain sessions
                        const OpenSessions = getView(ClientSessionTable).filter(
                          ({ utcOut }) => !Boolean(utcOut)
                        );
                        // close the remaining sessions
                        closeSession();
                        OpenSessions.forEach(
                          ({
                            HCBSHrsEmpID,
                            prId,
                            dt,
                            clsvId,
                            clsvidId,
                            serviceId,
                            svc,
                            startLat,
                            startLon,
                          }) => {
                            ClientSessionTable.rows.add(
                              HCBSHrsEmpID,
                              prId,
                              dt,
                              clsvId,
                              clsvidId,
                              serviceId,
                              svc,
                              TimeStamp,
                              null,
                              startLat,
                              startLon,
                              null,
                              null,
                              OpenSessions.length,
                              null,
                              ClientLocationId,
                              LocationTypeId,
                              null,
                              null,
                              null,
                              null
                            );
                          }
                        );
                      }
                    }
                  );
                  ClientSessionTable.rows = ClientSessionTable.rows.filter(
                    (row) => {
                      const utcIn = ClientSessionTable.getProperty(
                        row,
                        "utcIn"
                      );
                      const utcOut = ClientSessionTable.getProperty(
                        row,
                        "utcOut"
                      );
                      const units = ClientSessionTable.getProperty(
                        row,
                        "units"
                      );
                      if (utcIn === utcOut || Number(units) === 0) return false;
                      return true;
                    }
                  );
                  const clientUpdateRequest = db.newRequest(user);
                  clientUpdateRequest.input("providerId", PROVIDERID);
                 // clientUpdateRequest.input("date1", oldRow.utcPartition1Start); // valxx removed
                 clientUpdateRequest.input("date1", dayStart); //valxx add new
                  clientUpdateRequest.input("date2", sameDay ? null : dayEnd);
                  clientUpdateRequest.input("serviceId", MASTERSERVICEID);
                  clientUpdateRequest.input("svc", MASTERSERVICE);
                  clientUpdateRequest.input(
                    "HCBSHrsClient",
                    ClientSessionTable
                  );
                  clientUpdateRequest.input(
                    "ClientServiceIds",
                    ClientServiceListTable
                  );
                  const {
                    recordset: ClientSessionData,
                  } = await clientUpdateRequest.execute(
                    "sp_ApiInOutHCBSClientUpdate"
                  );

                  // Now we need to update the billing records
                  const ClientSessionDataView = getView(
                    ClientSessionData.toTable()
                  );
                  const UniqueBillingRecordKeys = _.uniqBy(
                    ClientSessionDataView,
                    (v) =>
                      JSON.stringify([
                        v.prid,
                        v.dt,
                        v.clsvid,
                        v.clsvidid,
                        v.serviceId,
                        v.svc,
                        v.ratio,
                      ])
                  );
                  const UniqueClientServices = _.uniqBy(
                    ClientSessionDataView,
                      (v) => JSON.stringify([v.clsvidid, v.dt])
                  );

                  // We need to go back and update client sessions just in case some are daily for Sandata Api
                  // so create
                  const HCBSHrsClientIsDailyUpdate = new sql.Table();
                  HCBSHrsClientIsDailyUpdate.columns.add("clsvidId", sql.Int);
                  HCBSHrsClientIsDailyUpdate.columns.add(
                    "billAsDaily",
                    sql.Bit
                  );

                  UniqueClientServices.forEach((UniqueClientService) => {
                    // Add update row and initialize to false for sandata API - not xls billing file
                    let newUpdateRow = [];
                    if (MASTERSERVICE === "RSP") {
                      // rsp is the only service that can go to daily
                      HCBSHrsClientIsDailyUpdate.rows.add(
                        UniqueClientService.clsvidid,
                        false
                      );
                      newUpdateRow = HCBSHrsClientIsDailyUpdate.rows.slice(
                        -1
                      )[0];
                    }

                    let TimeOfDayModifier = 0;
                    let TotalUnitsForService = 0; // For Calculating if RSP => RSD
                    let HighestRatio = 0; // If we have RSP with different ratios & RSP=>RSD we need this

                    const CurrentUniqueBillingRecordKeys = UniqueBillingRecordKeys.filter(
                      ({ clsvidid, dt }) =>
                        clsvidid === UniqueClientService.clsvidid &&
                        dt.getTime() === UniqueClientService.dt.getTime() //valxx change
                    );





                    CurrentUniqueBillingRecordKeys.forEach(
                      ({
                        prid,
                        dt,
                        clsvid,
                        clsvidid,
                        serviceId,
                        svc,
                        ratio,
                      }) => {
                        let units = 0;
                        if (HighestRatio < ratio) HighestRatio = ratio;
                        ClientSessionDataView.forEach((row) => {
                          if (
                            row.dt === dt &&
                            row.prid === prid &&
                            row.clsvidid === clsvidid &&
                            row.ratio === ratio
                          ) {
                            TotalUnitsForService += row.units;
                            units += row.units;
                          }
                        });
                        BillingTable.rows.add(
                          prid,
                          dt,
                          clsvid,
                          clsvidid,
                          serviceId,
                          svc,
                          ratio,
                          TimeOfDayModifier,
                          units,
                          false,
                          0,
                          null,
                          null
                        );
                        TimeOfDayModifier++;
                      }
                    );
















                    // for the client service in question
                    if (
                      MASTERSERVICE == "RSP" &&
                      TotalUnitsForService > 11.75
                    ) {
                      // RSP turns into RSD at > 11.75
                      let BillAsGroup = 0;
                      BillingTable.rows.forEach((BillingRecord) => {
                        if (BillAsGroup === 0) {
                          // we need some type of id
                          const defaultSelectedRow =
                            _.orderBy(
                              ClientSessionDataView.filter(
                                ({ clsvidid }) =>
                                  clsvidid === BillingRecord.clsvidId
                              ),
                              "HCBSHrsClientId"
                            )[0] || {};
                          BillAsGroup = defaultSelectedRow.HCBSHrsClientId;
                        }
                        BillingTable.setProperty(
                          BillingRecord,
                          "billAsGroup",
                          BillAsGroup
                        );
                        BillingTable.setProperty(
                          BillingRecord,
                          "billAsGroupRatio",
                          HighestRatio
                        );
                      });
                      // We need to update the actual client sessions for sandata
                      HCBSHrsClientIsDailyUpdate.setProperty(
                        newUpdateRow,
                        "billAsDaily",
                        true
                      );
                    }
                  });

                  const billUpdateRequest = db.newRequest(user);
                  billUpdateRequest.input("date1", oldRow.utcPartition1Start);
                  billUpdateRequest.input("date2", sameDay ? null : dayEnd);
                  billUpdateRequest.input(
                    "ClientServiceIds",
                    ClientServiceListTable
                  );
                  billUpdateRequest.input("HCBSHrsBill", BillingTable);
                  billUpdateRequest.input(
                    "HCBSHrsClientIsDailyUpdate",
                    HCBSHrsClientIsDailyUpdate
                  );
                  const {
                    recordset: BillData,
                  } = await billUpdateRequest.execute(
                    "sp_ApiInOutHCBSBillUpdate"
                  );
                  console.log(BillData);
                }

                const readRequest1 = db.newRequest(user);
                const {
                  recordset: [newRow],
                } = await readRequest1.query(`
                SELECT *
                FROM HCBSHrsEmp
                WHERE HCBSHrsEmpId = ${HCBSHrsEmpId}
              `);

                newRow.isTherapy = isTherapy || isEvaluation;

                resolve(
                  renameProperties(newRow, {
                    HCBSHrsEmpID: "id",
                    clsvidId: "clientServiceId",
                    prid: "prId",
                  })
                );
              }
              resolve({});
            } catch (err) {
              reject(err);
            }
          });
        })
      );
      return responses;
    },
  },
];
