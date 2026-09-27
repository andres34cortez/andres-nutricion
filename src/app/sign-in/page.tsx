import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export default function SignInPage() {
  async function authenticate(formData: FormData) {
    "use server";
    try { await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: "/" }); }
    catch (error) { if (error instanceof AuthError) redirect("/sign-in?error=credentials"); throw error; }
  }
  return <main className="signin"><section><p className="eyebrow">NUTRICIÓN ANDRÉS</p><h1>Bienvenido</h1><p>Ingresá a tu espacio personal de nutrición y entrenamiento.</p><form action={authenticate}><label>Email<input type="email" name="email" required autoComplete="email" /></label><label>Contraseña<input type="password" name="password" required minLength={8} autoComplete="current-password" /></label><button className="primary-button">Ingresar</button></form></section></main>;
}
