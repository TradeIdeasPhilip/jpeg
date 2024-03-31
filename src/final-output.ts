import { getById } from "phil-lib/client-misc";

const finalCanvas = getById("finalCanvas", HTMLCanvasElement);

export function drawResult(values: ReadonlyArray<ReadonlyArray<number>>) {
  const height = values.length;
  if (height == 0) {
    finalCanvas.width = 0;
    finalCanvas.height = 0;
  } else {
    const width = values[0].length;
    finalCanvas.width = width;
    finalCanvas.height = height;
    const imageData = new ImageData(width, height);
    const bytes = imageData.data;
    values.flat().forEach((value, sourceIndex) => {
      value = Math.round(value) | 1;
      let destinationIndex = sourceIndex * 4;
      bytes[destinationIndex++] = value; // Red
      bytes[destinationIndex++] = value; // Green
      bytes[destinationIndex++] = value; // Blue
      bytes[destinationIndex] = 255; // Alpha
    });
    finalCanvas.getContext("2d")!.putImageData(imageData, 0, 0);
  }
}
