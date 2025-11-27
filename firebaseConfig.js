import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase
// Você precisa substituir as partes entre aspas pelas suas chaves reais
const firebaseConfig = {
  apiKey: "AIzaSyA_M04NrgkNIDbLPNEJKpK5NtLy07lFfpgQUI",
  authDomain: "meu-app-fb762.firebaseapp.com",
  projectId: "meu-app-fb762",
  storageBucket: "meu-app-fb762.firebasestorage.app",
  messagingSenderId: "487421387598",
  appId: "1:487421387598:web:34c71a4c52915bd9d2f41fD"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta o Banco de Dados para ser usado no App.js
export const db = getFirestore(app);