import type { Food, FoodReference } from "./app-types";

export type NutritionSource = (Food & { kind: "personal" }) | (FoodReference & { kind: "reference"; favorite: false });

export const drinkContainerUnits = new Set(["taza", "tazas", "vaso", "vasos", "jarro", "jarros"]);
export const drinkSizes = [
  { value: 150, label: "Pequeña · 150 ml" },
  { value: 200, label: "Mediana · 200 ml" },
  { value: 250, label: "Grande · 250 ml" },
  { value: 300, label: "Muy grande · 300 ml" },
];

export function normalizeFoodName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

export function foodContentName(value: string) {
  const cleaned = value
    .trim()
    .replace(/^(?:una?\s+)?(?:taza|vaso|plato|bowl|bol|jarro)\s+de\s+/i, "")
    .trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : value.trim();
}

function candidateNames(source: NutritionSource) {
  return [source.name, ...(source.kind === "reference" ? source.aliases : [])]
    .map(normalizeFoodName)
    .filter(Boolean);
}

export function nutritionSources(foods: Food[], references: FoodReference[]): NutritionSource[] {
  return [
    ...foods.map((food) => ({ ...food, kind: "personal" as const })),
    ...references.map((reference) => ({ ...reference, kind: "reference" as const, favorite: false as const })),
  ];
}

export function findNutritionSource(name: string, sources: NutritionSource[]) {
  const query = normalizeFoodName(name);
  if (!query) return undefined;

  return sources
    .flatMap((source) => candidateNames(source).map((candidate) => {
      const exact = query === candidate;
      const contained = candidate.length >= 4 && (query.includes(candidate) || candidate.includes(query));
      const score = exact ? 10_000 + candidate.length : contained ? candidate.length : -1;
      return { source, score: score < 0 ? score : score + (source.kind === "personal" ? 100 : 0) };
    }))
    .filter(({ score }) => score >= 0)
    .sort((first, second) => second.score - first.score)[0]?.source;
}

export function isUnresolvedDrinkContainer(unit: string | undefined, source: NutritionSource | undefined) {
  return source?.servingUnit === "ml" && drinkContainerUnits.has(normalizeFoodName(unit ?? ""));
}
