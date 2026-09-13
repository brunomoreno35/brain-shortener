const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const DB_FILE = path.join(__dirname, 'links_db.json');

function lerBaseDados() {
    if (!fs.existsSync(DB_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function guardarBaseDados(dados) {
    fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2), 'utf8');
}

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

const htmlContent = `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aguarde... O seu link está a ser gerado</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; background: #0f172a; color: #f8fafc; padding-top: 50px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #1e293b; padding: 40px 30px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); border: 1px solid #334155; }
        h2 { color: #38bdf8; font-size: 22px; margin-bottom: 5px; }
        .espaco-anuncio { width: 100%; height: 200px; background: #334155; margin: 25px 0; display: flex; align-items: center; justify-content: center; color: #94a3b8; border: 2px dashed #475569; border-radius: 8px; font-weight: bold; }
        #contador { font-size: 18px; color: #cbd5e1; margin: 20px 0; font-weight: 500; }
        .btn { padding: 15px 40px; font-size: 18px; border: none; border-radius: 8px; cursor: pointer; display: none; margin: 20px auto; font-weight: bold; transition: background 0.2s; width: 100%; max-width: 300px; }
        .btn-loading { background: #475569; color: #94a3b8; cursor: not-allowed; display: inline-block; }
        .btn-ready { background: #10b981; color: white; display: none; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4); }
        .btn-ready:hover { background: #059669; }
    </style>
</head>
<body>
<div class="container">
    <h2>O seu link está quase pronto!</h2>
    <p style="color: #94a3b8; margin-top:0;">Aguarde o validador do sistema terminar.</p>
    <div class="espaco-anuncio">[ ANÚNCIO BANNER SUPERIOR ]</div>
    <div id="contador">A verificar segurança em: 10 segundos...</div>
    <button id="btnAguardar" class="btn btn-loading">A processar link...</button>
    <button id="btnAvancar" class="btn btn-ready" onclick="redirecionar()">OBTER LINK</button>
    <div class="espaco-anuncio">[ ANÚNCIO BANNER INFERIOR ]</div>
</div>
<script>
    let segundos = 10;
    const textoContador = document.getElementById('contador');
    const btnAguardar = document.getElementById('btnAguardar');
    const btnAvancar = document.getElementById('btnAvancar');
    const urlAtual = window.location.pathname;
    const codigoLink = urlAtual.substring(urlAtual.lastIndexOf('/') + 1);

    const contagem = setInterval(() => {
        segundos--;
        textoContador.innerText = "A verificar segurança em: " + segundos + " segundos...";
        if (segundos <= 0) {
            clearInterval(contagem);
            textoContador.innerHTML = "Link validado com sucesso! <span style='color:#10b981;'>✔</span>";
            btnAguardar.style.display = 'none';
            btnAvancar.style.display = 'inline-block';
        }
    }, 1000);

    function redirecionar() {
        fetch('/get-redirect/' + codigoLink)
            .then(res => res.json())
            .then(data => {
                if(data.url) {
                    window.location.href = data.url;
                } else {
                    alert("Este link expirou ou é inválido.");
                }
            })
            .catch(() => alert("Erro ao conectar ao servidor."));
    }
</script>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'anuncio.html'), htmlContent, 'utf8');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/api/shorten', (req, res) => {
    const { api, url } = req.query;
    if (!api || !url) {
        return res.status(400).json({ status: "error", message: "Parâmetros obrigatórios em falta: 'api' e 'url'." });
    }
    const db = lerBaseDados();
    const codigoCurto = uuidv4().substring(0, 8);
    db[codigoCurto] = { urlOriginal: url, cliques: 0, criadoEm: new Date().toISOString() };
    guardarBaseDados(db);
    res.json({
        status: "success",
        shortenedUrl: req.protocol + "://" + req.get('host') + "/s/" + codigoCurto
    });
});

app.get('/s/:codigo', (req, res) => {
    const { codigo } = req.params;
    const db = lerBaseDados();
    if (!db[codigo]) {
        return res.status(404).send('<body style="background:#0f172a;color:white;font-family:sans-serif;text-align:center;padding-top:100px;"><h1>Erro 404</h1><p>O link solicitado não existe ou já expirou.</p></body>');
    }
    res.sendFile(path.join(__dirname, 'public', 'anuncio.html'));
});

app.get('/get-redirect/:codigo', (req, res) => {
    const { codigo } = req.params;
    const db = lerBaseDados();
    if (db[codigo]) {
        db[codigo].cliques += 1;
        guardarBaseDados(db);
        return res.json({ url: db[codigo].urlOriginal });
    }
    res.status(404).json({ error: "Inválido" });
});

app.listen(PORT, () => {
    console.log("=====================================================");
    console.log("  ENCURTADOR MONETIZÁVEL ONLINE PRONTO A USAR!       ");
    console.log("  Servidor ativo na porta: " + PORT);
    console.log("=====================================================");
});
