import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Create a new user profile in Firestore
 * @param {string} userId - Firebase Auth UID
 * @param {object} userData - {email, name, phone}
 */
export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      email: userData.email,
      name: userData.name || '',
      username: userData.username || '',
      phone: userData.phone || '',
      photoURL: userData.photoURL || '',
      circles: [], // Empty array initially
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log("User profile created successfully");
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

/**
 * Get user profile data
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<object>} User data
 */
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    } else {
      throw new Error("User profile not found");
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

/**
 * Update user profile (creates if doesn't exist)
 * @param {string} userId - Firebase Auth UID
 * @param {object} updates - Fields to update
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    // Use setDoc with merge to create document if it doesn't exist
    await setDoc(userRef, {
      ...updates,
      updatedAt: new Date()
    }, { merge: true });
    console.log("User profile updated");
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};