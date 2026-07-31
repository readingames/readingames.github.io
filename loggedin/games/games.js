// Ensure functions are added to the global window object if using type="module"
window.openGame = function(gameId) {
    const dashboardView = document.getElementById('games-dashboard');
    const gamePlayView = document.getElementById('game-play-view');
    const activeGameTitle = document.getElementById('active-game-title');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    dashboardView.classList.add('hidden');
    gamePlayView.classList.remove('hidden');

    // Setup canvas depending on game chosen
    if (gameId === 'cat-mouse') {
        activeGameTitle.innerText = "Cat & Mouse Chase";
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = "24px 'Jaini'";
        ctx.fillText("Game Loop Ready Here!", 280, 220);
    } else {
        activeGameTitle.innerText = "Mini Game Area";
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
};

window.closeGame = function() {
    const dashboardView = document.getElementById('games-dashboard');
    const gamePlayView = document.getElementById('game-play-view');
    
    gamePlayView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    
    // Clear canvas when exiting
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};