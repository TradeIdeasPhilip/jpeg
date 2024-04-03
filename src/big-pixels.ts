import { initializedArray, makeLinear, sum } from "phil-lib/misc";

export type Transformed = {
  readonly height: number;
  readonly width: number;
  valuesByLevel: number[][];
};

type Location = {
  readonly recursionDepth: number;
  readonly topRow: number;
  readonly height: number;
  readonly leftColumn: number;
  readonly width: number;
};
type Callback = (siblings: ReadonlyArray<Location>) => void;

function forEachPixel(
  location: Location,
  allPixels: number[][],
  callback: (array: number[], index: number) => void
) {
  const rowStop = location.topRow + location.height;
  const columnStop = location.leftColumn + location.width;
  for (let rowIndex = location.topRow; rowIndex < rowStop; rowIndex++) {
    const row = allPixels[rowIndex];
    for (
      let columnIndex = location.leftColumn;
      columnIndex < columnStop;
      columnIndex++
    ) {
      callback(row, columnIndex);
    }
  }
}

function pixelCount(location: Location) {
  if (!(location.width >= 0 && location.height >= 0)) {
    return NaN;
  }
  return location.width * location.height;
}
function assertSamePixelCount(parent: Location, children: Location[]) {
  const parentPixelCount = pixelCount(parent);
  const childPixelCount = sum(children.map(pixelCount));
  if (parentPixelCount != childPixelCount) {
    debugger;
    throw new Error("pixel count mismatch");
  }
}

class MaxRecursionDepth {
  static #maxSoFar = 0;
  static show(current: number) {
    if (current > this.#maxSoFar) {
      this.#maxSoFar = current;
      console.log(current);
    }
  }
}

function breadthFirstSearchHelper( // need a fifo, no recursion ‼️
  siblings: readonly Location[],
  callback: Callback
): void {
  callback(siblings);
  siblings.forEach((startFrom) => {
    function processChildren(children: Location[]) {
      assertSamePixelCount(startFrom, children);
      breadthFirstSearchHelper(children, callback);
    }
    const recursionDepth = startFrom.recursionDepth + 1;
    MaxRecursionDepth.show(recursionDepth);
    if (startFrom.height >= 2 * startFrom.width) {
      const childCount = Math.floor(startFrom.height / startFrom.width);
      const getRowIndex = makeLinear(
        0,
        startFrom.topRow,
        childCount,
        startFrom.topRow + startFrom.height
      );
      const children = initializedArray<Location>(childCount, (index) => {
        const topRow = Math.round(getRowIndex(index));
        const height = Math.round(getRowIndex(index + 1)) - topRow;
        const { leftColumn, width } = startFrom;
        return { recursionDepth, height, leftColumn, topRow, width };
      });
      processChildren(children);
    } else if (startFrom.width >= 2 * startFrom.height) {
      const childCount = Math.floor(startFrom.width / startFrom.height);
      const getColumnIndex = makeLinear(
        0,
        startFrom.topRow,
        childCount,
        startFrom.topRow + startFrom.height
      );
      const children = initializedArray<Location>(childCount, (index) => {
        const leftColumn = Math.round(getColumnIndex(index));
        const width = Math.round(getColumnIndex(index + 1)) - leftColumn;
        const { topRow, height } = startFrom;
        return {
          recursionDepth: recursionDepth,
          height,
          leftColumn,
          topRow,
          width,
        };
      });
      processChildren(children);
    } else if (startFrom.width == 1 && startFrom.height == 1) {
      // Base case!  Nothing else to do.
    } else {
      // Slice the Location vertically and horizontally to get 4 approximately equal children.
      if (startFrom.width < 2 || startFrom.height < 2) {
        throw new Error("wtf");
      }
      const leftWidth = Math.floor(startFrom.width / 2);
      const rightWidth = startFrom.width - leftWidth;
      const left = { leftColumn: startFrom.leftColumn, width: leftWidth };
      const right = {
        leftColumn: startFrom.leftColumn + leftWidth,
        width: rightWidth,
      };
      const topHeight = Math.floor(startFrom.height / 2);
      const bottomHeight = startFrom.height - topHeight;
      const top = { topRow: startFrom.topRow, height: topHeight };
      const bottom = {
        topRow: startFrom.topRow + topHeight,
        height: bottomHeight,
      };
      const children: Location[] = [
        { recursionDepth: recursionDepth, ...top, ...left },
        { recursionDepth: recursionDepth, ...bottom, ...left },
        { recursionDepth: recursionDepth, ...top, ...right },
        { recursionDepth: recursionDepth, ...bottom, ...right },
      ];
      processChildren(children);
    }
  });
}

