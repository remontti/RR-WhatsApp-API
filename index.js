const express = require('express');
const fileUpload = require('express-fileupload');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const QRCode = require('qrcode');
const ipRangeCheck = require('ip-range-check');

const app = express();
const port = 3001;

const allowedIPs = [
    '192.168.0.0/16',
    '127.0.0.1',
    '::1',
];

app.use((req, res, next) => {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const cleanedIP = clientIP.replace('::ffff:', '');
    if (ipRangeCheck(cleanedIP, allowedIPs)) {
        next();
    } else {
        res.status(403).send('Acesso negado.');
    }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(fileUpload());

let qrCodeData = null;
let authenticated = false;

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws, req) {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const cleanedIP = clientIP.replace('::ffff:', '');
    if (ipRangeCheck(cleanedIP, allowedIPs)) {
        console.log(`Cliente conectado via WebSocket: ${cleanedIP}`);
        if (qrCodeData) {
            ws.send(JSON.stringify({ type: 'qr', data: qrCodeData }));
        }
    } else {
        console.log(`Conexão WebSocket negada para o IP: ${cleanedIP}`);
        ws.terminate();
    }
});

let client;

function createClient() {
    client = new Client({
        authStrategy: new LocalAuth({ dataPath: './session' }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: null,
            timeout: 0,
        },
    });
    registerClientEvents();
}

function registerClientEvents() {
    client.removeAllListeners();
    client.on('qr', (qr) => {
        qrCodeData = qr;
        console.log('QR Code gerado.');
        wss.clients.forEach(function each(wsClient) {
            if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.send(JSON.stringify({ type: 'qr', data: qr }));
            }
        });
    });

    client.on('authenticated', () => {
        console.log('Cliente autenticado com sucesso.');
    });

    client.on('ready', async () => {
        console.log('WhatsApp está pronto!');
        qrCodeData = null;
        await new Promise(resolve => setTimeout(resolve, 5000));
        const info = await client.getState();
        console.log('Estado do cliente:', info);
        authenticated = true;
        wss.clients.forEach(function each(wsClient) {
            if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.send(JSON.stringify({ type: 'authenticated' }));
            }
        });
    });

    client.on('disconnected', (reason) => {
        console.log('Motivo da desconexão:', reason);
        authenticated = false;
        qrCodeData = null;
        wss.clients.forEach(function each(wsClient) {
            if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.send(JSON.stringify({ type: 'disconnected' }));
            }
        });
    });

    client.on('auth_failure', (msg) => {
        console.error('Falha na autenticação:', msg);
    });

    client.on('change_state', (state) => {
        console.log('Estado de conexão mudou para:', state);
    });

    client.on('loading_screen', (percent, message) => {
        console.log(`Carregando (${percent}%): ${message}`);
    });
    /*	
        // Adicione este evento para autoresponder mensagens
        client.on('message', async (msg) => {
            console.log(`Mensagem recebida de ${msg.from}: ${msg.body}`);
            
            // Verifique se a mensagem é de texto
            if (msg.type === 'chat') {
                const response = `Olá, recebi sua mensagem: "${msg.body}". Vou te responder em breve.`;
                await client.sendMessage(msg.from, response);
                console.log(`Resposta automática enviada para ${msg.from}`);
            }
        });
    */
    // Adicione este evento para mensagem de testes
    client.on('message', async (msg) => {
        console.log(`Mensagem recebida de ${msg.from}: ${msg.body}`);

        // Verifique se a mensagem é de texto
        if (msg.type === 'chat' && msg.body.toLowerCase().trim() === '!ping') {
            const response = 'PONG';
            await client.sendMessage(msg.from, response);
            console.log(`Resposta automática enviada para ${msg.from}`);
        }
    });

    // Adicione este evento para recusar chamadas e responder
    client.on('call', async (call) => {
        console.log(`Recebida uma chamada de ${call.from} (Tipo: ${call.isVideo ? 'Vídeo' : 'Voz'})`);

        await call.reject();
        console.log('Videochamada rejeitada.');
        const message = '*Mensagem automática!*\n\nEste número não aceita chamadas de voz ou de vídeo.';
        await client.sendMessage(call.from, message);
        console.log(`Mensagem automática enviada para ${call.from}`);
    });

}

