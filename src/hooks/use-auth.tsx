
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFirebase, useUser as useFirebaseUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

type UserProfile = {
    id: string; // Add id to user profile
    firstName: string;
    lastName: string;
    email: string;
    role: "admin" | "lawyer" | "secretary"; // Use lowercase roles
    avatar?: string;
    name: string;
};

type AuthContextType = {
    user: UserProfile | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } = useFirebaseUser();
    const { firestore } = useFirebase();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (firebaseUser) {
                const userDocRef = doc(firestore, 'users', firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    // Store the role in lowercase
                    const role = (data.role || 'lawyer').toLowerCase();
                    setUserProfile({
                        id: firebaseUser.uid,
                        ...data,
                        name: `${data.firstName} ${data.lastName}`,
                        email: data.email,
                        role: role as "admin" | "lawyer" | "secretary",
                        avatar: `https://i.pravatar.cc/150?u=${firebaseUser.uid}`
                    } as UserProfile);
                } else {
                    // This can happen if the user record is created in Auth but not yet in Firestore
                    const role = firebaseUser.email === 'waitathukaranja@gmail.com' ? 'admin' : 'lawyer';
                     const firstName = firebaseUser.displayName?.split(' ')[0] || "New";
                     const lastName = firebaseUser.displayName?.split(' ')[1] || "User";
                     const newUserProfile: UserProfile = {
                        id: firebaseUser.uid,
                        email: firebaseUser.email || "",
                        name: `${firstName} ${lastName}`,
                        role: role,
                        firstName,
                        lastName,
                        avatar: `https://i.pravatar.cc/150?u=${firebaseUser.uid}`
                     };
                     // Also create the document in firestore now
                     await setDoc(userDocRef, {
                         firstName,
                         lastName,
                         email: newUserProfile.email,
                         role: newUserProfile.role,
                     });
                     setUserProfile(newUserProfile);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        };

        if (!isFirebaseUserLoading) {
            fetchUserProfile();
        }

    }, [firebaseUser, firestore, isFirebaseUserLoading]);
    
    if(loading || isFirebaseUserLoading) {
        return (
             <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center space-y-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <AuthContext.Provider value={{ user: userProfile, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
