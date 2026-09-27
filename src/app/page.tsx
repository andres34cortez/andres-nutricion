import { NutritionApp } from "@/components/nutrition-app";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAppData } from "@/server/app-data";

export default async function HomePage() {
  let initialData;
  let cloud = false;
  if (process.env.APP_DEMO_MODE === "false") {
    const session = await auth();
    if (!session) redirect("/sign-in");
    initialData = await getAppData(session.user.id);
    cloud = true;
  }
  return <NutritionApp initialData={initialData} cloud={cloud} />;
}
