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

const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']

const hasRequiredEnv = () => requiredEnv.every((key) => Boolean(process.env[key]))

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

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

    const transporter = createTransporter()

    const textBody = [
      'Se adjunta formulario SINDEGEOLOGICO generado automaticamente.',
      '',
      `Nombre: ${formData?.nombres || ''} ${formData?.apellidos || ''}`.trim(),
      `Correo: ${formData?.correo || ''}`,
      `Ciudad: ${formData?.ciudad || ''}`,
      `Fecha envio: ${new Date().toLocaleString('es-CO')}`,
    ].join('\n')

    await transporter.sendMail({
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

    return res.json({ ok: true, message: `Correo enviado a ${toEmail}` })
  } catch (error) {
    console.error('Error enviando correo:', error)
    const smtpMessage = error?.response || error?.message || 'No se pudo enviar el correo.'
    return res.status(500).json({ ok: false, message: smtpMessage })
  }
})

app.listen(port, () => {
  console.log(`[server] API disponible en http://localhost:${port}`)
})
