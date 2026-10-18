/**
 * Tipos mínimos para os módulos do Firebase carregados por URL (CDN).
 * Sem bundler, o TypeScript não conhece essas URLs; aqui dizemos que existem.
 */
declare module "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js" {
  export const initializeApp: any;
}

declare module "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js" {
  export const getAuth: any;
  export const createUserWithEmailAndPassword: any;
  export const signInWithEmailAndPassword: any;
  export const signOut: any;
  export const onAuthStateChanged: any;
  export const updateProfile: any;
  export const sendPasswordResetEmail: any;
  export const setPersistence: any;
  export const browserLocalPersistence: any;
  export const browserSessionPersistence: any;
}

declare module "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js" {
  export const getFirestore: any;
  export const collection: any;
  export const doc: any;
  export const getDoc: any;
  export const getDocs: any;
  export const addDoc: any;
  export const setDoc: any;
  export const updateDoc: any;
  export const deleteDoc: any;
  export const query: any;
  export const where: any;
  export const orderBy: any;
  export const limit: any;
  export const serverTimestamp: any;
}