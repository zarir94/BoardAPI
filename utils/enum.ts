
export const BOARDS = [
    "barisal",
    "chittagong",
    "comilla",
    "dhaka",
    "dinajpur",
    "jessore",
    "madrasah",
    "mymensingh",
    "rajshahi",
    "sylhet",
    "tec" // Technical
] as const;

export const EXAMS = [
    "jsc",
    "ssc",
    "hsc",
    "dibs"
] as const;

export type Board = typeof BOARDS[number];
export type Exam = typeof EXAMS[number];

/*
YEAR: 1996 -> now
ROLL: usually 6 digit number
REG No: usually 10 digit number
*/

export function isBoardValid(b: any): b is Board {
    return BOARDS.includes(b as any);
}

export function isExamValid(e: any): e is Exam {
    return EXAMS.includes(e as any);
}

interface ValidQuery {
    exam: Exam;
    board: Board;
    year: number;
    roll: number;
    reg: number;
    maxCaptchaRetry?: number;
}

export function isQueryValid(data: Record<string, any>): data is ValidQuery {
    return Boolean(
        isExamValid(data.exam) && isBoardValid(data.board) && Number(data.year) &&
        Number(data.roll) && Number(data.reg) && (!data.maxCaptchaRetry || Number(data.maxCaptchaRetry))
    );
}
