import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

admin.initializeApp();
const db = getFirestore();

interface ReservationRequestData {
  courtId: string;
  startTime: string;
  endTime: string;
}

exports.submitCourtReservation = onCall(
  async (request: CallableRequest<ReservationRequestData>) => {
    const userId = request.auth?.uid || "test-user-id-123";
    const userEmail = request.auth?.token.email || "test@example.com";

    const { courtId, startTime, endTime } = request.data;

    if (!courtId || !startTime || !endTime) {
      throw new HttpsError(
        "invalid-argument",
        "Missing courtId, startTime, or endTime."
      );
    }

    let startTimestamp: Timestamp;
    let endTimestamp: Timestamp;

    try {
      startTimestamp = Timestamp.fromDate(new Date(startTime));
      endTimestamp = Timestamp.fromDate(new Date(endTime));

      if (endTimestamp.toMillis() <= startTimestamp.toMillis()) {
        throw new HttpsError(
          "invalid-argument",
          "End time must be after start time."
        );
      }

      if (startTimestamp.toMillis() < Date.now()) {
        throw new HttpsError(
          "invalid-argument",
          "Reservation must be in the future."
        );
      }

      const durationMs = endTimestamp.toMillis() - startTimestamp.toMillis();
      const minDuration = 30 * 60 * 1000;
      const maxDuration = 2 * 60 * 60 * 1000;

      if (durationMs < minDuration || durationMs > maxDuration) {
        throw new HttpsError(
          "invalid-argument",
          "Duration must be between 30 minutes and 2 hours."
        );
      }
    } catch (err) {
      console.error("Invalid date format:", err);
      throw new HttpsError(
        "invalid-argument",
        "Invalid date format. Use ISO 8601 string."
      );
    }

    try {
      const conflicts = await db
        .collection("reservations")
        .where("courtId", "==", courtId)
        .where("startTime", "<", endTimestamp)
        .where("endTime", ">", startTimestamp)
        .where("status", "==", "confirmed")
        .get();

      if (!conflicts.empty) {
        throw new HttpsError(
          "already-exists",
          "Court is already booked for that time."
        );
      }
    } catch (error: any) {
      if (error instanceof HttpsError) throw error;
      console.error("Error checking availability:", error);
      throw new HttpsError(
        "internal",
        "Server error while checking availability."
      );
    }

    const newReservation = {
      courtId,
      startTime: startTimestamp,
      endTime: endTimestamp,
      userId,
      userEmail,
      createdAt: FieldValue.serverTimestamp(),
      status: "pending",
    };

    try {
      const docRef = await db.collection("reservations").add(newReservation);
      console.log(`Reservation created with ID: ${docRef.id}`);
      return {
        status: "success",
        message: "Reservation submitted and awaiting confirmation.",
        reservationId: docRef.id,
      };
    } catch (error) {
      console.error("Error saving reservation:", error);
      throw new HttpsError(
        "internal",
        "Server error while saving reservation."
      );
    }
  }
);

exports.getAllReservations = onRequest(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const snapshot = await db.collection("reservations").get();
    const reservations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      status: "success",
      data: reservations,
    });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch reservations.",
    });
  }
});
