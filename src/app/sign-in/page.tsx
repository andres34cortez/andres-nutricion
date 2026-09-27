import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export default function SignInPage() {
  async function authenticate(formData: FormData) {
    "use server";
    try { await signIn("credentials", { identifier: formData.get("identifier"), password: formData.get("password"), redirectTo: "/" }); }
    catch (error) { if (error instanceof AuthError) redirect("/sign-in?error=credentials"); throw error; }
  }
  return <main className="signin"><section><p className="eyebrow">NUTRICIÓN ANDRÉS</p><h1>Bienvenido</h1><p>Ingresá a tu espacio personal de nutrición y entrenamiento.</p><form action={authenticate}><label>Usuario o email<input type="text" name="identifier" required autoComplete="username" /></label><label>Contraseña<input type="password" name="password" required minLength={4} autoComplete="current-password" /></label><button className="primary-button">Ingresar</button></form><p className="local-access">Acceso local: <strong>admin</strong></p></section></main>;
}
