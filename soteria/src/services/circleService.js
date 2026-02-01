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
      members: circleData.members || [], // Use provided members or empty array
      createdAt: new Date()
    });

    console.log("Circle created with ID:", circleRef.id);
    return { id: circleRef.id, name: circleData.name, members: circleData.members || [], ownerId: userId };
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
    console.log("Fetching circles for user:", userId);

    // Get circles where user is the owner
    const ownerQuery = query(
      collection(db, 'circles'),
      where('ownerId', '==', userId)
    );
    const ownerSnapshot = await getDocs(ownerQuery);
    console.log("Owner circles count:", ownerSnapshot.size);

    // Get circles where user is a member
    const memberQuery = query(
      collection(db, 'circles'),
      where('members', 'array-contains', { userId })
    );
    const memberSnapshot = await getDocs(memberQuery);
    console.log("Member circles count:", memberSnapshot.size);

    const circles = [];
    ownerSnapshot.forEach(doc => {
      console.log("Owner circle:", doc.id, doc.data());
      circles.push({ id: doc.id, ...doc.data() });
    });
    memberSnapshot.forEach(doc => {
      console.log("Member circle:", doc.id, doc.data());
      circles.push({ id: doc.id, ...doc.data() });
    });

    console.log("Total circles found:", circles.length);
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

/**
 * Update user's profile data in all their circles
 * @param {string} userId - User ID
 * @param {object} profileData - {name, phone}
 */
export const updateMemberProfileInCircles = async (userId, profileData) => {
  try {
    console.log("Updating member profile in all circles for user:", userId);

    // Get all circles to check membership
    const allCirclesQuery = query(collection(db, 'circles'));
    const allCirclesSnapshot = await getDocs(allCirclesQuery);

    const updatePromises = [];

    // Update in all circles where user is a member
    allCirclesSnapshot.forEach((circleDoc) => {
      const circleData = circleDoc.data();
      const members = circleData.members || [];

      // Find if this user is a member
      const memberIndex = members.findIndex(m => m.userId === userId || m.email === profileData.email);

      if (memberIndex !== -1) {
        // Update the member's data
        const updatedMembers = [...members];
        updatedMembers[memberIndex] = {
          ...updatedMembers[memberIndex],
          name: profileData.name,
          phone: profileData.phone || updatedMembers[memberIndex].phone || "",
        };

        // Update the circle with new members array
        const circleRef = doc(db, 'circles', circleDoc.id);
        updatePromises.push(
          updateDoc(circleRef, { members: updatedMembers })
        );
      }
    });

    await Promise.all(updatePromises);
    console.log(`Updated profile in ${updatePromises.length} circles`);
  } catch (error) {
    console.error("Error updating member profile in circles:", error);
    throw error;
  }
};