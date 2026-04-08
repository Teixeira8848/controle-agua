import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

const paginaAtual = window.location.pathname;

// -------------------------------------------------------------------
// 1. GERENCIADOR DE ROTAS (O "Guarda de Trânsito")
// -------------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      if (paginaAtual.endsWith("index.html") || paginaAtual.endsWith("cadastro.html") || paginaAtual === "/") {
        window.location.href = "app.html";
      }
    } else {
      if (!paginaAtual.endsWith("cadastro.html")) {
        window.location.href = "cadastro.html";
      }
    }
  } else {
    if (!paginaAtual.endsWith("index.html") && paginaAtual !== "/") {
      window.location.href = "index.html";
    }
  }
});

// -------------------------------------------------------------------
// 2. TELA DE LOGIN (index.html)
// -------------------------------------------------------------------
const btnLogin = document.getElementById("loginGoogleBtn");
if (btnLogin) {
  btnLogin.addEventListener("click", async () => {
    try {
      btnLogin.innerText = "Abrindo Google...";
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro ao tentar logar com o Google.");
      btnLogin.innerText = "Entrar com Google";
    }
  });
}

// -------------------------------------------------------------------
// 3. TELA DE CADASTRO (cadastro.html)
// -------------------------------------------------------------------
// O JavaScript agora "fisga" o botão diretamente, sem bloqueios de tempo.
const btnSalvar = document.getElementById("btnSalvar");

if (btnSalvar) {
  btnSalvar.addEventListener("click", async (event) => {
    event.preventDefault(); // Impede a página de recarregar sozinha
    
    const user = auth.currentUser;
    if (!user) {
      alert("Sincronizando com o Google... clique novamente em 1 segundo.");
      return; 
    }

    const nome = document.getElementById("nome").value;
    const fotoInput = document.getElementById("foto");

    if (!nome) {
      alert("Por favor, digite o seu nome para os relatórios.");
      return;
    }

    try {
      // Trava o botão para não enviar 2 vezes
      btnSalvar.innerText = "Salvando...";
      btnSalvar.disabled = true;

      // Salva no banco de dados usando o ID único do Google
      await setDoc(doc(db, "usuarios", user.uid), {
        nome: nome,
        email: user.email,
        foto: fotoInput.files[0] ? fotoInput.files[0].name : null,
        dataCadastro: new Date()
      });
      
      alert("Perfil criado com sucesso!");
      window.location.href = "app.html"; 
      
    } catch (err) {
      console.error("Erro ao salvar no banco:", err);
      alert("Erro de conexão. Verifique a internet e tente novamente.");
      btnSalvar.innerText = "Salvar";
      btnSalvar.disabled = false;
    }
  });
}