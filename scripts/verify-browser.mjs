import { chromium, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const db = new PrismaClient();
const base = "http://localhost:3000";
const password = randomUUID();
const email = `browser-${randomUUID()}@example.invalid`;
const historyDate = "2026-09-26";
const localTimestamp = `${historyDate}T23:30`;
const storedTimestamp = "2026-09-27T02:30:00.000Z";
const screenshotDirectory = await mkdtemp(join(tmpdir(), "nutricion-browser-"));
const browserErrors = [];
const recordRequests = [];
let fixture;
let browser;
let page;

async function openEditor(label) {
  await page.getByRole("button", { name: "Agregar registro", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: label, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Fecha y hora/).fill(localTimestamp);
  return dialog;
}

async function saveEditor(name, method, status) {
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/records" && response.request().method() === method,
  );
  await page.getByRole("dialog").getByRole("button", { name, exact: true }).click();
  const response = await responsePromise;
  assert.equal(response.status(), status, `${method} /api/records must succeed`);
  const data = await response.json();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Registro guardado." })).toBeVisible();
  return data.id;
}

async function openHistory() {
  await page.getByRole("button", { name: "Historial", exact: true }).click();
  await page.getByLabel("Elegir fecha", { exact: true }).fill(historyDate);
  await expect(page.getByRole("heading", { name: historyDate, exact: true })).toBeVisible();
}

async function deleteRecord(button) {
  page.once("dialog", (dialog) => dialog.accept());
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/records" && response.request().method() === "DELETE",
  );
  await button.click();
  const response = await responsePromise;
  assert.equal(response.status(), 204, "DELETE /api/records must succeed");
}

