const res = await fetch('/generate-avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: "Hello, I'm your AI assistant." })
});
const { id } = await res.json();
// then poll a status endpoint until the video is ready, then:
document.querySelector('.avatar-container video').src = videoUrl;