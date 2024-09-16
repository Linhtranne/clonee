import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import type { User } from "@/types";
import { TRPCError } from "@trpc/server";
import type { Post } from "./post";
import { NotificationType } from "@/enums";

export interface Notification {
  id: string;
  createdAt: string;
  read: boolean;
  type: NotificationType;
  message: string;
  isPublic: boolean;
  senderUserId: string;
  receiverUserId: string;
  senderUser: User;
  receiverUser: User;
  postId: string;
  post: Post;
}

export const notificationRouter = createTRPCRouter({
  getNotification: privateProcedure.query(async ({ ctx }) => {
    const { userId } = ctx;

    const response = await fetch(
      `http://localhost:3001/notifications?_expand=senderUser&_expand=post`,
    );
    const allNotifications: Notification[] =
      (await response.json()) as Notification[];

    const getNotifications = allNotifications.filter(
      (notification: Notification) =>
        (notification.isPublic &&
          notification.type === NotificationType.ADMIN) ||
        (!notification.isPublic &&
          notification.type === NotificationType.ADMIN &&
          notification.receiverUserId === userId) ||
        (!notification.isPublic &&
          notification.receiverUserId === userId &&
          notification.senderUserId !== userId),
    );

    if (!getNotifications) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return {
      notifications: getNotifications.map((notification: Notification) => ({
        id: notification.id,
        createdAt: notification.createdAt,
        type: notification.type,
        message: notification.message,
        read: notification.read,
        post: notification.post,
        senderUser: notification.senderUser,
      })),
    };
  }),
});
