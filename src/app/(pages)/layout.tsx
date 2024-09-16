import MobileNavbar from "@/components/layouts/mobile-navbar";
import SiteHeader from "@/components/layouts/site-header";
import { getUserEmail } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

interface PagesLayoutProps {
  children: React.ReactNode;
}

export interface DbUser {
  id: string;
  username: string;
  fullname: string;
  image: string;
  privacy: string;
  bio: string;
  link: string;
  email: string;
  verified: boolean;
}

export default async function PagesLayout({ children }: PagesLayoutProps) {
  const user = await currentUser();

  if (!user) redirect("/login");

  const response = await fetch(
    `http://localhost:3001/users?id=${user.id}&email=${getUserEmail(user)}`,
  );

  const dbUser: DbUser | null = (await response.json()) as DbUser | null;
  if (!dbUser) redirect("/account?origin=/");

  return (
    <>
      <SiteHeader />
      <main className="container max-w-[620px] px-4 sm:px-6">{children}</main>
      <MobileNavbar />
    </>
  );
}
