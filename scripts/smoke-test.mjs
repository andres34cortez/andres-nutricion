const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

async function expectStatus(path, init, expected) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (response.status !== expected) {
    throw new Error(`${init?.method ?? "GET"} ${path}: esperado ${expected}, recibido ${response.status}`);
  }
  console.log(`✓ ${init?.method ?? "GET"} ${path} → ${response.status}`);
  return response;
}

await expectStatus("/", undefined, 200);

const manifestResponse = await expectStatus("/manifest.webmanifest", undefined, 200);
const manifest = await manifestResponse.json();
if (manifest.name !== "Nutrición Andrés" || manifest.display !== "standalone") {
  throw new Error("El manifiesto PWA no contiene el nombre o modo standalone esperado.");
}
console.log("✓ manifiesto PWA válido");

await expectStatus("/icon.svg", undefined, 200);

const jsonPost = (body) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

await expectStatus("/api/meals", jsonPost({}), 401);
await expectStatus("/api/weights", jsonPost({ weightKg: 91.4 }), 401);
await expectStatus("/api/activities", jsonPost({ type: "Gym", duration: 60 }), 401);
await expectStatus("/api/profile", { ...jsonPost({}), method: "PUT" }, 401);
await expectStatus("/api/ai/food", { method: "POST", body: new FormData() }, 401);

console.log("\nSmoke test completo: la app responde y las APIs privadas rechazan sesiones anónimas.");
