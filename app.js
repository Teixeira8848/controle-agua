import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJECT.firebaseapp.com",
  projectId: "SEU_PROJECT",
  storageBucket: "SEU_PROJECT.appspot.com",
  messagingSenderId: "SEU_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const salvarBtn = document.getElementById("salvarBtn");
const lista = document.getElementById("lista");

salvarBtn.addEventListener("click", async () => {
  const userNome = localStorage.getItem("userNome");
  if (!userNome) return alert("Nome do usuário não encontrado!");

  const registro = {
    usuario: userNome,
    dataHora: new Date().toISOString(),
    turno: document.getElementById("turno").value,
    tanque: document.getElementById("tanque").value,
    colorimetrico: {
      amonia_mg_L: parseFloat(document.getElementById("amonia").value) || 0,
      nitrito_mg_L: parseFloat(document.getElementById("nitrito").value) || 0,
      alcalinidade_mg_L: parseFloat(document.getElementById("alcalinidade").value) || 0,
      dureza_mg_L: parseFloat(document.getElementById("dureza").value) || 0
    },
    multiparametro: {
      ph: parseFloat(document.getElementById("ph").value) || 0,
      oxigenio_dissolvido_mg_L: parseFloat(document.getElementById("od").value) || 0,
      temperatura_C: parseFloat(document.getElementById("temperatura").value) || 0,
      condutividade: document.getElementById("condutividade").value || null,
      salinidade: document.getElementById("salinidade").value || null,
      solidos_totais: document.getElementById("solidos_totais").value || null
    },
    observacoes: document.getElementById("observacoes").value
  };

  await addDoc(collection(db, "registros"), registro);
  alert("Registro salvo!");
  carregarRegistros();
});

async function carregarRegistros() {
  lista.innerHTML = "";
  const querySnapshot = await getDocs(collection(db, "registros"));
  querySnapshot.forEach(doc => {
    const dados = doc.data();
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${dados.usuario}</strong> | ${new Date(dados.dataHora).toLocaleString()}<br>
      Turno: ${dados.turno} | Tanque: ${dados.tanque}<br>
      pH: ${dados.multiparametro.ph} | OD: ${dados.multiparametro.oxigenio_dissolvido_mg_L}<br>
      Amônia: ${dados.colorimetrico.amonia_mg_L} | Nitrito: ${dados.colorimetrico.nitrito_mg_L}<br>
      Observações: ${dados.observacoes}
      <hr>
    `;
    lista.appendChild(item);
  });
}

window.addEventListener("DOMContentLoaded", carregarRegistros);