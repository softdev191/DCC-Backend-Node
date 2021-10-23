import jwt from 'jsonwebtoken';

import db from '../db';
import { getUser, renameProperties } from '../utils';

export default [
  {
    key: 'loginGuardian',
    prototype: '(userName: String, password: String): GuardianAuthPayload',
    mutation: true,
    run: async ({ userName, password }) => {
      if (!userName || !password) {
        return {
          error: 'Empty userName or password'
        }
      }
      const request = db.newRequest();
      request.input('userName', db.sql.VarChar(100), userName);
      request.input('password', db.sql.VarChar(50), password);
      const { recordset } = await request.execute('sp_APIGuardianLogin');
      if (!recordset || !recordset.length) {
        return {
          error: 'Invalid Username or Password'
        }
      }
      const user = recordset[0];
      return {
        error: null,
        token: jwt.sign({ userId: user.guardianUId, type: 'guardian' }, process.env.SUPER_PASSWORD),
        user: renameProperties(user, {
          City: 'city',
          PostalCode: 'postalCode'
        })
      }
    }
  },
  {
    key: 'loginStaff',
    prototype: '(userName: String, password: String): StaffAuthPayload',
    mutation: true,
    run: async ({ userName, password }) => {
      if (!userName || !password) {
        return {
          error: 'Empty userName or password'
        }
      }
      const request = db.newRequest();
      request.input('userName', db.sql.VarChar(100), userName);
      request.input('password', db.sql.VarChar(50), password);
      const { recordset } = await request.execute('sp_APILogin');
      if (!recordset || !recordset.length) {
        return {
          error: 'Invalid Username or Password'
        }
      }
      const user = recordset[0];
      const token = jwt.sign({ userId: user.uid, type: 'staff' }, process.env.SUPER_PASSWORD);
      const { Timezone: timezone } = await getUser(token);
      return {
        error: null,
        token,
        user,
        timezone
      }
    }
  }
];
