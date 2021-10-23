export default `
  type LongTermObjective {
    objectiveId: Int
    objIndex: String
    longTermVision: String
    longTermGoal: String
    goalAreaId: Int
    goalAreaName: String
    objectiveStatus: String

    completedDt: String
    changes: String
    shortTermGoals: [ShortTermGoal]
  }

  input LongTermObjectiveInput {
    objectiveId: Int
    shortTermGoals: [ShortTermGoalInput]
  }
`;
