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
const paginaAtual = window.location.pathname;

let nomeUsuarioAtivo = "Usuário";

// --- GERENCIADOR DE ROTAS ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      nomeUsuarioAtivo = docSnap.data().nome;
      if (paginaAtual.endsWith("index.html") || paginaAtual.endsWith("cadastro.html") || paginaAtual === "/") window.location.href = "app.html";
    } else {
      if (!paginaAtual.endsWith("cadastro.html")) window.location.href = "cadastro.html";
    }
  } else {
    if (!paginaAtual.endsWith("index.html") && paginaAtual !== "/") window.location.href = "index.html";
  }
});

// --- LOGIN E CADASTRO ---
const btnLogin = document.getElementById("loginGoogleBtn");
if (btnLogin) {
  btnLogin.addEventListener("click", async () => {
    try { await signInWithPopup(auth, provider); } catch (e) { alert("Erro ao logar."); }
  });
}

const btnSalvar = document.getElementById("btnSalvar");
if (btnSalvar) {
  btnSalvar.addEventListener("click", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const nome = document.getElementById("nome").value;
    if (!nome) return alert("Digite seu nome.");
    try {
      await setDoc(doc(db, "usuarios", user.uid), { nome: nome, email: user.email, dataCadastro: new Date() });
      window.location.href = "app.html";
    } catch (err) { alert("Erro ao salvar."); }
  });
}

// --- COLETA DE DADOS ---
const formMedicao = document.getElementById("formMedicao");
if (formMedicao) {
  const getVal = (id) => {
    const v = document.getElementById(id).value;
    return v === "" ? null : parseFloat(v);
  };

  formMedicao.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const btn = document.getElementById("btnSalvarMedicao");
    
    btn.innerText = "Gravando...";
    btn.disabled = true;

    const payload = {
      coletor: nomeUsuarioAtivo,
      timestamp: serverTimestamp(),
      turno: document.getElementById("turno").value,
      tratamento: document.getElementById("tratamento").value,
      caixa: document.getElementById("caixa").value,
      amonia: getVal("amonia"),
      nitrito: getVal("nitrito"),
      alcalinidade: getVal("alcalinidade"),
      dureza: getVal("dureza"),
      ph: getVal("ph"),
      od: getVal("od"),
      temperatura: getVal("temperatura"),
      condutividade: getVal("condutividade"),
      salinidade: getVal("salinidade"),
      solidos: getVal("solidos")
    };

    try {
      await addDoc(collection(db, "medicoes"), payload);
      alert(`${payload.tratamento} - ${payload.caixa} salvo!`);
      // Não reseta o turno para facilitar a próxima caixa
      document.getElementById("tratamento").value = "";
      document.getElementById("caixa").value = "";
    } catch (err) { alert("Erro ao salvar medição."); }
    finally { btn.innerText = "💾 Salvar Esta Caixa"; btn.disabled = false; }
  });
}

// --- RELATÓRIO CSV BLOCADO ---
const btnRelatorio = document.getElementById("btnBaixarRelatorio");
if (btnRelatorio) {
  btnRelatorio.addEventListener("click", async () => {
    btnRelatorio.innerText = "...";
    try {
      // Ordenação múltipla para garantir o "bloco" por tempo e Tanque
      const q = query(collection(db, "medicoes"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      
      let csv = "Data,Hora,Turno,Coletor,Tratamento,Caixa,Amonia,Nitrito,Alcalinidade,Dureza,pH,OD,Temp,Cond,Salin,Solidos\n";

      snap.forEach(doc => {
        const d = doc.data();
        const dt = d.timestamp ? d.timestamp.toDate() : new Date();
        const row = [
          dt.toLocaleDateString("pt-BR"),
          dt.toLocaleTimeString("pt-BR"),
          d.turno, d.coletor, d.tratamento, d.caixa,
          d.amonia??"", d.nitrito??"", d.alcalinidade??"", d.dureza??"",
          d.ph??"", d.od??"", d.temperatura??"", d.condutividade??"", d.salinidade??"", d.solidos??""
        ];
        csv += row.join(",") + "\n";
      });

      const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Experimento_Agua_${new Date().toLocaleDateString()}.csv`;
      link.click();
    } catch (e) { alert("Erro ao gerar relatório."); }
    finally { btnRelatorio.innerText = "Relatório"; }
  });
}

document.getElementById("btnSair")?.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));