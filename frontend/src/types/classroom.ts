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
    email: string;
    totalScore: number;
    maxClassScore: number;
    progressPercentage: number;
    solvedCount: number;
    scores: Record<string, number>;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface LeaderboardResponse {
    classroomId: string;
    classroomCode: string;
    classroomName: string;
    totalAssignments: number;
    maxClassScore: number;
    studentCount: number;
    leaderboard: LeaderboardStudent[];
    meta: PaginationMeta;
}

export interface ClassQueryDto {
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
}
