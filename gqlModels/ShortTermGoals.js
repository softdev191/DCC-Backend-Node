export default `
  type ShortTermGoal {
    goalId: Int

    goalIndex: String
    step: Int
    shortTermGoal: String
    teachingMethod: String
    goalStatus: String
    frequencyId: String
    frequency: String
    progress: String
    score: String

    trialPct: String
    completedDt: String
    recommendation: String

    therapyScores: [TherapyScore]
  }

  type TherapyScore {
    date: String
    score: String
  }

  input ShortTermGoalInput {
    goalId: Int
    score: String
    trialPct: String
  }
`;
