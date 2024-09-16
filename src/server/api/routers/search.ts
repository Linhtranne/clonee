import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import type { User } from "./user";

export const searchRouter = createTRPCRouter({
  allUsers: publicProcedure
    .input(
      z.object({
        debouncedSearch: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const response = await fetch(`http://localhost:3001/users`);
      const allUsers = (await response.json()) as User[];

      const filteredUsers = allUsers.filter(
        (user: User) =>
          (user.fullname ?? "")
            .toLowerCase()
            .includes(input.debouncedSearch.toLowerCase()) ||
          (user.username ?? "")
            .toLowerCase()
            .includes(input.debouncedSearch.toLowerCase()) ||
          (user.email ?? "")
            .toLowerCase()
            .includes(input.debouncedSearch.toLowerCase()),
      );

      return filteredUsers;
    }),
});
