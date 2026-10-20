import type { Board, Exam } from "./enum.js";
import { parse_stud_result } from "./parse.js";
import { getCaptcha, populateSession, randomUA, type FC } from "./req.js";
import makeFetchCookie from "fetch-cookie";

export async function getResult(
    exam: Exam,
    board: Board,
    year: number,
    roll: number,
    reg: number,
    getCaptchaSolve: (captcha: Awaited<ReturnType<typeof getCaptcha>>) => number | null | Promise<number | null>,
    fetchWithCookie?: FC,
    maxCaptchaRetry = 50
) {
    if (!fetchWithCookie) {
        fetchWithCookie = makeFetchCookie(fetch);
        await populateSession(fetchWithCookie);
    }
    let answer: number | null = null;
    let tries = 0;
    while (!answer) {
        answer = await getCaptchaSolve(await getCaptcha(fetchWithCookie));
        tries++;
        if (tries >= maxCaptchaRetry) {
            throw new Error("Max Retries exceeded. Cannot solve captcha.");
        }
    }
    const r = await fetchWithCookie('https://eboardresults.com/v2/getres', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': randomUA(),
            'Referer': 'https://eboardresults.com/v2/home',
            'Origin': 'https://eboardresults.com'
        },
        body: new URLSearchParams({
            board, exam, year, roll, reg,
            result_type: 1,
            captcha: answer,
        } as any).toString()
    });
    if (!r.ok) throw new Error(`Invalid Response (${r.status}): ${await r.text()}`);
    const d = await r.json();
    if (d.status !== 0) throw new Error(d.msg || `Invalid Status: ${d.status} | ${JSON.stringify(d)}`);
    d.res.regno = reg.toString();
    return {
        original_response: d,
        ...parse_stud_result(d, exam, year)
    };
}
