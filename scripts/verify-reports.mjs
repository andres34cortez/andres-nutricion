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
const email = `reports-${randomUUID()}@example.invalid`;
const screenshotDirectory = await mkdtemp(join(tmpdir(), "nutricion-reports-"));
const browserErrors = [];
const aiRequests = [];
let fixture;
let browser;
let page;

function meal(date, calories, protein, name, hour = "15:00:00") {
  return {
    category: "LUNCH",
    eatenAt: new Date(`${date}T${hour}Z`),
    items: {
      create: {
        name,
        quantity: 1,
        unit: "porción",
        calories,
        protein,
        carbs: 50,
        fat: 15,
        source: "MANUAL",
      },
    },
  };
}

async function selectPeriod(range, reference, start, end, previousStart, previousEnd) {
  await page.getByLabel("Período", { exact: true }).selectOption(range);
  await page.getByLabel("Fecha de referencia", { exact: true }).fill(reference);
  await expect(page.getByRole("heading", { name: "Período seleccionado", exact: true })).toBeVisible();
  await expect(page.getByText(`${start} — ${end}`, { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Período anterior", exact: true })).toContainText(`${previousStart} — ${previousEnd}`);
}

async function expectMetric(label, value) {
  await expect(page.getByRole("region", { name: label, exact: true }).locator("strong")).toHaveText(value);
}

async function assertMobileScreenshot(name) {
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, content: document.documentElement.scrollWidth }));
  assert.equal(dimensions.width, 390, "Viewport must remain mobile-sized");
  assert.ok(dimensions.content <= dimensions.width, `Reports must not overflow horizontally (${JSON.stringify(dimensions)})`);
  const path = join(screenshotDirectory, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`Screenshot: ${path}`);
}

async function historyDay(date) {
  await page.getByLabel("Elegir fecha", { exact: true }).fill(date);
  await expect(page.getByRole("heading", { name: date, exact: true })).toBeVisible();
}

