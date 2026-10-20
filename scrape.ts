import { access, constants, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import makeFetchCookie from "fetch-cookie";
import { getCaptcha } from "./utils/req.js";

const fetchWithCookie = makeFetchCookie(fetch);

async function fileExists(filePath: string) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function downloadCaptcha() {
  const { buffer, md5 } = await getCaptcha(fetchWithCookie);
  const fileName = `${md5}.jpeg`;
  const filePath = join("output", fileName);

  if (await fileExists(filePath)) {
    return await downloadCaptcha();
  }
  
  await writeFile(filePath, buffer);

  return {
    fileName, md5,
    size: buffer.length,
  };
}

if (import.meta.main) {
  await mkdir('output', { recursive: true });
  let count = 0;
  while (true) {
    await downloadCaptcha();
    console.log(`${++count} images downloaded.`);
  }
}
