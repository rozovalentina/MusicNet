// Manages network connection and synchronization

const RENDER_SERVICE_URL = "https://parcnet.onrender.com";

function sendToParcnet(fileInput) {
  const formData = new FormData();
  formData.append('file', fileInput);

  return fetch(`${RENDER_SERVICE_URL}/parcnet2`, {
    method: "POST",
    body: formData
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("Error during audio enhancement: " + response.statusText);
    }
    return response.blob();
  })
  .catch(error => {
    console.error("Error sending audio:", error);
    throw error;
  });
}

async function sendToParcnetIfNeeded(wavBlob) {
  const formData = new FormData();
  formData.append('file', wavBlob);

  try {
    const lossResponse = await fetch(`${RENDER_SERVICE_URL}/detect_loss`, {
      method: "POST",
      body: formData
    });

    if (!lossResponse.ok) throw new Error("Error getting loss data");
    const lossData = await lossResponse.json();

    if (lossData.loss_percentage > 1.0) {
      console.log("Pérdida alta, enviando a PARCnet...");
      return sendToParcnet(wavBlob); 
    } else {
      return wavBlob; 
    }
  } catch (err) {
    console.error("Error en la detección de pérdida:", err);
    return wavBlob; 
  }
}