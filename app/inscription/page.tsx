import Link from "next/link";
import SignupForm from "@/components/SignupForm";
import { SIGNUP_INTRO } from "@/lib/marketing";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-3 text-2xl font-semibold text-ink">Créer un compte</h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-soft">{SIGNUP_INTRO}</p>
      <SignupForm />
      <p className="mt-6 text-sm text-ink-soft">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="text-brand-600 hover:text-brand-700">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
