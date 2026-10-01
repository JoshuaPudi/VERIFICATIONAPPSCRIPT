const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyxrHTX310DMF3dIbzltT0HIwDvqyShdKvZoBu6RErawbNX1T2lKl6suf2AhBGi9UIvVw/exec";

const searchForm = document.getElementById("searchForm");
const resultCard = document.getElementById("resultCard");
const messageBox = document.getElementById("messageBox");

// Show a Bootstrap alert message.
function showMessage(message, type = "danger") {
  resultCard.classList.add("d-none");
  messageBox.className = `alert alert-${type} mt-4`;
  messageBox.textContent = message;
}

// Hide the alert message.
function hideMessage() {
  messageBox.classList.add("d-none");
}

// Display a verified ID record returned by Apps Script.
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
  } else if (status === "INACTIVE") {
    statusBadge.classList.add("text-bg-danger");
  } else {
    statusBadge.classList.add("text-bg-secondary");
  }

  resultCard.classList.remove("d-none");
}

// Send a verification request to the Google Apps Script Web App.
async function requestVerification(params) {
  const url = new URL(APPS_SCRIPT_URL);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  showMessage("Checking ID...", "info");

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error("Request failed");
    }

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

// Manual verification using Control Number + Last Name.
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const idNumber = document.getElementById("idNumber").value.trim();
  const lastName = document.getElementById("lastName").value.trim();

  if (!idNumber || !lastName) {
    showMessage("Enter both Control Number and Last Name.", "warning");
    return;
  }

  requestVerification({
    action: "search",
    idNumber,
    lastName
  });
});

// Read a Control Number from an existing QR code.
// If the QR contains a URL, the code tries common ID parameters first.
// Otherwise, the complete QR text is treated as the Control Number.
function extractControlNumber(decodedText) {
  const value = String(decodedText || "").trim();

  try {
    const qrUrl = new URL(value);

    return (
      qrUrl.searchParams.get("idNumber") ||
      qrUrl.searchParams.get("controlNumber") ||
      qrUrl.searchParams.get("id") ||
      value
    ).trim();
  } catch {
    return value;
  }
}

let lastScannedValue = "";
let lastScannedAt = 0;

// Called automatically when the camera successfully reads a QR code.
function onScanSuccess(decodedText) {
  const now = Date.now();

  // Prevent the same QR from firing repeatedly every frame.
  if (decodedText === lastScannedValue && now - lastScannedAt < 3000) {
    return;
  }

  lastScannedValue = decodedText;
  lastScannedAt = now;

  const controlNumber = extractControlNumber(decodedText);

  requestVerification({
    action: "qr",
    idNumber: controlNumber
  });
}

// Start the QR scanner if the library loaded correctly.
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
