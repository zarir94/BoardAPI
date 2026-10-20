import type { FetchCookieImpl } from "fetch-cookie";
import crypto from "node:crypto";
import UserAgent from 'user-agents';

export type FC = FetchCookieImpl<string | URL | Request, RequestInit, Response>;

export function randomUA() {
  return new UserAgent().toString();
}

export async function populateSession(
  fetchWithCookie: FC,
  response_text?: string
) {
  const html = response_text ? response_text : await (() =>
    fetchWithCookie("https://eboardresults.com/_challenge-engine", {
      headers: { 'User-Agent': randomUA() }
    }).then(r => r.text())
  )();
  if (!html.includes('verification')) throw new Error("The HTML is not of verification");
  const regex = /(?:var|let|const)\s+challenge\s*=\s*(\{[\s\S]*?\})\s*;/;
  const match = html.match(regex);
  if (!match || !match[1]) throw new Error("Challenge not found!");
  
  const challenge: {
    type: string;
    seed: number;
    salt: string;
    token: string;
  } = JSON.parse(match[1]);
  const hash = crypto.hash('sha256', 'browser-proof:' + challenge.seed + ':' + challenge.salt);

  const r = await fetchWithCookie('https://eboardresults.com/_challenge-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': randomUA() },
    body: JSON.stringify({ token: challenge.token, answer: 'hash:' + hash })
  });
  if (!r.ok) throw new Error(`Cannot verify challenge. Response (${r.status}): ${await r.text()}`);
  const d = await r.json();
  if (!d ||! d.ok) throw new Error(`Server couldnt verify. Data: ${d}`);
  return fetchWithCookie.cookieJar.getCookieString('https://eboardresults.com/');
}

export async function getCaptcha(fetchWithCookie: FC) {
  const r = await fetchWithCookie("https://eboardresults.com/v2/captcha", {
    headers: { 'User-Agent': randomUA() }
  });

  if (!r.ok) throw new Error(`Failed to fetch captcha: ${r.status} - ${await r.text()}`);
  if (r.headers.get('Content-Type')?.includes('text/html')) {
    await populateSession(fetchWithCookie, await r.text());
    return await getCaptcha(fetchWithCookie);
  }

  const buffer = Buffer.from(await r.arrayBuffer());
  const md5 = crypto.hash('md5', buffer);
  return { buffer, md5 };
}

