/**
 * Inicialização do Firebase (SDK modular via CDN, sem bundler).
 * Local: frontend/src/ts/firebase.ts
 *
 * A apiKey do Firebase Web NÃO é segredo (ela só identifica o projeto).
 * A segurança de verdade fica nas regras do Firestore (firestore.rules).
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-C2KXegz1MNk7WwmdHRHAL_0tIvsoQrI",
  authDomain: "coleta-de-lixo-quixada.firebaseapp.com",
  projectId: "coleta-de-lixo-quixada",
  storageBucket: "coleta-de-lixo-quixada.firebasestorage.app",
  messagingSenderId: "303867381396",
  appId: "1:303867381396:web:e385a2a7839391d9dd5681",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
