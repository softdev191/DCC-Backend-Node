// TODO: GuardianNote & ClientNote are confusing. Consider merging.

export default `
  type GuardianNote {
    sessionId: Int!
    svcDate: String
    inTime: String
    outTime: String
    serviceName: String
    approvedNote: Boolean
    guardianId: Int
    providerName: String
    noteType: String
  }

  type ClientNote {
    coId: String
    docType: String
    startUTC: Int
    signee: String
    signeeCredentials: String
    verification: Boolean
    longTermObjectives: [LongTermObjective]
    scoring: [Scoring]
    careAreas: [CareArea]
    supervisorPresent: Boolean
    rejected: Boolean
    rejectedReason: String

    clientId: Int
    serviceId: Int
    clientServiceId: Int
    providerId: Int
    providerName: String
    clientName: String
    svc: String
    note: String
    msg: String
    dt: String
    docId: Int
    teletherapy: Boolean
    noShow: Boolean
    completed: Boolean
    clientRefusedService: Boolean
    designeeUnableToSign: Boolean
    designeeRefusedToSign: Boolean
    unsafeToWork: Boolean
    guardianId: Int
    designeeId: Int
    designeeLat: Float
    designeeLon: Float
    designeeLocationId: Int
    designeeLocationTypeId: Int
    hasAttachment: Boolean
    attachmentName: String
    extension: String
    startLat: Float
    startLon: Float
    endLat: Float
    endLon: Float
    clientLocationId: Int
    locationTypeId: Int
    utcIn: Float
    utcOut: Float
    adjUtcIn: Float
    adjUtcOut: Float
  }
  input ClientNoteInput {
    providerId: Int
    noShow: Boolean
    supervisorPresent: Boolean
    teletherapy: Boolean
    completed: Boolean
    clientRefusedService: Boolean
    designeeUnableToSign: Boolean
    designeeRefusedToSign: Boolean
    unsafeToWork: Boolean
    guardianId: Int
    designeeId: Int
    designeeLat: Float
    designeeLon: Float
    designeeLocationId: Int
    designeeLocationTypeId: Int
    hasAttachment: Boolean
    attachmentName: String
    extension: String
    note: String
    adjutcIn: Int
    adjutcOut: Int
    longTermObjectives: [LongTermObjectiveInput]
    careAreas: [CareAreaInput]
  }
`;
