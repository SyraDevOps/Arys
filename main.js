const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const os = require('os');

// --- REFERÊNCIAS DAS JANELAS ---
let arysWindow;
let terminalWindow;
let toolsWindow;

// --- FUNÇÕES DE CRIAÇÃO DE JANELAS ---
function createArysWindow() {
  arysWindow = new BrowserWindow({
    show: false,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });
  arysWindow.loadFile('index.html');
  arysWindow.once('ready-to-show', () => {
    arysWindow.maximize();
    arysWindow.show();
  });
  arysWindow.on('closed', () => { arysWindow = null; });
}

function createTerminalWindow(cwd) {
  if (terminalWindow) {
    terminalWindow.focus();
    return;
  }
  terminalWindow = new BrowserWindow({
    show: false,
    title: 'Terminal Syra',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      additionalArguments: [`--cwd=${encodeURIComponent(cwd || os.homedir())}`]
    }
  });
  terminalWindow.loadFile('terminal_standalone.html');
  terminalWindow.once('ready-to-show', () => {
    terminalWindow.maximize();
    terminalWindow.show();
  });
  terminalWindow.on('closed', () => { terminalWindow = null; });
}

function createToolsWindow() {
  if (toolsWindow) {
    toolsWindow.focus();
    return;
  }
  toolsWindow = new BrowserWindow({
    show: false,
    title: 'Ferramentas Arys',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  toolsWindow.loadFile(path.join(__dirname, 'tools.html'));
  toolsWindow.once('ready-to-show', () => {
    toolsWindow.maximize();
    toolsWindow.show();
  });
  toolsWindow.on('closed', () => { toolsWindow = null; });
}

// --- LÓGICA DE EVENTOS (IPC) ---
ipcMain.on('open-tools-window', () => {
  createToolsWindow();
});

ipcMain.on('open-standalone-terminal', (event, cwd) => {
  createTerminalWindow(cwd);
});

ipcMain.on('close-window', () => arysWindow?.close());
ipcMain.on('minimize-window', () => arysWindow?.minimize());
ipcMain.on('toggle-maximize', () => {
  if (arysWindow?.isMaximized()) {
    arysWindow.unmaximize();
  } else {
    arysWindow.maximize();
  }
});

ipcMain.handle('select-folder', () => {
  return dialog.showOpenDialog(arysWindow, { properties: ['openDirectory'] });
});

ipcMain.handle('show-save-dialog', async () => {
  const result = await dialog.showSaveDialog(arysWindow, {
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
  return result;
});

ipcMain.handle('get-home-dir', () => os.homedir());

// Executar comando PowerShell e enviar saída para renderer
ipcMain.on('executar-comando', (event, { comando, cwd }) => {
  if (!comando.trim()) {
    event.sender.send('saida-comando', '');
    return;
  }

  const wrappedCommand = `
    $ErrorActionPreference = "Stop"
    try {
      ${comando} | Out-String -Stream
    } catch {
      $_ | Out-String
    }
  `;

  const b64Comando = Buffer.from(wrappedCommand, 'utf16le').toString('base64');
  const psComando = `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64Comando}`;

  console.log(`[TERMINAL] Executando em: "${cwd}"`);

  exec(psComando, { cwd: cwd || os.homedir(), shell: true }, (err, stdout, stderr) => {
    console.log(`[TERMINAL] Saída recebida:\n${stdout}`);
    event.sender.send('saida-comando', stdout || stderr);
  });
});

// --- CICLO DE VIDA DO APP ---
app.whenReady().then(createArysWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createArysWindow();
});
