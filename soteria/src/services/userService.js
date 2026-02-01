import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
      phone: userData.phone || '',
      circles: [], // Empty array initially
      createdAt: new Date()
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
 * Update user profile
 * @param {string} userId - Firebase Auth UID
 * @param {object} updates - Fields to update
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, updates);
    console.log("User profile updated");
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * Search users by name or email prefix
 * @param {string} searchTerm - What the user typed
 * @returns {Promise<array>} Matching user objects {id, name, email, phone}
 */
export const searchUsers = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length === 0) return [];

  const term = searchTerm.trim();
  const termLower = term.toLowerCase();

  // Prefix match on name (as typed) and email (lowercased)
  const nameQuery = query(
    collection(db, 'users'),
    where('name', '>=', term),
    where('name', '<', term + '\uffff')
  );

  const emailQuery = query(
    collection(db, 'users'),
    where('email', '>=', termLower),
    where('email', '<', termLower + '\uffff')
  );

  const [nameSnap, emailSnap] = await Promise.all([
    getDocs(nameQuery),
    getDocs(emailQuery)
  ]);

  // Merge and deduplicate by doc ID
  const usersMap = new Map();
  nameSnap.forEach(doc => {
    if (!usersMap.has(doc.id)) usersMap.set(doc.id, { id: doc.id, ...doc.data() });
  });
  emailSnap.forEach(doc => {
    if (!usersMap.has(doc.id)) usersMap.set(doc.id, { id: doc.id, ...doc.data() });
  });

  return Array.from(usersMap.values());
};
