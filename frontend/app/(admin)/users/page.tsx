import { serverApi } from "@/app/lib/serverApi";
import { revalidatePath } from "next/cache";
import AddUserForm from "./AddUserForm";
import UserList from "./UserList";
import { User } from "@/types";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function getUsers(): Promise<User[]> {
  try {
    const res = await serverApi(`${API}/users/`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

async function deleteUser(id: number) {
  "use server";
  await serverApi(`${API}/users/${id}`, { method: "DELETE" });
  revalidatePath("/users");
}

async function refresh() {
  "use server";
  revalidatePath("/users");
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Users</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {users.length} user{users.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <AddUserForm onAdded={refresh} />
      </div>
      <UserList users={users} onDelete={deleteUser} />
    </div>
  );
}