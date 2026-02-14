import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import nodemailer from 'nodemailer'

const app = express()
const port = Number(process.env.PORT || 8787)
const toEmail = process.env.EMAIL_TO || 'hsolarte@sgc.gov.co'

app.use(cors())
app.use(express.json({ limit: '30mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

const requiredEnv = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']

const hasRequiredEnv = () =>
  requiredEnv.every((key) => {
    const value = process.env[key]
    return Boolean(value && value.trim())
  })

const createTransporter = ({ host, port: smtpPort, secure }) =>
  nodemailer.createTransport({
    host,
    port: smtpPort,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  })

const sendWithFallback = async (mailOptions) => {
  const host = process.env.SMTP_HOST
  const configuredPort = Number(process.env.SMTP_PORT || 587)
  const configuredSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true'

  const attempts = [
    { host, port: configuredPort, secure: configuredSecure, label: `cfg(${configuredPort}/${configuredSecure ? 'ssl' : 'starttls'})` },
    { host, port: 587, secure: false, label: '587/starttls' },
    { host, port: 465, secure: true, label: '465/ssl' },
  ]

  const unique = []
  for (const attempt of attempts) {
    if (!unique.some((x) => x.port === attempt.port && x.secure === attempt.secure && x.host === attempt.host)) {
      unique.push(attempt)
    }
  }

  let lastError = null
  for (const attempt of unique) {
    try {
      const transporter = createTransporter(attempt)
      await transporter.verify()
      await transporter.sendMail(mailOptions)
      return { ok: true, used: attempt.label }
    } catch (error) {
      lastError = { attempt: attempt.label, error }
    }
  }

  const e = lastError?.error
  const detail = [
    `attempt=${lastError?.attempt || 'unknown'}`,
    `code=${e?.code || ''}`,
    `responseCode=${e?.responseCode || ''}`,
    `message=${e?.message || ''}`,
    `response=${e?.response || ''}`,
  ].join(' | ')

  throw new Error(detail)
}

app.post('/api/send-pdf', async (req, res) => {
  try {
    if (!hasRequiredEnv()) {
      return res.status(500).json({
        ok: false,
        message: 'Faltan variables SMTP en el servidor.',
      })
    }

    const { pdfBase64, fileName, formData } = req.body || {}

    if (!pdfBase64) {
      return res.status(400).json({ ok: false, message: 'No se recibió el PDF.' })
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    const safeName = fileName || 'formulario-sindegeologico.pdf'

    const textBody = [
      'Se adjunta formulario SINDEGEOLOGICO generado automaticamente.',
      '',
      `Nombre: ${formData?.nombres || ''} ${formData?.apellidos || ''}`.trim(),
      `Correo: ${formData?.correo || ''}`,
      `Ciudad: ${formData?.ciudad || ''}`,
      `Fecha envio: ${new Date().toLocaleString('es-CO')}`,
    ].join('\n')

    const result = await sendWithFallback({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: 'Formulario SINDEGEOLOGICO',
      text: textBody,
      attachments: [
        {
          filename: safeName,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    return res.json({ ok: true, message: `Correo enviado a ${toEmail} (${result.used})` })
  } catch (error) {
    console.error('Error enviando correo:', error)
    const errorMessage = error?.message || 'No se pudo enviar el correo.'
    return res.status(500).json({ ok: false, message: errorMessage })
  }
})

app.listen(port, () => {
  console.log(`[server] API disponible en http://localhost:${port}`)
})
