import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

let nomeUsuarioAtivo = "Usuário";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      nomeUsuarioAtivo = docSnap.data().nome;
      if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") window.location.href = "app.html";
    } else if (!window.location.pathname.endsWith("cadastro.html")) {
      window.location.href = "cadastro.html";
    }
  } else if (!window.location.pathname.endsWith("index.html") && window.location.pathname !== "/") {
    window.location.href = "index.html";
  }
});

const formMedicao = document.getElementById("formMedicao");
if (formMedicao) {
  formMedicao.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btnSalvarMedicao");
    btn.disabled = true;
    btn.innerText = "Salvando...";

    const getVal = (id) => {
      const v = document.getElementById(id).value;
      return v === "" ? null : parseFloat(v);
    };

    const dados = {
      coletor: nomeUsuarioAtivo,
      timestamp: serverTimestamp(),
      turno: document.getElementById("turno").value,
      tratamento: document.getElementById("tratamento").value,
      caixa: document.getElementById("caixa").value,
      amonia: getVal("amonia"), nitrito: getVal("nitrito"),
      alcalinidade: getVal("alcalinidade"), dureza: getVal("dureza"),
      ph: getVal("ph"), od: getVal("od"), temperatura: getVal("temperatura"),
      condutividade: getVal("condutividade"), salinidade: getVal("salinidade"), solidos: getVal("solidos")
    };

    try {
      await addDoc(collection(db, "medicoes"), dados);
      alert("Salvo: " + dados.tratamento + " - " + dados.caixa);
      document.getElementById("tratamento").value = "";
      document.getElementById("caixa").value = "";
    } catch (err) { alert("Erro ao salvar."); }
    finally { btn.disabled = false; btn.innerText = "Salvar Medição"; }
  });
}

const btnRelatorio = document.getElementById("btnBaixarRelatorio");
if (btnRelatorio) {
  btnRelatorio.addEventListener("click", async () => {
    const q = query(collection(db, "medicoes"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    let csv = "\ufeffData,Hora,Turno,Coletor,Tratamento,Caixa,Amonia,Nitrito,Alcalinidade,Dureza,pH,OD,Temp,Cond,Salin,Solidos\n";
    snap.forEach(doc => {
      const d = doc.data();
      const dt = d.timestamp ? d.timestamp.toDate() : new Date();
      csv += [dt.toLocaleDateString(), dt.toLocaleTimeString(), d.turno, d.coletor, d.tratamento, d.caixa, d.amonia??"", d.nitrito??"", d.alcalinidade??"", d.dureza??"", d.ph??"", d.od??"", d.temperatura??"", d.condutividade??"", d.salinidade??"", d.solidos??""].join(",") + "\n";
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "relatorio_agua.csv";
    link.click();
  });
}

document.getElementById("btnSair")?.addEventListener("click", () => signOut(auth));