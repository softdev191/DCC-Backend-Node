export default `
  input SessionInput {
    ids: [Int]
    clientIds: [Int]
    serviceId: Int
    lat: Float
    lon: Float
    clientLocationId: Int
    locationTypeId: Int
    timestamp: Int
    isManual: Boolean
  }
  type Session {
    id: Int
    clientServiceId: Int
    prId: Int
    isTherapy: Boolean
  }
`;
