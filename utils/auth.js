import jwt from 'jsonwebtoken';
import sql from 'mssql';
import moment from 'moment';

import db from '../db';

export const getUser = async token => {
  if (token) {
    const { userId, type } = jwt.verify(token, process.env.SUPER_PASSWORD);
    if (userId === 0) return { id: 0, username: 'admin', hospitals: [] };
    if (type === 'staff') {
      const request = db.newRequest();
      request.input('Id', db.sql.Int, userId);
      const { recordset } = await request.execute('sp_GetUserById');
      const user = recordset[0];  // TODO: a staff can belong to multiple companies and switch between them
      user.companyConnection = new sql.ConnectionPool({
        user: user.sqlUserName,
        password: user.sqlPassword,
        server: process.env.DB_SERVER, 
        database: user.dbName
      });
      await user.companyConnection.connect();
      return recordset[0];
    } else {
      const request = db.newRequest();
      request.input('guardianUId', db.sql.Int, userId);
      const { recordset } = await request.execute('sp_GuardianGetByGuardianUId');
      const user = recordset[0];
      user.companyConnection = new sql.ConnectionPool({
        user: user.sqlUserName,
        password: user.sqlPassword,
        server: process.env.DB_SERVER, 
        database: user.dbName
      });
      await user.companyConnection.connect();
      return recordset[0];
    }
  }
  return null;
};

export const getUserInfo = async user => {
  const request = db.newRequest(user);
  request.input('uId', db.sql.Int, user.UserId);
  const { recordset: [userInfo] } = await request.execute('sp_Login');
  return userInfo;
}

export const getPrId = async user => {
  const { prID } = await getUserInfo(user);
  return prID;
};

export const getView = ({ rows, columns }) => {
  const view = rows.map(row => {
    const rowView = {};
    columns.forEach((column, index) => {
      rowView[column.name] = row[index];
    });
    return rowView;
  });
  return view;
};

export const calulateUnits15MinRule = (end, start) => {
  const duration = moment.duration(moment(end).diff(moment(start)));
  return Math.round(duration.asHours() * 4) / 4;
};
