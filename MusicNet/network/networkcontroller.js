// Manages network connection and synchronization
function sendToParcnet(fileInput) {
  const formData = new FormData();
  formData.append('file', fileInput);

  return fetch("http://127.0.0.1:8081/parcnet2", {
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
  //console.log("Verificandooo...");
  const formData = new FormData();
  formData.append('file', wavBlob);

  try {
    // 1. Consultar el porcentaje de pérdida
    const lossResponse = await fetch("http://127.0.0.1:8081/detect_loss", {
      method: "POST",
      body: formData
    });

    if (!lossResponse.ok) throw new Error("Error getting loss data");
    const lossData = await lossResponse.json();

    //console.log(`Pérdida detectada: ${lossData.loss_percentage.toFixed(2)}%`);

    if (lossData.loss_percentage > 1.0) {
      console.log("Pérdida alta, enviando a PARCnet...");
      return sendToParcnet(wavBlob); // usa el original
    } else {
      //console.log("Pérdida baja, usando audio original");
      return wavBlob; // devuelve el mismo blob sin procesar
    }
  } catch (err) {
    console.error("Error en la detección de pérdida:", err);
    return wavBlob; // fallback a original en caso de error
  }
}


