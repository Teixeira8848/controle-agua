import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCRLrik-rHVfDNz_gn2P4oYgraM64iHI0k",
  authDomain: "parametros-de-qualidade.firebaseapp.com",
  projectId: "parametros-de-qualidade",
  storageBucket: "parametros-de-qualidade.firebasestorage.app",
  messagingSenderId: "329194124166",
  appId: "1:329194124166:web:50d3685ef680284c5fb207"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ==========================================
// FUNÇÕES DE SEGURANÇA (EVITAM O CRASH DO SCRIPT)
// ==========================================
function mostrarTela(id) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add('ativa');
}

function escrever(id, texto) {
    const el = document.getElementById(id);
    if (el) el.innerText = texto;
}

function adicionarClique(id, callback) {
    const el = document.getElementById(id);
    if (el) {
        el.onclick = callback;
    } else {
        console.warn(`Elemento não encontrado: ${id}`);
    }
}

function adicionarEnvio(id, callback) {
    const el = document.getElementById(id);
    if (el) {
        el.onsubmit = callback;
    } else {
        console.warn(`Formulário não encontrado: ${id}`);
    }
}

// ==========================================
// 1. MONITOR DE AUTENTICAÇÃO (CONTROLA AS TELAS)
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "usuarios", user.uid));
            if (docSnap.exists()) {
                const d = docSnap.data();
                escrever("userNameHeader", d.nome);
                escrever("userEmailHeader", user.email);
                escrever("userIdText", user.uid);
                if (d.nome) escrever("userIniciais", d.nome.charAt(0).toUpperCase());
                mostrarTela("telaApp");
            } else {
                mostrarTela("telaCadastro");
            }
        } catch (e) {
            console.error("Erro no Firestore:", e);
            mostrarTela("telaLogin");
        }
    } else {
        mostrarTela("telaLogin");
    }
});

// Força a resolução do Redirect para celulares
getRedirectResult(auth).catch(e => console.warn("Aviso do Redirect:", e));

// ==========================================
// 2. AÇÕES DOS BOTÕES (COM SEGURANÇA)
// ==========================================

// Login
adicionarClique("loginGoogleBtn", async () => {
    const btn = document.getElementById("loginGoogleBtn");
    btn.innerText = "Conectando...";
    try {
        await setPersistence(auth, browserLocalPersistence);
        if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
            await signInWithRedirect(auth, provider);
        } else {
            await signInWithPopup(auth, provider);
        }
    } catch (e) {
        console.error(e);
        alert("Erro na autenticação. Tente novamente.");
        btn.innerText = "Entrar com Google";
    }
});

// Cadastro
adicionarClique("btnSalvarCadastro", async () => {
    const nomeEl = document.getElementById("nomeCadastro");
    if (!nomeEl || !nomeEl.value) return alert("Digite seu nome!");
    try {
        await setDoc(doc(db, "usuarios", auth.currentUser.uid), {
            nome: nomeEl.value, email: auth.currentUser.email, data: new Date()
        });
        window.location.reload();
    } catch (e) { alert("Erro ao salvar cadastro: " + e.message); }
});

// Medição
adicionarEnvio("formMedicao", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btnSalvarMedicao");
    if(btn) btn.disabled = true;
    try {
        await addDoc(collection(db, "medicoes"), {
            coletor: document.getElementById("userNameHeader").innerText,
            tanque: document.getElementById("tanque").value,
            amonia: parseFloat(document.getElementById("amonia").value),
            ph: parseFloat(document.getElementById("ph").value),
            timestamp: serverTimestamp()
        });
        alert("Medição salva com sucesso!");
        document.getElementById("formMedicao").reset();
    } catch (e) { 
        alert("Erro ao salvar medição: " + e.message); 
    } finally { 
        if(btn) btn.disabled = false; 
    }
});

// Relatório CSV
adicionarClique("btnBaixarRelatorio", async () => {
    try {
        const snap = await getDocs(query(collection(db, "medicoes"), orderBy("timestamp", "desc")));
        let csv = "\ufeffData,Coletor,Tanque,Amonia,pH\n";
        snap.forEach(doc => {
            const d = doc.data();
            const dt = d.timestamp ? d.timestamp.toDate().toLocaleDateString() : "";
            csv += `${dt},${d.coletor},${d.tanque},${d.amonia},${d.ph}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "relatorio.csv";
        link.click();
    } catch (e) {
        alert("Erro ao gerar relatório: " + e.message);
    }
});

// Abas e Sair
adicionarClique("tabRegistro", () => {
    const secReg = document.getElementById("secaoRegistro");
    const secPerf = document.getElementById("secaoPerfil");
    if(secReg) secReg.style.display = "block";
    if(secPerf) secPerf.style.display = "none";
});

adicionarClique("tabPerfil", () => {
    const secReg = document.getElementById("secaoRegistro");
    const secPerf = document.getElementById("secaoPerfil");
    if(secReg) secReg.style.display = "none";
    if(secPerf) secPerf.style.display = "block";
});

adicionarClique("btnSair", () => {
    signOut(auth).then(() => window.location.reload());
});