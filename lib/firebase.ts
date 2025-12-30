import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCrAQJlkdCDNW0VEKMBPCXMtw4u2HWJ-ek",
  authDomain: "financetracker-28567.firebaseapp.com",
  projectId: "financetracker-28567",
  storageBucket: "financetracker-28567.firebasestorage.app",
  messagingSenderId: "492810648792",
  appId: "1:492810648792:web:d9d78b6aa735e83aa72bad"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);