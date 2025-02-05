import Dropzone from "dropzone";

export const initializeDropzone = (
  elementId: string,
  maxFiles: number
): Dropzone => {
  const selectedFiles: File[] = [];

  const dropzone = new Dropzone(`#${elementId}`, {
    url: "/fake-upload", // Fake URL to prevent actual upload
    maxFiles: maxFiles,
    addRemoveLinks: true,
    dictRemoveFile: "Remove file",
    autoProcessQueue: false, // Prevent automatic upload
    init(this: Dropzone) {
      // Explicitly type `this`
      this.on("addedfile", (file) => {
        if (this.files.length > maxFiles) {
          // Remove the newly added file if it exceeds the maxFiles limit
          this.removeFile(file);
          alert(
            `You can only upload up to ${maxFiles} file${
              maxFiles > 1 ? "s" : ""
            }.`
          );
        } else {
          selectedFiles.push(file);
        }
      });

      this.on("removedfile", (file) => {
        const index = selectedFiles.indexOf(file);
        if (index > -1) selectedFiles.splice(index, 1);
      });

      this.on("error", (file, response) => {});
    },
  });

  // Add a custom method to get selected files
  (dropzone as any).getSelectedFiles = () => selectedFiles;

  return dropzone;
};
