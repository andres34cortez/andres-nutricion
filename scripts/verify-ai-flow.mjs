import { deflateSync } from "node:zlib";

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const identifier = "admin";
const password = "admin";

const cookies = new Map();
function absorbCookies(response) {
  for (const raw of response.headers.getSetCookie()) {
    const [pair] = raw.split(";", 1);
    const separator = pair.indexOf("=");
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}
function cookieHeader() {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}

const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
absorbCookies(csrfResponse);
const { csrfToken } = await csrfResponse.json();

const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
  method: "POST",
  redirect: "manual",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    cookie: cookieHeader(),
  },
  body: new URLSearchParams({ csrfToken, identifier, password, callbackUrl: baseUrl }),
});
absorbCookies(loginResponse);

const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
  headers: { cookie: cookieHeader() },
});
const session = await sessionResponse.json();
if (!session?.user?.id) throw new Error(`No se pudo iniciar sesión (HTTP ${loginResponse.status}).`);
console.log("✓ autenticación y sesión");

const image = createMealPng();
let aiResponse;
let result;
for (let attempt = 1; attempt <= 4; attempt += 1) {
  const form = new FormData();
  form.append("image", new File([image], "plato-prueba.png", { type: "image/png" }));
  aiResponse = await fetch(`${baseUrl}/api/ai/food`, {
    method: "POST",
    headers: { cookie: cookieHeader() },
    body: form,
  });
  result = await aiResponse.json();
  if (aiResponse.ok || aiResponse.status !== 503 || attempt === 4) break;
  console.log(`↻ Gemini no disponible temporalmente; reintento ${attempt}/3`);
  await new Promise((resolve) => setTimeout(resolve, 3_000));
}
if (!aiResponse.ok) throw new Error(`Gemini respondió HTTP ${aiResponse.status}: ${result.error ?? "error desconocido"}`);
if (!Array.isArray(result.foods) || result.foods.length === 0) throw new Error("Gemini no devolvió alimentos estructurados.");
if (!Array.isArray(result.questions) || !Array.isArray(result.warnings)) throw new Error("La respuesta de Gemini no coincide con el esquema esperado.");

console.log(`✓ Gemini detectó ${result.foods.length} alimento(s): ${result.foods.map((food) => food.name).join(", ")}`);
console.log("✓ imagen generada y procesada únicamente en memoria");

function createMealPng() {
  const width = 384;
  const height = 384;
  const pixels = Buffer.alloc(width * height * 4, 255);
  const paint = (x, y, color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (y * width + x) * 4;
    pixels.set([...color, 255], offset);
  };
  const circle = (centerX, centerY, radius, color) => {
    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        if ((x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2) paint(x, y, color);
      }
    }
  };
  const rectangle = (left, top, right, bottom, color) => {
    for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) paint(x, y, color);
  };

  rectangle(0, 0, width, height, [229, 231, 235]);
  circle(192, 192, 160, [245, 245, 240]);
  circle(192, 192, 145, [255, 255, 252]);
  circle(130, 192, 68, [238, 190, 71]);
  rectangle(205, 128, 310, 230, [160, 82, 45]);
  rectangle(215, 138, 300, 220, [205, 126, 68]);
  for (const [x, y] of [[235, 270], [270, 264], [300, 280], [258, 300]]) {
    circle(x, y, 25, [39, 125, 69]);
    rectangle(x - 5, y + 15, x + 6, y + 45, [79, 108, 54]);
  }

  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) pixels.copy(scanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([signature, pngChunk("IHDR", header), pngChunk("IDAT", deflateSync(scanlines)), pngChunk("IEND", Buffer.alloc(0))]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
