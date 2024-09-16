import { z } from "zod";
import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import type { Privacy } from "@/enums";
import type { Post, Repost } from "./post";
import type { Like } from "./like";
import type { Notification } from "./notification";

export interface User {
  id: string;
  createdAt: string;
  updatedAt: string;
  username: string;
  fullname: string | null;
  image: string | null;
  bio: string | null;
  link: string | null;
  email: string;
  password: string;
  verified: boolean | null;
  privacy: Privacy;
  followers: User[];
  following: User[];
  posts: Post[];
  likedPosts: Like[];
  isAdmin: boolean | null;
  reposts: Repost[];
  reports: Report[];
  senderNotifications: Notification[];
  receiverNotifications: Notification[];
}

export const userRouter = createTRPCRouter({
  Info: publicProcedure
    .input(
      z.object({
        username: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const response = await fetch(
        `http://localhost:3001/users?username=${input.username}`,
      );
      const users = (await response.json()) as User[];

      if (users.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const userProfileInfo = users[0];

      return {
        userDetails: {
          id: userProfileInfo?.id,
          image: userProfileInfo?.image,
          fullname: userProfileInfo?.fullname,
          username: userProfileInfo?.username,
          bio: userProfileInfo?.bio,
          link: userProfileInfo?.link,
          privacy: userProfileInfo?.privacy,
          createdAt: userProfileInfo?.createdAt,
          isAdmin: userProfileInfo?.isAdmin,
          followers: userProfileInfo?.followers,
        },
      };
    }),

  postInfo: publicProcedure
    .input(
      z.object({
        username: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const response = await fetch(
        `http://localhost:3001/posts?author.username=${input.username}&parentPostId=null&_expand=author&_embed=likes&_embed=replies&_embed=reposts`,
      );
      const posts = (await response.json()) as Post[];

      if (!posts) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return posts.map((post: Post) => ({
        id: post.id,
        createdAt: post.createdAt,
        text: post.text,
        images: post.images,
        parentPostId: post.parentPostId,
        author: post.author,
        count: {
          likeCount: post.likes.length,
          replyCount: post.replies.length,
        },
        likes: post.likes,
        replies: post.replies,
        reposts: post.reposts,
        quoteId: post.quoteId,
      }));
    }),

  repliesInfo: publicProcedure
    .input(
      z.object({
        username: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const response = await fetch(
        `http://localhost:3001/posts?author.username=${input.username}&parentPostId_ne=null&_expand=author&_embed=likes&_embed=replies&_embed=reposts`,
      );
      const replies = (await response.json()) as Post[];

      if (!replies) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return replies.map((reply: Post) => ({
        id: reply.id,
        createdAt: reply.createdAt,
        text: reply.text,
        images: reply.images,
        parentPostId: reply.parentPostId,
        author: reply.author,
        count: {
          likeCount: reply.likes.length,
          replyCount: reply.replies.length,
        },
        likes: reply.likes,
        replies: reply.replies,
        reposts: reply.reposts,
        quoteId: reply.quoteId,
      }));
    }),

  repostsInfo: publicProcedure
    .input(
      z.object({
        username: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const response = await fetch(
        `http://localhost:3001/reposts?user.username=${input.username}&_expand=post&_embed=post.likes&_embed=post.replies&_embed=post.reposts`,
      );
      const reposts = (await response.json()) as Repost[];

      if (!reposts) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return reposts.map((repost: Repost) => ({
        id: repost.post.id,
        createdAt: repost.post.createdAt,
        text: repost.post.text,
        images: repost.post.images,
        parentPostId: repost.post.parentPostId,
        author: repost.post.author,
        count: {
          likeCount: repost.post.likes.length,
          replyCount: repost.post.replies.length,
        },
        likes: repost.post.likes,
        replies: repost.post.replies,
        reposts: repost.post.reposts,
        quoteId: repost.post.quoteId,
      }));
    }),

  allUsers: privateProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        cursor: z.object({ id: z.string(), createdAt: z.date() }).optional(),
      }),
    )
    .query(async ({ input: { limit = 10, cursor } }) => {
      const response = await fetch(
        `http://localhost:3001/users?_sort=createdAt,id&_order=desc,desc&_limit=${limit + 1}`,
      );
      const allUsers = (await response.json()) as User[];

      let nextCursor: typeof cursor | undefined;

      if (allUsers.length > limit) {
        const nextItem = allUsers.pop();
        if (nextItem != null) {
          nextCursor = {
            id: nextItem.id,
            createdAt: new Date(nextItem.createdAt),
          };
        }
      }

      return {
        allUsers,
        nextCursor,
      };
    }),

  toggleFollow: privateProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { userId } = ctx;

      const response = await fetch(
        `http://localhost:3001/users/${userId}?_embed=following`,
      );
      const user = (await response.json()) as User;

      const isAlreadyFollowing = user.following.some(
        (followedUser: User) => followedUser.id === input.id,
      );

      if (!isAlreadyFollowing) {
        await fetch(`http://localhost:3001/users/${userId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            following: [...user.following, { id: input.id }],
          }),
        });

        await fetch("http://localhost:3001/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "FOLLOW",
            senderUserId: userId,
            receiverUserId: input.id,
            message: "Followed you",
          }),
        });

        return { followUser: true };
      } else {
        await fetch(`http://localhost:3001/users/${userId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            following: user.following.filter(
              (followedUser: User) => followedUser.id !== input.id,
            ),
          }),
        });

        const notificationResponse = await fetch(
          `http://localhost:3001/notifications?senderUserId=${userId}&receiverUserId=${input.id}&type=FOLLOW`,
        );
        const notifications =
          (await notificationResponse.json()) as Notification[];

        if (notifications.length > 0) {
          await fetch(
            `http://localhost:3001/notifications/${notifications[0]?.id}`,
            {
              method: "DELETE",
            },
          );
        }

        return { unfollowUser: true };
      }
    }),
});
