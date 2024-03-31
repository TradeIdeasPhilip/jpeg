import { getById } from "phil-lib/client-misc";
import { initializedArray, makePromise } from "phil-lib/misc";

const initialImg = getById("initialImg", HTMLImageElement);
const initialCanvas = getById("initialCanvas", HTMLCanvasElement);

const promise = makePromise<number[][]>();

export const initialPixels = promise.promise;

async function copyImgToCanvas() {
  await initialImg.decode();
  const height = initialImg.naturalHeight;
  const width = initialImg.naturalWidth;
  if (height == 0 || width == 0) {
    // The documentation suggests that decode() will throw an exception if there is a problem.
    // However, as I recall the promise resolves to undefined as soon as the image succeeds or fails.
    // I'm using this test to know if it failed.
    console.error("problem with image");
  } else {
    initialCanvas.width = width;
    initialCanvas.height = height;
    const context = initialCanvas.getContext("2d");
    if (!context) {
      throw new Error("wtf");
    }
    context.fillStyle = "#777";
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = "luminosity";
    context.drawImage(initialImg, 0, 0);

    const allBytes = context.getImageData(0, 0, width, height).data;
    promise.resolve(
      initializedArray(height, (rowIndex) =>
        initializedArray(
          width,
          (columnIndex) => allBytes[4 * (rowIndex * width + columnIndex)]
        )
      )
    );

    context.globalCompositeOperation = "color";
    context.fillStyle = "#f00";
    context.fillRect(0, 8, 8, 8);
    context.fillStyle = "#0f0";
    context.fillRect(8, 0, 8, 8);
    context.fillStyle = "#00f";
    context.fillRect(8, 8, 8, 8);
  }
}

copyImgToCanvas();
