<script>
  // @ts-nocheck

  import { fileOpen } from 'browser-fs-access';
  import { unified } from 'unified';
  import remarkParse from 'remark-parse';
  import remarkGfm from 'remark-gfm';
  import { toHast } from 'mdast-util-to-hast';
  import { toHtml } from 'hast-util-to-html';

  import { dndzone } from 'svelte-dnd-action';
  import Layout from './+layout.svelte';

  let fileContents = '';
  let fileLastModified = 0;
  let handle;
  const openFilePicker = async () => {
    const file = await fileOpen({
      mimeTypes: ['text/plain']
    });
    handle = file.handle;
    fileContents = await file.text();

    setInterval(async () => {
      const file = await handle.getFile();
      if (file.lastModified === fileLastModified) return;
      fileLastModified = file.lastModified;
      fileContents = await file.text();
      parseTodos();
    }, 100);
  };

  let allTodos = [];
  let todoTodos = [];
  let doneTodos = [];
  let irregularTodos = [];
  let uniqueTodoItemCharacters = new Set();
  let numberUniqueTodoItemTypes = 2;
  const parseTodos = async () => {
    let mdAst = await unified().use(remarkGfm).use(remarkParse).parse(fileContents);

    allTodos = getAllTodos(mdAst);
    todoTodos = [];
    doneTodos = [];
    irregularTodos = [];

    // Get list of todo items that are not typical markdown checkboxes
    const irregularTodoItems = allTodos.filter((todo) => todo.checked === null);
    // Get all the characters that are contained in '[ ]' in the todo item text
    irregularTodoItems.forEach((todo) => {
      const todoItemText = todo.children[0].children[0].value;
      const todoItemTextCharacter = todoItemText.match(/\[.*\]/g)[0][1];
      uniqueTodoItemCharacters.add(todoItemTextCharacter);
    });
    numberUniqueTodoItemTypes = 2 + uniqueTodoItemCharacters.size;

    allTodos.forEach(async (todo) => {
      const hast = toHast(todo.children[0]);
      const todoAsHtml = toHtml(hast);
      const todoAsHtmlWithTargetBlank = todoAsHtml.replace(/<a/g, '<a target="_blank"');

      if (todo.checked) {
        doneTodos.push({
          id: todo.position.start.line,
          name: todoAsHtmlWithTargetBlank,
          checked: todo.checked,
          character: 'x'
        });
      } else if (todo.checked === false) {
        todoTodos.push({
          id: todo.position.start.line,
          name: todoAsHtmlWithTargetBlank,
          checked: todo.checked,
          character: ' '
        });
      } else if (todo.checked === null) {
        irregularTodos.push({
          id: todo.position.start.line,
          name: todoAsHtmlWithTargetBlank,
          checked: null,
          character: todo.children[0].children[0].value.match(/\[.*\]/g)[0][1]
        });
      }
    });
    // console.log(irregularTodos);
  };

  const getAllTodos = (mdAst) => {
    const todos = [];
    const findTodos = (node) => {
      if (node.type === 'listItem') {
        if (node.checked !== null) {
          todos.push(node);
        } else if (isTodoItem(node)) {
          todos.push(node);
        }
      }
      if (node.children) {
        node.children.forEach(findTodos);
      }
    };
    mdAst.children.forEach(findTodos);
    return todos;
  };

  const todoRegex = /^\s*\[[\s\w]\]\s+/;
  const isTodoItem = (node) => {
    // Check the value of the text node to see if it matches a todo regex
    const textNode = node.children[0].children[0];
    if (textNode.type === 'text') {
      const text = textNode.value;
      const matches = text.match(todoRegex);
      if (matches) {
        return true;
      }
    }
    return false;
  };

  const dropFinalize = (e, todoOrDone) => {
    if (e.detail.info.trigger === 'droppedIntoAnother') return;
    console.log(e, todoOrDone);
    if (todoOrDone === 'x') {
      doneTodos = e.detail.items;
    } else if (todoOrDone === ' ') {
      todoTodos = e.detail.items;
    } else {
      irregularTodos = e.detail.items;
    }

    let fileContentsArr = fileContents.split('\n');
    const lineNumber = e.detail.info.id;
    if (todoOrDone === 'x') {
      fileContentsArr[lineNumber - 1] = fileContentsArr[lineNumber - 1].replace(`[x]`, `[ ]`);
    } else if (todoOrDone === ' ') {
      fileContentsArr[lineNumber - 1] = fileContentsArr[lineNumber - 1].replace(`[ ]`, `[x]`);
    } else if (todoOrDone === 'i') {
      fileContentsArr[lineNumber - 1] = fileContentsArr[lineNumber - 1].replace(todoRegex, 'i');
    } else {
      return;
    }

    const newFileContent = fileContentsArr.join('\n');
    handle.createWritable().then((writable) => {
      writable.write(newFileContent);
      writable.close();
    });

    parseTodos();
  };
  const doneDropConsider = (e) => (doneTodos = e.detail.items);
  const irregularDropConsider = (e) => (irregularTodos = e.detail.items);
  const todoDropConsider = (e) => (todoTodos = e.detail.items);
</script>

<button class="bg-white rounded py-1 px-2 mb-2" on:click={openFilePicker} id="butOpenFile"
  >Open File</button
>

<div class="board grid {`grid-cols-${numberUniqueTodoItemTypes}`} flex">
  <div class="lane rounded bg-slate-100 py-1 px-2 mr-2">
    <h1 class="font-semibold">Todo</h1>
    <section
      use:dndzone={{
        items: todoTodos,
        centreDraggedOnCursor: true,
        dropTargetClasses: ['bg-slate-200', 'rounded'],
        dropTargetStyle: {}
      }}
      on:consider={todoDropConsider}
      on:finalize={(e) => {
        dropFinalize(e, ' ');
      }}
    >
      {#each todoTodos as todo (todo.id)}
        <div class="card text-sm bg-white rounded drop-shadow-sm py-1 px-2 mb-2">
          {@html todo.name}
        </div>
      {/each}
    </section>
  </div>

  <!-- loop through the Set uniqueTodoItemCharacters -->
  {#each [...uniqueTodoItemCharacters] as todoItemType}
    <div class="lane rounded bg-slate-100 py-1 px-2 mr-2">
      <h1 class="font-semibold">{todoItemType}</h1>
      <section
        use:dndzone={{
          items: irregularTodos,
          centreDraggedOnCursor: true,
          dropTargetClasses: ['bg-slate-200', 'rounded'],
          dropTargetStyle: {}
        }}
        on:consider={irregularDropConsider}
        on:finalize={(e) => {
          dropFinalize(e, todoItemType);
        }}
      >
        {#each irregularTodos as todo (todo.id)}
          {#if todo.character === todoItemType}
            <div class="card text-sm bg-white rounded drop-shadow-sm py-1 px-2 mb-2">
              {@html todo.name}
            </div>
          {/if}
        {/each}
      </section>
    </div>
  {/each}

  <div class="lane rounded bg-slate-100 py-1 px-2">
    <h1 class="font-semibold">Done</h1>
    <section
      use:dndzone={{
        items: doneTodos,
        centreDraggedOnCursor: true,
        dropTargetClasses: ['bg-slate-200', 'rounded'],
        dropTargetStyle: {}
      }}
      on:consider={doneDropConsider}
      on:finalize={(e) => {
        dropFinalize(e, 'x');
      }}
    >
      {#each doneTodos as todo (todo.id)}
        <div class="card text-sm bg-white rounded drop-shadow-sm py-1 px-2 mb-2">
          {@html todo.name}
        </div>
      {/each}
    </section>
  </div>
</div>
