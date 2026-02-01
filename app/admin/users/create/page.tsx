
import Link from "next/link";
import CreateUserForm from "./create-user-form";
import UserList from "./user-list";
import { getUsers } from "./actions";

export const dynamic = 'force-dynamic'

export default async function CreateUserPage() {
  const users = await getUsers()

  return (
    <div className="min-h-screen bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header / Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link 
              href="/admin/dashboard"
              className="text-zinc-400 hover:text-[#F3E5AB] flex items-center transition-colors text-sm font-medium"
          >
              ← Retour au Dashboard
          </Link>
          <h1 className="text-xl font-bold text-[#F3E5AB]">Administration</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Colonne Gauche : Formulaire (4 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div>
                <h2 className="text-2xl font-extrabold text-[#F3E5AB]">
                    Nouveau Locataire
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                    Créez un compte d&apos;accès pour un résident.
                </p>
            </div>
            
            <div className="bg-zinc-900 py-6 px-4 shadow rounded-lg border border-zinc-800 sm:px-6">
                <CreateUserForm />
            </div>
          </div>

          {/* Colonne Droite : Liste (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
             <div>
                <h2 className="text-2xl font-extrabold text-[#F3E5AB]">
                    Annuaire
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                    Gestion des comptes actifs.
                </p>
            </div>
            
            <UserList users={users} />
          </div>
        </div>
      </div>
    </div>
  );
}
