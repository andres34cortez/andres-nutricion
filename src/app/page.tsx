import { NutritionApp } from "@/components/nutrition-app";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAppData } from "@/server/app-data";
import { db } from "@/server/db";
import { requiresOnboarding } from "@/lib/onboarding-state";

export default async function HomePage() {
  let initialData;
  let cloud = false;
  if (process.env.APP_DEMO_MODE !== "true") {
    const session = await auth();
    if (!session) redirect("/sign-in");
    const profile = await db.profile.findUnique({ where: { userId: session.user.id } });
    if (requiresOnboarding(profile)) redirect("/onboarding");
    initialData = await getAppData(session.user.id);
    cloud = true;
  }
  return <NutritionApp initialData={initialData} cloud={cloud} googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} />;
}
