# Formulario SGC (React)

Aplicacion React + Vite para diligenciar el formulario de SINDEGEOLOGICO, guardar en localStorage y exportar a PDF.

## Deploy en Render (Blueprint)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/henrysolarte/FormularioSGC)

Tambien puedes hacerlo manual:
1. Ve a https://dashboard.render.com/blueprints
2. Click en **New Blueprint Instance**
3. Selecciona el repo `henrysolarte/FormularioSGC` (rama `main`)
4. Render detecta `render.yaml` y crea:
   - `formulario-sgc` (frontend estatico)
   - `formulario-sgc-api` (backend de correo)
5. En `formulario-sgc-api` revisa y actualiza variables:
   - `SMTP_USER`
   - `SMTP_PASS` (App Password de Gmail)
   - `EMAIL_FROM`

## Desarrollo local

```bash
npm install
npm run dev
```

## Envio automatico de PDF por correo

1. Crea `.env` a partir de `.env.example` y completa tus credenciales SMTP.
2. Ejecuta:

```bash
npm install
npm run dev
```

3. Usa el boton **Enviar por correo** en el formulario.

Nota: El backend expone `POST /api/send-pdf` y envia por defecto a `hsolarte@sgc.gov.co` (variable `EMAIL_TO`).
