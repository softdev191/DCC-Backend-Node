export default `
  type GuardianAuthPayload {
    error: String
    token: String
    user: GuardianUser
  }
  type StaffAuthPayload {
    error: String
    token: String
    user: StaffUser
    timezone: String
  }
`;
