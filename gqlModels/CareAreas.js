export default `
  type CareArea {
    careId: Int
    clsvId: Int
    serviceId: Int
    clsvidId: Int
    careArea: String
    careAreaId: String
    score: String
    lastDate: String
  }

  input CareAreaInput {
    careId: Int
    careArea: String
    score: String
  }
`;
