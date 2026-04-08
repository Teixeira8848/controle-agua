import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. CONFIGURAÇÃO
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
let processandoLogin = false; // Trava para o Safari

// --- AJUSTE PARA SAFARI: Captura o resultado IMEDIATAMENTE ---
if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
    processandoLogin = true; // Avisa ao sistema para não redirecionar ainda
    getRedirectResult(auth)
        .then((result) => {
            processandoLogin = false;
            if (result?.user) {
                console.log("Safari: Login recuperado com sucesso!");
            }
        })
        .catch((error) => {
            processandoLogin = false;
            console.error("Erro no Safari Redirect:", error);
        });
}

// 2. GERENCIADOR DE ROTAS
onAuthStateChanged(auth, async (user) => {
  const path = window.location.pathname;
  
  if (user) {
    const docRef = doc(db, "usuarios", user.uid);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        dadosUsuarioLocal = docSnap.data();
        if (document.getElementById("userNameHeader")) {
          atualizarUIPerfil(user, dadosUsuarioLocal);
        }
        if (path.endsWith("index.html") || path === "/") {
          window.location.href = "app.html";
        }
      } else if (!path.endsWith("cadastro.html")) {
        window.location.href = "cadastro.html";
      }
    } catch (e) { console.error("Erro Firestore:", e); }
  } else {
    // Só redireciona se NÃO estiver processando um login do Safari
    if (!path.endsWith("index.html") && path !== "/" && !processandoLogin) {
       setTimeout(() => {
           if (!auth.currentUser) window.location.href = "index.html";
       }, 4000); // Aumentado para 4s para o Safari
    }
  }
});

// 3. BOTÃO DE LOGIN
const btnLogin = document.getElementById("loginGoogleBtn");
if (btnLogin) {
  btnLogin.addEventListener("click", async () => {
    try {
      btnLogin.innerText = "Conectando...";
      await setPersistence(auth, browserLocalPersistence);
      
      // Detecção de Mobile
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      alert("Erro ao logar. Se estiver no iPhone, use o Safari fora de outros apps.");
      btnLogin.innerText = "Entrar com Google";
    }
  });
}

// 4. CADASTRO INICIAL
const btnSalvar = document.getElementById("btnSalvar");
if (btnSalvar) {
  btnSalvar.addEventListener("click", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("nome").value;
    if (!auth.currentUser || !nome) return alert("Preencha o nome!");
    try {
      btnSalvar.disabled = true;
      await setDoc(doc(db, "usuarios", auth.currentUser.uid), { 
        nome: nome, email: auth.currentUser.email, dataCadastro: new Date() 
      });
      window.location.href = "app.html";
    } catch (err) { alert("Erro ao salvar."); btnSalvar.disabled = false; }
  });
}

// 5. INTERFACE DO APP
function atualizarUIPerfil(user, dados) {
    if (document.getElementById("userNameHeader")) document.getElementById("userNameHeader").innerText = dados.nome;
    if (document.getElementById("userEmailHeader")) document.getElementById("userEmailHeader").innerText = user.email;
    if (document.getElementById("userEmailText")) document.getElementById("userEmailText").innerText = user.email;
    if (document.getElementById("userIdText")) document.getElementById("userIdText").innerText = user.uid;
    if (document.getElementById("editNome")) document.getElementById("editNome").value = dados.nome;
    if (document.getElementById("userIniciais")) {
        document.getElementById("userIniciais").innerText = dados.nome.charAt(0).toUpperCase();
    }
}

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

// Atualizar Nome no Perfil
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

// 6. SALVAR MEDIÇÃO
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
      alert("Salvo!");
      document.getElementById("tratamento").value = "";
      document.getElementById("caixa").value = "";
    } catch (err) { alert("Erro ao salvar."); }
    finally { btn.disabled = false; }
  };
}

// 7. RELATÓRIO CSV
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

// 8. LOGOUT
const btnSair = document.getElementById("btnSair");
if (btnSair) {
    btnSair.onclick = () => signOut(auth).then(() => window.location.href = "index.html");
}