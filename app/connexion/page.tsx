import Link from "next/link";
import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-8 text-3xl font-normal text-ink">Connexion</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-sm text-ink-soft">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-brand-600 hover:text-brand-700">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
