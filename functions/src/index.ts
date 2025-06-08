import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
} from "firebase-functions/v2/firestore";
import type { CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getMessaging } from "firebase-admin/messaging";
import { onObjectFinalized } from "firebase-functions/v2/storage";


admin.initializeApp();
const db = getFirestore();

interface ReservationRequestData {
  courtId: string;
  startTime: string;
  endTime: string;
}

// 3. Funkcije za upravljanje igrišč (Courts)

/**
 * Pridobi seznam vseh razpoložljivih igrišč.
 * Dostopno vsem uporabnikom.
 */
exports.listCourts = onCall(async () => {
  try {
    const snapshot = await db.collection("courts").get();
    const courts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { status: "success", data: courts };
  } catch (error) {
    console.error("Error fetching courts:", error);
    throw new HttpsError("internal", "Napaka pri pridobivanju seznama igrišč.");
  }
});

/**
 * Pridobi podrobnosti o specifičnem igrišču po ID-ju.
 * Dostopno vsem uporabnikom.
 */
exports.getCourtDetails = onCall(
  async (request: CallableRequest<{ courtId: string }>) => {
    const { courtId } = request.data;

    if (!courtId) {
      throw new HttpsError("invalid-argument", "Manjka ID igrišča.");
    }

    try {
      const courtDoc = await db.collection("courts").doc(courtId).get();

      if (!courtDoc.exists) {
        throw new HttpsError("not-found", "Igrišče ni najdeno.");
      }

      return { status: "success", data: { id: courtDoc.id, ...courtDoc.data() } };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error("Error fetching court details:", error);
      throw new HttpsError(
        "internal",
        "Napaka pri pridobivanju podrobnosti o igrišču."
      );
    }
  }
);

// 4. Funkcije za upravljanje rezervacij (Reservations)

/**
 * Oddaja novo rezervacijo igrišča.
 * Preverja razpoložljivost in veljavnost časovnih intervalov.
 */
exports.submitCourtReservation = onCall(
  async (request: CallableRequest<ReservationRequestData>) => {
    const userId = request.auth?.uid || "test-user-id-123";
    const userEmail = request.auth?.token.email || "test@example.com";

    const { courtId, startTime, endTime } = request.data;

    if (!courtId || !startTime || !endTime) {
      throw new HttpsError(
        "invalid-argument",
        "Manjka ID igrišča, začetni ali končni čas."
      );
    }

    const courtRef = db.collection("courts").doc(courtId);
    const courtDoc = await courtRef.get();

    if (!courtDoc.exists) {
      throw new HttpsError("not-found", "Navedeno igrišče ne obstaja.");
    }
    const courtData = courtDoc.data();
    const courtName = courtData?.name || "Neznano igrišče"; 

    let startTimestamp: Timestamp;
    let endTimestamp: Timestamp;

    try {
      startTimestamp = Timestamp.fromDate(new Date(startTime));
      endTimestamp = Timestamp.fromDate(new Date(endTime));

      if (endTimestamp.toMillis() <= startTimestamp.toMillis()) {
        throw new HttpsError(
          "invalid-argument",
          "Končni čas mora biti po začetnem času."
        );
      }

      if (startTimestamp.toMillis() < Date.now() - (5 * 60 * 1000)) {
        throw new HttpsError(
          "invalid-argument",
          "Rezervacija mora biti v prihodnosti."
        );
      }

      const durationMs = endTimestamp.toMillis() - startTimestamp.toMillis();
      const minDuration = 30 * 60 * 1000; // 30 minut
      const maxDuration = 2 * 60 * 60 * 1000; // 2 uri

      if (durationMs < minDuration || durationMs > maxDuration) {
        throw new HttpsError(
          "invalid-argument",
          "Trajanje mora biti med 30 minutami in 2 urama."
        );
      }


    } catch (err) {
      console.error("Invalid date format or time validation:", err);
      throw new HttpsError(
        "invalid-argument",
        `Neveljaven format datuma ali časovna omejitev: ${err instanceof Error ? err.message : 'Neznana napaka'}`
      );
    }

    try {
      const conflicts = await db
        .collection("reservations")
        .where("courtId", "==", courtId)
        .where("startTime", "<", endTimestamp)
        .where("endTime", ">", startTimestamp)
        .where("status", "in", ["confirmed", "pending"])
        .get();

      if (!conflicts.empty) {
        throw new HttpsError(
          "already-exists",
          "Igrišče je v tem terminu že zasedeno."
        );
      }
    } catch (error: any) {
      if (error instanceof HttpsError) throw error; 
      console.error("Error checking availability:", error);
      throw new HttpsError(
        "internal",
        "Napaka strežnika med preverjanjem razpoložljivosti."
      );
    }

    const newReservation = {
      courtId,
      courtName, 
      startTime: startTimestamp,
      endTime: endTimestamp,
      userId,
      userEmail,
      createdAt: FieldValue.serverTimestamp(),
      status: "pending",
    };

    // Shranjevanje rezervacije
    try {
      const docRef = await db.collection("reservations").add(newReservation);
      console.log(`Reservation created with ID: ${docRef.id}`);
      return {
        status: "success",
        message: "Rezervacija je poslana in čaka na potrditev.",
        reservationId: docRef.id,
      };
    } catch (error) {
      console.error("Error saving reservation:", error);
      throw new HttpsError(
        "internal",
        "Napaka strežnika med shranjevanjem rezervacije."
      );
    }
  }
);

