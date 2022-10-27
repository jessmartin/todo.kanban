<script>
	// @ts-nocheck

	import { fileOpen } from 'browser-fs-access';
	import { unified } from 'unified';
	import remarkParse from 'remark-parse';
	import remarkGfm from 'remark-gfm';

	import { dndzone } from 'svelte-dnd-action';

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
	const parseTodos = async () => {
		let mdAst = await unified().use(remarkGfm).use(remarkParse).parse(fileContents);

		allTodos = getAllTodos(mdAst);
		todoTodos = [];
		doneTodos = [];

		allTodos.forEach((todo) => {
			if (todo.checked) {
				doneTodos.push({
					id: todo.position.start.line,
					name: todo.children[0].children[0].value,
					checked: todo.checked
				});
			} else {
				todoTodos.push({
					id: todo.position.start.line,
					name: todo.children[0].children[0].value,
					checked: todo.checked
				});
			}
		});
	};

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
		};
		mdAst.children.forEach(findTodos);
		return todos;
	};

	const todoDropConsider = (e) => (todoTodos = e.detail.items);
	const dropFinalize = (e, todoOrDone) => {
		if (e.detail.info.trigger === 'droppedIntoAnother') return;
		todoTodos = e.detail.items;

		let fileContentsArr = fileContents.split('\n');
		const lineNumber = e.detail.info.id;
		if (todoOrDone === 'todo') {
			fileContentsArr[lineNumber - 1] = fileContentsArr[lineNumber - 1].replace(`[x]`, `[ ]`);
		} else if (todoOrDone === 'done') {
			fileContentsArr[lineNumber - 1] = fileContentsArr[lineNumber - 1].replace(`[ ]`, `[x]`);
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
	const doneDropFinalize = (e) => {
		doneTodos = e.detail.items;
	};
</script>

<button class="bg-white rounded py-1 px-2 mb-2" on:click={openFilePicker} id="butOpenFile"
	>Open File</button
>

<div class="board grid grid-cols-2 flex">
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
				dropFinalize(e, 'todo');
			}}
		>
			{#each todoTodos as todo (todo.id)}
				<div class="card text-sm bg-white rounded drop-shadow-sm py-1 px-2 mb-2">
					{todo.name}
				</div>
			{/each}
		</section>
	</div>

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
				dropFinalize(e, 'done');
			}}
		>
			{#each doneTodos as todo (todo.id)}
				<div class="card text-sm bg-white rounded drop-shadow-sm py-1 px-2 mb-2">
					{todo.name}
				</div>
			{/each}
		</section>
	</div>
</div>
