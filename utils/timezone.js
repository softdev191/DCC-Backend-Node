import moment from 'moment-timezone';

const timezones = {
  'US/Arizona': 'America/Denver',
  'US/Mountain': 'America/Denver',
  'US/Hawaii': 'Pacific/Honolulu',
  'US/Pacific': 'America/Los_Angeles',
  'US/Eastern': 'America/New_York',
  'US/Central': 'America/Chicago'
};

export const getDateTime = (timestamp, timezone) => {
  const time = moment.tz(timestamp, timezones[timezone]);
  return time;
};

export const getDayStart = (timestamp, timezone) => {
  const time = getDateTime(timestamp, timezone);
  return time
    .hour(0)
    .minute(0)
    .second(0)
    .toDate();
};

