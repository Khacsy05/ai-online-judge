export interface ClassroomItem {
    id: string;
    code: string;
    name: string;
    createdAt: string;
    _count?: {
        members: number;
        assignments: number;
    };
}

export interface LeaderboardStudent {
    rank: number;
    userId: string;
    fullName: string;
    studentCode: string;
    totalScore: number;
    maxScore: number;
    solvedCount: number;
    totalAssignments: number;
    progressPercentage: number;
    assignmentScores: Record<string, number>;
}

export interface LeaderboardResponse {
    classroomId: string;
    classroomCode: string;
    classroomName: string;
    totalAssignments: number;
    maxClassScore: number;
    studentCount: number;
    leaderboard: LeaderboardStudent[];
}

export interface ClassQueryDto {
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
}
