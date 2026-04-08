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

function mostrarTela(id) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    const target = document.getElementById(id);
    if(target) target.classList.add('ativa');
}

// 1. MONITOR DE ESTADO (A única coisa que manda nas telas)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "usuarios", user.uid));
            if (docSnap.exists()) {
                const dados = docSnap.data();
                document.getElementById("userNameHeader").innerText = dados.nome;
                document.getElementById("userEmailHeader").innerText = user.email;
                document.getElementById("userIniciais").innerText = dados.nome.charAt(0).toUpperCase();
                mostrarTela('telaApp');
            } else {
                mostrarTela('telaCadastro');
            }
        } catch (e) {
            alert("Erro ao carregar dados: " + e.message);
        }
    } else {
        mostrarTela('telaLogin');
    }
});

// 2. BOTÃO DE LOGIN
const btnLogin = document.getElementById("loginGoogleBtn");
btnLogin.onclick = async () => {
    btnLogin.innerText = "Conectando...";
    try {
        await setPersistence(auth, browserLocalPersistence);
        // PC usa Popup, Celular usa Redirect
        if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
            await signInWithRedirect(auth, provider);
        } else {
            await signInWithPopup(auth, provider);
        }
    } catch (e) {
        alert("Erro no login: " + e.message);
        btnLogin.innerText = "Entrar com Google";
    }
};

// 3. SALVAR CADASTRO
document.getElementById("btnSalvarCadastro").onclick = async () => {
    const nome = document.getElementById("nomeCadastro").value;
    if (!nome) return alert("Digite seu nome!");
    try {
        await setDoc(doc(db, "usuarios", auth.currentUser.uid), {
            nome: nome, email: auth.currentUser.email, dataCadastro: new Date()
        });
        window.location.reload(); 
    } catch (e) { alert(e.message); }
};

// 4. SALVAR MEDIÇÃO
document.getElementById("formMedicao").onsubmit = async (e) => {
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
        alert("Salvo!");
        e.target.reset();
    } catch (e) { alert(e.message); }
    finally { btn.disabled = false; }
};

// 5. BAIXAR CSV
document.getElementById("btnBaixarRelatorio").onclick = async () => {
    const snap = await getDocs(query(collection(db, "medicoes"), orderBy("timestamp", "desc")));
    let csv = "\ufeffData,Coletor,Tanque,Amonia,pH\n";
    snap.forEach(doc => {
        const d = doc.data();
        const data = d.timestamp ? d.timestamp.toDate().toLocaleDateString() : "";
        csv += `${data},${d.coletor},${d.tanque},${d.amonia},${d.ph}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "relatorio.csv";
    link.click();
};

// 6. ABAS E SAIR
document.getElementById("tabRegistro").onclick = () => {
    document.getElementById("secaoRegistro").style.display = "block";
    document.getElementById("secaoPerfil").style.display = "none";
};
document.getElementById("tabPerfil").onclick = () => {
    document.getElementById("secaoRegistro").style.display = "none";
    document.getElementById("secaoPerfil").style.display = "block";
};
document.getElementById("btnSair").onclick = () => signOut(auth);

// Trata o retorno do Redirect (Celular)
getRedirectResult(auth).catch(e => console.error(e));