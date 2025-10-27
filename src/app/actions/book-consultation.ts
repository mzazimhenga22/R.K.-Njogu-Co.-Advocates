
'use server';

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Admin SDK
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

type Advocate = {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

type ConsultationPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  advocates: Advocate[];
};

export async function bookConsultation(payload: ConsultationPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const clientsRef = collection(db, 'clients');
    const appointmentsRef = collection(db, 'appointments');

    // 1. Find or create the client
    const q = query(clientsRef, where('email', '==', payload.email));
    const querySnapshot = await getDocs(q);

    let clientId: string;
    if (querySnapshot.empty) {
      // Client does not exist, create a new one
      const newClientDoc = await addDoc(clientsRef, {
        firstName: payload.firstName,
        lastName: payload.lastName,
        name: `${payload.firstName} ${payload.lastName}`,
        email: payload.email,
        phoneNumber: payload.phone,
        createdAt: new Date().toISOString(),
      });
      clientId = newClientDoc.id;
    } else {
      // Client exists, use their ID
      clientId = querySnapshot.docs[0].id;
    }

    // 2. Find an advocate to assign the appointment to
    const adminOrLawyer = payload.advocates.find(
      (u) => u.role === 'admin' || u.role === 'lawyer'
    );
    if (!adminOrLawyer) {
      throw new Error('No available advocates to assign the consultation.');
    }
    const assignedUserId = adminOrLawyer.id;
    
    // 3. Create the appointment
    const appointmentTime = new Date(); // Schedule for now, admin will adjust
    appointmentTime.setHours(appointmentTime.getHours() + 1); // e.g., 1 hour from now

    const newAppointment = {
      title: `Consultation: ${payload.firstName} ${payload.lastName}`,
      description: `New consultation request from landing page.\n\nClient Message:\n${payload.message}`,
      clientId: clientId,
      userId: assignedUserId,
      startTime: Timestamp.fromDate(new Date()),
      endTime: Timestamp.fromDate(appointmentTime),
      createdAt: serverTimestamp(),
    };

    const appointmentDocRef = await addDoc(appointmentsRef, newAppointment);
    
    // 4. Create a notification for the assigned advocate
    await addDoc(collection(db, `users/${assignedUserId}/notifications`), {
      userId: assignedUserId,
      message: `New consultation request from ${payload.firstName} ${payload.lastName}.`,
      link: `/dashboard/calendar`,
      read: false,
      createdAt: serverTimestamp(),
    });


    // 5. Log the activity
    await addDoc(collection(db, 'activities'), {
        type: 'appointment:request',
        message: `New consultation request from ${payload.firstName} ${payload.lastName}.`,
        actorName: 'Website Visitor',
        meta: {
            appointmentId: appointmentDocRef.id,
            clientId: clientId,
            assignedUserId: assignedUserId,
        },
        timestamp: serverTimestamp(),
    });


    return { success: true };
  } catch (e: any) {
    console.error('Error in bookConsultation server action:', e);
    return { success: false, error: e.message || 'An internal error occurred.' };
  }
}
