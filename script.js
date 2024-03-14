logid = 0;
var var1;
function addlog(txt) {
  var strlog = String(logid++);
  $("#log").append(
    '<div id="log_' + strlog + '">[' + strlog + "]" + txt + "</div>",
  );
  setTimeout(function () {
    $("#log_" + strlog).remove();
  }, 5000);
}

const video = document.getElementById("video");

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
]).then(startWebcam);

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error(error, 'Puede encontrar mas información en https://developer.mozilla.org/es/docs/Web/API/MediaDevices/getUserMedia');
    });
}

function getLabeledFaceDescriptions() {
  const labels = ["roberto", "gaston", "moska"];
  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      for (let i = 1; i <= 2; i++) {
        const img = await faceapi.fetchImage(`./labels/${label}/${i}.jpg`);
        addlog(`./labels/${label}/${i}.jpg`);
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        descriptions.push(detections.descriptor);
      }
      var r = new faceapi.LabeledFaceDescriptors(label, descriptions);
      addlog("r: " + JSON.stringify(r));
      return r;
    }),
  );
}

video.addEventListener("play", async () => {
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();

  addlog("labeledFaceDescriptors: " + JSON.stringify(labeledFaceDescriptors));

  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
  addlog("faceMatcher: " + JSON.stringify(faceMatcher));

  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  addlog("canvas: " + JSON.stringify(canvas));

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  addlog("displaySize: " + JSON.stringify(displaySize));

  task = setInterval(async () => {
    const timestamp = new Date().toLocaleString();
    //addlog("timestamp: " + timestamp);

    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    //addlog("resizedDetections: " + JSON.stringify(resizedDetections));

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    const results = resizedDetections.map((d) => {
      return faceMatcher.findBestMatch(d.descriptor);
    });

    //addlog("results: " + JSON.stringify(results));

    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: result,
      });
      //addlog("drawBox: " + JSON.stringify(drawBox));
      var1 = typeof var1 == "undefined" ? drawBox : var1;
      drawBox.draw(canvas);

      var ctx = canvas.getContext("2d");

      // Configura el estilo del rectángulo
      ctx.lineWidth = 2; // Ancho de la línea del borde
      ctx.strokeStyle = "#3366ff"; // Color del borde
      ctx.fillStyle = "transparent"; // Color del relleno (transparente en este caso)

      // Configura la esquina de los bordes redondeados
      var borderRadius = drawBox.box._width / 2;

      // Dibuja el rectángulo con bordes redondeados
      ctx.beginPath();
      ctx.moveTo(drawBox.box._x + borderRadius, drawBox.box._y);
      ctx.arcTo(
        drawBox.box._x + drawBox.box._width,
        drawBox.box._y,
        drawBox.box._x + drawBox.box._width,
        drawBox.box._y + drawBox.box._height,
        borderRadius,
      );
      ctx.arcTo(
        drawBox.box._x + drawBox.box._width,
        drawBox.box._y + drawBox.box._height,
        drawBox.box._x,
        drawBox.box._y + drawBox.box._height,
        borderRadius,
      );
      ctx.arcTo(
        drawBox.box._x,
        drawBox.box._y + drawBox.box._height,
        drawBox.box._x,
        drawBox.box._y,
        borderRadius,
      );
      ctx.arcTo(
        drawBox.box._x,
        drawBox.box._y,
        drawBox.box._x + drawBox.box._width,
        drawBox.box._y,
        borderRadius,
      );
      ctx.closePath();

      // Dibuja el borde y el relleno
      ctx.stroke(); // Dibuja el borde
      ctx.fill(); // Rellena el rectángulo (transparente en este caso)
    });
  }, 100);
});
