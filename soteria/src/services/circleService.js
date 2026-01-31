import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  arrayUnion,
  query,
  where 
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Create a new circle
 * @param {string} userId - Owner's user ID
 * @param {object} circleData - {name}
 * @returns {Promise<string>} Circle ID
 */
export const createCircle = async (userId, circleData) => {
  try {
    const circleRef = await addDoc(collection(db, 'circles'), {
      name: circleData.name,
      ownerId: userId,
      members: [], // Owner will be added separately
      createdAt: new Date()
    });
    
    console.log("Circle created with ID:", circleRef.id);
    return circleRef.id;
  } catch (error) {
    console.error("Error creating circle:", error);
    throw error;
  }
};

/**
 * Add a member to a circle
 * @param {string} circleId - Circle ID
 * @param {object} memberData - {userId, name, email, phone}
 */
export const addMemberToCircle = async (circleId, memberData) => {
  try {
    const circleRef = doc(db, 'circles', circleId);
    await updateDoc(circleRef, {
      members: arrayUnion(memberData)
    });
    console.log("Member added to circle");
  } catch (error) {
    console.error("Error adding member:", error);
    throw error;
  }
};

/**
 * Get all circles for a user
 * @param {string} userId - User ID
 * @returns {Promise<array>} Array of circles
 */
export const getUserCircles = async (userId) => {
  try {
    // Get circles where user is the owner
    const ownerQuery = query(
      collection(db, 'circles'), 
      where('ownerId', '==', userId)
    );
    const ownerSnapshot = await getDocs(ownerQuery);
    
    // Get circles where user is a member
    const memberQuery = query(
      collection(db, 'circles'),
      where('members', 'array-contains', { userId })
    );
    const memberSnapshot = await getDocs(memberQuery);
    
    const circles = [];
    ownerSnapshot.forEach(doc => {
      circles.push({ id: doc.id, ...doc.data() });
    });
    memberSnapshot.forEach(doc => {
      circles.push({ id: doc.id, ...doc.data() });
    });
    
    return circles;
  } catch (error) {
    console.error("Error fetching circles:", error);
    throw error;
  }
};

/**
 * Get a specific circle
 * @param {string} circleId - Circle ID
 * @returns {Promise<object>} Circle data
 */
export const getCircle = async (circleId) => {
  try {
    const circleRef = doc(db, 'circles', circleId);
    const circleSnap = await getDoc(circleRef);
    
    if (circleSnap.exists()) {
      return { id: circleSnap.id, ...circleSnap.data() };
    } else {
      throw new Error("Circle not found");
    }
  } catch (error) {
    console.error("Error fetching circle:", error);
    throw error;
  }
};

/**
 * Delete a circle
 * @param {string} circleId - Circle ID
 */
export const deleteCircle = async (circleId) => {
  try {
    const circleRef = doc(db, 'circles', circleId);
    await deleteDoc(circleRef);
    console.log("Circle deleted");
  } catch (error) {
    console.error("Error deleting circle:", error);
    throw error;
  }
};