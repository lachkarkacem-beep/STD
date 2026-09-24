import Link from "next/link";
import SignupForm from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-8 text-2xl font-medium text-ink">Créer un compte</h1>
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
