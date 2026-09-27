import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const db = new PrismaClient();
const base = "http://localhost:3000";
const password = randomUUID();
const created = [];

function makeRequest(cookie = () => "") {
  return async (path, method = "GET", body) => {
    const response = await fetch(base + path, {
      method,
      headers: { cookie: cookie(), "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    return {
      status: response.status,
      location: response.headers.get("location"),
      data: await response.json().catch(() => null),
    };
  };
}

async function login(email) {
  const cookies = new Map();
  const absorb = (response) => {
    for (const raw of response.headers.getSetCookie()) {
      const pair = raw.split(";")[0];
      const separator = pair.indexOf("=");
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  };
  const cookie = () => [...cookies].map(([key, value]) => `${key}=${value}`).join("; ");
  const csrf = await fetch(base + "/api/auth/csrf", { signal: AbortSignal.timeout(30_000) });
  assert.equal(csrf.status, 200, "CSRF endpoint must respond");
  absorb(csrf);
  const { csrfToken } = await csrf.json();
  const response = await fetch(base + "/api/auth/callback/credentials", {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookie() },
    body: new URLSearchParams({ csrfToken, identifier: email, password, callbackUrl: base }),
    signal: AbortSignal.timeout(30_000),
  });
  absorb(response);
  assert.equal(response.status, 302, "Credentials login must redirect");
  const request = makeRequest(cookie);
  const session = await request("/api/auth/session");
  assert.equal(session.data?.user?.email, email, "Login must establish the fixture's own session");
  return request;
}

async function expectStatus(request, path, method, body, expected) {
  const response = await request(path, method, body);
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(response.data)}`);
  return response.data;
}

async function appData(request) {
  return expectStatus(request, "/api/data", "GET", undefined, 200);
}

async function assertCannotModify(other, input, id) {
  await expectStatus(other, "/api/records", "PUT", { ...input, id }, 404);
  await expectStatus(other, "/api/records", "DELETE", { kind: input.kind, id }, 404);
}

try {
  for (let index = 0; index < 2; index += 1) {
    const user = await db.user.create({
      data: {
        name: "Integration fixture",
        email: `test-${randomUUID()}@example.invalid`,
        passwordHash: await hash(password, 10),
      },
    });
    created.push(user);
  }

  const request = await login(created[0].email);
  const other = await login(created[1].email);
  const anonymous = makeRequest();
  assert.equal((await request("/")).location, "/onboarding");

  const answers = {
    name: "Prueba", age: 30, height: 178, weight: 80, goal: "Mantener peso",
    occupation: "Oficina", activityLevel: "Algo activo", trainingDays: 3,
    training: "Fuerza", mealsPerDay: 3, usualBreakfast: "Avena", usualLunch: "Arroz",
    usualDinner: "Pollo", snacks: "Fruta", waterLiters: 2, dietaryPreferences: "",
    restrictions: "", knownDailyCalories: null, timezone: "America/Argentina/San_Juan",
    calorieGoal: 2400, proteinGoal: 180, carbGoal: 251, fatGoal: 75,
  };
  const meal = {
    kind: "meal", timestamp: "2026-09-28T02:30:00Z", category: "Cena", notes: "Test",
    items: [{
      name: "Arroz", quantity: 100, unit: "g", calories: 130, protein: 3,
      carbs: 28, fat: 1, source: "manual", estimated: false,
    }],
  };
  const weight = { kind: "weight", timestamp: "2026-10-01T02:59:59Z", weightKg: 79.5 };
  const activity = {
    kind: "activity", timestamp: "2026-12-31T23:59:59-03:00", type: "Caminata",
    duration: 45, detail: "Caminata de prueba", distanceKm: 4.2, steps: 6000,
  };

  await expectStatus(anonymous, "/api/data", "GET", undefined, 401);
  await expectStatus(anonymous, "/api/onboarding", "PUT", answers, 401);
  await expectStatus(anonymous, "/api/profile", "PUT", {}, 401);
  for (const input of [meal, weight, activity]) {
    await expectStatus(anonymous, "/api/records", "POST", input, 401);
    await expectStatus(anonymous, "/api/records", "PUT", { ...input, id: randomUUID() }, 401);
    await expectStatus(anonymous, "/api/records", "DELETE", { kind: input.kind, id: randomUUID() }, 401);
  }

  await expectStatus(request, "/api/onboarding", "PUT", answers, 200);
  const initial = await appData(request);
  assert.equal(initial.weights.length, 1);
  assert.equal(initial.profile.name, "Prueba");
  const initialWeight = initial.weights[0];

  const { id: mealId } = await expectStatus(request, "/api/records", "POST", meal, 201);
  await assertCannotModify(other, meal, mealId);
  await expectStatus(request, "/api/records", "PUT", {
    ...meal, id: mealId, items: [{ ...meal.items[0], calories: 260 }],
  }, 200);
  const savedMeal = (await appData(request)).meals.find((entry) => entry.mealId === mealId);
  assert.equal(savedMeal.calories, 260);
  assert.equal(savedMeal.date, "2026-09-27", "UTC next-day meal must stay on Argentina's prior day");
  assert.equal(savedMeal.timestamp, "2026-09-28T02:30:00.000Z");
  await expectStatus(request, "/api/records", "PUT", { ...meal, id: mealId, items: [] }, 400);
  await expectStatus(request, "/api/records", "PUT", { ...meal, id: mealId, timestamp: "invalid" }, 400);
  assert.deepEqual(
    (await appData(request)).meals.filter((entry) => entry.mealId === mealId),
    [savedMeal],
    "Invalid meal edits must not delete or replace existing items",
  );
  const zeroItem = { ...meal.items[0], name: "Agua", calories: 0, protein: 0, carbs: 0, fat: 0 };
  await expectStatus(request, "/api/records", "POST", { ...meal, items: [zeroItem] }, 400);
  await expectStatus(request, "/api/records", "PUT", { ...meal, id: mealId, items: [zeroItem] }, 400);
  assert.deepEqual(
    (await appData(request)).meals.filter((entry) => entry.mealId === mealId),
    [savedMeal],
    "Unconfirmed zero nutrition must not overwrite an existing meal",
  );
  const { id: waterId } = await expectStatus(request, "/api/records", "POST", {
    ...meal, items: [{ ...zeroItem, zeroNutritionConfirmed: true }],
  }, 201);
  const savedWater = (await appData(request)).meals.find((entry) => entry.mealId === waterId);
  assert.equal(savedWater.name, "Agua");
  assert.equal(savedWater.calories, 0, "Confirmed legitimate zero-nutrition foods must be saveable");
  await expectStatus(request, "/api/records", "DELETE", { kind: "meal", id: waterId }, 204);

  const { id: weightId } = await expectStatus(request, "/api/records", "POST", weight, 201);
  await assertCannotModify(other, weight, weightId);
  let savedWeight = (await appData(request)).weights.find((entry) => entry.id === weightId);
  assert.equal(savedWeight.weightKg, 79.5);
  assert.equal(savedWeight.date, "2026-09-30", "One second before local midnight belongs to September");
  assert.equal(savedWeight.timestamp, "2026-10-01T02:59:59.000Z");
  await expectStatus(request, "/api/records", "PUT", {
    ...weight, id: weightId, timestamp: "2026-10-01T00:00:00-03:00", weightKg: 79.2,
  }, 200);
  savedWeight = (await appData(request)).weights.find((entry) => entry.id === weightId);
  assert.equal(savedWeight.weightKg, 79.2);
  assert.equal(savedWeight.date, "2026-10-01", "Exact local midnight belongs to October");
  assert.equal(savedWeight.timestamp, "2026-10-01T03:00:00.000Z");
  await expectStatus(request, "/api/records", "PUT", { ...weight, id: weightId, weightKg: 0 }, 400);
  assert.deepEqual(
    (await appData(request)).weights.find((entry) => entry.id === weightId),
    savedWeight,
    "Invalid weight edits must preserve the previous value and timestamp",
  );

  const { id: activityId } = await expectStatus(request, "/api/records", "POST", activity, 201);
  await assertCannotModify(other, activity, activityId);
  let savedActivity = (await appData(request)).activities.find((entry) => entry.id === activityId);
  assert.equal(savedActivity.date, "2026-12-31", "Argentina's year end must not become UTC's next year");
  assert.equal(savedActivity.timestamp, "2027-01-01T02:59:59.000Z");
  assert.equal(savedActivity.distanceKm, 4.2);
  assert.equal(savedActivity.steps, 6000);
  await expectStatus(request, "/api/records", "PUT", {
    ...activity, id: activityId, timestamp: "2027-01-01T03:00:00Z", type: "Gym",
    duration: 60, detail: "Fuerza de prueba", distanceKm: 0, steps: 0,
  }, 200);
  savedActivity = (await appData(request)).activities.find((entry) => entry.id === activityId);
  assert.equal(savedActivity.date, "2027-01-01");
  assert.equal(savedActivity.timestamp, "2027-01-01T03:00:00.000Z");
  assert.equal(savedActivity.type, "Gym");
  assert.equal(savedActivity.duration, 60);
  assert.equal(savedActivity.detail, "Fuerza de prueba");
  assert.equal(savedActivity.distanceKm, 0, "Zero distance must not be dropped on read");
  assert.equal(savedActivity.steps, 0, "Zero steps must not be dropped on read");
  await expectStatus(request, "/api/records", "PUT", { ...activity, id: activityId, duration: -1 }, 400);
  await expectStatus(request, "/api/records", "PUT", { ...activity, id: activityId, steps: 1.5 }, 400);
  assert.deepEqual(
    (await appData(request)).activities.find((entry) => entry.id === activityId),
    savedActivity,
    "Invalid activity edits must preserve the previous record",
  );
  await expectStatus(request, "/api/records", "PUT", {
    ...activity, id: activityId, distanceKm: undefined, steps: undefined,
  }, 200);
  const clearedActivity = (await appData(request)).activities.find((entry) => entry.id === activityId);
  assert.equal(clearedActivity.distanceKm, undefined, "Clearing optional distance must remove its previous value");
  assert.equal(clearedActivity.steps, undefined, "Clearing optional steps must remove their previous value");
  assert.equal(clearedActivity.duration, activity.duration, "Clearing optional fields must still save required fields");

  const isolated = await appData(other);
  assert.deepEqual(isolated.meals, [], "Other users must not read meals");
  assert.deepEqual(isolated.weights, [], "Other users must not read weights");
  assert.deepEqual(isolated.activities, [], "Other users must not read activities");

  const beforeRepeat = await appData(request);
  await expectStatus(request, "/api/onboarding", "PUT", { ...answers, trainingDays: 4, weight: 79 }, 200);
  const afterRepeat = await appData(request);
  for (const collection of ["meals", "weights", "activities"]) {
    assert.deepEqual(afterRepeat[collection], beforeRepeat[collection], `Repeating onboarding must preserve ${collection}`);
  }
  await expectStatus(request, "/api/profile", "PUT", { ...initial.profile, age: 32 }, 200);
  assert.equal((await appData(request)).profile.age, 32);

  for (const [kind, id] of [["meal", mealId], ["weight", weightId], ["activity", activityId]]) {
    await expectStatus(request, "/api/records", "DELETE", { kind, id }, 204);
    await expectStatus(request, "/api/records", "DELETE", { kind, id }, 404);
  }
  const afterDelete = await appData(request);
  assert.deepEqual(afterDelete.meals, []);
  assert.deepEqual(afterDelete.activities, []);
  assert.deepEqual(afterDelete.weights, [initialWeight], "Deleting a weight must preserve the onboarding measurement");

  await expectStatus(request, "/api/records", "POST", { ...meal, items: [] }, 400);
  await expectStatus(request, "/api/records", "POST", { ...weight, weightKg: 301 }, 400);
  await expectStatus(request, "/api/records", "POST", { ...activity, timestamp: "2026-09-27" }, 400);

  console.log("PASS: onboarding and age persistence; meal, weight and activity CRUD; Argentina day/month/year boundaries; invalid edits preserve data; anonymous 401; ownership isolation; repeat questionnaire preserves history.");
} finally {
  // Only these exact, randomly generated fixture IDs are eligible for cleanup.
  const cleanup = await Promise.allSettled(created.map((user) => db.user.delete({ where: { id: user.id } })));
  await db.$disconnect();
  const failed = cleanup.filter((result) => result.status === "rejected");
  assert.equal(failed.length, 0, "All temporary integration users must be removed");
}
