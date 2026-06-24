"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "../prisma";

export async function syncUser() {
  const clerkUser = await currentUser();

  // ❗ guest user = normal state, not error
  if (!clerkUser) {
    return null;
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      clerkId: clerkUser.id,
    },
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      phone: clerkUser.phoneNumbers[0]?.phoneNumber,
    },
  });
}
