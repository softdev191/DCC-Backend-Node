export default `
  type Client {
    firstName: String
    lastName: String
    clientId: Int
    services: [Service]
    locations: [ClientLocation]
    designees: [Designee]
  }
  type ClientLocation {
    id: Int
    locationTypeId: Int
    address1: String
    address2: String
    city: String
    state: String
    zip: String
    lat: Float
    lon: Float
    radius: Int
  }
`;
