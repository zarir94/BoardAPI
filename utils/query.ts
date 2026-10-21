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
        ...parse_stud_result(d, exam, year),
        original_response: d,
    };
}

export async function getInstitutions(exam: Exam, board: Board, year: number, type: 'nested' | 'flat') {
    const fetchWithCookie = makeFetchCookie(fetch);
    await populateSession(fetchWithCookie);
    const r = await fetchWithCookie("https://eboardresults.com/v2/list?" + new URLSearchParams({
        id: 'btree',
        board, exam, year,
        type: 'tbl',
        cols: 'eiin,i_code,i_name,zilla,thana'
    } as any).toString(), {
        headers: {
            'Referer': `https://eboardresults.com/app/stud/btbl.html?board=${board}&exam=${exam}&year=${year}&url=/v2/list?id=btree`,
            'Origin': 'https://eboardresults.com',
            'User-Agent': randomUA(),
            'X-Requested-With': 'XMLHttpRequest',
        }
    });
    if (!r.ok) throw new Error(`Invalid Response (${r.status}): ${await r.text()}`);
    const { data } = await r.json();
    if (data.length === 0) return null;
    if (type == 'flat') {
        return data.map(([eiin, code, name, zilla, thana]: string[]) => ({
            eiin, code, name, zilla, thana
        })) as {
            eiin: string;
            code: string;
            name: string;
            zilla: string;
            thana: string;
        }[];
    } // else nested
    const all_zilla = [...new Set(data.map((i: string[]) => i[3]))] as string[];
    return Object.fromEntries(all_zilla.map(zilla => {
        const all_thana = [...new Set(data
            .filter((i: string[]) => i[3] === zilla)
            .map((i: string[]) => i[4]))] as string[];
        return [zilla, Object.fromEntries(all_thana.map(thana => {
            const institutions = data
            .filter((i: string[]) => i[3] === zilla && i[4] === thana)
            .map(([eiin, code, name]: string[]) => ({ eiin, code, name }));
            return [thana, institutions];
        }))];
    })) as Record<string, Record<string, {
        eiin: string;
        code: string;
        name: string;
    }[]>>;
}


if (import.meta.main) {
    console.log(await getInstitutions('jsc', 'jessore', 2018, 'flat'))
}
