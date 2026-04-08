import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
let estaProcessandoAuth = true; // TRAVA MESTRE: O site começa "congelado"

// 1. FORÇAR PERSISTÊNCIA E CAPTURAR RESULTADO DO REDIRECT
async function iniciarSistema() {
    try {
        await setPersistence(auth, browserLocalPersistence);
        
        // Esta linha é a que salva o celular: ela espera o Google falar "oi"
        const result = await getRedirectResult(auth);
        if (result?.user) {
            console.log("Login via Redirect detectado!");
        }
    } catch (error) {
        console.error("Erro no Redirect:", error);
    } finally {
        // Só depois de tentar capturar o resultado, liberamos o monitoramento de rotas
        estaProcessandoAuth = false;
        configurarMonitoramento();
    }
}

// 2. MONITORAMENTO DE USUÁRIO (SÓ RODA DEPOIS DO PASSO 1)
function configurarMonitoramento() {
    onAuthStateChanged(auth, async (user) => {
        const path = window.location.pathname;

        if (user) {
            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                dadosUsuarioLocal = docSnap.data();
                if (document.getElementById("userNameHeader")) {
                    atualizarUIPerfil(user, dadosUsuarioLocal);
                }
                // Se estiver na index, vai pro app
                if (path.endsWith("index.html") || path === "/") {
                    window.location.href = "app.html";
                }
            } else if (!path.endsWith("cadastro.html")) {
                window.location.href = "cadastro.html";
            }
        } else {
            // SÓ MANDA PARA LOGIN SE: não houver usuário E não estivermos processando o início
            if (!estaProcessandoAuth && !path.endsWith("index.html") && path !== "/") {
                window.location.href = "index.html";
            }
        }
    });
}

// Inicia o motor
iniciarSistema();

// 3. BOTÃO DE LOGIN (MÉTODO ÚNICO PARA CELULAR E PC)
const btnLogin = document.getElementById("loginGoogleBtn");
if (btnLogin) {
    btnLogin.onclick = async () => {
        try {
            btnLogin.innerText = "Conectando...";
            // No celular, o Redirect é o único que o Safari aceita sem bloquear
            if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                await signInWithRedirect(auth, provider);
            } else {
                await signInWithPopup(auth, provider);
            }
        } catch (error) {
            alert("Erro ao logar. Tente abrir o link direto no navegador (Chrome/Safari).");
            btnLogin.innerText = "Entrar com Google";
        }
    };
}

// --- 4. FUNÇÕES DO APP (ABAS, REGISTRO, PERFIL) ---
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

// Registro de Dados
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

// Cadastro e Relatório (Mantidos)
const btnSalvar = document.getElementById("btnSalvar");
if (btnSalvar) {
    btnSalvar.onclick = async (e) => {
        e.preventDefault();
        const nome = document.getElementById("nome").value;
        if (!auth.currentUser || !nome) return;
        await setDoc(doc(db, "usuarios", auth.currentUser.uid), { nome, email: auth.currentUser.email, dataCadastro: new Date() });
        window.location.href = "app.html";
    };
}

document.getElementById("btnBaixarRelatorio")?.addEventListener("click", async () => {
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
});

document.getElementById("btnSair")?.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));