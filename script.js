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

  const lists = mdAst.children.filter((node) => node.type === 'list');
  lists.forEach((list) => {
    list.children.forEach((item) => {
      const listItem = document.createElement('li');
      listItem.draggable = true;
      listItem.textContent = item.children[0].children[0].value;
      listItem.addEventListener('dragstart', dragStart);
      listItem.addEventListener('dragend', dragEnd);
      listItem.addEventListener('drop', handleDrop);
      if (item.checked) {
        doneList.appendChild(listItem);
        listItem.classList.add('done')
      } else {
        todoList.appendChild(listItem);
      }
    });
  });
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

const handleDrop = (e) => {
  e.stopPropagation();

  if (e.target.id === 'doneDrop' && !draggingItem.classList.contains('done')) {
    draggingItem.parentElement.removeChild(draggingItem);
    e.target.children[1].appendChild(draggingItem);
    e.target.classList.remove('over');

    // Update the AST
    const lists = mdAst.children.filter((node) => node.type === 'list');
    lists.forEach((list) => {
      list.children.forEach((item) => {
        if (item.children[0].children[0].value === draggingItem.textContent) {
          item.checked = true;
        }
      });
    });
    // turn the mdAst back into markdown using remark-stringify
    let markdown = unified()
      .use(remarkGfm)
      .use(remarkStringify)
      .stringify(mdAst);

    // write the markdown back to the file
    fileHandle.createWritable().then((writable) => {
      writable.write(markdown);
      writable.close();
    });

  } else if (e.target.id === 'todoDrop' && draggingItem.classList.contains('done')) {
    draggingItem.parentElement.removeChild(draggingItem);
    e.target.children[1].appendChild(draggingItem);
    e.target.classList.remove('over');

    // Update the AST
    const lists = mdAst.children.filter((node) => node.type === 'list');
    lists.forEach((list) => {
      list.children.forEach((item) => {
        if (item.children[0].children[0].value === draggingItem.textContent) {
          item.checked = false;
        }
      });
    });
    // turn the mdAst back into markdown using remark-stringify
    let markdown = unified()
      .use(remarkGfm)
      .use(remarkStringify)
      .stringify(mdAst);

    // write the markdown back to the file
    fileHandle.createWritable().then((writable) => {
      writable.write(markdown);
      writable.close();
    });
  }
  return false;
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
