import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { JSONFilePreset } from 'lowdb/node';
import { getResult } from './utils/query.js';
import makeFetchCookie from "fetch-cookie";
import { populateSession } from './utils/req.js';

const rl = readline.createInterface({ input, output });
const solvedDB = await JSONFilePreset('solved-captcha.json', {} as Record<string, number | null>);
const verifiedDB = await JSONFilePreset('verified-captcha.json', {} as Record<string, number | null>);
const ASK_INVALID = !true; // a little cfg
const INVALIDS: string[] = [];

function calculateRemaining() {
    return Object.keys(solvedDB.data)
    .filter(md5 => !(md5 in verifiedDB.data) && !INVALIDS.includes(md5) && solvedDB.data[md5]).length;
}

async function askCaptcha(filePath: string, prev?: number | null) {
    console.clear();
    spawnSync('chafa', [filePath], { stdio: 'inherit' });
    const solve = parseInt(await rl.question(`Captcha (${prev}): `)) || null;
    if (!solve) return askCaptcha(filePath);
    return solve;
}

async function main() {
    const fetchWithCookie = makeFetchCookie(fetch);
    await populateSession(fetchWithCookie);
    while (Object.keys(verifiedDB.data).length !== Object.keys(solvedDB.data).length) {
        let last: { md5: string, answer: number } = null!;
        const middleware = (fn: Parameters<typeof getResult>[5]) => (
            async (captcha: Parameters<typeof fn>[0]) => {
                const answer = await fn(captcha);
                last = { md5: captcha.md5, answer: answer! };
                return answer;
            }
        );
        try {
            await getResult('ssc', 'jessore', 2025, 617381, 2213489227, middleware(async ({ md5 }) => {
                if (md5 in verifiedDB.data) return null;
                if (INVALIDS.includes(md5)) return null;
                if (md5 in solvedDB.data && solvedDB.data[md5]) return Number(solvedDB.data[md5]);
                if (ASK_INVALID) return await askCaptcha(join('output', `${md5}.jpeg`));
                return null;
            }), fetchWithCookie, 100_000);
            verifiedDB.data[last.md5] = last.answer;
            await verifiedDB.write();
            console.log(last.md5, last.answer, 'VERIFIED', 'Remaining:', calculateRemaining());
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('CAPTCHA')) {
                if (ASK_INVALID) {
                    solvedDB.data[last.md5] = await askCaptcha(join('output', `${last.md5}.jpeg`), last.answer);
                    await solvedDB.write();
                } else {
                    console.log(last.md5, msg, 'Remaining:', calculateRemaining());
                    INVALIDS.push(last.md5);
                    // Extra: Set null to run AI qgain
                    // solvedDB.data[last.md5] = null;
                    // await solvedDB.write();
                }
            } else {
                console.error(err);
            }
        }
    }
    console.log('All Done!');
}

while (1) {
    try {
        if (ASK_INVALID) {
            await main();
        } else {
            await Promise.all(Array.from({ length: 5 }).map(() => main()));
        }
        break;
    } catch (err) {
        console.error(err);
    }
}
rl.close();