/**
 * This function will be shared by the encoder and the decoder.
 * It recursively breaks the image into pieces knowing only the image's height and width.
 * @param width How many pixels across is the entire image.
 * @param height How many pixels high is the entire image.
 * @param callback What to do with each section of the image.
 */
function breadthFirstSearch(
  width: number,
  height: number,
  callback: Callback
): void {
  if (width > 0 && height > 0) {
    breadthFirstSearchHelper(
      [{ recursionDepth: 0, height, leftColumn: 0, topRow: 0, width }],
      callback
    );
  }
}
(window as any).breadthFirstSearch = breadthFirstSearch;

export function transform(original: number[][]): Transformed {
  const height = original.length;
  const width = original[0].length;
  const result: Transformed = { height, width, valuesByLevel: [] };
  function getResultList(level: number): number[] {
    const valuesByLevel = result.valuesByLevel;
    while (level >= valuesByLevel.length) {
      valuesByLevel.push([]);
    }
    return valuesByLevel[level];
  }
  function callback(siblings: ReadonlyArray<Location>): void {
    const siblingCount = siblings.length;
    const doNotWriteThisIndex = siblingCount == 1 ? -1 : siblingCount - 1;
    for (let i = 0; i < siblingCount; i++) {
      const location = siblings[i];
      // Find the average
      let count = 0;
      let sum = 0;
      forEachPixel(location, original, (array, index) => {
        count++;
        sum += array[index];
      });
      const average = sum / count;
      // subtract the average from all cells
      forEachPixel(location, original, (array, index) => {
        array[index] -= average;
      });
      if (i != doNotWriteThisIndex) {
        // Write the average
        getResultList(location.recursionDepth).push(average);
      }
    }
  }
  breadthFirstSearch(width, height, callback);
  return result;
}

export function restore(transformed: Transformed): number[][] {
  transformed;
  return []; //TODO
}

function countDistinct(
  numbers: readonly number[],
  startFrom: number,
  endBefore: number
) {
  const result = new Map<number, number>();
  for (let index = startFrom; index < endBefore; index++) {
    const number = numbers[index];
    const previousCount = result.get(number) ?? 0;
    result.set(number, previousCount + 1);
  }
  return result;
}

/**
 * Compute the ideal cost of a single item sent to the entropy encoder.
 * I've found these estimates to be very accurate using [rANS](https://en.wikipedia.org/wiki/Asymmetric_numeral_systems#Range_variants_(rANS)_and_streaming)
 * when the dictionary is complete.
 * @param probability The probability of seeing the value we intend to encode.
 * @returns The number of bits required to encode the symbol.
 */
function idealItemCost(probability: number) {
  return -Math.log2(probability);
}

function idealListCost(counts: number[]) {
  const denominator = sum(counts);
  let result = 0;
  counts.forEach(
    (count) => (result += count * idealItemCost(count / denominator))
  );
  return result;
}

function costFromMap(items: Map<unknown, number>) {
  return idealListCost([...items.values()]);
}

export function analyze(numbers: number[]) {
  numbers = numbers.map((number) => Math.round(number * 100000) / 100000);
  numbers.sort((a, b) => a - b);
  const inputCount = numbers.length;
  const mean = sum(numbers) / inputCount;
  const breakCount = 11;
  const getIdealIndex = makeLinear(0, 0, breakCount, inputCount - 1);
  const nTiles = initializedArray(breakCount, (breakNumber) => {
    const idealIndex = getIdealIndex(breakNumber);
    const lowIndex = Math.floor(idealIndex);
    const highIndex = Math.ceil(idealIndex);
    const value = (numbers[lowIndex] + numbers[highIndex]) / 2;
    const optional: { distinct?: Map<number, number> } = {};
    const nextBreak = breakNumber + 1;
    if (nextBreak < breakCount) {
      const lastIndex = Math.floor(getIdealIndex(nextBreak));
      optional.distinct = countDistinct(numbers, highIndex, lastIndex + 1);
    }
    return { breakNumber, value, ...optional };
  });
  const distinct = countDistinct(numbers, 0, numbers.length);
  return {
    inputCount,
    mean,
    totalBits: costFromMap(distinct),
    distinct,
    nTiles,
  };
}
(window as any).analyze = analyze;
