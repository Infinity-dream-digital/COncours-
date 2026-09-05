import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy 
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


let candidates = [];
let votes = [];
let selectedCandidate = null;

const $ = (selector) => document.querySelector(selector);
const openModal = (id) => $(id).classList.add('open');
const closeModal = (id) => $(id).classList.remove('open');
const showToast = (message) => { 
  const toast = $('#toast'); 
  toast.textContent = message; 
  toast.classList.add('show'); 
  setTimeout(() => toast.classList.remove('show'), 3500); 
};
const normalized = (value) => value.trim().toLowerCase();

async function loadData() {
  try {
    const candidatesCol = collection(db, 'candidates');
    const candSnapshot = await getDocs(query(candidatesCol, orderBy('name', 'asc')));
    
    if (!candSnapshot.empty) {
      candidates = candSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      for (const c of seedCandidates) {
        const docRef = await addDoc(candidatesCol, c);
        candidates.push({ id: docRef.id, ...c });
      }
    }

    const votesCol = collection(db, 'votes');
    const voteSnapshot = await getDocs(votesCol);
    votes = voteSnapshot.docs.map(doc => doc.data());

    candidates.forEach(c => {
      c.votesCount = votes.filter(v => v.candidate_id === c.id).length;
    });

    renderCandidates();
  } catch (error) {
    console.error("Erreur de chargement Firebase:", error);
  }
}

function renderCandidates() {
  $('#candidateGrid').innerHTML = candidates.map((candidate, index) => {
    const visual = candidate.photo_url
      ? `<img src="${candidate.photo_url}" alt="${candidate.name}" />`
      : `<div class="portrait">${candidate.initials || candidate.name.split(' ').map(p => p[0]).join('').slice(0,2)}</div>`;
    
    return `
      <article class="candidate-card" data-id="${candidate.id}">
        <div class="candidate-visual">${visual}</div>
        <div class="card-info">
          <span class="rank">FINALISTE 0${index + 1}</span>
          <h3>${candidate.name}</h3>
          <p>${candidate.short_description || ''}</p>
          <div class="card-bottom">
            <a href="vote.html?id=${candidate.id}" class="card-vote">Voter pour ce projet →</a>
            <span class="vote-count">${candidate.votesCount || 0} votes</span>
          </div>
        </div>
      </article>`;
  }).join('');
}

function openProject(candidate) {
  selectedCandidate = candidate;
  $('#projectTitle').textContent = candidate.name;
  $('#projectSummary').textContent = candidate.short_description || '';
  $('#projectFull').textContent = candidate.full_project || '';
  $('#projectVoteButton').onclick = () => { closeModal('projectModal'); openVote(candidate); };
  openModal('projectModal');
}

function openVote(candidate) {
  selectedCandidate = candidate;
  $('#voteCandidateName').textContent = candidate.name;
  $('#voteError').textContent = '';
  $('#voterEmail').value = '';
  openModal('voteModal');
  setTimeout(() => $('#voterEmail').focus(), 100);
}

async function submitVote(event) {
  event.preventDefault();
  const email = normalized($('#voterEmail').value);
  const error = $('#voteError');
  error.textContent = '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { 
    error.textContent = 'Veuillez entrer une adresse e-mail valide.'; 
    return; 
  }

  if (votes.some((vote) => normalized(vote.voter_email) === email)) {
    error.textContent = 'Cette adresse a déjà participé au vote.';
    return;
  }

  try {
    const votesCol = collection(db, 'votes');
    const existingQuery = query(votesCol, where('voter_email', '==', email));
    const existingDocs = await getDocs(existingQuery);

    if (!existingDocs.empty) {
      error.textContent = 'Cette adresse a déjà participé au vote.';
      votes.push({ voter_email: email, candidate_id: selectedCandidate.id });
      return;
    }

    const newVote = { voter_email: email, candidate_id: selectedCandidate.id };
    await addDoc(votesCol, newVote);

    votes.push(newVote);
    const localCandidate = candidates.find((c) => c.id === selectedCandidate.id);
    if (localCandidate) localCandidate.votesCount = (localCandidate.votesCount || 0) + 1;
    
    closeModal('voteModal');
    renderCandidates();
    showToast('Votre vote a bien été enregistré. Merci !');
  } catch (submitError) {
    console.error(submitError);
    error.textContent = 'Impossible d enregistrer le vote. Réessayez.';
  }
}

document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => closeModal(button.dataset.close));
});

document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
  backdrop.addEventListener('click', (event) => { 
    if (event.target === backdrop) backdrop.classList.remove('open'); 
  });
});

$('#voteForm').addEventListener('submit', submitVote);

loadData();