try {
  fixture = await db.user.create({
    data: {
      name: "Prueba aislada de reportes",
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
      goals: {
        create: [
          { calories: 2000, protein: 150, carbs: 200, fat: 65, validFrom: new Date("2024-02-01T03:00:00Z"), validUntil: new Date("2024-03-01T03:00:00Z") },
          { calories: 2400, protein: 180, carbs: 251, fat: 75, validFrom: new Date("2024-03-01T03:00:00Z") },
        ],
      },
      meals: {
        create: [
          meal("2024-01-31", 600, 30, "Enero fuera del mes"),
          meal("2024-02-01", 1000, 100, "Febrero primer registro"),
          meal("2024-02-01", 500, 50, "Febrero segundo registro del mismo día", "20:00:00"),
          meal("2024-02-28", 1800, 90, "Febrero penúltimo día"),
          // 02:30 UTC on March 1 is still leap day, February 29, in Argentina.
          meal("2024-03-01", 2200, 110, "Última cena de febrero", "02:30:00"),
          meal("2024-03-01", 2600, 130, "Primer registro de marzo", "03:00:00"),
          meal("2024-03-03", 1400, 70, "Domingo dentro de semana"),
          meal("2024-03-04", 9000, 900, "Lunes fuera de semana"),
          meal("2024-04-01", 9999, 999, "Abril fuera del mes"),
        ],
      },
      weights: {
        create: [
          { recordedAt: new Date("2024-01-31T15:00:00Z"), weightKg: 82 },
          { recordedAt: new Date("2024-02-01T15:00:00Z"), weightKg: 81 },
          { recordedAt: new Date("2024-02-29T15:00:00Z"), weightKg: 80 },
          { recordedAt: new Date("2024-03-01T15:00:00Z"), weightKg: 79.5 },
          { recordedAt: new Date("2024-03-03T15:00:00Z"), weightKg: 79 },
          { recordedAt: new Date("2024-03-04T15:00:00Z"), weightKg: 85 },
        ],
      },
      activities: {
        create: [
          { occurredAt: new Date("2024-01-31T15:00:00Z"), type: "GYM", durationMinutes: 99 },
          { occurredAt: new Date("2024-02-01T15:00:00Z"), type: "GYM", durationMinutes: 40 },
          { occurredAt: new Date("2024-02-29T15:00:00Z"), type: "WALK", durationMinutes: 20 },
          { occurredAt: new Date("2024-03-01T15:00:00Z"), type: "CROSSFIT", durationMinutes: 50 },
          { occurredAt: new Date("2024-03-03T15:00:00Z"), type: "GYM", durationMinutes: 60 },
          { occurredAt: new Date("2024-03-04T15:00:00Z"), type: "GYM", durationMinutes: 999 },
        ],
      },
    },
  });
  assert.equal(await db.meal.count({ where: { userId: fixture.id } }), 9, "All synthetic records must exist in Postgres before login");
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
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/ai/")) aiRequests.push(request.url());
  });

  await page.goto(base + "/sign-in");
  await page.getByLabel("Usuario o email", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hoy", exact: true })).toBeVisible();
  assert.equal(new URL(page.url()).pathname, "/", "Fixture login must load persisted data without onboarding");
  await page.getByRole("button", { name: "Progreso", exact: true }).click();

  await selectPeriod("month", "2024-02-20", "2024-02-01", "2024-02-29", "2024-01-01", "2024-01-31");
  await expectMetric("Calorías promedio", /^(1\.833|1833)( kcal)?$/);
  await expectMetric("Proteína promedio", "117 g");
  await expectMetric("Cobertura", /3\s*\/\s*29 días/);
  await expectMetric("Entrenamientos", "1");
  await expectMetric("Minutos activos", /60( min)?/);
  await expectMetric("Cambio de peso", "-1 kg");
  const previous = page.getByRole("region", { name: "Período anterior", exact: true });
  await expect(previous).toContainText(/1\s*\/\s*31 días/);
  await expect(previous).toContainText(/600 kcal/);
  await assertMobileScreenshot("mobile-reports-leap-month");

  await selectPeriod("week", "2024-03-01", "2024-02-26", "2024-03-03", "2024-02-19", "2024-02-25");
  await expectMetric("Calorías promedio", /^(2\.000|2000)( kcal)?$/);
  await expectMetric("Proteína promedio", "100 g");
  await expectMetric("Cobertura", /4\s*\/\s*7 días/);
  await expectMetric("Entrenamientos", "2");
  await expectMetric("Minutos activos", /130( min)?/);
  await expectMetric("Cambio de peso", "-1 kg");
  await expect(previous).toContainText(/0\s*\/\s*7 días/);
  await expect(previous).toContainText("Sin datos");
  await assertMobileScreenshot("mobile-reports-calendar-week");

  await selectPeriod("7d", "2024-03-01", "2024-02-24", "2024-03-01", "2024-02-17", "2024-02-23");
  await expectMetric("Calorías promedio", /^(2\.200|2200)( kcal)?$/);
  await expectMetric("Proteína promedio", "110 g");
  await expectMetric("Cobertura", /3\s*\/\s*7 días/);

  await selectPeriod("30d", "2024-03-01", "2024-02-01", "2024-03-01", "2024-01-02", "2024-01-31");
  await expectMetric("Calorías promedio", /^(2\.025|2025)( kcal)?$/);
  await expectMetric("Proteína promedio", "120 g");
  await expectMetric("Cobertura", /4\s*\/\s*30 días/);

  await selectPeriod("month", "2024-03-20", "2024-03-01", "2024-03-31", "2024-02-01", "2024-02-29");
  await expectMetric("Calorías promedio", /^(4\.333|4333)( kcal)?$/);
  await expectMetric("Proteína promedio", "367 g");
  await expectMetric("Cobertura", /3\s*\/\s*31 días/);
  await expect(previous).toContainText(/3\s*\/\s*29 días/);

  await selectPeriod("month", "2024-05-15", "2024-05-01", "2024-05-31", "2024-04-01", "2024-04-30");
  await expectMetric("Calorías promedio", "Sin datos");
  await expectMetric("Proteína promedio", "Sin datos");
  await expectMetric("Cobertura", /0\s*\/\s*31 días/);
  await expect(page.getByRole("button", { name: "Analizar este período con IA", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "Historial", exact: true }).click();
  await historyDay("2024-02-29");
  await expect(page.getByText("Última cena de febrero", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-value")).toHaveText(/2\.200\s*\/\s*2\.000 kcal/);
  await expect(page.getByText("Primer registro de marzo", { exact: true })).toHaveCount(0);
  await assertMobileScreenshot("mobile-history-old-goal");

  await historyDay("2024-03-01");
  await expect(page.getByText("Primer registro de marzo", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-value")).toHaveText(/2\.600\s*\/\s*2\.400 kcal/);
  await expect(page.getByText("Última cena de febrero", { exact: true })).toHaveCount(0);
  await historyDay("2024-01-31");
  await expect(page.getByText("Sin objetivo registrado para esta fecha", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-value")).not.toContainText("2.400");
  await assertMobileScreenshot("mobile-history-no-goal");

  await page.reload();
  await page.getByRole("button", { name: "Progreso", exact: true }).click();
  await selectPeriod("month", "2024-02-20", "2024-02-01", "2024-02-29", "2024-01-01", "2024-01-31");
  await expectMetric("Calorías promedio", /^(1\.833|1833)( kcal)?$/);
  assert.equal(await db.meal.count({ where: { userId: fixture.id } }), 9, "Reading reports must not mutate any meal");
  assert.deepEqual(aiRequests, [], "Reports verification must not consume Gemini or any AI endpoint");
  assert.deepEqual(browserErrors, [], "The browser must not report uncaught application errors");
  console.log("PASS: real Postgres → isolated mobile login → calendar weeks/months, leap year and previous periods, 7/30-day windows, day-based averages excluding empty days, activity/weight range filtering, reload persistence, local-midnight historical goals and no horizontal overflow. No AI requests or real user records used.");
} catch (error) {
  if (page && !page.isClosed()) {
    const path = join(screenshotDirectory, "failure.png");
    await page.screenshot({ path, fullPage: true }).catch(() => {});
    console.error(`Failure screenshot: ${path}`);
  }
  throw error;
} finally {
  try {
    await browser?.close();
  } finally {
    try {
      // Delete only this exact random test account; never existing users or broad filters.
      if (fixture) await db.user.delete({ where: { id: fixture.id } });
    } finally {
      await db.$disconnect();
    }
  }
}
