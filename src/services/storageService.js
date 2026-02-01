import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Upload profile picture to Firebase Storage
 * @param {string} userId - User's Firebase Auth UID
 * @param {string} imageUri - Local URI of selected image
 * @returns {Promise<string>} - Download URL of uploaded image
 */
export const uploadProfilePicture = async (userId, imageUri) => {
  try {
    // Create a unique filename with timestamp
    const filename = `profile_${Date.now()}.jpg`;
    const storageRef = ref(storage, `profile-pictures/${userId}/${filename}`);

    // Fetch the image and convert to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload the blob to Firebase Storage
    await uploadBytes(storageRef, blob);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw new Error('Failed to upload profile picture. Please try again.');
  }
};

/**
 * Delete profile picture from Firebase Storage
 * @param {string} photoURL - Full download URL of image to delete
 * @returns {Promise<void>}
 */
export const deleteProfilePicture = async (photoURL) => {
  try {
    if (!photoURL) return;

    // Extract the storage path from the download URL
    // Firebase Storage URLs have the format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const url = new URL(photoURL);
    const pathMatch = url.pathname.match(/\/o\/(.+)$/);

    if (pathMatch && pathMatch[1]) {
      const path = decodeURIComponent(pathMatch[1]);
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    }
  } catch (error) {
    // Don't throw error if deletion fails - it's not critical
    console.error('Error deleting profile picture:', error);
  }
};
