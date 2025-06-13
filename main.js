const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let win;

function createWindow() {
    win = new BrowserWindow({
        width: 1024,
        height: 768,
        frame: false,
        transparent: false, // Mudado para false para ter fundo sólido
        backgroundColor: '#1e1e1e', // Cor de fundo igual ao editor
        minWidth: 800, // Largura mínima
        minHeight: 600, // Altura mínima
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Iniciar maximizado
    win.maximize();

    win.loadFile(path.join(__dirname, 'index.html'));

    ipcMain.on('close-window', () => {
        app.quit(); // Mudado de win.close() para app.quit()
    });

    ipcMain.on('save-dialog', async () => {
        const { filePath } = await dialog.showSaveDialog(win, {
            filters: [
                { name: 'Todos os Arquivos', extensions: ['*'] },
                { name: 'Texto', extensions: ['txt'] },
                { name: 'JavaScript', extensions: ['js'] },
                { name: 'HTML', extensions: ['html', 'htm'] },
                { name: 'CSS', extensions: ['css'] }
            ]
        });

        if (filePath) {
            win.webContents.send('save-file', filePath);
        }
    });

    // Adicionar evento para alternar maximização
    ipcMain.on('toggle-maximize', () => {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    });

    ipcMain.handle('select-folder', async () => {
        return dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        });
    });

    // Adicionar aos eventos IPC existentes
    ipcMain.on('minimize-window', () => {
        win.minimize();
    });
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