/**
 * Pridobi vse rezervacije za trenutno prijavljenega uporabnika.
 * Uporabnik lahko vidi samo svoje rezervacije.
 */
exports.getUserReservations = onCall(
  async (request: CallableRequest<{}>) => {
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError("unauthenticated", "Uporabnik ni prijavljen.");
    }

    try {
      const snapshot = await db
        .collection("reservations")
        .where("userId", "==", userId)
        .orderBy("startTime", "desc")
        .get();

      const reservations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { reservations };
    } catch (error) {
      console.error("Napaka pri pridobivanju rezervacij:", error);
      throw new HttpsError("internal", "Napaka na strežniku.");
    }
  }
);

/**
 * Omogoča uporabniku preklic lastne rezervacije.
 * Preverja lastništvo in časovne pogoje za preklic.
 */
exports.cancelReservation = onCall(
  async (request: CallableRequest<{ reservationId: string }>) => {
    const userId = request.auth?.uid;
    const { reservationId } = request.data;

    if (!userId) {
      throw new HttpsError("unauthenticated", "Uporabnik ni prijavljen.");
    }
    if (!reservationId) {
      throw new HttpsError("invalid-argument", "Manjka ID rezervacije.");
    }

    const reservationRef = db.collection("reservations").doc(reservationId);

    try {
      const reservationDoc = await reservationRef.get();

      if (!reservationDoc.exists) {
        throw new HttpsError("not-found", "Rezervacija ni najdena.");
      }

      const reservationData = reservationDoc.data();

      if (reservationData?.userId !== userId) {
        // Omogočite administratorjem preklic katere koli rezervacije
        if (!request.auth?.token.admin) {
            throw new HttpsError("permission-denied", "Nimate dovoljenja za preklic te rezervacije.");
        }
      }

      if (reservationData?.status === "cancelled" || reservationData?.status === "completed") {
        throw new HttpsError("failed-precondition", "Te rezervacije ni mogoče preklicati v trenutnem stanju.");
      }

      const startTimeMillis = (reservationData?.startTime as Timestamp)?.toMillis();
      const nowMillis = Date.now();
      const cancellationCutoff = 24 * 60 * 60 * 1000; // 24 ur v milisekundah

      // Upoštevajte pravilo 24 ur samo za potrjene rezervacije, če klicatelj ni admin
      if (reservationData?.status === "confirmed" && (startTimeMillis && (startTimeMillis - nowMillis < cancellationCutoff)) && !request.auth?.token.admin) {
        throw new HttpsError("failed-precondition", "Potrjene rezervacije ni mogoče preklicati manj kot 24 ur pred začetkom.");
      }

      await reservationRef.update({
        status: "cancelled",
        cancelledAt: FieldValue.serverTimestamp(),
      });

      return { status: "success", message: "Rezervacija uspešno preklicana." };
    } catch (error: any) {
      if (error instanceof HttpsError) throw error;
      console.error("Error cancelling reservation:", error);
      throw new HttpsError(
        "internal",
        "Napaka strežnika med preklicom rezervacije."
      );
    }
  }
);

