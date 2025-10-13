import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the filename from command line arguments
const filename = process.argv[2] || '84.html';

if (!filename) {
    console.error('❌ No filename provided');
    process.exit(1);
}

// Resolve the absolute file path
const filepath = path.isAbsolute(filename) 
    ? filename 
    : path.resolve(__dirname, '..', 'data', 'ebooks', filename);

console.log(`Loading file: ${filepath}`);

app.whenReady().then(() => {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        // These options help prevent the cmd.exe window on Windows
        show: false // Don't show until ready
    });

    // Load the HTML file
    win.loadFile(filepath);
    
    // Show window when ready to prevent flash
    win.once('ready-to-show', () => {
        win.show();
    });
    
    win.on('closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Prevent new window creation (optional)
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
    });
});