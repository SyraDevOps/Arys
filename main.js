const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const os = require('os');

// --- REFERÊNCIAS DAS JANELAS ---
let arysWindow;
let terminalWindow;
let toolsWindow; // <-- NOVO: Variável para a janela de ferramentas

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
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  terminalWindow.loadFile('terminal_standalone.html', {
    query: { cwd: encodeURIComponent(cwd || os.homedir()) }
  });
  terminalWindow.on('closed', () => { terminalWindow = null; });
}

// <-- NOVO: Função para criar a janela de ferramentas -->
function createToolsWindow() {
  // Se a janela já estiver aberta, apenas foque nela.
  if (toolsWindow) {
    toolsWindow.focus();
    return;
  }

  toolsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Ferramentas Arys',
    autoHideMenuBar: true, // Deixa a interface mais limpa
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  // Carrega o arquivo tools.html do mesmo diretório
  toolsWindow.loadFile(path.join(__dirname, 'tools.html'));

  // Quando a janela for fechada, limpa a referência para que possa ser reaberta
  toolsWindow.on('closed', () => {
    toolsWindow = null;
  });
}


// --- LÓGICA DE EVENTOS (IPC) ---

// <-- NOVO: Listener para o evento do botão de ferramentas -->
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
        arysWindow?.unmaximize();
    } else {
        arysWindow?.maximize();
    }
});

ipcMain.handle('select-folder', () => {
    return dialog.showOpenDialog(arysWindow, { properties: ['openDirectory'] });
});

// NOVO: Adicionei o handle para o diálogo 'Salvar Como' que estava faltando
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


ipcMain.handle('get-home-dir', () => {
    return os.homedir();
});

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createArysWindow();
  }
});