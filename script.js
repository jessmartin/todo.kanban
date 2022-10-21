let fileHandle;
butOpenFile.addEventListener('click', async () => {
  // Destructure the one-element array.
  [fileHandle] = await window.showOpenFilePicker();
  // Do something with the file handle.

  const file = await fileHandle.getFile();
  const contents = await file.text();
  alert(contents);

});
