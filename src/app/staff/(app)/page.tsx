import { requireStaff } from "@/lib/session";
import { logout } from "../login/actions";

export default async function StaffHome() {
  const session = await requireStaff();
  return (
    <main className="p-10">
      <h1 className="font-serif text-4xl text-forest">Hello, {session.name}</h1>
      <p className="mt-2 text-muted">Signed in as {session.role}.</p>
      <form action={logout} className="mt-6">
        <button className="border border-forest px-4 py-2 text-forest">Sign out</button>
      </form>
    </main>
  );
}
