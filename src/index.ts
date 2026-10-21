import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { isBoardValid, isExamValid, isQueryValid } from '../utils/enum.js';
import solves from "../verified-captcha.json" with { type: "json" };
import { getInstitutions, getResult } from '../utils/query.js';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/api/*', cors());

app.on(['GET', 'POST'], '/api/get-result', async (c) => {
    const method = c.req.method;
    let data: Record<string, any> = {};

    if (method === 'GET') {
        data = c.req.query();
    } else if (method === 'POST') {
        const contentType = c.req.header('content-type') || '';

        if (contentType.includes('application/json')) {
            data = await c.req.json().catch(() => ({}));
        } else if (
            contentType.includes('application/x-www-form-urlencoded') ||
            contentType.includes('multipart/form-data')
        ) {
            data = await c.req.parseBody();
        } else {
            data = await c.req.json().catch(() => ({}));
        }
    }

    if (!isQueryValid(data)) {
        return c.json({ success: false, msg: 'Invalid or Incomplete Data' });
    }

    let mcr = Number(data.maxCaptchaRetry) || undefined;
    if (mcr) mcr = Math.max(10, Math.min(mcr, 500));
    const { original_response, ...res } = await getResult(data.exam, data.board, Number(data.year), Number(data.roll), Number(data.reg), ({ md5 }) => solves[md5 as keyof typeof solves] || null, undefined, mcr);
    
    return c.json({ success: true, data: res, original_response });
});

app.get('/api/get-institutions', async (c) => {
    const { board, exam, year, type } = c.req.query();
    if (!isBoardValid(board) || !isExamValid(exam))
        return c.json({ success: false, msg: 'Invalid value for board or exam', data: null });
    if (Number(year)) {
        const data = await getInstitutions(exam, board, Number(year), type === 'flat' ? 'flat' : 'nested');
        return c.json({ success: true, data });
    }
    const currentYear = new Date().getUTCFullYear();
    for (let i = 0; i < 11; i++) {
        const data = await getInstitutions(exam, board, currentYear - i, type === 'flat' ? 'flat' : 'nested');
        if (data) return c.json({ success: true, data });
    }
    return c.json({ success: false, msg: 'Automatic Year Selection failed. Please provide a year.', data: null });
});

app.use('/', serveStatic({ path: './static/index.html' }));
app.use('/*', serveStatic({ root: './static' }));

const port = 3000;
console.log(`Server running at http://localhost:${port}`);

serve({
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0'
});
