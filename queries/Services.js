import _ from 'lodash';

import db from '../db';
import { getPrId } from '../utils';

export default [
  {
    key: 'servicesByClientIds',
    prototype: '(clientIds: [Int]): [Service]',
    run: async ({ clientIds }, { user }) => {
      if (!clientIds.length) return [];

      const prID = await getPrId(user);
      const request = db.newRequest(user);
      const { recordset } = await request.query(`
        SELECT CompS.name, CS.serviceId as id, C.clsvID as clientId
        FROM CLientStaffRelationships as CSR
        JOIN Clients AS C ON C.clsvID=CSR.clsvId AND C.deleted=0
        JOIN ClientServices AS CS ON CS.id=CSR.clsvidId AND CS.deleted=0
        JOIN CompanyServices AS CompS ON CompS.serviceId=CS.serviceId
        WHERE CSR.prid = ${prID} AND
              CSR.isActive <> 0 AND
              C.clsvID in (${clientIds.join(', ')})
        ORDER BY CompS.name
      `);
      const allServices = _.groupBy(recordset, 'id');
      const services = [];
      Object.keys(allServices).forEach(id => {
        const clientIdsById = _.uniq(allServices[id].map(({ clientId }) => clientId));
        if (_.xor(clientIdsById, clientIds).length === 0) {
          services.push(_.pick(allServices[id][0], ['id', 'name']));
        }
      })

      return services;
    }
  }
];
