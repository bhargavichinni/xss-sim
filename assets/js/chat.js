/* Message Board using Firebase Firestore */

(() => {
  // 1) Firebase project config
  const firebaseConfig = {
    apiKey: "AIzaSyDC_cdvQ97i82WqYQUU-GRvsvs2fPxe4iM",
    authDomain: "xss-sim.firebaseapp.com",
    projectId: "xss-sim",
    storageBucket: "xss-sim.firebasestorage.app",
    messagingSenderId: "687730855799",
    appId: "1:687730855799:web:7f4e36b1a972f5a6bb9b72",
    measurementId: "G-EDP1ZVERSP"
  };

  // 2) Initialize Firebase + Firestore
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const db = firebase.firestore();

  // 3) DOM references
  const form = document.getElementById("chat-form");
  const nameInput = document.getElementById("chat-name");
  const msgInput = document.getElementById("chat-message");
  const listEl = document.getElementById("chat-list");
  const clearBtn = document.getElementById("clear-posts");
  const statusEl = document.getElementById("chat-status");

  // 4) Firestore collection
  const messagesRef = db.collection("blog_messages");

  // 5) Tiny helpers
  const setStatus = (text) => {
    if (!statusEl) return;
    statusEl.textContent = text || "";
  };

  const makeMessageNode = (doc) => {
    const data = doc.data();

    const wrapper = document.createElement("div");
    wrapper.style.padding = "0.9rem 1rem";
    wrapper.style.border = "1px solid rgba(0,0,0,0.12)";
    wrapper.style.borderRadius = "8px";
    wrapper.style.marginBottom = "0.75rem";
    wrapper.style.background = "rgba(255,255,255,0.9)";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.gap = "1rem";
    header.style.alignItems = "baseline";

    const name = document.createElement("strong");
    name.textContent = (data.name || "Anonymous").slice(0, 40);

    const time = document.createElement("span");
    time.style.opacity = "0.7";
    time.style.fontSize = "0.9rem";

    // Firestore timestamp -> readable
    let dateStr = "";
    if (data.createdAt && typeof data.createdAt.toDate === "function") {
      const d = data.createdAt.toDate();
      dateStr = d.toLocaleString();
    }
    time.textContent = dateStr;

    header.appendChild(name);
    header.appendChild(time);

    const body = document.createElement("div");
    body.style.marginTop = "0.4rem";
    body.style.whiteSpace = "pre-wrap";

    // Below, using ".innerHTML" allows messages to include HTML tags and scripts, allowing for XSS
    // To make this safer, replace ".innerHTML" with ".textContent" to disable all HTML rendering in messages
    body.innerHTML = (data.message || "").slice(0, 500);

    wrapper.appendChild(header);
    wrapper.appendChild(body);

    return wrapper;
  };

  // 6) Live render (real-time updates)
  // Order newest -> oldest; change to "asc" for oldest first.
  messagesRef
    .orderBy("createdAt", "desc")
    .limit(100)
    .onSnapshot(
      (snapshot) => {
        listEl.innerHTML = "";
        if (snapshot.empty) {
          const empty = document.createElement("div");
          empty.style.opacity = "0.75";
          empty.textContent = "No messages yet. Be the first to post!";
          listEl.appendChild(empty);
          return;
        }

        snapshot.forEach((doc) => {
          listEl.appendChild(makeMessageNode(doc));
        });
      },
      (err) => {
        console.error(err);
        setStatus("Error loading messages.");
      }
    );

  // 7) Post a message
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = (nameInput.value || "").trim();
    const message = (msgInput.value || "").trim();

    if (!name || !message) {
      setStatus("Please enter a name and message.");
      return;
    }

    setStatus("Posting...");
    form.querySelector('button[type="submit"]').disabled = true;

    try {
      await messagesRef.add({
        name: name.slice(0, 40),
        message: message.slice(0, 500),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      msgInput.value = "";
      setStatus("Posted!");
      setTimeout(() => setStatus(""), 1500);
    } catch (err) {
      console.error(err);
      setStatus("Failed to post. Check console.");
    } finally {
      form.querySelector('button[type="submit"]').disabled = false;
    }
  });

  // 8) Clear all posts (for everyone)
  // This deletes up to the latest 500 docs
  clearBtn.addEventListener("click", async () => {
    const ok = confirm("Clear ALL posts for everyone? This cannot be undone.");
    if (!ok) return;

    setStatus("Clearing...");
    clearBtn.disabled = true;

    try {
      const snap = await messagesRef.orderBy("createdAt", "desc").limit(500).get();
      const batch = db.batch();
      snap.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      setStatus("All posts cleared.");
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      console.error(err);
      setStatus("Failed to clear posts. Check console.");
    } finally {
      clearBtn.disabled = false;
    }
  });
})();