/**
 * Pridobi vse rezervacije (običajno za administrativni pregled).
 * Lahko omejite dostop samo za administratorje z varnostnimi pravili Firestore.
 */
exports.getAllReservations = onRequest(async (req, res) => {
  // CORS headers for onRequest functions
  res.set('Access-Control-Allow-Origin', '*'); // You might want to restrict this in production
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    // Handle preflight request
    res.status(204).send('');
    return;
  }

  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // Preverjanje avtorizacije za administratorje
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
      res.status(403).send("Forbidden: Authorization token missing.");
      return;
  }

  try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      if (!decodedToken.admin) { // Preverite custom claim 'admin: true'
          res.status(403).send("Forbidden: Only administrators can access this resource.");
          return;
      }
  } catch (error) {
      console.error("Error verifying ID token:", error);
      res.status(403).send("Forbidden: Invalid or expired token.");
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


// 5. Administrativne funkcije za rezervacije

/**
 * Preveri, ali ima klicatelj administratorske pravice (custom claim 'admin: true').
 * To funkcijo lahko kličejo vsi avtenticirani uporabniki.
 */
exports.isAdmin = onCall(async (request: CallableRequest<any>) => {
    if (!request.auth) {
        return { status: 'success', isAdmin: false, message: 'Uporabnik ni avtenticiran.' };
    }

    const isAdminClaim = request.auth.token?.admin || false; 

    return { status: 'success', isAdmin: isAdminClaim };
});


/**
 * Potrdi rezervacijo (samo za administratorje).
 * Zahteva preverjanje Firebase Custom Claims za admin vlogo.
 */
exports.confirmReservation = onCall(
  async (request: CallableRequest<{ reservationId: string }>) => {
    if (!request.auth?.token.admin) {
      throw new HttpsError("permission-denied", "Nimate dovoljenja za to operacijo.");
    }

    const { reservationId } = request.data;
    if (!reservationId) {
      throw new HttpsError("invalid-argument", "Manjka ID rezervacije.");
    }

    const reservationRef = db.collection("reservations").doc(reservationId);
    try {
      await reservationRef.update({ status: "confirmed" });
      return { status: "success", message: "Rezervacija potrjena." };
    } catch (error) {
      console.error("Error confirming reservation:", error);
      throw new HttpsError("internal", "Napaka pri potrjevanju rezervacije.");
    }
  }
);


/**
 * Doda uporabniku 'admin' custom claim.
 * To funkcijo lahko kliče samo uporabnik, ki že ima 'admin' custom claim.
 * Uporablja se za dodeljevanje administratorskih pravic drugim uporabnikom.
 */
exports.addAdminRole = onCall(async (request: CallableRequest<{ email?: string }>) => {
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Samo prijavljeni uporabniki lahko kličejo to funkcijo."
        );
    }

    if (!request.auth.token.admin) {
        throw new HttpsError(
            "permission-denied",
            "Samo administratorji lahko dodelijo admin vloge."
        );
    }

    const email = request.data?.email; 
    if (!email || typeof email !== "string") {
        throw new HttpsError(
            "invalid-argument",
            "Potreben je veljaven email naslov."
        );
    }

    try {
        const user = await admin.auth().getUserByEmail(email);

        await admin.auth().setCustomUserClaims(user.uid, { admin: true });

        await admin.auth().revokeRefreshTokens(user.uid);

        return {
            status: "success",
            message: `Uporabnik ${email} je zdaj administrator.`,
        };
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            throw new HttpsError(
                "not-found",
                `Uporabnik z emailom ${email} ni najden.`
            );
        }
        console.error("Napaka pri dodeljevanju admin role:", error);
        throw new HttpsError(
            "internal",
            "Napaka strežnika pri dodeljevanju admin role."
        );
    }
});


