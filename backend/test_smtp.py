import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys
import socket

def send_test_email():
    smtp_server = "10.1.150.25"
    smtp_port = 25
    sender_email = "alerta_soc@policiafederal.gov.ar"
    password = "!Seguridad#1601"
    receiver_email = "fldominguez@policiafederal.gov.ar"
    
    print(f"--- INICIO DE PRUEBA SMTP ---")
    print(f"Servidor: {smtp_server}:{smtp_port}")
    print(f"Remitente: {sender_email}")
    print(f"Destinatario: {receiver_email}")
    print(f"Seguridad: STARTTLS")
    
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = receiver_email
    msg['Subject'] = "Prueba de Tráfico SMTP - Ticketera (STARTTLS + AUTH)"
    
    body = "Mensaje de prueba enviado desde el servidor Ticketera (10.1.9.240) usando STARTTLS y autenticación."
    msg.attach(MIMEText(body, 'plain'))
    
    try:
        print("1. Conectando al servidor...")
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=30)
        server.set_debuglevel(1) # Habilitar debug detallado
        
        print("2. Enviando EHLO...")
        server.ehlo()
        
        print("3. Iniciando STARTTLS...")
        server.starttls()
        
        print("4. Re-enviando EHLO post-TLS...")
        server.ehlo()
        
        print("5. Intentando Login...")
        server.login(sender_email, password)
        
        print("6. Enviando mensaje...")
        server.send_message(msg)
        
        server.quit()
        print("✅ ¡ÉXITO! El correo fue enviado.")
        
    except socket.timeout:
        print("❌ ERROR: Tiempo de espera agotado (Timeout). El servidor no responde.")
    except ConnectionRefusedError:
        print("❌ ERROR: Conexión rechazada. El puerto 25 está cerrado en el destino.")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    print(f"--- FIN DE PRUEBA ---")

if __name__ == "__main__":
    send_test_email()