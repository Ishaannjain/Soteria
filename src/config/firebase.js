import { initializeApp } from 'firebase/app';
   import { getAuth } from 'firebase/auth';
   import { getFirestore } from 'firebase/firestore';

   // Your Firebase configuration (paste from Firebase Console)
 const firebaseConfig = {
  apiKey: "AIzaSyDDWD-l8JeZt8xSKCLydmUgOdAh0obpE64",
  authDomain: "soteria-20e8e.firebaseapp.com",
  projectId: "soteria-20e8e",
  storageBucket: "soteria-20e8e.firebasestorage.app",
  messagingSenderId: "647120633668",
  appId: "1:647120633668:web:a4c49f32ba96e8a5066111",
  measurementId: "G-4B35GC3EP5"
};

   // Initialize Firebase
   const app = initializeApp(firebaseConfig);

   // Initialize services
   export const auth = getAuth(app);
   export const db = getFirestore(app);
   export default app;