import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

let dadosUsuarioLocal = null;

// --- GERENCIADOR DE ROTAS E CARREGAMENTO DE DADOS ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      dadosUsuarioLocal = docSnap.data();
      atualizarUIPerfil(user, dadosUsuarioLocal);
      
      if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") window.location.href = "app.html";
    } else if (!window.location.pathname.endsWith("cadastro.html")) {
      window.location.href = "cadastro.html";
    }
  } else if (!window.location.pathname.endsWith("index.html") && window.location.pathname !== "/") {
    window.location.href = "index.html";
  }
});

function atualizarUIPerfil(user, dados) {
    // Atualiza cabeçalho
    document.getElementById("userNameHeader").innerText = dados.nome;
    document.getElementById("userEmailHeader").innerText = user.email;
    // Atualiza aba de perfil
    document.getElementById("userEmailText").innerText = user.email;
    document.getElementById("userIdText").innerText = user.uid;
    document.getElementById("editNome").value = dados.nome;
}

// --- LOGICA DE ABAS ---
const tabRegistro = document.getElementById("tabRegistro");
const tabPerfil = document.getElementById("tabPerfil");
const secaoRegistro = document.getElementById("secaoRegistro");
const secaoPerfil = document.getElementById("secaoPerfil");

if(tabRegistro && tabPerfil) {
    tabRegistro.onclick = () => {
        secaoRegistro.style.display = "block";
        secaoPerfil.style.display = "none";
        tabRegistro.style.backgroundColor = "#007bff";
        tabPerfil.style.backgroundColor = "#6c757d";
    };
    tabPerfil.onclick = () => {
        secaoRegistro.style.display = "none";
        secaoPerfil.style.display = "block";
        tabPerfil.style.backgroundColor = "#007bff";
        tabRegistro.style.backgroundColor = "#6c757d";
    };
}

// --- ATUALIZAR PERFIL ---
document.getElementById("btnAtualizarPerfil")?.addEventListener("click", async () => {
    const user = auth.currentUser;
    const novoNome = document.getElementById("editNome").value;
    if(!novoNome) return alert("O nome não pode ser vazio.");

    try {
        await updateDoc(doc(db, "usuarios", user.uid), { nome: novoNome });
        alert("Perfil atualizado!");
        location.reload(); // Recarrega para aplicar as mudanças
    } catch (e) { alert("Erro ao atualizar perfil."); }
});

// --- SALVAR MEDIÇÃO (Atrelando Nome e Email) ---
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
      coletor: dadosUsuarioLocal.nome,
      emailColetor: auth.currentUser.email, // Atrelando o email para segurança do relatório
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
      alert("Salvo com sucesso!");
      document.getElementById("tratamento").value = "";
      document.getElementById("caixa").value = "";
    } catch (err) { alert("Erro ao salvar."); }
    finally { btn.disabled = false; btn.innerText = "Salvar Medição"; }
  });
}

// --- RELATÓRIO CSV (Com Nome e Email) ---
document.getElementById("btnBaixarRelatorio")?.addEventListener("click", async () => {
    const q = query(collection(db, "medicoes"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    let csv = "\ufeffData,Hora,Turno,Coletor,Email,Tratamento,Caixa,Amonia,Nitrito,Alcalinidade,Dureza,pH,OD,Temp,Cond,Salin,Solidos\n";
    snap.forEach(doc => {
      const d = doc.data();
      const dt = d.timestamp ? d.timestamp.toDate() : new Date();
      csv += [dt.toLocaleDateString(), dt.toLocaleTimeString(), d.turno, d.coletor, d.emailColetor || "N/A", d.tratamento, d.caixa, d.amonia??"", d.nitrito??"", d.alcalinidade??"", d.dureza??"", d.ph??"", d.od??"", d.temperatura??"", d.condutividade??"", d.salinidade??"", d.solidos??""].join(",") + "\n";
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "relatorio_detalhado.csv";
    link.click();
});

document.getElementById("btnSair")?.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));