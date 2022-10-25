import { unified } from 'https://esm.sh/unified@10'
import remarkParse from "https://esm.sh/remark-parse@10";
import remarkGfm from 'https://esm.sh/remark-gfm@3'
import remarkStringify from 'https://esm.sh/remark-stringify@10';

let fileHandle;
butOpenFile.addEventListener('click', async () => {
  [fileHandle] = await window.showOpenFilePicker();

  setInterval(drawTodos, 100);
});

let file;
let fileLastModified = 0;
let mdAst;
const drawTodos = async () => {
  file = await fileHandle.getFile();
  if (file.lastModified === fileLastModified) return;
  fileLastModified = file.lastModified;
  const contents = await file.text();

  // Clear the todo lists
  todoList.innerHTML = '';
  doneList.innerHTML = '';

  mdAst = await unified()
    .use(remarkGfm)
    .use(remarkParse)
    .parse(contents);

  fileContents.value = JSON.stringify(mdAst, null, 2);

  const todos = getAllTodos(mdAst);
  todos.forEach((item) => {
    console.log(item);
    const listItem = document.createElement('li');
    listItem.draggable = true;
    listItem.textContent = item.children[0].children[0].value;
    listItem.addEventListener('dragstart', dragStart);
    listItem.addEventListener('dragend', dragEnd);
    listItem.addEventListener('drop', handleDrop);
    // add the line number to the todo item so that we can find the todo later
    listItem.dataset.lineNumber = item.position.start.line;
    if (item.checked) {
      listItem.classList.add('done')
      doneList.appendChild(listItem);
    } else {
      todoList.appendChild(listItem);
    }
  });

  const headings = getAllHeadings(mdAst);

};

const getAllHeadings = (mdAst) => {
  const headings = [];
  mdAst.children.forEach((node) => {
    if (node.type === 'heading') {
      headings.push(node);
    }
  });
  return headings;
};

// recursively find all the todo items in the markdown AST
const getAllTodos = (mdAst) => {
  const todos = [];
  const findTodos = (node) => {
    if (node.type === 'listItem') {
      if (node.checked !== null) {
        todos.push(node);
      }
    }
    if (node.children) {
      node.children.forEach(findTodos);
    }
  }
  mdAst.children.forEach(findTodos);
  return todos;
};

let draggingItem;
const dragStart = (e) => {
  const item = e.target;
  item.style.opacity = '0.4';

  draggingItem = item;

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', item.innerHTML);
};

const dragEnd = (e) => {
  const item = e.target;
  item.style.opacity = '1';
};

const dragEnter = (e) => {
  e.target.classList.add('over');
};

const dragLeave = (e) => {
  e.target.classList.remove('over');
};

const dragOver = (e) => {
  e.preventDefault();
};

const handleDrop = async (e) => {
  e.stopPropagation();

  const contents = await file.text();
  let fileContentArr = contents.split(`\n`);
  const lineNumber = draggingItem.dataset.lineNumber;
  if (e.target.id === 'doneDrop' && !draggingItem.classList.contains('done')) {
    // move the todo item to the done list
    draggingItem.parentElement.removeChild(draggingItem);
    e.target.children[1].appendChild(draggingItem);
    e.target.classList.remove('over');

    fileContentArr[lineNumber - 1] = fileContentArr[lineNumber - 1].replace(`[ ]`, `[x]`);
  } else if (e.target.id === 'todoDrop' && draggingItem.classList.contains('done')) {
    // move the todo item to the todo list
    draggingItem.parentElement.removeChild(draggingItem);
    e.target.children[1].appendChild(draggingItem);
    e.target.classList.remove('over');

    fileContentArr[lineNumber - 1] = fileContentArr[lineNumber - 1].replace(`[x]`, `[ ]`);
  }

  const fileContent = fileContentArr.join(`\n`);
  fileHandle.createWritable().then((writable) => {
    writable.write(fileContent);
    writable.close();
  });

  console.log(fileContent);

  drawTodos();
};

todoDrop.addEventListener('dragenter', dragEnter);
todoDrop.addEventListener('dragleave', dragLeave);
todoDrop.addEventListener('drop', handleDrop);
todoDrop.addEventListener('dragover', dragOver);
doneDrop.addEventListener('dragenter', dragEnter);
doneDrop.addEventListener('dragleave', dragLeave);
doneDrop.addEventListener('drop', handleDrop);
doneDrop.addEventListener('dragover', dragOver);

fileContents.addEventListener('input', async e => {
  const writable = await fileHandle.createWritable();
  await writable.write(e.target.value);
  await writable.close();
});
