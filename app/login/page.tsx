import Image from "next/image";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            <div className="relative w-96 h-48">
                 <Image
                    src="/logo.jpeg"
                    alt="Thagora Luxury Real Estate"
                    fill
                    className="object-contain"
                    priority
                 />
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[#F3E5AB]">
          Espace Résidentiel
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Connectez-vous pour gérer vos réservations
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-zinc-800">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
