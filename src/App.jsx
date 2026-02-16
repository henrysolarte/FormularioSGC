import { useEffect, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import './App.css'
import logoSindegeologico from '../images/logo.png'

const initialData = {
  nombres: '',
  apellidos: '',
  fecha_ingreso: '',
  dependencia: '',
  ciudad: '',
  telefono: '',
  extension: '',
  correo: '',
  firma_1_image: '',
  cc_1: '',
  de_1: '',
  yo: '',
  cc_identificado: '',
  de_2: '',
  autorizacion_texto:
    'Autorizo se me descuente mensualmente el 0,5 % de mi sueldo básico con destino al Sindicato de Empleados del Servicio Geológico Colombiano - SINDEGEOLÓGICO, por concepto de cuotas mensuales ordinarias.',
  firma_2_image: '',
  cc_2: '',
  de_3: '',
  ciudad_fecha: '',
}

const STORAGE_KEY = 'sindegeologico_form_data'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const buildPreviewData = (data) => ({
  ...data,
  firma_1_image: data.firma_1_image ? '[Imagen cargada]' : '[Sin firma]',
  firma_2_image: data.firma_2_image ? '[Imagen cargada]' : '[Sin firma]',
})

function App() {
  const firstSignatureInputRef = useRef(null)
  const [formData, setFormData] = useState(initialData)
  const [resultado, setResultado] = useState(null)
  const [isEditing, setIsEditing] = useState(true)
  const [emailStatus, setEmailStatus] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return
    }

    try {
      const parsed = JSON.parse(saved)
      setFormData((prev) => ({ ...prev, ...parsed }))
      setResultado(buildPreviewData(parsed))
      setIsEditing(false)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    const yoAuto = `${formData.nombres} ${formData.apellidos}`.trim()
    const ccAuto = formData.cc_1
    const deAuto = formData.de_1

    if (
      formData.yo === yoAuto &&
      formData.cc_identificado === ccAuto &&
      formData.de_2 === deAuto &&
      formData.cc_2 === ccAuto &&
      formData.de_3 === deAuto
    ) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      yo: yoAuto,
      cc_identificado: ccAuto,
      de_2: deAuto,
      cc_2: ccAuto,
      de_3: deAuto,
    }))
  }, [formData.nombres, formData.apellidos, formData.cc_1, formData.de_1, formData.yo, formData.cc_identificado, formData.de_2, formData.cc_2, formData.de_3])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSignatureUpload = (field, event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const imageData = typeof reader.result === 'string' ? reader.result : ''
      setFormData((prev) => {
        if (field === 'firma_1_image') {
          return { ...prev, firma_1_image: imageData, firma_2_image: imageData }
        }
        return { ...prev, [field]: imageData }
      })
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveSignature = (field) => {
    setFormData((prev) => {
      if (field === 'firma_1_image') {
        return { ...prev, firma_1_image: '', firma_2_image: '' }
      }
      return { ...prev, [field]: '' }
    })
  }

  const openFileDialog = () => {
    if (!firstSignatureInputRef.current) {
      return
    }
    firstSignatureInputRef.current.value = ''
    firstSignatureInputRef.current.click()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
    setResultado(buildPreviewData(formData))
    setIsEditing(false)
    setEmailStatus('')
  }

  const handleReset = () => {
    setFormData(initialData)
    setResultado(null)
    localStorage.removeItem(STORAGE_KEY)
    setIsEditing(true)
    setEmailStatus('')
  }

  const handleModify = () => {
    setIsEditing(true)
  }

  const generatePdfDoc = async () => {
    const doc = new jsPDF({ unit: 'mm', format: 'letter' })
    const value = (v) => (v && v.trim() ? v : 'N/A')
    const colors = {
      greenDark: [0, 94, 60],
      greenSoft: [233, 243, 238],
      gold: [200, 154, 60],
      text: [23, 45, 35],
      label: [0, 94, 60],
      border: [190, 210, 198],
    }
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const page = { w: pageWidth, h: pageHeight, m: 12, usableW: pageWidth - 24 }
    let y = 12

    const ensureRoom = (height) => {
      if (y + height <= page.h - page.m) {
        return
      }
      doc.addPage()
      y = 12
    }

    const drawField = (label, val, x, yy, w, h = 16) => {
      doc.setDrawColor(...colors.border)
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(x, yy, w, h, 1.8, 1.8, 'FD')
      doc.setTextColor(...colors.label)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(label, x + 2, yy + 4.2)
      doc.setTextColor(...colors.text)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const textLines = doc.splitTextToSize(value(val), w - 4)
      doc.text(textLines[0] || 'N/A', x + 2, yy + 10.5)
    }

    const loadImage = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
      })

    const getImageFormat = (imageData) => {
      if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
        return 'JPEG'
      }
      return 'PNG'
    }

    const drawSignatureField = async (label, imageData, x, yy, w, h = 24) => {
      doc.setDrawColor(...colors.border)
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(x, yy, w, h, 1.8, 1.8, 'FD')
      doc.setTextColor(...colors.label)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(label, x + 2, yy + 4.2)

      if (!imageData) {
        return
      }

      try {
        const signature = await loadImage(imageData)
        const fmt = getImageFormat(imageData)
        const maxW = w - 6
        const maxH = h - 9
        const imgW = signature.naturalWidth || signature.width || 1
        const imgH = signature.naturalHeight || signature.height || 1
        const imgRatio = imgW / imgH
        const boxRatio = maxW / maxH

        let drawW = maxW
        let drawH = maxH
        if (imgRatio > boxRatio) {
          drawH = maxW / imgRatio
        } else {
          drawW = maxH * imgRatio
        }

        const drawX = x + (w - drawW) / 2
        const drawY = yy + 6 + (maxH - drawH) / 2
        doc.addImage(signature, fmt, drawX, drawY, drawW, drawH)
      } catch {
        return
      }
    }

    doc.setFillColor(...colors.greenDark)
    doc.roundedRect(page.m, y, page.usableW, 44, 3, 3, 'F')
    doc.setFillColor(...colors.gold)
    doc.rect(page.m, y + 41.5, page.usableW, 2.5, 'F')

    try {
      const logo = await loadImage(logoSindegeologico)
      doc.addImage(logo, 'PNG', page.m + 3, y + 4, 28, 28)
    } catch {
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('LOGO', page.m + 12, y + 20)
    }

    const headerTextLeft = page.m + 36
    const headerTextRight = page.m + page.usableW - 3
    const headerTextCenter = (headerTextLeft + headerTextRight) / 2

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(19)
    doc.text('SINDEGEOLÓGICO', headerTextCenter, y + 11, { align: 'center' })
    doc.setFontSize(11)
    doc.text('Cuando estamos unidos, nadie queda atrás', headerTextCenter, y + 18, { align: 'center' })
    doc.setTextColor(255, 224, 161)
    doc.setFontSize(14)
    doc.text('50 Años', headerTextCenter, y + 25, { align: 'center' })
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9.5)
    doc.text('SINDICATO DE EMPLEADOS DEL SERVICIO GEOLÓGICO COLOMBIANO', headerTextCenter, y + 32, { align: 'center' })
    doc.setFontSize(8.5)
    doc.text('Personería jurídica No. 001330 del 14 de mayo de 1975', headerTextCenter, y + 37, { align: 'center' })
    y += 50

    doc.setFillColor(...colors.greenSoft)
    doc.roundedRect(page.m, y, page.usableW, 10, 2, 2, 'F')
    doc.setDrawColor(...colors.gold)
    doc.setLineWidth(0.8)
    doc.line(page.m + 1, y + 1, page.m + 1, y + 9)
    doc.setTextColor(...colors.label)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('Solicitud de afiliación SINDEGEOLÓGICO', page.m + 5, y + 6.8)
    y += 14

    doc.setTextColor(...colors.text)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    const intro = doc.splitTextToSize(
      'De manera libre y en ejercicio del derecho fundamental de asociación, consagrado en el artículo 38 de la Constitución Política, solicito mi afiliación a SINDEGEOLÓGICO.',
      page.usableW,
    )
    doc.text(intro, page.m, y)
    y += intro.length * 4 + 3

    ensureRoom(80)
    doc.setFillColor(...colors.greenDark)
    doc.roundedRect(page.m, y, page.usableW, 7, 1.5, 1.5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('DATOS PERSONALES', page.m + 3, y + 4.7)
    y += 10

    const colGap = 4
    const half = (page.usableW - colGap) / 2
    drawField('Nombres', formData.nombres, page.m, y, half)
    drawField('Apellidos', formData.apellidos, page.m + half + colGap, y, half)
    y += 19
    drawField('Fecha de ingreso al SGC', formData.fecha_ingreso, page.m, y, half)
    drawField('Dependencia a donde labora', formData.dependencia, page.m + half + colGap, y, half)
    y += 19
    drawField('Ciudad', formData.ciudad, page.m, y, half)
    drawField('Teléfono', formData.telefono, page.m + half + colGap, y, half)
    y += 19
    drawField('Extensión', formData.extension, page.m, y, half)
    drawField('Correo electrónico', formData.correo, page.m + half + colGap, y, half)
    y += 19
    await drawSignatureField('En constancia, firmo', formData.firma_1_image, page.m, y, page.usableW)
    y += 27
    drawField('C.C. No', formData.cc_1, page.m, y, half)
    drawField('De', formData.de_1, page.m + half + colGap, y, half)
    y += 22

    ensureRoom(98)
    doc.setFillColor(...colors.greenDark)
    doc.roundedRect(page.m, y, page.usableW, 7, 1.5, 1.5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('AUTORIZACIÓN', page.m + 3, y + 4.7)
    y += 10

    drawField('Yo', formData.yo, page.m, y, half)
    drawField('Identificado con C.C. No', formData.cc_identificado, page.m + half + colGap, y, half)
    y += 19
    drawField('De', formData.de_2, page.m, y, page.usableW)
    y += 19

    const textBoxH = 32
    doc.setDrawColor(...colors.border)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(page.m, y, page.usableW, textBoxH, 1.8, 1.8, 'FD')
    doc.setTextColor(...colors.label)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Autorización', page.m + 2, y + 4.2)
    doc.setTextColor(...colors.text)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    const authLines = doc.splitTextToSize(value(formData.autorizacion_texto), page.usableW - 4)
    doc.text(authLines, page.m + 2, y + 9.8)
    y += textBoxH + 3

    await drawSignatureField('En constancia, firmo', formData.firma_2_image, page.m, y, page.usableW)
    y += 27
    drawField('C.C. No', formData.cc_2, page.m, y, half)
    drawField('De', formData.de_3, page.m + half + colGap, y, half)
    y += 19
    drawField('Ciudad y fecha', formData.ciudad_fecha, page.m, y, page.usableW)

    const totalPages = doc.getNumberOfPages()
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      doc.setPage(pageNumber)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(90, 110, 98)
      doc.text(`${pageNumber} de ${totalPages}`, page.w / 2, page.h - 6, { align: 'center' })
    }

    return doc
  }

  const handleDownloadPdf = async () => {
    const doc = await generatePdfDoc()
    doc.save('formulario-sindegeologico.pdf')
  }

  const handleSendEmail = async () => {
    try {
      setIsSending(true)
      setEmailStatus('Enviando...')
      const doc = await generatePdfDoc()
      const dataUri = doc.output('datauristring')
      const pdfBase64 = dataUri.split(',')[1] || ''

      const response = await fetch(`${API_BASE_URL}/api/send-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64,
          fileName: 'formulario-sindegeologico.pdf',
          formData,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'No se pudo enviar el correo.')
      }

      setEmailStatus(result.message || 'Correo enviado correctamente.')
    } catch (error) {
      setEmailStatus(error.message || 'Error enviando correo.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="brand-block">
          <div className="brand-inner">
            <img
              className="brand-logo"
              src={logoSindegeologico}
              alt="Logo SINDEGEOLÓGICO"
            />
            <div className="brand-text">
              <p className="brand-name">SINDEGEOLÓGICO</p>
              <p className="brand-slogan">Cuando estamos unidos, nadie queda atrás</p>
              <p className="brand-years">50 Años</p>
              <p className="brand-org">SINDICATO DE EMPLEADOS DEL SERVICIO GEOLÓGICO COLOMBIANO</p>
              <p className="brand-legal">Personería jurídica No. 001330 del 14 de mayo de 1975</p>
            </div>
          </div>
        </div>
        <h1>Solicitud de afiliación SINDEGEOLÓGICO</h1>
        <p>
         De manera libre y en ejercicio del derecho fundamental de asociación, consagrado en el artículo 38 de la Constitución Política, solicito mi afiliación a SINDEGEOLÓGICO.
        </p>

        <form onSubmit={handleSubmit}>
          <fieldset className="form-fieldset" disabled={!isEditing}>
            <h2>Datos personales</h2>
            <div className="grid">
              <div>
                <label htmlFor="nombres">Nombres</label>
                <input id="nombres" name="nombres" value={formData.nombres} onChange={handleChange} required />
              </div>
              <div>
                <label htmlFor="apellidos">Apellidos</label>
                <input id="apellidos" name="apellidos" value={formData.apellidos} onChange={handleChange} required />
              </div>
              <div>
                <label htmlFor="fecha_ingreso">Fecha de ingreso al SGC</label>
                <input id="fecha_ingreso" name="fecha_ingreso" type="date" value={formData.fecha_ingreso} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="dependencia">Dependencia donde labora</label>
                <input id="dependencia" name="dependencia" value={formData.dependencia} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="ciudad">Ciudad</label>
                <input id="ciudad" name="ciudad" value={formData.ciudad} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="telefono">Teléfono</label>
                <input id="telefono" name="telefono" value={formData.telefono} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="extension">Extensión</label>
                <input id="extension" name="extension" value={formData.extension} onChange={handleChange} />
              </div>
              <div className="full">
                <label htmlFor="correo">Dirección de correo electrónico</label>
                <input id="correo" name="correo" type="email" value={formData.correo} onChange={handleChange} />
              </div>
            </div>

            <p>
              Si es aceptada mi afiliación, me comprometo a respetar y acatar los
              estatutos de SINDEGEOLÓGICO, las actividades y decisiones de sus cuerpos
              directivos, los principios que rigen la actividad y el programa de
              defensa en favor de sus asociados.
            </p>

            <div className="grid">
              <div className="full">
                <label htmlFor="firma_1_file">En constancia, firmo (subir firma)</label>
                <input
                  id="firma_1_file"
                  name="firma_1_file"
                  ref={firstSignatureInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={(event) => handleSignatureUpload('firma_1_image', event)}
                />
                {!formData.firma_1_image && (
                  <button type="button" className="primary" onClick={openFileDialog}>
                    Subir firma
                  </button>
                )}
                {formData.firma_1_image && (
                  <div className="signature-preview-wrap">
                    <img className="signature-preview" src={formData.firma_1_image} alt="Firma afiliación" />
                    <button type="button" className="secondary" onClick={() => handleRemoveSignature('firma_1_image')}>Quitar firma</button>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="cc_1">C.C. No</label>
                <input id="cc_1" name="cc_1" value={formData.cc_1} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="de_1">De</label>
                <input id="de_1" name="de_1" value={formData.de_1} onChange={handleChange} />
              </div>
            </div>

            <h2>Autorización</h2>
            <div className="grid">
              <div>
                <label htmlFor="yo">Yo</label>
                <input id="yo" name="yo" value={formData.yo} onChange={handleChange} readOnly />
              </div>
              <div>
                <label htmlFor="cc_identificado">Identificado con C.C. No</label>
                <input id="cc_identificado" name="cc_identificado" value={formData.cc_identificado} onChange={handleChange} readOnly />
              </div>
              <div>
                <label htmlFor="de_2">De</label>
                <input id="de_2" name="de_2" value={formData.de_2} onChange={handleChange} readOnly />
              </div>
              <div className="full">
                <label htmlFor="autorizacion_texto">Autorización</label>
                <textarea id="autorizacion_texto" name="autorizacion_texto" value={formData.autorizacion_texto} onChange={handleChange} />
              </div>
              <div className="full">
                <label>En constancia, firmo</label>
                {formData.firma_2_image && (
                  <div className="signature-preview-wrap">
                    <img className="signature-preview" src={formData.firma_2_image} alt="Firma autorización" />
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="cc_2">C.C. No.</label>
                <input id="cc_2" name="cc_2" value={formData.cc_2} onChange={handleChange} readOnly />
              </div>
              <div>
                <label htmlFor="de_3">De</label>
                <input id="de_3" name="de_3" value={formData.de_3} onChange={handleChange} readOnly />
              </div>
              <div className="full">
                <label htmlFor="ciudad_fecha">Ciudad y fecha</label>
                <input id="ciudad_fecha" name="ciudad_fecha" value={formData.ciudad_fecha} onChange={handleChange} />
              </div>
            </div>
          </fieldset>

          <div className="actions">
            <button type="submit" className="primary" disabled={!isEditing}>Guardar</button>
            <button type="button" className="secondary" onClick={handleModify}>Modificar</button>
            <button type="button" className="primary" onClick={handleDownloadPdf}>Descargar PDF</button>
            <button type="button" className="secondary" onClick={handleReset}>Limpiar</button>
          </div>
        </form>

        {emailStatus && <p className="status-message">{emailStatus}</p>}
        {resultado && <pre>{JSON.stringify(resultado, null, 2)}</pre>}
      </div>
    </div>
  )
}

export default App




