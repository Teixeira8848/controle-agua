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

// --- 1. GERENCIADOR DE LOGIN E ROTAS ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "usuarios", user.uid);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        dadosUsuarioLocal = docSnap.data();
        // Só tenta atualizar a UI se os elementos existirem (evita erro 400)
        if (document.getElementById("userNameHeader")) {
          atualizarUIPerfil(user, dadosUsuarioLocal);
        }
        if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
          window.location.href = "app.html";
        }
      } else if (!window.location.pathname.endsWith("cadastro.html")) {
        window.location.href = "cadastro.html";
      }
    } catch (e) { console.error("Erro ao buscar usuário:", e); }
  } else {
    if (!window.location.pathname.endsWith("index.html") && window.location.pathname !== "/") {
      window.location.href = "index.html";
    }
  }
});

// --- 2. TELA DE LOGIN (index.html) ---
const btnLogin = document.getElementById("loginGoogleBtn");
if (btnLogin) {
  btnLogin.onclick = async () => {
    try {
      btnLogin.innerText = "Conectando...";
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      alert("Erro ao logar com Google. Verifique sua conexão.");
      btnLogin.innerText = "Entrar com Google";
    }
  };
}

// --- 3. TELA DE CADASTRO (cadastro.html) ---
const btnSalvar = document.getElementById("btnSalvar");
if (btnSalvar) {
  btnSalvar.onclick = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const nome = document.getElementById("nome").value;
    if (!user || !nome) return alert("Preencha o nome!");
    try {
      btnSalvar.disabled = true;
      await setDoc(doc(db, "usuarios", user.uid), { 
        nome: nome, 
        email: user.email, 
        dataCadastro: new Date() 
      });
      window.location.href = "app.html";
    } catch (err) { alert("Erro ao salvar cadastro."); btnSalvar.disabled = false; }
  };
}

// --- 4. TELA DO APP (Perfil e Abas) ---
function atualizarUIPerfil(user, dados) {
    if (document.getElementById("userNameHeader")) document.getElementById("userNameHeader").innerText = dados.nome;
    if (document.getElementById("userEmailHeader")) document.getElementById("userEmailHeader").innerText = user.email;
    if (document.getElementById("userEmailText")) document.getElementById("userEmailText").innerText = user.email;
    if (document.getElementById("userIdText")) document.getElementById("userIdText").innerText = user.uid;
    if (document.getElementById("editNome")) document.getElementById("editNome").value = dados.nome;
}

// Troca de Abas
const tReg = document.getElementById("tabRegistro");
const tPer = document.getElementById("tabPerfil");
if (tReg && tPer) {
    tReg.onclick = () => {
        document.getElementById("secaoRegistro").style.display = "block";
        document.getElementById("secaoPerfil").style.display = "none";
        tReg.style.backgroundColor = "#007bff";
        tPer.style.backgroundColor = "#6c757d";
    };
    tPer.onclick = () => {
        document.getElementById("secaoRegistro").style.display = "none";
        document.getElementById("secaoPerfil").style.display = "block";
        tPer.style.backgroundColor = "#007bff";
        tReg.style.backgroundColor = "#6c757d";
    };
}

// Atualizar Perfil
document.getElementById("btnAtualizarPerfil")?.addEventListener("click", async () => {
    const user = auth.currentUser;
    const novoNome = document.getElementById("editNome").value;
    if(!novoNome) return;
    try {
        await updateDoc(doc(db, "usuarios", user.uid), { nome: novoNome });
        alert("Nome atualizado!");
        location.reload();
    } catch (e) { alert("Erro ao atualizar."); }
});

// --- 5. SALVAR MEDIÇÃO E RELATÓRIO ---
const formMedicao = document.getElementById("formMedicao");
if (formMedicao) {
  formMedicao.onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btnSalvarMedicao");
    btn.disabled = true;
    const getVal = (id) => {
      const v = document.getElementById(id).value;
      return v === "" ? null : parseFloat(v);
    };
    const dados = {
      coletor: dadosUsuarioLocal?.nome || "N/A",
      emailColetor: auth.currentUser.email,
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
      alert("Medição salva!");
      document.getElementById("tratamento").value = "";
      document.getElementById("caixa").value = "";
    } catch (err) { alert("Erro ao salvar."); }
    finally { btn.disabled = false; }
  };
}

// Relatório
document.getElementById("btnBaixarRelatorio")?.addEventListener("click", async () => {
    try {
        const q = query(collection(db, "medicoes"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        let csv = "\ufeffData,Hora,Turno,Coletor,Email,Tratamento,Caixa,Amonia,Nitrito,Alcalinidade,Dureza,pH,OD,Temp,Cond,Salin,Solidos\n";
        snap.forEach(doc => {
            const d = doc.data();
            const dt = d.timestamp ? d.timestamp.toDate() : new Date();
            csv += [dt.toLocaleDateString(), dt.toLocaleTimeString(), d.turno, d.coletor, d.emailColetor, d.tratamento, d.caixa, d.amonia??"", d.nitrito??"", d.alcalinidade??"", d.dureza??"", d.ph??"", d.od??"", d.temperatura??"", d.condutividade??"", d.salinidade??"", d.solidos??""].join(",") + "\n";
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "relatorio.csv";
        link.click();
    } catch (e) { alert("Erro no relatório."); }
});

document.getElementById("btnSair")?.addEventListener("click", () => signOut(auth));