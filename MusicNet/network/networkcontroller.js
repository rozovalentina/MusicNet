// Manages network connection and synchronization
function sendToParcnet(fileInput) {
  console.log("Pasa por parcNet");
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

