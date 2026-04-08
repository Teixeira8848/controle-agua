import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, addDoc, collection, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let usuarioAtual = null;

// --- LOGIN GOOGLE ---
window.loginGoogle = async function() {
  try {
    const result = await signInWithPopup(auth, provider);
    usuarioAtual = result.user;

    const userRef = doc(db, "usuarios", usuarioAtual.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      window.location.href = "app.html";
    } else {
      window.location.href = "cadastro.html";
    }
  } catch (error) {
    alert("Erro no login: " + error.message);
  }
};

// --- CADASTRO ---
window.addEventListener("DOMContentLoaded", () => {
  const salvarBtn = document.getElementById("salvarBtn");
  if (salvarBtn) {
    salvarBtn.onclick = async () => {
      const nome = document.getElementById("nome").value;
      const fotoInput = document.getElementById("foto");

      if (!nome) {
        alert("Digite seu nome!");
        return;
      }

      const userRef = doc(db, "usuarios", usuarioAtual.uid);
      await setDoc(userRef, {
        nome: nome,
        foto: fotoInput.files[0] ? fotoInput.files[0].name : null,
        email: usuarioAtual.email
      });

      alert("Cadastro salvo!");
      window.location.href = "app.html";
    };
  }

  // --- SALVAR REGISTRO ---
  const salvarRegistroBtn = document.getElementById("salvarRegistro");
  if (salvarRegistroBtn) {
    salvarRegistroBtn.onclick = async () => {
      const turno = document.getElementById("turno").value;
      const tanque = document.getElementById("tanque").value;

      const registro = {
        usuario: usuarioAtual.displayName || usuarioAtual.email,
        dataHora: new Date().toISOString(),
        turno,
        tanque,
        colorimetrico: {
          amonia_mg_L: parseFloat(document.getElementById("amonia").value) || null,
          nitrito_mg_L: parseFloat(document.getElementById("nitrito").value) || null,
          alcalinidade_mg_L: parseFloat(document.getElementById("alcalinidade").value) || null,
          dureza_mg_L: parseFloat(document.getElementById("dureza").value) || null
        },
        multiparametro: {
          ph: parseFloat(document.getElementById("ph").value) || null,
          oxigenio_dissolvido_mg_L: parseFloat(document.getElementById("od").value) || null,
          temperatura_C: parseFloat(document.getElementById("temperatura").value) || null,
          condutividade: parseFloat(document.getElementById("condutividade").value) || null,
          salinidade: parseFloat(document.getElementById("salinidade").value) || null,
          solidos_totais: parseFloat(document.getElementById("solidos").value) || null
        },
        observacoes: document.getElementById("observacoes").value
      };

      await addDoc(collection(db, "registros"), registro);
      alert("Registro salvo!");

      // Atualiza lista
      const lista = document.getElementById("lista");
      if (lista) {
        const item = document.createElement("li");
        item.innerHTML = `
          <strong>${registro.usuario}</strong><br>
          Turno: ${registro.turno} | Tanque: ${registro.tanque}<br>
          pH: ${registro.multiparametro.ph} | OD: ${registro.multiparametro.oxigenio_dissolvido_mg_L}<br>
          Data: ${new Date(registro.dataHora).toLocaleString()}<hr>
        `;
        lista.appendChild(item);
      }
    };
  }
});