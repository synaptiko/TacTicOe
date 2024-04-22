export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // If the document is not in fullscreen mode, request fullscreen on the document body
    enableFullscreen();
  } else {
    // If the document is already in fullscreen, exit fullscreen mode
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

function enableFullscreen() {
  document.documentElement.requestFullscreen().catch((err) => {
    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
  });
}
