import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import Filter from "bad-words";
import type { User } from "@/types";
import { PostPrivacy } from "@/enums";
import type { Like } from "./like";
import type { Notification } from "./notification";

export interface Post {
  id: string;
  createdAt: string;
  author: User;
  authorId: string;
  text: string;
  images: string[];
  likes: Like[];
  parentPostId: string | null;
  parentPost: Post | null;
  replies: Post[];
  notification: Notification[];
  reposts: Repost[];
  quoteId: string | null;
  privacy: PostPrivacy;
  reports: Report[];
}

export interface Repost {
  createdAt: string;
  post: Post;
  postId: string;
  user: User;
  userId: string;
}

export const postRouter = createTRPCRouter({
  createPost: privateProcedure
    .input(
      z.object({
        text: z.string().min(3, {
          message: "Text must be at least 3 character",
        }),
        imageUrl: z.string().optional(),
        privacy: z.nativeEnum(PostPrivacy).default(PostPrivacy.ANYONE),
        quoteId: z.string().optional(),
        postAuthor: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;
      const filter = new Filter();
      const filteredText = filter.clean(input.text);

      const response = await fetch("http://localhost:3001/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: filteredText,
          authorId: userId,
          images: input.imageUrl ? [input.imageUrl] : [],
          privacy: input.privacy,
          quoteId: input.quoteId,
          createdAt: new Date().toISOString(),
        }),
      });

      const newpost = (await response.json()) as Post;

      if (input.postAuthor && userId !== input.postAuthor) {
        await fetch("http://localhost:3001/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "QUOTE",
            senderUserId: userId,
            receiverUserId: input.postAuthor,
            postId: newpost.id,
            message: input.text,
          }),
        });
      }

      return {
        createPost: newpost,
        success: true,
      };
    }),

  getInfinitePost: publicProcedure
    .input(
      z.object({
        searchQuery: z.string().optional(),
        limit: z.number().optional(),
        cursor: z.object({ id: z.string(), createdAt: z.date() }).optional(),
      }),
    )
    .query(async ({ input: { limit = 10, cursor, searchQuery } }) => {
      try {
        const response = await fetch(
          `http://localhost:3001/posts?text_like=${searchQuery}&parentPostId=null&_sort=createdAt,id&_order=desc,desc&_limit=${limit + 1}`,
        );
        const allPosts: Post[] = (await response.json()) as Post[];

        let nextCursor: typeof cursor | undefined;

        if (allPosts.length > limit) {
          const nextItem = allPosts.pop();
          if (nextItem != null) {
            nextCursor = {
              id: nextItem.id,
              createdAt: new Date(nextItem.createdAt),
            };
          }
        }

        return {
          posts: allPosts.map((post: Post) => ({
            id: post.id,
            createdAt: new Date(post.createdAt),
            text: post.text,
            parentPostId: post.parentPostId,
            author: post.author,
            count: {
              likeCount: post.likes?.length,
              replyCount: post.replies?.length,
            },
            likes: post.likes,
            replies: post.replies,
            quoteId: post.quoteId,
            images: post.images,
            reposts: post.reposts,
          })),
          nextCursor,
        };
      } catch (error) {
        console.error("Error in getInfinitePost:", error);
        throw error;
      }
    }),

  getPostInfo: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const response = await fetch(
        `http://localhost:3001/posts/${input.id}?_embed=likes&_expand=parentPost&_embed=replies`,
      );
      const postInfo = (await response.json()) as Post;

      if (!postInfo) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        postInfo: {
          id: postInfo.id,
          text: postInfo.text,
          createdAt: new Date(postInfo.createdAt),
          likeCount: postInfo.likes.length,
          replyCount: postInfo.replies.length,
          user: postInfo.author,
          parentPost: postInfo.parentPost,
          likes: postInfo.likes,
          replies: postInfo.replies,
        },
      };
    }),

  replyToPost: privateProcedure
    .input(
      z.object({
        postAuthor: z.string(),
        postId: z.string(),
        text: z.string().min(3, {
          message: "Text must be at least 3 character",
        }),
        imageUrl: z.string().optional(),
        privacy: z.nativeEnum(PostPrivacy),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;
      const filter = new Filter();
      const filteredText = filter.clean(input.text);

      const response = await fetch("http://localhost:3001/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: filteredText,
          images: input.imageUrl ? [input.imageUrl] : [],
          privacy: input.privacy,
          authorId: userId,
          parentPostId: input.postId,
          createdAt: new Date().toISOString(),
        }),
      });

      const repliedPost = (await response.json()) as Post;

      if (userId !== input.postAuthor) {
        await fetch("http://localhost:3001/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "REPLY",
            senderUserId: userId,
            receiverUserId: input.postAuthor,
            postId: input.postId,
            message: input.text,
          }),
        });
      }

      return {
        createPost: repliedPost,
        success: true,
      };
    }),

  getNestedPosts: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { id } = input;
      const response = await fetch(
        `http://localhost:3001/posts/${id}?_embed=replies&_embed=likes&_embed=reposts`,
      );
      const getPosts = (await response.json()) as Post;

      const parentPostsResponse = await fetch(
        `http://localhost:3001/posts?parentPostId=${id}&_sort=createdAt,id&_order=desc,desc`,
      );
      const parentPosts = (await parentPostsResponse.json()) as Post[];

      if (!getPosts) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        postInfo: {
          id: getPosts.id,
          createdAt: new Date(getPosts.createdAt),
          text: getPosts.text,
          images: getPosts.images,
          quoteId: getPosts.quoteId,
          reposts: getPosts.reposts,
          parentPostId: getPosts.parentPostId,
          author: getPosts.author,
          count: {
            likeCount: getPosts.likes.length,
            replyCount: getPosts.replies.length,
          },
          likes: getPosts.likes,
          replies: getPosts.replies.map((reply) => ({
            ...reply,
            count: {
              likeCount: reply.likes.length,
              replyCount: reply.replies.length,
            },
          })),
        },

        parentPosts: parentPosts
          .filter((parent: Post) => parent.id !== id)
          .map((parent: Post) => {
            return {
              id: parent.id,
              createdAt: new Date(parent.createdAt),
              text: parent.text,
              images: parent.images,
              parentPostId: parent.parentPostId,
              author: parent.author,
              count: {
                likeCount: parent.likes.length,
                replyCount: parent.replies.length,
              },
              likes: parent.likes ?? [],
              replies: parent.replies ?? [],
              quoteId: parent.quoteId,
              reposts: parent.reposts ?? [],
            };
          })
          .reverse(),
      };
    }),

  toggleRepost: privateProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input: { id }, ctx }) => {
      const { userId } = ctx;

      const response = await fetch(
        `http://localhost:3001/reposts?postId=${id}&userId=${userId}`,
      );
      const existingRepost = (await response.json()) as Repost[];

      if (existingRepost.length === 0) {
        const postResponse = await fetch(`http://localhost:3001/posts/${id}`);
        const post = (await postResponse.json()) as Post;

        const createdRepostResponse = await fetch(
          "http://localhost:3001/reposts",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              postId: id,
              userId,
            }),
          },
        );

        (await createdRepostResponse.json()) as Repost;

        await fetch("http://localhost:3001/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "REPOST",
            postId: id,
            message: post.text,
            senderUserId: userId,
            receiverUserId: post.authorId,
          }),
        });

        return { createdRepost: true };
      } else {
        await fetch(
          `http://localhost:3001/reposts/${existingRepost[0]?.postId}`,
          {
            method: "DELETE",
          },
        );

        const notificationResponse = await fetch(
          `http://localhost:3001/notifications?senderUserId=${userId}&postId=${id}&type=REPOST`,
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

        return { createdRepost: false };
      }
    }),

  getQuotedPost: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const response = await fetch(
        `http://localhost:3001/posts/${input.id}?_embed=likes&_embed=replies`,
      );
      const postInfo = (await response.json()) as Post;

      if (!postInfo) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        postInfo: {
          id: postInfo.id,
          text: postInfo.text,
          createdAt: new Date(postInfo.createdAt),
          likeCount: postInfo.likes.length,
          replyCount: postInfo.replies.length,
          user: postInfo.author,
          likes: postInfo.likes,
          replies: postInfo.replies,
        },
      };
    }),

  deletePost: privateProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { userId } = ctx;
      const response = await fetch(
        `http://localhost:3001/posts/${input.id}?authorId=${userId}`,
      );
      const postInfo = (await response.json()) as Post;

      if (!postInfo) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await fetch(`http://localhost:3001/posts?quoteId=${input.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteId: null,
        }),
      });

      return { success: true };
    }),
});
