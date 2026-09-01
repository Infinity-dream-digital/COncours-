import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjbVjLLEWQyJFkXG-g67q3zQfee69Wo-I",
  authDomain: "concours-13ebb.firebaseapp.com",
  projectId: "concours-13ebb",
  storageBucket: "concours-13ebb.firebasestorage.app",
  messagingSenderId: "34631527839",
  appId: "1:34631527839:web:14580c393acd7736efe1aa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. Charger la liste des candidats dans le <select id="candidateSelect">
async function loadCandidatesSelect() {
  const selectEl = document.getElementById('candidateSelect');
  if (!selectEl) return;

  const snapshot = await getDocs(collection(db, 'candidates'));
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const option = document.createElement('option');
    option.value = docSnap.id; // Stocke l'ID du candidat
    option.textContent = data.name;
    selectEl.appendChild(option);
  });
}

// 2. Traiter la soumission du vote
async function submitVote(voterEmail, selectedCandidateId) {
  // Optionnel : vérifier si l'email a déjà voté
  const existingVotes = await getDocs(
    query(collection(db, 'votes'), where('voter_email', '==', voterEmail))
  );

  if (!existingVotes.empty) {
    alert('Cet e-mail a déjà été utilisé pour voter !');
    return;
  }

  // Enregistrement du vote dans la collection 'votes'
  await addDoc(collection(db, 'votes'), {
    candidate_id: selectedCandidateId,
    voter_email: voterEmail,
    created_at: serverTimestamp()
  });

  alert('Votre vote a bien été pris en compte !');
}

loadCandidatesSelect();