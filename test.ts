import solves from "./verified-captcha.json" with { type: "json" };
import { getResult } from './utils/result.js';
import makeFetchCookie from "fetch-cookie";
import { populateSession } from './utils/req.js';

const fetchWithCookie = makeFetchCookie(fetch);
await populateSession(fetchWithCookie);

for (let i = 1; i <= 100; i++) {
    const res = await getResult('ssc', 'jessore', 2025, 617381, 2213489227, ({ md5 }) => {
        return solves[md5 as keyof typeof solves] || null;
    }, fetchWithCookie);
    console.log(i, 'PASSED', i === 1 ? JSON.stringify(res, null, 2) : '');
}
