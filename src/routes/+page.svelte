<script>
	import { fileOpen } from 'browser-fs-access';
	import { unified } from 'unified';
	import remarkParse from 'remark-parse';
	import remarkGfm from 'remark-gfm';

	let fileContents = '';
	let fileLastModified = 0;
	let handle;
	const openFilePicker = async () => {
		console.log('open file clicked');
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
	const parseTodos = async () => {
		let mdAst = await unified().use(remarkGfm).use(remarkParse).parse(fileContents);

		allTodos = getAllTodos(mdAst);

		console.log(allTodos);
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
</script>

<button on:click={openFilePicker} id="butOpenFile">Open File</button>

<div class="board grid grid-cols-2 flex">
	<div class="lane rounded bg-slate-100 py-1 px-2 mr-2">
		<h1 class="font-semibold">Todo</h1>
		<ul>
			{#each allTodos as todo}
				{#if !todo.checked}
					<li class="card text-sm bg-white rounded drop-shadow-sm py-1 px-2 mb-2">
						{todo.children[0].children[0].value}
					</li>
				{/if}
			{/each}
		</ul>
	</div>

	<div class="lane rounded bg-slate-100 py-1 px-2 mr-2">
		<h1 class="font-semibold">Done</h1>
		<ul>
			{#each allTodos as todo}
				{#if todo.checked}
					<li class="card text-sm bg-white rounded drop-shadow-sm py-1 px-2 mb-2">
						{todo.children[0].children[0].value}
					</li>
				{/if}
			{/each}
		</ul>
	</div>
</div>
