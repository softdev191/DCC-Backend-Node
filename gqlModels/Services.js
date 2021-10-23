export default `
  type Auth2 {
    # Date the auth starts
    startDt: String
    # Date the auth ends
    endDt: String
    # remaining units on this authorization in .25 increments
    remainingHours: Float 
    # hours availabe per week
    weeklyHours: Float
    # Hour available for current day
    remainingDailyHours: Float
  }
  type Service {
    id: Int
    clientServiceId: Int
    isTherapy: Boolean
    isEvaluation: Boolean
    isHCBS: Boolean
    name: String
    shortName: String
    authorizations: [Auth2]
    # the note type required from the provider - will select either ATCNote,RSPNote or HAHNote
    noteType: String
    clientNote: ClientNote
  }
`;
