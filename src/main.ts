import { initializedArray } from 'phil-lib/misc';
import './style.css';
import { getById } from 'phil-lib/client-misc';

const SIZE = 8

function findGrid(id:string){
  const top = getById(id, HTMLDivElement);
  top.classList.add("grid");
  const byRow = initializedArray(SIZE, () =>  initializedArray(SIZE, () => {
    const cell = document.createElement("div");
    top.appendChild(cell);
    return cell;
  }) );
  return {top, byRow};
}

const inputGrid = findGrid("input");

const period = 5000;
inputGrid.byRow.forEach((row) => row.forEach(cell =>{
  cell.animate([{offset:0, backgroundColor:"rgba(0,0,0,0)"},{offset:0.05, backgroundColor:"rgba(0,0,0,.1)"},{offset:0.1, backgroundColor:"rgba(0,0,0,0)"},], {duration:period, iterations:Infinity, delay:Math.random()*period });
}))

const all = inputGrid.byRow.flat();
let index = 0;
all[index++].innerText="0";
all[index++].innerText="0.00";
all[index++].innerText=".00";
all[index++].innerText=".987654";
all[index++].innerHTML="5<br>5";
