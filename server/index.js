import 'dotenv/config'
import cors from 'cors'
import express from 'express'

const app = express()
const port = Number(process.env.PORT || 8787)
const toEmail = process.env.EMAIL_TO || 'hsolarte@sgc.gov.co'
const resendApiUrl = 'https://api.resend.com/emails'

app.use(cors())
app.use(express.json({ limit: '30mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

const requiredEnv = ['RESEND_API_KEY', 'EMAIL_FROM']

const hasRequiredEnv = () =>
  requiredEnv.every((key) => {
    const value = process.env[key]
    return Boolean(value && value.trim())
  })

app.post('/api/send-pdf', async (req, res) => {
  try {
    if (!hasRequiredEnv()) {
      return res.status(500).json({
        ok: false,
        message: 'Faltan variables de Resend en el servidor.',
      })
    }

    const { pdfBase64, fileName, formData } = req.body || {}

    if (!pdfBase64) {
      return res.status(400).json({ ok: false, message: 'No se recibió el PDF.' })
    }

    const safeName = fileName || 'formulario-sindegeologico.pdf'

    const textBody = [
      'Se adjunta formulario SINDEGEOLOGICO generado automaticamente.',
      '',
      `Nombre: ${formData?.nombres || ''} ${formData?.apellidos || ''}`.trim(),
      `Correo: ${formData?.correo || ''}`,
      `Ciudad: ${formData?.ciudad || ''}`,
      `Fecha envio: ${new Date().toLocaleString('es-CO')}`,
    ].join('\n')

    const resendResponse = await fetch(resendApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [toEmail],
        subject: 'Formulario SINDEGEOLOGICO',
        text: textBody,
        attachments: [
          {
            filename: safeName,
            content: pdfBase64,
          },
        ],
      }),
    })

    if (!resendResponse.ok) {
      const errorPayload = await resendResponse.text()
      throw new Error(errorPayload || `Error Resend (${resendResponse.status})`)
    }

    return res.json({ ok: true, message: `Correo enviado a ${toEmail}` })
  } catch (error) {
    console.error('Error enviando correo:', error)
    const errorMessage = error?.message || 'No se pudo enviar el correo.'
    return res.status(500).json({ ok: false, message: errorMessage })
  }
})

app.listen(port, () => {
  console.log(`[server] API disponible en http://localhost:${port}`)
})
