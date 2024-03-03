import { initializedArray } from "phil-lib/misc";
import "./style.css";
import { getById } from "phil-lib/client-misc";
import * as math from "mathjs";
import seedrandom from "seedrandom";

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

const mm = math.matrix([
  [1, 0],
  [0, 1],
]);
mm;
math.randomInt(2);

const initialTransforms: InitialTransform[] = [];
initialTransforms.push({
  name: "Simple Average",
  decode: math.transpose(
    math.matrix(
      initializedArray(AREA, (plaintextIndex) => {
        if (plaintextIndex == 0) {
          return initializedArray(AREA, () => 1);
        } else {
          return initializedArray(AREA, (encodedIndex) =>
            encodedIndex == plaintextIndex ? 1 : 0
          );
        }
      })
    )
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
          text.forEach((element) => (element.innerText = newValue.toString()));
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

const transformNameSelect = getById("transformName", HTMLSelectElement);

initialTransforms.forEach((transform) => {
  const option = document.createElement("option");
  option.innerText = transform.name;
  transformNameSelect.appendChild(option);
});

function updateCells() {
  const decode = initialTransforms[transformNameSelect.selectedIndex].decode;
  const encode = math.inv(decode);
  const encoded = math.multiply(encode, initialGrid.vector);
  encodedGrid.vector = encoded;
  const recreated = math.multiply(decode, encoded);
  recreatedGrid.vector = recreated;
}

updateCells();
transformNameSelect.addEventListener("input", updateCells);

/*
inputGrid.all.forEach((cell) => {
  const period = 4500 + Math.random() * 1000;
  cell.animate(
    [
      { offset: 0, backgroundColor: "rgba(0,0,0,0)" },
      {
        offset: Math.random() * 0.3,
        backgroundColor: `rgba(0,0,0,${0.25 + Math.random() * 0.5})`,
      },
      { offset: 0.3, backgroundColor: "rgba(0,0,0,0)" },
    ],
    { duration: period, iterations: Infinity, delay: Math.random() * period }
  );
});
let index = 0;
inputGrid.all[index++].innerText = "0";
inputGrid.all[index++].innerText = "0.00";
inputGrid.all[index++].innerText = ".00";
inputGrid.all[index++].innerText = ".987654";
inputGrid.all[index++].innerHTML = "5<br>5";
*/
