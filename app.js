import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- LOGIN ---
const loginBtn = document.getElementById("loginGoogleBtn");
const nomeContainer = document.getElementById("nomeContainer");
const salvarNomeBtn = document.getElementById("salvarNomeBtn");

loginBtn?.addEventListener("click", async () => {
  await signInWithRedirect(auth, provider);
});

getRedirectResult(auth).then((result) => {
  if (result?.user) {
    const usuario = result.user;
    const nomeSalvo = localStorage.getItem("nomeUsuario");
    if (!nomeSalvo) {
      nomeContainer.style.display = "block";
    } else {
      window.location.href = "app.html";
    }
  }
}).catch(console.error);

salvarNomeBtn?.addEventListener("click", () => {
  const nome = document.getElementById("nomeUsuario").value;
  if (nome) {
    localStorage.setItem("nomeUsuario", nome);
    window.location.href = "app.html";
  }
});

// --- REGISTRO ---
if (window.location.pathname.endsWith("app.html")) {
  const usuarioLogado = localStorage.getItem("nomeUsuario");
  document.getElementById("usuarioLogado").innerText = usuarioLogado;

  document.getElementById("salvarRegistroBtn").addEventListener("click", async () => {
    const registro = {
      usuario: usuarioLogado,
      dataHora: new Date().toISOString(),
      turno: document.getElementById("turno").value,
      tanque: document.getElementById("tanque").value,
      colorimetrico: {
        amonia_mg_L: parseFloat(document.getElementById("amonia").value),
        nitrito_mg_L: parseFloat(document.getElementById("nitrito").value),
        alcalinidade_mg_L: parseFloat(document.getElementById("alcalinidade").value),
        dureza_mg_L: parseFloat(document.getElementById("dureza").value)
      },
      multiparametro: {
        ph: parseFloat(document.getElementById("ph").value),
        oxigenio_dissolvido_mg_L: parseFloat(document.getElementById("od").value),
        temperatura_C: parseFloat(document.getElementById("temperatura").value),
        condutividade: parseFloat(document.getElementById("condutividade").value),
        salinidade: parseFloat(document.getElementById("salinidade").value) || null,
        solidos_totais: parseFloat(document.getElementById("solidos").value) || null
      },
      observacoes: document.getElementById("observacoes").value
    };

    await addDoc(collection(db, "registros"), registro);
    alert("Registro salvo!");
  });

  document.getElementById("carregarRegistrosBtn").addEventListener("click", async () => {
    const lista = document.getElementById("lista");
    lista.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "registros"));
    querySnapshot.forEach((doc) => {
      const r = doc.data();
      const item = document.createElement("li");
      item.innerHTML = `<strong>${r.usuario}</strong> | Turno: ${r.turno} | Tanque: ${r.tanque} | Data: ${new Date(r.dataHora).toLocaleString()}<br>
      Colorimétrico: Amônia ${r.colorimetrico.amonia_mg_L} mg/L, Nitrito ${r.colorimetrico.nitrito_mg_L} mg/L<br>
      Multiparâmetro: pH ${r.multiparametro.ph}, OD ${r.multiparametro.oxigenio_dissolvido_mg_L} mg/L, Temp ${r.multiparametro.temperatura_C} °C
      <hr>`;
      lista.appendChild(item);
    });
  });
}