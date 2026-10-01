const APPS_SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

const searchForm = document.getElementById("searchForm");
const resultCard = document.getElementById("resultCard");
const messageBox = document.getElementById("messageBox");

function showMessage(message, type = "danger") {
  resultCard.classList.add("d-none");
  messageBox.className = `alert alert-${type} mt-4`;
  messageBox.textContent = message;
}

function hideMessage() {
  messageBox.classList.add("d-none");
}

function showResult(data) {
  hideMessage();

  document.getElementById("resultName").textContent = data.name || "-";
  document.getElementById("resultDesignation").textContent = data.designation || "-";
  document.getElementById("resultAcquired").textContent = data.dateAcquired || "-";
  document.getElementById("resultExpiration").textContent = data.expirationDate || "-";

  const statusBadge = document.getElementById("resultStatus");
  const status = (data.status || "UNKNOWN").toUpperCase();
  statusBadge.textContent = status;
  statusBadge.className = "badge";

  if (status === "VALID" || status === "ACTIVE") {
    statusBadge.classList.add("text-bg-success");
  } else if (status === "EXPIRED") {
    statusBadge.classList.add("text-bg-warning");
  } else {
    statusBadge.classList.add("text-bg-secondary");
  }

  resultCard.classList.remove("d-none");
}

async function requestVerification(params) {
  if (APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
    showMessage("Apps Script URL is not configured yet.", "warning");
    return;
  }

  const url = new URL(APPS_SCRIPT_URL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  showMessage("Checking ID...", "info");

  try {
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Request failed");

    const data = await response.json();

    if (!data.success) {
      showMessage(data.message || "ID record not found.");
      return;
    }

    showResult(data.record);
  } catch (error) {
    console.error(error);
    showMessage("Unable to verify the ID right now. Please try again.");
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const idNumber = document.getElementById("idNumber").value.trim();
  const lastName = document.getElementById("lastName").value.trim();

  if (!idNumber || !lastName) {
    showMessage("Enter both ID Number and Last Name.", "warning");
    return;
  }

  requestVerification({
    action: "search",
    idNumber,
    lastName
  });
});

function extractToken(decodedText) {
  try {
    const qrUrl = new URL(decodedText);
    return qrUrl.searchParams.get("token") || decodedText;
  } catch {
    return decodedText.trim();
  }
}

let lastScannedValue = "";
let lastScannedAt = 0;

function onScanSuccess(decodedText) {
  const now = Date.now();

  if (decodedText === lastScannedValue && now - lastScannedAt < 3000) {
    return;
  }

  lastScannedValue = decodedText;
  lastScannedAt = now;

  const token = extractToken(decodedText);
  requestVerification({
    action: "qr",
    token
  });
}

if (typeof Html5QrcodeScanner !== "undefined") {
  const scanner = new Html5QrcodeScanner(
    "reader",
    {
      fps: 10,
      qrbox: { width: 240, height: 240 },
      rememberLastUsedCamera: true
    },
    false
  );

  scanner.render(onScanSuccess, () => {});
} else {
  showMessage("QR scanner library failed to load.");
}