// 6. Firestore Sprožilci (Triggers) za rezervacije

/**
 * Sprožilec, ki se aktivira ob ustvarjanju nove rezervacije.
 * Beleži dogodek v logih.
 */
exports.onReservationCreated = onDocumentCreated(
  "reservations/{reservationId}",
  async (event) => {
    const reservation = event.data?.data();
    if (!reservation) return;

    console.log(
      `✅ Nova rezervacija ustvarjena z ID-jem: ${event.params.reservationId}`
    );
    console.log("Podatki rezervacije:", reservation);
  }
);

/**
 * Sprožilec, ki se aktivira ob posodabljanju rezervacije.
 * Beleži spremembe statusa.
 */
exports.onReservationUpdated = onDocumentUpdated(
  "reservations/{reservationId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const reservationId = event.params.reservationId;

    if (!before || !after) return;

    if (before.status !== after.status) {
      console.log(
        `🔄 Status rezervacije ${reservationId} spremenjen iz "${before.status}" v "${after.status}"`
      );
    }
  }
);

/**
 * Sprožilec, ki se aktivira ob brisanju rezervacije.
 * Beleži dogodek v logih.
 */
exports.onReservationDeleted = onDocumentDeleted(
  "reservations/{reservationId}",
  async (event) => {
    const reservation = event.data?.data();
    const reservationId = event.params.reservationId;

    console.log(`🗑️ Rezervacija ${reservationId} izbrisana`);
    console.log("Izbrisani podatki rezervacije:", reservation);
  }
);

// 7. Funkcije razporeda (Scheduler functions)

/**
 * Funkcija, ki se izvaja vsakih 30 minut in čisti zastarele čakajoče rezervacije.
 * Izbriše rezervacije s statusom "pending", ki so se morale začeti pred več kot eno uro.
 */
exports.cleanOldReservations = onSchedule("every 30 minutes", async () => {
  const now = Date.now();
  const cutoff = new Date(now - 60 * 60 * 1000); // 1 ura nazaj

  const snapshot = await db
    .collection("reservations")
    .where("status", "==", "pending")
    .where("startTime", "<", cutoff)
    .get();

  const batch = db.batch();
  snapshot.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  console.log(`🧹 Odstranjenih ${snapshot.size} zastarelih čakajočih rezervacij`);
});

// 8. Funkcije za shranjevanje (Storage functions)

/**
 * Sprožilec, ki se aktivira ob finalizaciji (nalaganju) objekta v določenem Storage bucketu.
 * Uporabno za obdelavo naloženih slik igrišč.
 */
exports.onFileUpload = onObjectFinalized(
  {
    bucket: "faasnaloge-b3081.firebasestorage.app", 
  },
  async (event) => {
    const file = event.data;
    if (!file) {
      console.log("No file data received for onObjectFinalized.");
      return;
    }
    console.log(`📂 Nova datoteka naložena: ${file.name} (Velikost: ${file.size} bajtov, vsebina: ${file.contentType})`);
  }
);


// 9. Druge obvestilne funkcije

/**
 * Sprožilec, ki se aktivira, ko se status rezervacije spremeni v "confirmed".
 * Pošlje FCM obvestilo uporabniku.
 */
exports.notifyOnConfirmation = onDocumentUpdated(
  "reservations/{reservationId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (
      before &&
      after &&
      before.status !== after.status &&
      after.status === "confirmed"
    ) {
      const fcmToken = after.fcmToken; 
      if (fcmToken) {
        try {
          await getMessaging().send({
            token: fcmToken,
            notification: {
              title: "Rezervacija potrjena",
              body: "Vaša rezervacija je potrjena.",
            },
          });
          console.log("📣 Poslano FCM obvestilo za potrditev rezervacije.");
        } catch (fcmError) {
          console.error("Napaka pri pošiljanju FCM obvestila:", fcmError);
        }
      } else {
        console.warn(`Ni FCM žetona za rezervacijo ${event.params.reservationId}, obvestilo ni poslano.`);
      }
    }
  }
);