createClient();
client.initialize();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/qr', async (req, res) => {
    if (authenticated && client) {
        res.json({ status: 'connected', message: 'Cliente já está conectado' });
    } else {
        if (qrCodeData) {
            try {
                const qrCodeImage = await QRCode.toDataURL(qrCodeData);
                const base64Data = qrCodeImage.replace(/^data:image\/png;base64,/, '');
                const imgBuffer = Buffer.from(base64Data, 'base64');

                res.writeHead(200, {
                    'Content-Type': 'image/png',
                    'Content-Length': imgBuffer.length
                });
                res.end(imgBuffer);
            } catch (err) {
                console.error('Erro ao gerar QR Code:', err);
                res.status(500).json({ status: 'error', message: 'Erro ao gerar QR Code' });
            }
        } else {
            res.json({ status: 'waiting', message: 'QR Code ainda não foi gerado, por favor tente novamente em alguns segundos' });
        }
    }
});

app.get('/api/disconnect', async (req, res) => {
    try {
        console.log('Iniciando logout...');
        await client.logout();
        console.log('Logout concluído.');
        console.log('Destruindo o cliente...');
        await client.destroy();
        console.log('Cliente destruído.');

        client = null;
        qrCodeData = null;
        authenticated = false;

        const sessionPath = path.join(__dirname, 'session');
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log('Dados de autenticação removidos.');
        }

        console.log('Criando novo cliente...');
        createClient();
        console.log('Inicializando novo cliente...');
        client.initialize();

        res.send('Desconectado com sucesso!');
    } catch (err) {
        console.error('Erro ao desconectar:', err);
        res.status(500).json({ status: 'error', message: 'Erro ao desconectar.', error: err });
    }
});

app.get('/api/status', async (req, res) => {
    if (authenticated && client) {
        const state = await client.getState();
        if (state === 'CONNECTED') {
            res.json({ status: 'connected', number: client.info.wid.user });
        } else {
            res.json({ status: 'connecting' });
        }
    } else {
        res.json({ status: 'disconnected' });
    }
});

const sendMessageWithTimeout = async (chatId, message, file, timeout = 20000) => {
    return new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Timeout ao enviar mensagem.'));
        }, timeout);

        try {
            // Verifica se a mensagem contém um link de imagem no formato [img = https://linkdaimagem]
            const imageRegex = /\[img\s*=\s*(https?:\/\/[^\s]+)\]/i;
            const pdfRegex = /\[pdf\s*=\s*(https?:\/\/[^\s]+)\]/i;  // Regex para detectar link de PDF

            let match = message.match(imageRegex);
            if (match) {
                const imageUrl = match[1];
                const media = await MessageMedia.fromUrl(imageUrl);  // Baixa a imagem usando o URL

                // Envia a imagem
                await client.sendMessage(chatId, media, { caption: message.replace(imageRegex, '') });
                console.log(`Imagem com a mensagem enviada para ${chatId}`);
            } else {
                match = message.match(pdfRegex);  // Verifica se é um link de PDF
                if (match) {
                    const pdfUrl = match[1];
                    const media = await MessageMedia.fromUrl(pdfUrl);  // Baixa o PDF

                    // Envia o PDF
                    await client.sendMessage(chatId, media, { caption: message.replace(pdfRegex, '') });
                    console.log(`PDF com a mensagem enviado para ${chatId}`);
                } else {
                    // Caso não haja imagem ou PDF, apenas envia a mensagem de texto
                    if (file) {
                        const filePath = path.join('/tmp', file.name);
                        await file.mv(filePath);
                        const media = MessageMedia.fromFilePath(filePath);
                        await client.sendMessage(chatId, media, { caption: message });
                        console.log(`Mensagem com anexo enviada para ${chatId}`);
                        fs.unlink(filePath, (err) => {
                            if (err) console.error(`Erro ao remover o arquivo: ${filePath}`, err);
                        });
                    } else {
                        await client.sendMessage(chatId, message);
                        console.log(`Mensagem enviada para ${chatId}`);
                    }
                }
            }

            clearTimeout(timeoutId);
            resolve();
        } catch (err) {
            clearTimeout(timeoutId);
            console.error(`Erro ao enviar mensagem para ${chatId}:`, err);
            reject(err);
        }
    });
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

