import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  async function authenticate(formData: FormData) {
    "use server";
    try { await signIn("credentials", { identifier: formData.get("identifier"), password: formData.get("password"), redirectTo: "/" }); }
    catch (error) { if (error instanceof AuthError) redirect("/sign-in?error=credentials"); throw error; }
  }
  async function googleSignIn() { "use server"; await signIn("google", { redirectTo: "/" }); }
  return <main className="signin"><section><p className="eyebrow">NUTRICIÓN ANDRÉS</p><h1>Bienvenido</h1><p>Tu alimentación, hábitos y progreso.</p>{error && <p role="alert">{error === "OAuthAccountNotLinked" ? "Ingresá primero con tu cuenta existente y vinculá Google desde Perfil." : "No pudimos iniciar sesión. Revisá tus datos o intentá nuevamente."}</p>}{googleEnabled && <form action={googleSignIn}><button className="primary-button">Continuar con Google</button></form>}<form action={authenticate}><label>Usuario o email<input type="text" name="identifier" required autoComplete="username" /></label><label>Contraseña<input type="password" name="password" required minLength={process.env.NODE_ENV === "production" ? 8 : 4} autoComplete="current-password" /></label><button className="primary-button">Ingresar</button></form>{process.env.NODE_ENV !== "production" && <p className="local-access">Acceso local: <strong>admin</strong></p>}</section></main>;
}