try {
  fixture = await db.user.create({
    data: {
      name: "Prueba de navegador",
      email,
      passwordHash: await hash(password, 10),
      profile: {
        create: {
          timezone: "America/Argentina/San_Juan",
          birthDate: new Date("1996-01-01T12:00:00Z"),
          heightCm: 178,
          onboardingCompletedAt: new Date(),
        },
      },
      goals: { create: { calories: 2400, protein: 180, carbs: 251, fat: 75, validFrom: new Date("2026-01-01T00:00:00Z") } },
    },
  });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "es-AR",
    timezoneId: "America/Argentina/San_Juan",
  });
  page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === "/api/records") {
      recordRequests.push(`${response.request().method()} ${response.status()}`);
    }
  });

  await page.goto(base + "/sign-in");
  await page.getByLabel("Usuario o email", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hoy", exact: true })).toBeVisible();
  assert.equal(new URL(page.url()).pathname, "/", "Fixture should login without onboarding redirect");

  const mealName = "Arroz prueba móvil";
  let editor = await openEditor("Agregar comida manual");
  await editor.getByLabel(/^Comida/).selectOption("Cena");
  await editor.getByLabel("Nombre", { exact: true }).fill(mealName);
  await editor.getByLabel("Cantidad", { exact: true }).fill("100");
  await editor.getByLabel("Calorías", { exact: true }).fill("130");
  await editor.getByLabel("Proteína (g)", { exact: true }).fill("3");
  await editor.getByLabel("Carbos (g)", { exact: true }).fill("28");
  await editor.getByLabel("Grasas (g)", { exact: true }).fill("1");
  const mealId = await saveEditor("Guardar comida", "POST", 201);
  await openHistory();
  let mealRow = page.getByRole("article").filter({ has: page.getByText(mealName, { exact: true }) });
  await expect(mealRow).toContainText("100 g · 3 g proteína");
  await expect(mealRow).toContainText(/23:30|11:30 p\.\s*m\./);
  let storedMeal = await db.meal.findUniqueOrThrow({ where: { id: mealId }, include: { items: true } });
  assert.equal(storedMeal.userId, fixture.id);
  assert.equal(storedMeal.eatenAt.toISOString(), storedTimestamp);
  assert.equal(storedMeal.items[0].calories, 130);

  await page.getByRole("button", { name: `Editar ${mealName}`, exact: true }).click();
  editor = page.getByRole("dialog");
  await editor.getByLabel("Cantidad", { exact: true }).fill("200");
  await expect(editor.getByLabel("Calorías", { exact: true })).toHaveValue("260");
  await expect(editor.getByLabel("Proteína (g)", { exact: true })).toHaveValue("6");
  await expect(editor.getByLabel("Carbos (g)", { exact: true })).toHaveValue("56");
  await expect(editor.getByLabel("Grasas (g)", { exact: true })).toHaveValue("2");
  assert.equal(await saveEditor("Guardar comida", "PUT", 200), mealId);

  editor = await openEditor("Registrar peso");
  await editor.getByLabel("Peso actual", { exact: true }).fill("80.5");
  const weightId = await saveEditor("Guardar peso", "POST", 201);
  await expect(page.getByRole("article").filter({ hasText: "80.5 kg" })).toBeVisible();
  await page.getByRole("button", { name: "Editar peso", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Peso actual", { exact: true }).fill("80.2");
  assert.equal(await saveEditor("Guardar peso", "PUT", 200), weightId);

  editor = await openEditor("Registrar actividad");
  await editor.getByLabel(/^Tipo/).selectOption("Caminata");
  await editor.getByLabel("Duración (min)", { exact: true }).fill("45");
  await editor.getByLabel("Distancia (km)", { exact: true }).fill("4.2");
  await editor.getByLabel("Pasos", { exact: true }).fill("6000");
  await editor.getByLabel("Detalle opcional", { exact: true }).fill("Actividad de prueba móvil");
  const activityId = await saveEditor("Guardar actividad", "POST", 201);
  let activityRow = page.getByRole("article").filter({ hasText: "Actividad de prueba móvil" });
  await expect(activityRow).toContainText("45 min");
  await activityRow.getByRole("button", { name: "Editar", exact: true }).click();
  editor = page.getByRole("dialog");
  await editor.getByLabel("Duración (min)", { exact: true }).fill("50");
  await editor.getByLabel("Distancia (km)", { exact: true }).fill("");
  await editor.getByLabel("Pasos", { exact: true }).fill("");
  assert.equal(await saveEditor("Guardar actividad", "PUT", 200), activityId);

  await page.reload();
  await openHistory();
  mealRow = page.getByRole("article").filter({ has: page.getByText(mealName, { exact: true }) });
  await expect(mealRow).toContainText("200 g · 6 g proteína");
  await expect(mealRow).toContainText(/23:30|11:30 p\.\s*m\./);
  await expect(page.getByRole("article").filter({ hasText: "80.2 kg" })).toBeVisible();
  activityRow = page.getByRole("article").filter({ hasText: "Actividad de prueba móvil" });
  await expect(activityRow).toContainText("50 min");
  storedMeal = await db.meal.findUniqueOrThrow({ where: { id: mealId }, include: { items: true } });
  assert.equal(storedMeal.items[0].quantity, 200);
  assert.equal(storedMeal.items[0].calories, 260);
  assert.equal(storedMeal.eatenAt.toISOString(), storedTimestamp);
  const storedWeight = await db.weightEntry.findUniqueOrThrow({ where: { id: weightId } });
  assert.equal(storedWeight.weightKg, 80.2);
  assert.equal(storedWeight.recordedAt.toISOString(), storedTimestamp);
  const storedActivity = await db.activity.findUniqueOrThrow({ where: { id: activityId } });
  assert.equal(storedActivity.durationMinutes, 50);
  assert.equal(storedActivity.occurredAt.toISOString(), storedTimestamp);
  assert.equal(storedActivity.distanceKm, null);
  assert.equal(storedActivity.steps, null);
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, content: document.documentElement.scrollWidth }));
  assert.equal(dimensions.width, 390, "Mobile viewport must be 390 CSS pixels wide");
  assert.ok(dimensions.content <= dimensions.width, `Mobile page must not overflow horizontally (${JSON.stringify(dimensions)})`);
  const historyScreenshot = join(screenshotDirectory, "mobile-history.png");
  await page.screenshot({ path: historyScreenshot, fullPage: true });
  console.log(`Screenshot: ${historyScreenshot}`);

  await deleteRecord(page.getByRole("button", { name: `Eliminar ${mealName}`, exact: true }));
  await expect(page.getByText(mealName, { exact: true })).toHaveCount(0);
  await deleteRecord(page.getByRole("button", { name: "Eliminar peso", exact: true }));
  await expect(page.getByText("80.2 kg", { exact: true })).toHaveCount(0);
  await deleteRecord(activityRow.getByRole("button", { name: "Eliminar", exact: true }));
  await expect(page.getByText("Actividad de prueba móvil", { exact: false })).toHaveCount(0);
  assert.equal(await db.meal.count({ where: { userId: fixture.id } }), 0);
  assert.equal(await db.weightEntry.count({ where: { userId: fixture.id } }), 0);
  assert.equal(await db.activity.count({ where: { userId: fixture.id } }), 0);
  assert.deepEqual(browserErrors, [], "Browser must not report uncaught application errors");
  assert.equal(recordRequests.length, 9, "Three complete create/edit/delete flows must reach the real API");
  console.log(`PASS: real mobile UI login, meal/weight/activity create-edit-reload-delete, proportional macros, Argentina time, Postgres persistence and no horizontal overflow. API evidence: ${recordRequests.join(", ")}.`);
} catch (error) {
  if (page && !page.isClosed()) {
    const failureScreenshot = join(screenshotDirectory, "failure.png");
    await page.screenshot({ path: failureScreenshot, fullPage: true }).catch(() => {});
    console.error(`Failure screenshot: ${failureScreenshot}`);
  }
  throw error;
} finally {
  try {
    await browser?.close();
  } finally {
    try {
      // Only delete the exact randomly generated fixture, never an existing user.
      if (fixture) await db.user.delete({ where: { id: fixture.id } });
    } finally {
      await db.$disconnect();
    }
  }
}
