import { initializedArray, makeBoundedLinear } from "phil-lib/misc";
import "./style.css";
import { getById } from "phil-lib/client-misc";
import * as math from "mathjs";
import seedrandom from "seedrandom";
import { initialPixels } from "./input-data";
import { drawResult } from "./final-output";

const SIZE = 8;
const AREA = SIZE * SIZE;

/**
 * These indices refer to a specific position in a matrix.
 *
 * The property names make sense when using a matrix to transform a _source_ vector into a _result_ vector.
 */
type TransformIndices = {
  /**
   * This is an index into the vector that we want to transform, i.e the _source_ of the transformation.
   *
   * This is a _column_ number in a transformation matrix.
   */
  sourceIndex: number;
  /**
   * This is an index into the vector that is the _result_ of the transformation.
   *
   * This is a _row_ number in the matrix.
   */
  resultIndex: number;
};

function createMatrix(getValue: (indices: TransformIndices) => number) {
  const asArrays = initializedArray(AREA, (resultIndex) =>
    initializedArray(AREA, (sourceIndex) =>
      getValue({ resultIndex, sourceIndex })
    )
  );
  return math.matrix(asArrays);
}

type InitialTransform = {
  /** Something unique to show the user. */
  name: string;
  /**
   * This is a matrix that will transform a vector of encoded numbers to a vector of plaintext numbers.
   * The matrix's dimensions should be AREA ⨉ AREA.
   *
   * This is a linear transform from a list of _encoded_ numbers to a list of _plaintext_ numbers, so:
   * - The column number in this matrix refers to the index in the initial vector of encoded numbers.
   * - The row number in this matrix refers to the index in the resulting vector of plaintext numbers.
   *
   * The inverse matrix will be computed elsewhere.
   * This must exist.
   */
  decode: math.Matrix;
};

const initialTransforms: InitialTransform[] = [];
initialTransforms.push({
  name: "Simple Average",
  decode: math.inv(
    createMatrix(({ resultIndex, sourceIndex }) => {
      if (resultIndex == 0) {
        return 1 / AREA;
      } else {
        if (sourceIndex == resultIndex) {
          return 1 - 1 / AREA;
        } else {
          return -1 / AREA;
        }
      }
    })
  ),
});

initialTransforms.push({
  name: "Identity",
  decode: createMatrix(({ resultIndex, sourceIndex }) =>
    resultIndex == sourceIndex ? 1 : 0
  ),
});
{
  const rng = seedrandom("גרסה ראשונה");
  initialTransforms.push({ name: "Random", decode: createMatrix(() => rng()) });
}
//{ name: "Squares", decode: math.matrix("dense") },

//{ name: "Taylor ⨉ Taylor", decode: math.matrix("dense") },
//{ name: "Blur", decode: math.matrix("dense") },
//{ name: "Taylor ⨉ (Rows ∪ Columns)", decode: math.matrix("dense") },

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 3,
});

function findGrid(id: string) {
  const top = getById(id, HTMLDivElement);
  top.classList.add("grid");
  const byRow = initializedArray(SIZE, () =>
    initializedArray(SIZE, () => {
      const div = document.createElement("div");
      top.appendChild(div);
      const text = initializedArray(2, () => {
        const d = document.createElement("div");
        div.appendChild(d);
        return d;
      });
      let value = 0.5;
      const result = {
        div,
        get value() {
          return value;
        },
        set value(newValue) {
          value = newValue;
          text.forEach(
            (element) => (element.innerText = numberFormatter.format(newValue))
          );
          const asPercent = `${newValue * 100}%`;
          div.style.backgroundColor = `rgba(${asPercent},${asPercent},${asPercent})`;
        },
      };
      result.value = value;
      return result;
    })
  );
  const all = byRow.flat();
  function getVector() {
    return math.matrix(all.map((cell) => cell.value));
  }
  function setVector(matrix: math.Matrix) {
    all.forEach((cell, index) => {
      cell.value = matrix.get([index]);
    });
  }
  return {
    top,
    byRow,
    all,
    get vector() {
      return getVector();
    },
    set vector(vector) {
      setVector(vector);
    },
  };
}

const initialGrid = findGrid("initial");
const encodedGrid = findGrid("encoded");
const recreatedGrid = findGrid("recreated");

(window as any).grids = { initialGrid, encodedGrid, recreatedGrid };

const transformSelect = getById("transformName", HTMLSelectElement);

initialTransforms.forEach((transform) => {
  const option = document.createElement("option");
  option.innerText = transform.name;
  transformSelect.appendChild(option);
});

function updateCells(which: "both" | "bottom") {
  const decode = initialTransforms[transformSelect.selectedIndex].decode;
  if (which == "both") {
    const encode = math.inv(decode);
    const encoded = math.multiply(encode, initialGrid.vector);
    encodedGrid.vector = encoded;
  }
  const recreated = math.multiply(decode, encodedGrid.vector);
  recreatedGrid.vector = recreated;
}

initialGrid.all.forEach((cell) => {
  const div = cell.div;
  div.style.cursor = "crosshair";
  let restoreTo = cell.value;
  function update(event: PointerEvent) {
    const x = event.offsetX / div.offsetWidth;
    const y = event.offsetY / div.offsetHeight;
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      cell.value = restoreTo;
    } else {
      const newValue = Math.min(1, Math.max(0, x + y - 0.5));
      cell.value = newValue;
      updateCells("both");
    }
  }
  div.addEventListener("pointerdown", (event) => {
    if (event.button == 0) {
      restoreTo = cell.value;
      update(event);
      div.setPointerCapture(event.pointerId);
    }
  });
  div.addEventListener("pointermove", (event) => {
    if (div.hasPointerCapture(event.pointerId) && event.buttons & 1) {
      update(event);
    }
  });
});

encodedGrid.all.forEach((cell, index) => {
  const div = cell.div;
  div.style.cursor = "pointer";
  div.addEventListener("pointerdown", (event) => {
    if (event.button == 0) {
      const newValue = prompt(
        `Index ${index}`,
        numberFormatter.format(cell.value)
      );
      if (newValue !== null) {
        cell.value = +newValue;
        updateCells("bottom");
      }
    }
  });
});

{
  const radiusToValue = makeBoundedLinear(3, 1, 4, 0);
  const centerRow = 4;
  const centerColumn = 3;
  initialGrid.byRow.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      const radius = Math.hypot(
        rowIndex - centerRow,
        columnIndex - centerColumn
      );
      cell.value = radiusToValue(radius);
    });
  });
}

updateCells("both");
transformSelect.addEventListener("input", () => updateCells("both"));

initialPixels.then((values) => drawResult(values));
