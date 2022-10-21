import { unified } from 'https://esm.sh/unified@10'
import remarkParse from "https://esm.sh/remark-parse@10?bundle";
import remarkGfm from 'https://esm.sh/remark-gfm@3'

let fileHandle;
butOpenFile.addEventListener('click', async () => {
  [fileHandle] = await window.showOpenFilePicker();

  setInterval(drawTodos, 100);
});

let file;
let fileLastModified = 0;
const drawTodos = async () => {
  file = await fileHandle.getFile();
  if (file.lastModified === fileLastModified) return;
  fileLastModified = file.lastModified;
  const contents = await file.text();

  // Clear the todo lists
  todoList.innerHTML = '';
  doneList.innerHTML = '';

  const mdAst = await unified()
    .use(remarkGfm)
    .use(remarkParse)
    .parse(contents);

  fileContents.value = JSON.stringify(mdAst, null, 2);

  const lists = mdAst.children.filter((node) => node.type === 'list');
  lists.forEach((list) => {
    list.children.forEach((item) => {
      const listItem = document.createElement('li');
      listItem.textContent = item.children[0].children[0].value;
      if (item.checked) {
        doneList.appendChild(listItem);
      } else {
        todoList.appendChild(listItem);
      }
    });
  });
};

fileContents.addEventListener('input', async e => {
  const writable = await fileHandle.createWritable();
  await writable.write(e.target.value);
  await writable.close();
});
