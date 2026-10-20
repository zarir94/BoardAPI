
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

export function isBoardValid(b: string): b is Board {
    return BOARDS.includes(b as any);
}

export function isExamValid(e: string): e is Exam {
    return EXAMS.includes(e as any);
}

