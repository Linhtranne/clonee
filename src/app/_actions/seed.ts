"use server";

import { NotificationType } from "@/enums";
import { currentUser } from "@clerk/nextjs";
import { faker } from "@faker-js/faker";
import type { DbUser } from "../(pages)/layout";
import { getUserEmail } from "@/lib/utils";

export async function checkAdmin() {
  const user = await currentUser();
  if (!user) return { success: false };

  const response = await fetch(
    `http://localhost:3001/users?id=${user.id}&email=${getUserEmail(user)}`,
  );

  const dbUser: DbUser | null = (await response.json()) as DbUser | null;

  if (!dbUser) return { success: false };

  return { success: true };
}

export async function createFakeUsers() {
  const isAdmin = await checkAdmin();

  if (!isAdmin) return null;

  const usersToCreate = [];

  for (let i = 1; i <= 100; i++) {
    const id = faker.string.nanoid(11);
    const username = faker.internet.userName();
    const fullname = faker.person.fullName();
    const email = faker.internet.email();
    const image = faker.image.avatarGitHub();
    const bio = faker.lorem.sentence();
    const link = faker.internet.url();

    usersToCreate.push({
      id,
      username,
      fullname,
      email,
      image,
      bio,
      link,
    });
  }

  const response = await fetch("http://localhost:3001/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(usersToCreate),
  });

  const allData = (await response.json()) as DbUser[];

  return allData;
}

export async function getUsersId() {
  const isAdmin = await checkAdmin();

  if (!isAdmin) return null;

  const response = await fetch("http://localhost:3001/users");

  const allData = (await response.json()) as DbUser[];

  return allData.map((user) => user.id);
}

export async function createFakePost() {
  const isAdmin = await checkAdmin();

  if (!isAdmin) return null;

  const userIds = await getUsersId();

  if (!userIds) {
    return { success: false, error: "User information not available." };
  }

  const posts = [];
  for (const userId of userIds) {
    const newPost = {
      authorId: userId,
      text: faker.lorem.sentence(),
    };

    posts.push(newPost);
  }

  const response = await fetch("http://localhost:3001/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(posts),
  });

  (await response.json()) as DbUser[];

  return { success: true };
}

export async function createFakeNotifications() {
  const isAdmin = await checkAdmin();

  if (!isAdmin) return null;

  const user = await currentUser();
  const userIds = await getUsersId();

  if (!userIds) {
    return { success: false, error: "User information not available." };
  }

  const notifications = [];
  for (const userId of userIds) {
    const newNotification = {
      type: NotificationType.LIKE,
      message: '"Your message here"',
      senderUserId: userId,
      receiverUserId: user?.id,
    };

    notifications.push(newNotification);
  }

  const response = await fetch("http://localhost:3001/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notifications),
  });

  (await response.json()) as DbUser[];

  return { success: true };
}

export async function deleteFakeUsers() {
  const isAdmin = await checkAdmin();

  if (!isAdmin) return null;

  const response = await fetch("http://localhost:3001/users", {
    method: "DELETE",
  });

  const alldata = (await response.json()) as DbUser[];

  return alldata;
}

// VERRRRRYYYYY DANGEROUS ☠️

// export async function renameUsernames() {
//   const isAdmin = await checkAdmin();

//   if (!isAdmin) return null;

//   const allUsers = await db.user.findMany({
//     select: {
//       id: true,
//       username: true,
//     },
//   });

//   const updatedUsernames = allUsers.map((user) => ({
//     id: user.id,
//     username: user.username + "_old",
//   }));
//   // return alldata.map(user => user.id)

//   await Promise.all(
//     updatedUsernames.map(async (updatedUser) => {
//       await db.user.update({
//         where: { id: updatedUser.id },
//         data: { username: updatedUser.username },
//       });
//     }),
//   );

//   return { success: true };
// }
