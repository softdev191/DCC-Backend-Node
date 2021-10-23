import db from '../db';

export default [
  {
    key: 'payPeriods',
    prototype: ': [PayPeriod]',
    run: async ({}, { user }) => {
      const request = db.newRequest(user);
      const { recordset } = await request.execute('sp_GetPayPeriodsOnly');
      return recordset.map(({ s, e, ppID }) => ({ startDate: s, endDate: e, ppID }));
    }
  }
];
