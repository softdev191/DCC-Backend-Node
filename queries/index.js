import authQueries from './Auth';
import billingQueries from './Billing';
import clientsQueries from './Clients';
import notesQueries from './Notes';
import servicesQueries from './Services';
import sessionsQueries from './Sessions';

const allQueries = [
  ...authQueries,
  ...billingQueries,
  ...clientsQueries,
  ...notesQueries,
  ...servicesQueries,
  ...sessionsQueries
];

export const queries = allQueries
  .filter(({ mutation }) => !mutation)
  .map(({ key, prototype }) => `${key}${prototype}`)
  .join(",\n  ");

export const mutations = allQueries
  .filter(({ mutation }) => mutation)
  .map(({ key, prototype }) => `${key}${prototype}`)
  .join(",\n  ");

export const root = allQueries.reduce((cur, { key, run }) => ({ ...cur, [key]: run }), {});
