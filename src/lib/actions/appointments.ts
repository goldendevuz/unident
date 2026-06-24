"use server";

import { prisma } from "../prisma";
import { AppointmentStatus } from "@prisma/client";
import { syncUser } from "./users";

/**
 * SAFE AUTH WRAPPER
 */
async function requireUser() {
  const user = await syncUser();

  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * SHARED INCLUDE (DRY)
 */
const appointmentInclude = {
  user: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  doctor: {
    select: {
      name: true,
      imageUrl: true,
    },
  },
};

/**
 * TRANSFORMER
 */
function transformAppointment(appointment: any) {
  return {
    ...appointment,
    patientName: `${appointment.user.firstName || ""} ${appointment.user.lastName || ""}`.trim(),
    patientEmail: appointment.user.email,
    doctorName: appointment.doctor.name,
    doctorImageUrl: appointment.doctor.imageUrl || "",
    date: appointment.date.toISOString().split("T")[0],
  };
}

/**
 * ALL APPOINTMENTS (ADMIN)
 */
export async function getAppointments() {
  try {
    const appointments = await prisma.appointment.findMany({
      include: appointmentInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return appointments.map(transformAppointment);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    throw new Error("Failed to fetch appointments");
  }
}

/**
 * USER APPOINTMENTS
 */
export async function getUserAppointments() {
  try {
    const user = await requireUser();

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: user.id,
      },
      include: appointmentInclude,
      orderBy: [
        { date: "asc" },
        { time: "asc" },
      ],
    });

    return appointments.map(transformAppointment);
  } catch (error) {
    console.error("Error fetching user appointments:", error);
    throw new Error("Failed to fetch user appointments");
  }
}

/**
 * USER STATS
 */
export async function getUserAppointmentStats() {
  try {
    const user = await requireUser();

    const [totalCount, completedCount] = await Promise.all([
      prisma.appointment.count({
        where: { userId: user.id },
      }),
      prisma.appointment.count({
        where: {
          userId: user.id,
          status: "COMPLETED",
        },
      }),
    ]);

    return {
      totalAppointments: totalCount,
      completedAppointments: completedCount,
    };
  } catch (error) {
    console.error("Error fetching user appointment stats:", error);

    return {
      totalAppointments: 0,
      completedAppointments: 0,
    };
  }
}

/**
 * BOOKED SLOTS
 */
export async function getBookedTimeSlots(doctorId: string, date: string) {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        date: new Date(date),
        status: {
          in: ["CONFIRMED", "COMPLETED"],
        },
      },
      select: {
        time: true,
      },
    });

    return appointments.map((a) => a.time);
  } catch (error) {
    console.error("Error fetching booked time slots:", error);
    return [];
  }
}

/**
 * BOOK APPOINTMENT
 */
interface BookAppointmentInput {
  doctorId: string;
  date: string;
  time: string;
  reason?: string;
}

export async function bookAppointment(input: BookAppointmentInput) {
  try {
    if (!input.doctorId || !input.date || !input.time) {
      throw new Error("Doctor, date, and time are required");
    }

    const user = await requireUser();

    const appointment = await prisma.appointment.create({
      data: {
        userId: user.id,
        doctorId: input.doctorId,
        date: new Date(input.date),
        time: input.time,
        reason: input.reason || "General consultation",
        status: "CONFIRMED",
      },
      include: appointmentInclude,
    });

    return transformAppointment(appointment);
  } catch (error) {
    console.error("Error booking appointment:", error);
    throw new Error("Failed to book appointment. Please try again later.");
  }
}

/**
 * UPDATE STATUS
 */
export async function updateAppointmentStatus(input: {
  id: string;
  status: AppointmentStatus;
}) {
  try {
    const appointment = await prisma.appointment.update({
      where: {
        id: input.id,
      },
      data: {
        status: input.status,
      },
    });

    return appointment;
  } catch (error) {
    console.error("Error updating appointment:", error);
    throw new Error("Failed to update appointment");
  }
}
