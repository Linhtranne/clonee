import { z } from "zod";
import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import type { Post } from "./post";
import type { Notification } from "./notification";

export interface Like {
  id: string;
  postId: string;
  userId: string;
  post: Post;
}

export const likeRouter = createTRPCRouter({
  toggleLike: privateProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input: { id }, ctx }) => {
      const { userId } = ctx;

      const response = await fetch(
        `http://localhost:3001/likes?postId=${id}&userId=${userId}`,
      );
      const existingLike = (await response.json()) as Like[];

      if (existingLike.length === 0) {
        const postResponse = await fetch(`http://localhost:3001/posts/${id}`);
        const post = (await postResponse.json()) as Post;

        const createdLikeResponse = await fetch("http://localhost:3001/likes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postId: id,
            userId,
          }),
        });

        (await createdLikeResponse.json()) as object;

        await fetch("http://localhost:3001/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "LIKE",
            senderUserId: userId,
            receiverUserId: post.authorId,
            postId: id,
            message: post.text,
          }),
        });

        return { addedLike: true };
      } else {
        await fetch(`http://localhost:3001/likes/${existingLike[0]?.id}`, {
          method: "DELETE",
        });

        const notificationResponse = await fetch(
          `http://localhost:3001/notifications?senderUserId=${userId}&postId=${id}&type=LIKE`,
        );
        const notification =
          (await notificationResponse.json()) as Notification[];

        if (notification.length > 0) {
          await fetch(
            `http://localhost:3001/notifications/${notification[0]?.id}`,
            {
              method: "DELETE",
            },
          );
        }

        return { addedLike: false };
      }
    }),

  postLikeInfo: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const response = await fetch(
        `http://localhost:3001/posts/${input.id}?_embed=likes&_embed=reposts`,
      );
      const postInfo = (await response.json()) as Post;

      if (!postInfo) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        likes: postInfo.likes,
        reposts: postInfo.reposts,
      };
    }),
});
