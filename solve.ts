import { readdir, readFile } from "node:fs/promises";
import { JSONFilePreset } from 'lowdb/node';
import { join } from "node:path";
import pMap from "p-map";
import { init } from "@heyputer/puter.js/src/init.cjs";

const db = await JSONFilePreset('solved-captcha.json', {} as Record<string, number | null>);

const KEYS: {
    'gen-ai': string[],
    groq: string[],
    cloudflare: {
        id: string;
        token: string;
    }[],
    puter: string[]
} = JSON.parse(await readFile('ai-keys.json', { encoding: 'utf8' }));
const models = {
    'gen-ai': [
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
    ],
    groq: [
        'qwen/qwen3.8-27b'
    ]
};

const SYSTEM_PROMPT = `
You are an automated CAPTCHA solving engine. Your sole task is to extract and return the exact 4-digit number from the provided image.

Rules:
1. If the CAPTCHA is successfully solved, output ONLY the 4-digit number as plain text. No extra words, no punctuation, no markdown formatting, and no explanation.
2. If the CAPTCHA cannot be read, solved, or is invalid, output ONLY the exact word: null. No extra text or formatting.
`.trim();
const USER_PROMPT = "Solve the attached CAPTCHA image and return the result according to the system instructions.";

function pick<T>(arr: T[]) {
    if (arr.length === 0) throw new Error("Empty Array! Cannot pick.");
    return arr[Math.floor(Math.random() * arr.length)]!;
}

async function solveCaptchaWithGroq(filePath: string) {
    const base64ImageFile = await readFile(filePath, { encoding: 'base64' });
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + pick(KEYS['groq']),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: pick(models['groq']),
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: [
                        { type: "text", text: USER_PROMPT },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/${filePath.split('.').at(-1) || 'jpeg'};base64,${base64ImageFile}`
                            }
                        }
                    ]
                },
            ]
        })
    })
    if (!r.ok) {
        if (r.status === 429) {
            console.warn('Groq: Rate Limit! Returning null...');
            return null;
        }
        if (r.status === 503) {
            console.warn('Groq: Service Unavailable! Returning null...');
            return null;
        }
        throw new Error(`Groq: Invalid Response (${r.status}): ${await r.text()}`);
    };
    const d = await r.json();
    const solve = parseInt(d.choices[0].message.content) || null;
    return solve;
}

async function solveCaptchaWithCloudflare(filePath: string) {
    const base64ImageFile = await readFile(filePath, { encoding: 'base64' });
    const { id, token } = pick(KEYS.cloudflare);
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${id}/ai/run/@cf/qwen/qwen3.8-27b`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: [
                        { type: "text", text: USER_PROMPT },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/${filePath.split('.').at(-1) || 'jpeg'};base64,${base64ImageFile}`
                            }
                        }
                    ]
                },
            ]
        })
    })
    if (!r.ok) {
        if (r.status === 429) {
            console.warn('Cloudflare: Rate Limit! Returning null...');
            return null;
        }
        if (r.status === 503) {
            console.warn('Cloudflare: Service Unavailable! Returning null...');
            return null;
        }
        throw new Error(`Cloudflare: Invalid Response (${r.status}): ${await r.text()}`);
    };
    const d = await r.json();
    const solve = parseInt(d.result.choices[0].message.content) || null;
    return solve;
}

async function solveCaptchaWithGenAI(filePath: string) {
    const base64ImageFile = await readFile(filePath, { encoding: 'base64' });
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: 'POST',
        headers: {
            'x-goog-api-key': pick(KEYS["gen-ai"]),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: pick(models["gen-ai"]),
            system_instruction: SYSTEM_PROMPT,
            input: [
                { type: "text", text: USER_PROMPT },
                {
                    type: "image",
                    data: base64ImageFile,
                    mime_type: "image/" + (filePath.split('.').at(-1) || 'jpeg')
                }
            ]
        })
    })
    if (!r.ok) {
        if (r.status === 429) {
            console.warn('GenAI: Rate Limit! Returning null...');
            return null;
        }
        if (r.status === 503) {
            console.warn('GenAI: Service Unavailable! Returning null...');
            return null;
        }
        throw new Error(`GenAI: Invalid Response (${r.status}): ${await r.text()}`);
    };
    const d = await r.json();
    const solve = parseInt(d.steps.at(-1).content.at(-1).text) || null;
    return solve;
}

async function solveCaptchaWithPuter(filePath: string) {
    const base64ImageFile = await readFile(filePath, { encoding: 'base64' });
    const puter = init(pick(KEYS.puter));
    const resp = await puter.ai.chat([
        { role: 'system', content: SYSTEM_PROMPT },
        {
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:image/${filePath.split('.').at(-1) || 'jpeg'};base64,${base64ImageFile}`
                    }
                },
                { type: 'text', text: USER_PROMPT },
            ]
        }
    ], {
        model: 'google/gemini-3.1-flash-lite',
    });
    const solve = parseInt(resp.message?.content.toString() || '') || null;
    return solve;
}

async function tryAll() {
    const files = await readdir('output');
    const getMD5 = (n: string) => n.split('.')[0]!;
    const isEligible = (md5: string) => !(md5 in db.data && db.data[md5]);
    let count = 0;
    await pMap(files, async (fileName) => {
        const md5 = getMD5(fileName);
        if (!isEligible(md5)) {
            count++;
            return;
        }
        const solve = await (pick([
            solveCaptchaWithGenAI,
            solveCaptchaWithGroq,
            solveCaptchaWithCloudflare,
            // solveCaptchaWithPuter,
        ]))(join('output', fileName));
        db.data[md5] = solve;
        console.log(++count, fileName, solve);
        await db.write();
    },{ concurrency: 3 });
}

if (import.meta.main) {
    while (1) {
        await tryAll().catch(console.error);
        await new Promise(r => setTimeout(r, 1000));
    }
    // 8499
    // console.log(await solveCaptchaWithPuter('output/002966b6866e7ceab56d081bf00a0a69.jpeg'))
}
