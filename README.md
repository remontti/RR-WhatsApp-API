# RR-WhatsApp-API

https://blog.remontti.com.br/8109

Este repositório contém uma API simples para enviar mensagens do WhatsApp utilizando o `whatsapp-web.js`. A API possibilita o envio de mensagens com ou sem anexos, tanto para números individuais quanto para grupos. A aplicação pode ser utilizada via interface web ou diretamente através de endpoints REST.

## Índice

- [Requisitos](#requisitos)
- [Instalação](#instalação)
  - [1. Atualizar o Sistema](#1-atualizar-o-sistema)
  - [2. Instalar Dependências do Sistema](#2-instalar-dependências-do-sistema)
  - [3. Clonar o Repositório](#3-clonar-o-repositório)
  - [4. Instalar Dependências do Node.js](#4-instalar-dependências-do-nodejs)
  - [5. Ajustar Configurações](#5-ajustar-configurações)
- [Execução](#execução)
  - [Iniciar a Aplicação](#iniciar-a-aplicação)
- [Uso](#uso)
  - [1. Utilizando o Formulário Web](#1-utilizando-o-formulário-web)
    - [1.1. Acessar a Interface Web](#11-acessar-a-interface-web)
    - [1.2. Conectar ao WhatsApp](#12-conectar-ao-whatsapp)
    - [1.3. Enviar Mensagens](#13-enviar-mensagens)
    - [1.4. Desconectar do WhatsApp](#14-desconectar-do-whatsapp)
  - [2. Utilizando a API Diretamente](#2-utilizando-a-api-diretamente)
    - [2.1. Verificar o Status da Conexão](#21-verificar-o-status-da-conexão)
    - [2.2. Obter o QR Code](#22-obter-o-qr-code)
    - [2.3. Enviar Mensagens via API](#23-enviar-mensagens-via-api)
      - [2.3.1. Enviar Mensagem Sem Anexo](#231-enviar-mensagem-sem-anexo)
      - [2.3.2. Enviar Mensagem Com Anexo](#232-enviar-mensagem-com-anexo)
      - [2.3.3. Enviar Mensagem via URL](#233-enviar-mensagem-via-url)
    - [2.4. Desconectar do WhatsApp via API](#24-desconectar-do-whatsapp-via-api)
- [Executando como um Serviço systemd](#executando-como-um-serviço-systemd)
- [Considerações de Segurança](#considerações-de-segurança)
- [Contribuições](#contribuições)
- [Licença](#licença)

---

## Requisitos

- **Sistema Operacional:** Debian 12 (ou similar)
- **Node.js:** Versão 14 ou superior
- **npm:** Gerenciador de pacotes do Node.js

---

## Instalação

### 1. Atualizar o Sistema

Atualize os pacotes existentes:

```bash
apt update ; apt upgrade -y
```

### 2. Instalar Dependências do Sistema

Instale as dependências necessárias para o `puppeteer` e outras bibliotecas:

```bash
# apt install -y \
  curl wget nano vim git nodejs npm psmisc \
  ca-certificates fonts-liberation libappindicator3-1 \
  libatk-bridge2.0-0 libcups2 libdrm-dev libgbm-dev libgtk-3-0 \
  libnspr4 libnss3 libxss1 lsb-release xdg-utils libasound2 libdrm2 \
  libxcomposite1 libxrandr2 libgbm1
```

### 3. Clonar o Repositório

Crie um usuário para a aplicação e clone este repositório:

```bash
adduser --home /opt/RR-WhatsApp-API rr-whatsapp-api
su - rr-whatsapp-api
git clone https://github.com/remontti/RR-WhatsApp-API.git
mv /opt/RR-WhatsApp-API/RR-WhatsApp-API/* /opt/RR-WhatsApp-API/
rm -rf /opt/RR-WhatsApp-API/RR-WhatsApp-API
```

### 4. Instalar Dependências do Node.js

Instale as dependências do projeto:

```bash
cd /opt/RR-WhatsApp-API/
npm install
```

### 5. Ajustar Configurações

Altere o arquivo `index.js` para configurar os IPs autorizados (allowedIPs) que terão acesso à API:

```bash
nano /opt/RR-WhatsApp-API/index.js
```

Exemplo de configuração de IPs permitidos:

```javascript
const allowedIPs = [
    '192.168.0.0/16',
    '127.0.0.1',
    '::1',
];
```

Se desejar, altere também a porta da aplicação:

```javascript
const port = 3001;
```

---

## Execução

### Iniciar a Aplicação

Para iniciar a aplicação, execute:

```bash
node index.js
```

A saída será semelhante a:

```
API rodando em http://0.0.0.0:3001
```

---

## Uso

### 1. Utilizando o Formulário Web

#### 1.1. Acessar a Interface Web

No seu navegador, acesse:

```
http://SEU_SERVIDOR:3001
```

Substitua `SEU_SERVIDOR` pelo endereço IP ou nome de domínio do seu servidor.

#### 1.2. Conectar ao WhatsApp

- Na interface web, se não estiver conectado, você verá a opção para **Conectar**.
- Clique no botão **Conectar**.
- Um modal será aberto exibindo o QR Code.
- Escaneie o QR Code com o aplicativo do WhatsApp no seu dispositivo móvel:
  - Abra o WhatsApp.
  - Vá em **Configurações** > **Aparelhos Conectados** > **Conectar um Aparelho**.
  - Escaneie o QR Code exibido na tela.
- Após a autenticação, a página será atualizada e mostrará o status **Conectado ao WhatsApp**.

#### 1.3. Enviar Mensagens

- Preencha o formulário:
  - **Número(s) ou Grupo(s):** Insira os números de telefone (com código do país e DDD) ou nomes dos grupos, separados por vírgula. Exemplo:
    ```
    +5521999999999, +5511988888888, Nome do Grupo
    ```
  - **Mensagem:** Digite a mensagem que deseja enviar.
  - **Selecionar Imagem/Documento (Opcional):** Se desejar enviar um anexo, selecione o arquivo.
- Clique em **Enviar Mensagem**.
- Um modal aparecerá informando o sucesso ou erro do envio.

#### 1.4. Desconectar do WhatsApp

- Na interface web, clique no botão **Desconectar**.
- Você receberá uma confirmação de que foi desconectado.

### 2. Utilizando a API Diretamente

#### 2.1. Verificar o Status da Conexão

Faça uma requisição **GET** para:

```
http://SEU_SERVIDOR:3001/api/status
```

**Resposta:**

- Conectado:
  ```json
  {
    "status": "connected",
    "number": "552199999999"
  }
  ```
- Desconectado:
  ```json
  {
    "status": "disconnected"
  }
  ```

#### 2.2. Obter o QR Code

Para autenticar o cliente sem usar a interface web, você pode obter o QR Code via API.

Faça uma requisição **GET** para:

```
http://SEU_SERVIDOR:3001/api/qr
```

- **Se não estiver conectado:**
  - Você receberá a imagem do QR Code.
  - Escaneie essa imagem usando o aplicativo do WhatsApp.
- **Se já estiver conectado:**
  - Você receberá uma resposta JSON:
    ```json
    {
      "status": "connected",
      "message": "Cliente já está conectado"
    }
    ```

#### 2.3. Enviar Mensagens via API

##### 2.3.1. Enviar Mensagem Sem Anexo

Faça uma requisição **POST** para:

```
http://SEU_SERVIDOR:3001/api/send
```

**Parâmetros do Formulário (multipart/form-data):**

- **recipients:** Número(s) ou Grupo(s) separados por vírgula.
- **message:** Texto da mensagem.

**Exemplo usando `curl`:**

```bash
curl -X POST http://SEU_SERVIDOR:3001/api/send \
  -F 'recipients=+5521999999999,Grupo de Amigos' \
  -F 'message=Olá, esta é uma mensagem de teste!'
```

##### 2.3.2. Enviar Mensagem Com Anexo

Além dos parâmetros anteriores, inclua o campo **file** com o arquivo.

**Exemplo usando `curl`:**

```bash
curl -X POST http://SEU_SERVIDOR:3001/api/send \
  -F 'recipients=+552199999999' \
  -F 'message=Aqui está o documento solicitado.' \
  -F 'file=@/opt/o/arquivo.pdf'
```

##### 2.3.3. Enviar Mensagem via URL

**Atenção:** Este método é menos seguro e deve ser usado apenas para testes.

Faça uma requisição **GET**

 para:

```
http://SEU_SERVIDOR:3001/api/sendMessage/:recipient/:message
```

- **:recipient**: Número sem caracteres especiais ou nome do grupo (URL-encoded).
- **:message**: Mensagem (URL-encoded).

**Exemplo:**

Enviar "Teste via GET" para o número +55 21 99999-9999:

```
http://SEU_SERVIDOR:3001/api/sendMessage/5521999999999/Teste%20via%20GET
```

Enviar "Aviso importante" para o grupo "Equipe":

```
http://SEU_SERVIDOR:3001/api/sendMessage/Equipe/Aviso%20importante
```

#### 2.4. Desconectar do WhatsApp via API

Faça uma requisição **GET** para:

```
http://SEU_SERVIDOR:3001/api/disconnect
```

---

### **Executando como um Serviço systemd**

Para executar a aplicação como um serviço no Debian 12, siga os passos abaixo:

1. **Criar o Arquivo de Unidade**

   ```bash
   nano /etc/systemd/system/rr-whatsapp-api.service
   ```

   **Conteúdo do Arquivo:**

   ```ini
   [Unit]
   Description=RR WhatsApp API
   After=network.target
   
   [Service]
   ExecStart=/usr/bin/node /opt/RR-WhatsApp-API/index.js
   WorkingDirectory=/opt/RR-WhatsApp-API
   Restart=always
   User=rr-whatsapp-api
   Environment=NODE_ENV=production
   ExecReload=/usr/bin/killall -9 rr-whatsapp-api
   KillMode=process
   RestartSec=10
   
   [Install]
   WantedBy=multi-user.target
   ```

2. **Recarregar o systemd e Iniciar o Serviço**

   ```bash
   systemctl daemon-reload
   systemctl enable rr-whatsapp-api.service
   systemctl start rr-whatsapp-api.service
   ```

3. **Verificar o Status do Serviço**

   ```bash
   systemctl status rr-whatsapp-api.service
   ```

---

## Considerações de Segurança

- **Uso Responsável:** Utilize esta API de acordo com os termos de serviço do WhatsApp. O uso não autorizado pode levar ao banimento do número.
- **Informações Sensíveis:** Evite expor informações pessoais ou sensíveis. Proteja a API com autenticação em ambientes de produção.
- **Endpoint via GET:** O envio de mensagens via URL (método GET) não é seguro, pois parâmetros são expostos na URL.

---

## Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests. (Se vou responder ou modificar a resposta é provavelmente não.)
A programação é credito do Chat GTP, pois eu não sei node! Mas nem por isso sou c*zão, de não compartilhar! 

## Bônus Zabbix 
Deixei o arquivo Zabbix-Midia-Whatsapp-RR.yaml para que você possa usar para disparo de aviso no Zabbix, só importar e ajustar. 

---

**Nota:** Este projeto utiliza o `whatsapp-web.js`, que é uma biblioteca não oficial. O uso de bibliotecas não oficiais pode violar os termos de serviço do WhatsApp. Utilize por sua conta e risco.