app.post('/api/send', async (req, res) => {
    try {
        console.log('Recebendo requisição para enviar mensagem.');
        if (!client || !client.info || !authenticated) {
            console.log('Cliente não está pronto.');
            return res.status(500).json({ status: 'error', message: 'Cliente não está pronto. Por favor, tente novamente mais tarde.' });
        }

        const clientState = await client.getState();
        console.log('Estado atual do cliente:', clientState);
        if (clientState !== 'CONNECTED') {
            console.log('Cliente não está conectado.');
            return res.status(500).json({ status: 'error', message: 'Cliente não está conectado ao WhatsApp. Por favor, aguarde.' });
        }

        const { recipients, message } = req.body;
        const recipientList = recipients.split(',');
        const file = req.files ? req.files.file : null;

        console.log('Destinatários:', recipientList);
        console.log('Mensagem:', message);

        const chats = await client.getChats();

        for (const recipient of recipientList) {
            const recipientTrimmed = recipient.trim();

            // Verifica se o destinatário é um número de celular
            if (/^\+?\d+$/.test(recipientTrimmed)) {
                let number = recipientTrimmed.replace(/\D/g, ''); // Remove todos os caracteres não numéricos

                // Remove o nono dígito, caso seja um celular brasileiro com 11 dígitos (ex.: 55 + 11 + número com 9 dígitos)
                if (number.startsWith("55") && number.length === 13) {
                    number = number.slice(0, 4) + number.slice(5); // Remove o nono dígito
                }

                const chatId = number + "@c.us";
                await sendMessageWithTimeout(chatId, message, file);

            } else {
                // Envia para grupos usando o nome exato do grupo
                const group = chats.find(chat => chat.isGroup && chat.name === recipientTrimmed);
                if (group) {
                    await sendMessageWithTimeout(group.id._serialized, message, file);
                } else {
                    console.error(`Grupo ${recipientTrimmed} não encontrado.`);
                }
            }

            // Delay de 5 segundos entre os envios para evitar bloqueio
            await delay(5000); // Delay de 5 segundos (pode ajustar conforme necessário)
        }

        res.status(200).json({ status: 'success', message: 'Mensagem enviada!' });
    } catch (err) {
        console.error('Erro ao processar o envio:', err);
        res.status(500).json({ status: 'error', message: 'Erro ao processar o envio.', error: err.message });
    }
});

app.get('/api/sendMessage/:recipient/:message', async (req, res) => {
    try {
        console.log('Recebendo requisição para enviar mensagem via GET.');
        if (!client || !client.info || !authenticated) {
            console.log('Cliente não está pronto.');
            return res.status(500).json({ status: 'error', message: 'Cliente não está pronto. Por favor, tente novamente mais tarde.' });
        }

        const clientState = await client.getState();
        console.log('Estado atual do cliente:', clientState);
        if (clientState !== 'CONNECTED') {
            console.log('Cliente não está conectado.');
            return res.status(500).json({ status: 'error', message: 'Cliente não está conectado ao WhatsApp. Por favor, aguarde.' });
        }

        const recipientParam = req.params.recipient;
        const message = decodeURIComponent(req.params.message);
        console.log('Destinatário:', recipientParam);
        console.log('Mensagem:', message);

        // Função para tratar o número
        function processPhoneNumber(number) {
            // Remove espaços, parênteses, hifens e o símbolo +
            number = number.replace(/[\s()+-]/g, '');

            // Verifica se é um número brasileiro com nono dígito
            if (number.startsWith('55') && number.length === 13) {
                number = number.slice(0, 4) + number.slice(5); // Remove o nono dígito
            }

            return number;
        }

        let chatId;
        if (/^\d+$/.test(recipientParam)) {
            let number = processPhoneNumber(recipientParam); // Processa o número
            chatId = number + "@c.us";
        } else {
            const chats = await client.getChats();
            const group = chats.find(chat => chat.isGroup && chat.name === recipientParam);
            if (group) {
                chatId = group.id._serialized;
            } else {
                console.error(`Grupo "${recipientParam}" não encontrado.`);
                return res.status(404).json({ status: 'error', message: `Grupo "${recipientParam}" não encontrado.` });
            }
        }

        await client.sendMessage(chatId, message);
        console.log(`Mensagem enviada para ${chatId}`);
        res.status(200).json({ status: 'success', message: 'Mensagem enviada!' });
    } catch (err) {
        console.error('Erro ao enviar mensagem via GET:', err);
        res.status(500).json({ status: 'error', message: 'Erro ao enviar mensagem.', error: err.message });
    }
});

app.listen(port, () => {
    console.log(`API rodando na porta ${port}`);
});
