import qrcode

url = "https://formulario-sgc.onrender.com/"

img = qrcode.make(url)
img.save("qr_formulario_sgc.png")

print("QR generado: qr_formulario_sgc.png")
