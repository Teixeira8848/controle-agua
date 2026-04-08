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

// Função segura para mudar telas
function mostrarTela(id) {
    const telas = document.querySelectorAll('.tela');
    telas.forEach(t => t.classList.remove('ativa'));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add('ativa');
}

// Função segura para escrever texto
function escrever(id, texto) {
    const el = document.getElementById(id);
    if (el) el.innerText = texto;
}

// 1. MONITOR DE AUTENTICAÇÃO
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "usuarios", user.uid));
            if (docSnap.exists()) {
                const d = docSnap.data();
                escrever("userNameHeader", d.nome);
                escrever("userEmailHeader", user.email);
                escrever("userIdText", user.uid);
                escrever("userIniciais", d.nome.charAt(0).toUpperCase());
                mostrarTela("telaApp");
            } else {
                mostrarTela("telaCadastro");
            }
        } catch (e) {
            console.error(e);
            mostrarTela("telaLogin");
        }
    } else {
        mostrarTela("telaLogin");
    }
});

// 2. LOGICA DO BOTÃO DE LOGIN
const btnLogin = document.getElementById("loginGoogleBtn");
if (btnLogin) {
    btnLogin.onclick = async () => {
        escrever("msgDebug", "Iniciando conexão...");
        try {
            await setPersistence(auth, browserLocalPersistence);
            if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
                await signInWithRedirect(auth, provider);
            } else {
                await signInWithPopup(auth, provider);
            }
        } catch (e) {
            alert("Erro: " + e.message);
        }
    };
}

// Trata o retorno do celular
getRedirectResult(auth).catch(e => console.error("Erro redirect:", e));

// 3. SALVAR CADASTRO
const btnCad = document.getElementById("btnSalvarCadastro");
if (btnCad) {
    btnCad.onclick = async () => {
        const nome = document.getElementById("nomeCadastro").value;
        if (!nome) return alert("Digite seu nome!");
        try {
            await setDoc(doc(db, "usuarios", auth.currentUser.uid), {
                nome: nome, email: auth.currentUser.email, data: new Date()
            });
            window.location.reload();
        } catch (e) { alert(e.message); }
    };
}

// 4. SALVAR MEDIÇÃO
const form = document.getElementById("formMedicao");
if (form) {
    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById("btnSalvarMedicao");
        btn.disabled = true;
        try {
            await addDoc(collection(db, "medicoes"), {
                coletor: document.getElementById("userNameHeader").innerText,
                tanque: document.getElementById("tanque").value,
                amonia: parseFloat(document.getElementById("amonia").value),
                ph: parseFloat(document.getElementById("ph").value),
                timestamp: serverTimestamp()
            });
            alert("Medição salva!");
            form.reset();
        } catch (e) { alert(e.message); }
        finally { btn.disabled = false; }
    };
}

// 5. RELATÓRIO CSV
const btnCsv = document.getElementById("btnBaixarRelatorio");
if (btnCsv) {
    btnCsv.onclick = async () => {
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
    };
}

// 6. NAVEGAÇÃO E SAIR
document.getElementById("tabRegistro").onclick = () => {
    document.getElementById("secaoRegistro").style.display = "block";
    document.getElementById("secaoPerfil").style.display = "none";
};
document.getElementById("tabPerfil").onclick = () => {
    document.getElementById("secaoRegistro").style.display = "none";
    document.getElementById("secaoPerfil").style.display = "block";
};
document.getElementById("btnSair").onclick = () => signOut(auth);