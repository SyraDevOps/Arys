const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const pty = require('node-pty');

// --- REFERÊNCIAS DAS JANELAS ---
let arysWindow;
let terminalWindow;
let toolsWindow;
let ptyProcess = null;

// --- FUNÇÕES DE CRIAÇÃO DE JANELAS ---
function createArysWindow () {
  arysWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });
  arysWindow.loadFile('index.html');
  arysWindow.on('closed', () => { arysWindow = null; });
}

function createTerminalWindow(cwd) {
  if (terminalWindow) {
    terminalWindow.focus();
    return;
  }
  terminalWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Terminal Syra',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  terminalWindow.loadFile('terminal_standalone.html', {
    query: { cwd: encodeURIComponent(cwd || os.homedir()) }
  });
  terminalWindow.on('closed', () => {
      terminalWindow = null;
      if (ptyProcess) {
          ptyProcess.kill();
          ptyProcess = null;
      }
  });
}

function createToolsWindow() {
  if (toolsWindow) {
    toolsWindow.focus();
    return;
  }
  toolsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Ferramentas Arys',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  toolsWindow.loadFile(path.join(__dirname, 'tools.html'));
  toolsWindow.on('closed', () => { toolsWindow = null; });
}

// --- LÓGICA DE EVENTOS (IPC) ---
ipcMain.on('open-tools-window', () => createToolsWindow());
ipcMain.on('open-standalone-terminal', (event, cwd) => createTerminalWindow(cwd));
ipcMain.on('close-window', () => arysWindow?.close());
ipcMain.on('minimize-window', () => arysWindow?.minimize());
ipcMain.on('toggle-maximize', () => {
    if (arysWindow?.isMaximized()) arysWindow?.unmaximize();
    else arysWindow?.maximize();
});

ipcMain.handle('select-folder', () => dialog.showOpenDialog(arysWindow, { properties: ['openDirectory'] }));

ipcMain.handle('show-save-dialog', async () => {
    return await dialog.showSaveDialog(arysWindow, {
        title: 'Salvar arquivo como...',
        defaultPath: path.join(os.homedir(), 'arquivo.txt'),
        filters: [
            { name: 'Todos os Arquivos', extensions: ['*'] },
            { name: 'Documentos de Texto', extensions: ['txt'] },
            { name: 'JavaScript', extensions: ['js'] },
            { name: 'HTML', extensions: ['html', 'htm'] },
            { name: 'CSS', extensions: ['css'] },
        ]
    });
});

ipcMain.handle('get-home-dir', () => os.homedir());

ipcMain.on('terminal-init', (event, { cwd }) => {
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    if (ptyProcess) ptyProcess.kill();
    ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: cwd || os.homedir(),
        env: process.env
    });
    ptyProcess.on('data', (data) => event.sender.send('terminal-incoming-data', data));
});

ipcMain.on('terminal-keystroke', (event, data) => {
    if (ptyProcess) ptyProcess.write(data);
});

ipcMain.on('terminal-resize', (event, { cols, rows }) => {
    if (ptyProcess) ptyProcess.resize(cols, rows);
});

// --- CICLO DE VIDA DO APP ---
app.whenReady().then(createArysWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createArysWindow(); });
