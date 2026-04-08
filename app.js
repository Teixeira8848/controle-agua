import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCRLrik-rHVfDNz_gn2P4oYgraM64iHI0k",
  authDomain: "parametros-de-qualidade.firebaseapp.com",
  projectId: "parametros-de-qualidade",
  storageBucket: "parametros-de-qualidade.firebasestorage.app",
  messagingSenderId: "329194124166",
  appId: "1:329194124166:web:50d3685ef680284c5fb207",
  measurementId: "G-E8WPP91D8D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let dadosUsuarioLocal = null;

// 2. ATIVAÇÃO DA PERSISTÊNCIA (Resolve o erro do celular "esquecer" o login)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Persistência local ativa.");
  })
  .catch((error) => console.error("Erro na persistência:", error));

// Captura o resultado do redirecionamento (essencial para Chrome/Safari no celular)
getRedirectResult(auth).catch((error) => {
    console.error("Erro ao recuperar resultado do login:", error);
});

// 3. GERENCIADOR DE ROTAS E AUTENTICAÇÃO
onAuthStateChanged(auth, async (user) => {
  const path = window.location.pathname;
  
  if (user) {
    // USUÁRIO LOGADO
    const docRef = doc(db, "usuarios", user.uid);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        dadosUsuarioLocal = docSnap.data();
        
        // Se estiver no app.html, atualiza a interface
        if (document.getElementById("userNameHeader")) {
          atualizarUIPerfil(user, dadosUsuarioLocal);
        }
        
        // Redireciona para o App se estiver na tela de login
        if (path.endsWith("index.html") || path === "/") {
          window.location.href = "app.html";
        }
      } else {
        // Logou mas não tem cadastro no Firestore ainda
        if (!path.endsWith("cadastro.html")) {
          window.location.href = "cadastro.html";
        }
      }
    } catch (e) { console.error("Erro ao buscar dados do usuário:", e); }
  } else {
    // USUÁRIO DESLOGADO
    // Trava de segurança: aguarda 4 segundos antes de expulsar (tempo do celular processar o login)
    if (!path.endsWith("index.html") && path !== "/") {
       setTimeout(() => {
           if (!auth.currentUser) window.location.href = "index.html";
       }, 4000);
    }
  }
});

// 4. FUNÇÕES DE INTERFACE (UI)
function atualizarUIPerfil(user, dados) {
    if (document.getElementById("userNameHeader")) document.getElementById