import { generateUsername } from "@/app/_actions/generate-username";
import AccountSetupForm from "@/components/auth/account-setup-form";
import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { checkAdmin } from "../_actions/seed";

export default async function AccountPage() {
  const user = await currentUser();

  if (!user) redirect("/login");

  const isVerifiedUser = await checkAdmin();

  if (isVerifiedUser) redirect("/");

  const username = (await generateUsername(user)) ?? "";

  return (
    <div className="mx-auto flex h-[95vh] w-full max-w-lg flex-col items-center justify-center gap-6">
      <AccountSetupForm username={username} />
    </div>
  );
}
