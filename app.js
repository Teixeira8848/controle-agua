<<<<<<< HEAD
console.log("JS carregado");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, addDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIG FIREBASE
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

let userAtual = null;

// LOGIN GOOGLE
document.getElementById("btnLogin").addEventListener("click", async ()=>{
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    userAtual = result.user;
    alert("Logado como: " + userAtual.displayName);

    document.getElementById("loginCard").style.display = "none";
    document.getElementById("registroCard").style.display = "block";

  } catch(error) {
    alert("Erro no login: " + error.message);
  }
});

// SALVAR REGISTRO
document.getElementById("btnSalvar").addEventListener("click", async ()=>{
  if(!userAtual){ alert("Faça login primeiro!"); return; }

  await addDoc(collection(db, "registros"), {
    usuario: userAtual.displayName,
    dataHora: new Date(),

    turno: document.getElementById("turno").value,
    tratamento: document.getElementById("tratamento").value,
    tanque: document.getElementById("tanque").value,

    amonia: document.getElementById("amonia").value,
    nitrito: document.getElementById("nitrito").value,
    alcalinidade: document.getElementById("alcalinidade").value,
    dureza: document.getElementById("dureza").value,

    ph: document.getElementById("ph").value,
    od: document.getElementById("od").value,
    temperatura: document.getElementById("temperatura").value,
    condutividade: document.getElementById("condutividade").value,
    salinidade: document.getElementById("salinidade").value,
    solidosTotais: document.getElementById("solidos").value
  });

  alert("Registro salvo!");
});

// CARREGAR HISTÓRICO
document.getElementById("btnCarregar").addEventListener("click", async ()=>{
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  const querySnapshot = await getDocs(collection(db,"registros"));
  querySnapshot.forEach((doc)=>{
    const d = doc.data();
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${d.usuario}</strong><br>
      Turno: ${d.turno} | Tratamento: ${d.tratamento} | Tanque: ${d.tanque}<br>
      🧪 Amônia: ${d.amonia} | Nitrito: ${d.nitrito}<br>
      Alcalinidade: ${d.alcalinidade} | Dureza: ${d.dureza}<br>
      🌊 pH: ${d.ph} | OD: ${d.od}<br>
      Temp: ${d.temperatura} | Cond: ${d.condutividade}<br>
      Salinidade: ${d.salinidade} | Sólidos: ${d.solidosTotais}<br>
      Data: ${new Date(d.dataHora).toLocaleString()}<hr>
    `;
    lista.appendChild(li);
  });
});
=======
console.log("JS carregado");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, addDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let userAtual = null;

// LOGIN
window.login = async function () {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  const userCredential = await signInWithEmailAndPassword(auth, email, senha);
  userAtual = userCredential.user;

  alert("Logado como " + userAtual.email);
};

// SALVAR
window.salvar = async function () {
  if (!userAtual) {
    alert("Faça login primeiro!");
    return;
  }

  await addDoc(collection(db, "registros"), {
    usuario: userAtual.email,
    dataHora: new Date(),

    turno: document.getElementById("turno").value,
    tratamento: document.getElementById("tratamento").value,
    tanque: document.getElementById("tanque").value,

    // Colorimétrico
    amonia: document.getElementById("amonia").value,
    nitrito: document.getElementById("nitrito").value,
    alcalinidade: document.getElementById("alcalinidade").value,
    dureza: document.getElementById("dureza").value,

    // Multiparâmetro
    ph: document.getElementById("ph").value,
    od: document.getElementById("od").value,
    temperatura: document.getElementById("temperatura").value,
    condutividade: document.getElementById("condutividade").value,
    salinidade: document.getElementById("salinidade").value,
    solidosTotais: document.getElementById("solidos").value
  });

  alert("Registro salvo com sucesso!");
};

// HISTÓRICO
window.carregar = async function () {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "registros"));

  querySnapshot.forEach((doc) => {
    const dados = doc.data();

    const item = document.createElement("li");

    item.innerHTML = `
      <strong>${dados.usuario}</strong><br>
      Turno: ${dados.turno} | Tratamento: ${dados.tratamento} | Tanque: ${dados.tanque}<br>

      🧪 Amônia: ${dados.amonia} | Nitrito: ${dados.nitrito}<br>
      Alcalinidade: ${dados.alcalinidade} | Dureza: ${dados.dureza}<br>

      🌊 pH: ${dados.ph} | OD: ${dados.od}<br>
      Temp: ${dados.temperatura} | Cond: ${dados.condutividade}<br>
      Salinidade: ${dados.salinidade} | Sólidos: ${dados.solidosTotais}<br>

      Data: ${new Date(dados.dataHora).toLocaleString()}
      <hr>
    `;

    lista.appendChild(item);
  });
};
>>>>>>> 9eb63bd41857d4cabe81fb3b5a66d3514e61cbdc
