import React, { useState, useRef } from 'react';
import './TtpsPage.css';

export const TACTICS = [
  { key: 'reco', id: 'TA0043', label: 'Reconnaissance' },
  { key: 'resdev', id: 'TA0042', label: 'Resource Development' },
  { key: 'ia', id: 'TA0001', label: 'Initial Access' },
  { key: 'exec', id: 'TA0002', label: 'Execution' },
  { key: 'pers', id: 'TA0003', label: 'Persistence' },
  { key: 'pe', id: 'TA0004', label: 'Privilege Escalation' },
  { key: 'de', id: 'TA0005', label: 'Defense Evasion' },
  { key: 'ca', id: 'TA0006', label: 'Credential Access' },
  { key: 'disc', id: 'TA0007', label: 'Discovery' },
  { key: 'lm', id: 'TA0008', label: 'Lateral Movement' },
  { key: 'coll', id: 'TA0009', label: 'Collection' },
  { key: 'c2', id: 'TA0011', label: 'Command & Control' },
  { key: 'exfil', id: 'TA0010', label: 'Exfiltration' },
  { key: 'impact', id: 'TA0040', label: 'Impact' },
];

export const TTPS_DATA = [
  {
    id: 'T1071',
    name: 'Application Layer Protocol',
    tactic: 'c2',
    desc: 'Los adversarios pueden comunicarse usando protocolos de la capa de aplicación (como HTTP, HTTPS, o DNS) para ocultar el tráfico de mando y control.',
    cve: '',
    cvss: '',
    cveDesc: '',
    remed: ['Monitorizar tráfico de red.', 'Implementar filtrado de salida.']
  },
  {
    id: 'T1210',
    name: 'Exploitation of Remote Services',
    tactic: 'lm',
    desc: 'Los adversarios pueden explotar servicios remotos (como SMB o RDP) para obtener acceso no autorizado a sistemas internos.',
    cve: '',
    cvss: '',
    cveDesc: '',
    remed: ['Aplicar parches de seguridad.', 'Segmentación de red.']
  },
  {
    id: 'T1105',
    name: 'Ingress Tool Transfer',
    tactic: 'c2',
    desc: 'Los adversarios pueden transferir herramientas u otros archivos desde un sistema externo a un entorno comprometido.',
    cve: '',
    cvss: '',
    cveDesc: '',
    remed: ['Control de aplicaciones.', 'Análisis de tráfico de red entrante.']
  },
  {
    id: 'T1611',
    name: 'Escape to Host',
    tactic: 'pe',
    desc: 'Los adversarios pueden explotar vulnerabilidades en contenedores para escapar al host subyacente y ganar mayores privilegios.',
    cve: '',
    cvss: '',
    cveDesc: '',
    remed: ['Actualizar runtime del contenedor.', 'Implementar perfiles de seguridad como seccomp o AppArmor.']
  },
  // Reconnaissance
  {
    id: 'T1595',
    name: 'Active Scanning',
    tactic: 'reco',
    desc: 'El adversario escanea rangos IP y puertos del objetivo para identificar servicios expuestos antes de planificar el ataque.',
    cve: 'CVE-2023-11042',
    cvss: '5.3 MEDIO',
    cveDesc: 'Un servicio de descubrimiento de red mal configurado expone metadatos de infraestructura a peticiones no autenticadas.',
    remed: [
      'Limitar el escaneo saliente/entrante mediante segmentación y listas de control de acceso.',
      'Desplegar honeypots para detectar reconocimiento activo.',
      'Monitorizar patrones de escaneo con el SIEM y generar alertas automáticas.'
    ]
  },
  {
    id: 'T1592',
    name: 'Gather Victim Host Information',
    tactic: 'reco',
    desc: 'Recolección de información sobre hardware, software y configuración de los equipos objetivo mediante fuentes públicas o técnicas OSINT.',
    cve: 'CVE-2022-38217',
    cvss: '4.3 MEDIO',
    cveDesc: 'Cabeceras HTTP verbosas revelan versión de servidor y stack tecnológico interno.',
    remed: [
      'Endurecer cabeceras HTTP (ocultar versión de servidor y tecnologías).',
      'Reducir la superficie de información pública sobre activos.',
      'Formar al personal sobre exposición de datos en repositorios públicos.'
    ]
  },
  {
    id: 'T1589',
    name: 'Gather Victim Identity Information',
    tactic: 'reco',
    desc: 'Obtención de nombres, correos y roles de empleados para preparar campañas de phishing dirigidas o ingeniería social.',
    cve: 'CVE-2021-27890',
    cvss: '6.1 MEDIO',
    cveDesc: 'Un directorio corporativo accesible sin autenticación filtra nombres completos y correos electrónicos.',
    remed: [
      'Restringir el acceso a directorios de empleados solo a personal autenticado.',
      'Aplicar políticas de mínima exposición de datos en perfiles públicos.',
      'Simular campañas de phishing para medir exposición del personal.'
    ]
  },
  {
    id: 'T1598',
    name: 'Phishing for Information',
    tactic: 'reco',
    desc: 'Envío de comunicaciones engañosas para obtener credenciales o información sensible sin ejecutar código malicioso todavía.',
    cve: 'CVE-2023-30845',
    cvss: '6.5 MEDIO',
    cveDesc: 'Un filtro anti-spoofing SPF/DKIM mal configurado permite suplantar dominios corporativos.',
    remed: [
      'Implementar SPF, DKIM y DMARC correctamente configurados.',
      'Desplegar filtrado avanzado de correo con sandboxing de adjuntos.',
      'Capacitar periódicamente al personal en detección de phishing.'
    ]
  },

  // Resource Development
  {
    id: 'T1583',
    name: 'Acquire Infrastructure',
    tactic: 'resdev',
    desc: 'El adversario adquiere servidores, dominios o cuentas cloud para alojar infraestructura de ataque.',
    cve: 'CVE-2022-41738',
    cvss: '5.8 MEDIO',
    cveDesc: 'Un proveedor cloud de bajo coste permite registro anónimo facilitando infraestructura ofensiva desechable.',
    remed: [
      'Bloquear rangos de IP asociados a proveedores de alto riesgo conocido.',
      'Suscribirse a feeds de inteligencia de amenazas para IOC actualizados.',
      'Correlacionar tráfico saliente con listas de reputación de dominios.'
    ]
  },
  {
    id: 'T1586',
    name: 'Compromise Accounts',
    tactic: 'resdev',
    desc: 'Compromiso de cuentas legítimas de terceros (redes sociales, correo) para dar credibilidad a campañas posteriores.',
    cve: 'CVE-2023-20198',
    cvss: '7.2 ALTO',
    cveDesc: 'Una API de gestión de cuentas de terceros no valida correctamente tokens de sesión reutilizados.',
    remed: [
      'Exigir MFA en todas las cuentas de servicios de terceros integrados.',
      'Rotar credenciales y tokens de API periódicamente.',
      'Monitorizar inicios de sesión anómalos en cuentas corporativas vinculadas.'
    ]
  },
  {
    id: 'T1587',
    name: 'Develop Capabilities',
    tactic: 'resdev',
    desc: 'Desarrollo propio de malware, exploits o certificados para su posterior uso en campañas de intrusión.',
    cve: 'CVE-2024-21762',
    cvss: '9.8 CRÍTICO',
    cveDesc: 'Un componente de firma de código permite ejecución remota al procesar certificados manipulados.',
    remed: [
      'Validar y restringir certificados de firma de código confiables.',
      'Aplicar control de aplicaciones (allowlisting) en endpoints críticos.',
      'Actualizar firmas de EDR/antivirus con la última inteligencia de amenazas.'
    ]
  },
  {
    id: 'T1588',
    name: 'Obtain Capabilities',
    tactic: 'resdev',
    desc: 'Compra o descarga de herramientas ofensivas, exploits y malware ya desarrollado por terceros.',
    cve: 'CVE-2023-4863',
    cvss: '8.8 ALTO',
    cveDesc: 'Una librería de terceros ampliamente distribuida contiene un desbordamiento de búfer explotable remotamente.',
    remed: [
      'Mantener un inventario (SBOM) de librerías y dependencias de terceros.',
      'Aplicar parches de seguridad en cuanto se publiquen.',
      'Escanear dependencias con herramientas de análisis de composición de software.'
    ]
  },

  // Initial Access
  {
    id: 'T1566',
    name: 'Phishing',
    tactic: 'ia',
    desc: 'Entrega de enlaces o adjuntos maliciosos por correo para obtener acceso inicial al entorno corporativo.',
    cve: 'CVE-2023-23397',
    cvss: '9.8 CRÍTICO',
    cveDesc: 'Un cliente de correo procesa recordatorios especialmente diseñados que filtran hashes NTLM sin interacción del usuario.',
    remed: [
      'Aplicar el parche del cliente de correo afectado de inmediato.',
      'Desplegar sandboxing de adjuntos y enlaces en el gateway de correo.',
      'Bloquear el reenvío de hashes NTLM salientes en el perímetro.'
    ]
  },
  {
    id: 'T1190',
    name: 'Exploit Public-Facing Application',
    tactic: 'ia',
    desc: 'Explotación de vulnerabilidades en aplicaciones expuestas a internet (VPN, portales web, APIs) para obtener acceso.',
    cve: 'CVE-2024-3400',
    cvss: '10.0 CRÍTICO',
    cveDesc: 'Un firewall perimetral permite inyección de comandos no autenticada a través de un parámetro de configuración expuesto.',
    remed: [
      'Aplicar el parche del fabricante con carácter de emergencia.',
      'Restringir el acceso administrativo a la interfaz solo desde redes internas.',
      'Desplegar un WAF con reglas específicas para el CVE identificado.'
    ]
  },
  {
    id: 'T1078',
    name: 'Valid Accounts',
    tactic: 'ia',
    desc: 'Uso de credenciales legítimas obtenidas previamente para acceder a sistemas sin levantar alertas de intrusión.',
    cve: 'CVE-2023-36884',
    cvss: '8.3 ALTO',
    cveDesc: 'Un fallo de validación de sesión permite reutilizar tokens de acceso tras el cierre de sesión del usuario.',
    remed: [
      'Forzar MFA resistente a phishing en todas las cuentas privilegiadas.',
      'Invalidar tokens de sesión al cerrar sesión o tras inactividad.',
      'Auditar accesos con imposibilidad geográfica o patrones atípicos.'
    ]
  },
  {
    id: 'T1133',
    name: 'External Remote Services',
    tactic: 'ia',
    desc: 'Abuso de servicios de acceso remoto (VPN, RDP, escritorios virtuales) expuestos con controles insuficientes.',
    cve: 'CVE-2023-27997',
    cvss: '9.8 CRÍTICO',
    cveDesc: 'Un servicio VPN SSL contiene un desbordamiento de búfer explotable de forma remota y no autenticada.',
    remed: [
      'Actualizar el firmware/VPN a la versión corregida.',
      'Exigir MFA en todos los accesos remotos externos.',
      'Limitar el acceso VPN a rangos IP conocidos cuando sea posible.'
    ]
  },

  // Execution
  {
    id: 'T1059',
    name: 'Command and Scripting Interpreter',
    tactic: 'exec',
    desc: 'Ejecución de comandos mediante intérpretes como PowerShell, Bash o Python para desplegar cargas maliciosas.',
    cve: 'CVE-2023-38831',
    cvss: '7.8 ALTO',
    cveDesc: 'Un intérprete de scripts ejecuta código arbitrario embebido dentro de archivos comprimidos manipulados.',
    remed: [
      'Habilitar registro avanzado (Script Block Logging) de PowerShell.',
      'Restringir intérpretes de scripts mediante políticas de aplicación (AppLocker/WDAC).',
      'Desplegar detección de comportamiento en el EDR para cadenas de comandos sospechosas.'
    ]
  },
  {
    id: 'T1204',
    name: 'User Execution',
    tactic: 'exec',
    desc: 'El adversario induce al usuario a ejecutar un archivo o enlace malicioso mediante ingeniería social.',
    cve: 'CVE-2023-36025',
    cvss: '8.8 ALTO',
    cveDesc: 'El sistema operativo omite advertencias de seguridad al abrir archivos de acceso directo especialmente diseñados.',
    remed: [
      'Bloquear extensiones de archivo de alto riesgo en el gateway de correo.',
      'Mantener actualizadas las advertencias de seguridad del sistema operativo.',
      'Formar al personal en identificación de archivos y enlaces sospechosos.'
    ]
  },
  {
    id: 'T1053',
    name: 'Scheduled Task/Job',
    tactic: 'exec',
    desc: 'Creación de tareas programadas para ejecutar cargas maliciosas de forma recurrente o diferida.',
    cve: 'CVE-2022-26923',
    cvss: '8.8 ALTO',
    cveDesc: 'Un servicio de programación de tareas de dominio permite escalar privilegios mediante plantillas de certificado mal configuradas.',
    remed: [
      'Auditar y limitar la creación de tareas programadas a usuarios autorizados.',
      'Revisar periódicamente tareas programadas activas en servidores críticos.',
      'Aplicar el principio de mínimo privilegio en cuentas de servicio.'
    ]
  },
  {
    id: 'T1129',
    name: 'Shared Modules',
    tactic: 'exec',
    desc: 'Carga de módulos o librerías compartidas maliciosas para ejecutar código dentro de procesos legítimos.',
    cve: 'CVE-2021-44228',
    cvss: '10.0 CRÍTICO',
    cveDesc: 'Una librería de logging ampliamente usada permite ejecución remota de código mediante búsquedas JNDI no saneadas.',
    remed: [
      'Actualizar la librería afectada a una versión parcheada de inmediato.',
      'Deshabilitar funcionalidades de búsqueda JNDI no utilizadas.',
      'Aislar procesos críticos con controles de integridad de módulos cargados.'
    ]
  },

  // Persistence
  {
    id: 'T1547',
    name: 'Boot or Logon Autostart Execution',
    tactic: 'pers',
    desc: 'Configuración de claves de registro o servicios de arranque para mantener persistencia tras reinicios.',
    cve: 'CVE-2022-30190',
    cvss: '7.8 ALTO',
    cveDesc: 'Una herramienta de diagnóstico del sistema ejecuta código remoto al procesar documentos de office manipulados.',
    remed: [
      'Deshabilitar el protocolo de diagnóstico vulnerable si no es necesario.',
      'Monitorizar cambios en claves de registro de autoarranque.',
      'Aplicar control de integridad de archivos en rutas críticas del sistema.'
    ]
  },
  {
    id: 'T1136',
    name: 'Create Account',
    tactic: 'pers',
    desc: 'Creación de cuentas locales o de dominio adicionales para mantener acceso persistente al entorno.',
    cve: 'CVE-2021-42287',
    cvss: '8.8 ALTO',
    cveDesc: 'Un controlador de dominio permite la suplantación de cuentas de equipo mediante manipulación de nombres SAM.',
    remed: [
      'Auditar la creación de cuentas de dominio en tiempo real.',
      'Aplicar políticas de nomenclatura y aprobación para nuevas cuentas.',
      'Revisar y deshabilitar cuentas huérfanas o no utilizadas periódicamente.'
    ]
  },
  {
    id: 'T1098',
    name: 'Account Manipulation',
    tactic: 'pers',
    desc: 'Modificación de permisos, grupos o credenciales de cuentas existentes para mantener el acceso.',
    cve: 'CVE-2020-1472',
    cvss: '10.0 CRÍTICO',
    cveDesc: 'Un fallo criptográfico en el protocolo de autenticación de dominio permite restablecer contraseñas de controladores sin autenticación.',
    remed: [
      'Aplicar el parche de seguridad del controlador de dominio de inmediato.',
      'Habilitar el modo de aplicación reforzado del protocolo afectado.',
      'Monitorizar cambios de contraseña de cuentas de máquina del dominio.'
    ]
  },
  {
    id: 'T1505',
    name: 'Server Software Component',
    tactic: 'pers',
    desc: 'Instalación de componentes o webshells maliciosos en servidores para mantener acceso persistente.',
    cve: 'CVE-2021-26855',
    cvss: '9.1 CRÍTICO',
    cveDesc: 'Un servidor de correo corporativo permite solicitudes SSRF no autenticadas que derivan en la carga de componentes maliciosos.',
    remed: [
      'Aplicar los parches acumulativos del servidor de correo.',
      'Escanear directorios web en busca de webshells conocidos.',
      'Restringir permisos de escritura en directorios de aplicaciones expuestas.'
    ]
  },

  // Privilege Escalation
  {
    id: 'T1068',
    name: 'Exploitation for Privilege Escalation',
    tactic: 'pe',
    desc: 'Explotación de vulnerabilidades del sistema operativo o aplicaciones para obtener privilegios elevados.',
    cve: 'CVE-2023-32046',
    cvss: '7.8 ALTO',
    cveDesc: 'Un componente del sistema operativo permite escalar privilegios mediante manipulación de archivos MSI especialmente diseñados.',
    remed: [
      'Aplicar las actualizaciones acumulativas de seguridad del sistema operativo.',
      'Restringir la ejecución de instaladores MSI a usuarios autorizados.',
      'Desplegar monitorización de escalada de privilegios en el EDR.'
    ]
  },
  {
    id: 'T1055',
    name: 'Process Injection',
    tactic: 'pe',
    desc: 'Inyección de código malicioso en procesos legítimos para ocultar la actividad y elevar privilegios.',
    cve: 'CVE-2022-21999',
    cvss: '7.8 ALTO',
    cveDesc: 'El servicio de cola de impresión permite la inyección de código en el contexto de sistema mediante controladores manipulados.',
    remed: [
      'Deshabilitar el servicio de cola de impresión en servidores que no lo requieran.',
      'Aplicar el parche disponible para el servicio afectado.',
      'Habilitar protección de procesos y credential guard en endpoints críticos.'
    ]
  },
  {
    id: 'T1548',
    name: 'Abuse Elevation Control Mechanism',
    tactic: 'pe',
    desc: 'Manipulación de mecanismos de UAC o sudo para ejecutar acciones con privilegios elevados sin consentimiento explícito.',
    cve: 'CVE-2023-28252',
    cvss: '7.8 ALTO',
    cveDesc: 'El controlador del sistema de archivos de registro permite escalar privilegios locales mediante manipulación de journaling.',
    remed: [
      'Aplicar el parche del controlador afectado.',
      'Configurar UAC en modo estricto para todos los usuarios.',
      'Auditar el uso de comandos con elevación de privilegios (sudo/runas).'
    ]
  },
  {
    id: 'T1484',
    name: 'Domain Policy Modification',
    tactic: 'pe',
    desc: 'Modificación de políticas de grupo o de dominio para escalar privilegios o debilitar controles de seguridad.',
    cve: 'CVE-2021-42278',
    cvss: '8.8 ALTO',
    cveDesc: 'Un fallo en la validación de nombres de cuentas de dominio permite suplantar controladores de dominio.',
    remed: [
      'Aplicar los parches de seguridad de Active Directory correspondientes.',
      'Restringir permisos de modificación de GPO al mínimo necesario.',
      'Auditar cambios en políticas de dominio con alertas en tiempo real.'
    ]
  },

  // Defense Evasion
  {
    id: 'T1070',
    name: 'Indicator Removal',
    tactic: 'de',
    desc: 'Eliminación de registros de eventos, archivos temporales o artefactos forenses para dificultar la detección.',
    cve: 'CVE-2023-21554',
    cvss: '9.8 CRÍTICO',
    cveDesc: 'Un servicio de colas de mensajería permite ejecución remota de código que borra registros de auditoría asociados.',
    remed: [
      'Centralizar logs en un SIEM inmutable fuera del alcance del atacante.',
      'Aplicar el parche del servicio de mensajería afectado.',
      'Habilitar alertas ante la limpieza masiva de registros de eventos.'
    ]
  },
  {
    id: 'T1027',
    name: 'Obfuscated Files or Information',
    tactic: 'de',
    desc: 'Ofuscación o cifrado de payloads y scripts para evadir motores de detección estática.',
    cve: 'CVE-2023-38180',
    cvss: '7.5 ALTO',
    cveDesc: 'Un motor de análisis de contenido no detecta payloads comprimidos con codificación no estándar.',
    remed: [
      'Actualizar firmas del motor antimalware y habilitar análisis heurístico.',
      'Desplegar sandboxing dinámico para archivos comprimidos o codificados.',
      'Bloquear formatos de compresión poco comunes en el perímetro de correo.'
    ]
  },
  {
    id: 'T1562',
    name: 'Impair Defenses',
    tactic: 'de',
    desc: 'Deshabilitación de antivirus, EDR o firewalls para operar sin ser detectado por controles de seguridad.',
    cve: 'CVE-2022-37969',
    cvss: '7.8 ALTO',
    cveDesc: 'El servicio de registro de eventos de Windows permite escalada de privilegios que deriva en la desactivación de controles de seguridad.',
    remed: [
      'Aplicar tamper protection en las soluciones EDR/antivirus.',
      'Restringir permisos para detener servicios de seguridad críticos.',
      'Alertar automáticamente ante la desactivación de agentes de seguridad.'
    ]
  },
  {
    id: 'T1036',
    name: 'Masquerading',
    tactic: 'de',
    desc: 'Renombrado o falsificación de archivos y procesos para simular software legítimo y evadir controles.',
    cve: 'CVE-2023-29336',
    cvss: '7.8 ALTO',
    cveDesc: 'Un controlador del núcleo permite ejecutar procesos con nombres falsificados que suplantan binarios firmados del sistema.',
    remed: [
      'Verificar firmas digitales de binarios ejecutados en endpoints críticos.',
      'Aplicar listas de aplicaciones permitidas (allowlisting).',
      'Monitorizar procesos con nombres similares a binarios del sistema.'
    ]
  },

  // Credential Access
  {
    id: 'T1110',
    name: 'Brute Force',
    tactic: 'ca',
    desc: 'Intentos automatizados y masivos de adivinar contraseñas para obtener acceso a cuentas válidas.',
    cve: 'CVE-2023-24955',
    cvss: '7.2 ALTO',
    cveDesc: 'Un portal de autenticación web no aplica límites de intentos, permitiendo ataques de fuerza bruta distribuidos.',
    remed: [
      'Implementar bloqueo progresivo de cuentas tras intentos fallidos.',
      'Desplegar CAPTCHA y limitación de tasa (rate limiting) en portales de login.',
      'Exigir MFA para reducir el impacto de credenciales comprometidas.'
    ]
  },
  {
    id: 'T1003',
    name: 'OS Credential Dumping',
    tactic: 'ca',
    desc: 'Extracción de credenciales almacenadas en memoria o en el registro del sistema operativo.',
    cve: 'CVE-2021-36934',
    cvss: '7.8 ALTO',
    cveDesc: 'Permisos de lectura excesivos en archivos del registro permiten extraer hashes de contraseñas locales.',
    remed: [
      'Restringir permisos de lectura sobre archivos sensibles del registro.',
      'Habilitar Credential Guard en los endpoints compatibles.',
      'Monitorizar accesos a procesos de gestión de credenciales (LSASS).'
    ]
  },
  {
    id: 'T1552',
    name: 'Unsecured Credentials',
    tactic: 'ca',
    desc: 'Localización de credenciales almacenadas en texto claro en archivos de configuración, scripts o repositorios.',
    cve: 'CVE-2022-29464',
    cvss: '9.8 CRÍTICO',
    cveDesc: 'Un archivo de configuración web permite la carga de archivos que exponen credenciales embebidas en texto claro.',
    remed: [
      'Eliminar credenciales embebidas y migrar a un gestor de secretos.',
      'Escanear repositorios de código en busca de secretos expuestos.',
      'Aplicar rotación periódica de credenciales de aplicaciones.'
    ]
  },
  {
    id: 'T1556',
    name: 'Modify Authentication Process',
    tactic: 'ca',
    desc: 'Manipulación de mecanismos de autenticación (PAM, proveedores SSO) para capturar o eludir credenciales.',
    cve: 'CVE-2023-34362',
    cvss: '9.8 CRÍTICO',
    cveDesc: 'Una vulnerabilidad de inyección SQL en un componente de transferencia de archivos permite manipular el flujo de autenticación.',
    remed: [
      'Aplicar el parche del componente de transferencia de archivos afectado.',
      'Auditar cambios en proveedores de identidad y módulos PAM.',
      'Aplicar autenticación multifactor resistente a manipulación de sesión.'
    ]
  },

  // Discovery
  {
    id: 'T1082',
    name: 'System Information Discovery',
    tactic: 'disc',
    desc: 'Recolección de información del sistema operativo, hardware y configuración para planificar el ataque.',
    cve: 'CVE-2022-26809',
    cvss: '8.1 ALTO',
    cveDesc: 'Un servicio RPC expuesto responde a consultas de información del sistema sin autenticación adecuada.',
    remed: [
      'Restringir el acceso a servicios RPC solo a redes de confianza.',
      'Aplicar el parche de seguridad correspondiente al servicio.',
      'Segmentar la red para limitar la visibilidad entre subredes.'
    ]
  },
  {
    id: 'T1087',
    name: 'Account Discovery',
    tactic: 'disc',
    desc: 'Enumeración de cuentas de usuario locales o de dominio para identificar objetivos de mayor privilegio.',
    cve: 'CVE-2021-34527',
    cvss: '8.8 ALTO',
    cveDesc: 'El servicio de administración de impresión permite enumerar y comprometer cuentas con privilegios elevados.',
    remed: [
      'Aplicar el parche del servicio de impresión afectado.',
      'Restringir la enumeración de cuentas mediante políticas de grupo.',
      'Monitorizar consultas masivas de directorio activo.'
    ]
  },
  {
    id: 'T1046',
    name: 'Network Service Discovery',
    tactic: 'disc',
    desc: 'Escaneo interno para identificar servicios activos y puertos abiertos dentro de la red comprometida.',
    cve: 'CVE-2020-0796',
    cvss: '10.0 CRÍTICO',
    cveDesc: 'Un protocolo de compartición de archivos permite ejecución remota de código durante el descubrimiento de servicios de red.',
    remed: [
      'Aplicar el parche del protocolo de compartición de archivos.',
      'Deshabilitar la compresión del protocolo si no es necesaria.',
      'Segmentar la red interna para limitar el descubrimiento lateral.'
    ]
  },
  {
    id: 'T1018',
    name: 'Remote System Discovery',
    tactic: 'disc',
    desc: 'Identificación de otros sistemas conectados en la red para planificar movimiento lateral posterior.',
    cve: 'CVE-2022-30216',
    cvss: '7.5 ALTO',
    cveDesc: 'Un servicio de resolución de nombres permite la suplantación de certificados durante el descubrimiento remoto de sistemas.',
    remed: [
      'Aplicar el parche del servicio de resolución de nombres afectado.',
      'Restringir el tráfico de descubrimiento entre segmentos de red.',
      'Desplegar detección de escaneo interno anómalo.'
    ]
  },

  // Lateral Movement
  {
    id: 'T1021',
    name: 'Remote Services',
    tactic: 'lm',
    desc: 'Uso de RDP, SSH o SMB con credenciales válidas para moverse entre sistemas dentro de la red.',
    cve: 'CVE-2019-0708',
    cvss: '9.8 CRÍTICO',
    cveDesc: 'El servicio de escritorio remoto permite ejecución de código sin autenticación previa a la conexión.',
    remed: [
      'Aplicar el parche del servicio de escritorio remoto de inmediato.',
      'Restringir RDP/SSH a segmentos de red autorizados mediante jump hosts.',
      'Habilitar autenticación a nivel de red (NLA) en todos los accesos remotos.'
    ]
  },
  {
    id: 'T1550',
    name: 'Use Alternate Authentication Material',
    tactic: 'lm',
    desc: 'Reutilización de hashes, tokens o tickets Kerberos capturados para autenticarse sin conocer la contraseña.',
    cve: 'CVE-2014-6324',
    cvss: '8.8 ALTO',
    cveDesc: 'Un fallo de validación de tickets Kerberos permite obtener privilegios de administrador de dominio.',
    remed: [
      'Aplicar el parche de validación de tickets Kerberos en los controladores de dominio.',
      'Forzar la actualización periódica del hash krbtgt.',
      'Desplegar detección de pass-the-hash y pass-the-ticket en el EDR.'
    ]
  }
];

export const normalizeTacticKey = (tacticStr = '') => {
  if (!tacticStr) return 'de';
  const str = String(tacticStr).toLowerCase();
  
  if (['reco', 'resdev', 'ia', 'exec', 'pers', 'pe', 'de', 'ca', 'disc', 'lm', 'coll', 'c2', 'exfil', 'impact'].includes(str)) {
    return str;
  }
  
  if (str.includes('recon') || str === 'ta0043') return 'reco';
  if (str.includes('resource') || str === 'ta0042') return 'resdev';
  if (str.includes('initial') || (str.includes('access') && !str.includes('cred')) || str === 'ta0001') return 'ia';
  if (str.includes('execution') || str === 'exec' || str === 'ta0002') return 'exec';
  if (str.includes('persist') || str === 'ta0003') return 'pers';
  if (str.includes('privilege') || str.includes('escalat') || str === 'ta0004') return 'pe';
  if (str.includes('defense') || str.includes('evasion') || str.includes('stealth') || str === 'ta0005') return 'de';
  if (str.includes('credential') || str === 'ta0006') return 'ca';
  if (str.includes('discovery') || str === 'ta0007') return 'disc';
  if (str.includes('lateral') || str.includes('movement') || str === 'ta0008') return 'lm';
  if (str.includes('collection') || str === 'ta0009') return 'coll';
  if (str.includes('command') || str.includes('control') || str === 'c2' || str === 'ta0011') return 'c2';
  if (str.includes('exfil') || str === 'ta0010') return 'exfil';
  if (str.includes('impact') || str === 'ta0040') return 'impact';

  return 'de';
};

const INFERRED_TTP_INFO = {
  'T1499': { name: 'Endpoint Denial of Service', tactic: 'impact' },
  'T1499.001': { name: 'OS Exhaustion Flood', tactic: 'impact' },
  'T1499.002': { name: 'Service Exhaustion Flood', tactic: 'impact' },
  'T1499.003': { name: 'Application Exhaustion Flood', tactic: 'impact' },
  'T1499.004': { name: 'Application Fault', tactic: 'impact' },
  'T1564': { name: 'Hide Artifacts', tactic: 'de' },
  'T1564.009': { name: 'Resource Fork', tactic: 'de' },
  'T1027': { name: 'Obfuscated Files or Information', tactic: 'de' },
  'T1027.006': { name: 'HTML Smuggling', tactic: 'de' },
  'T1027.009': { name: 'Embedded Payloads', tactic: 'de' },
  'T1574': { name: 'Hijack Execution Flow', tactic: 'pe' },
  'T1574.005': { name: 'Executable Installer File Permissions Weakness', tactic: 'pe' },
  'T1574.006': { name: 'Dynamic Link Library Search Order Hijacking', tactic: 'pe' },
  'T1574.007': { name: 'Path Interception by PATH Environment Variable', tactic: 'pe' },
  'T1574.010': { name: 'Services File Permissions Weakness', tactic: 'pe' },
  'T1547': { name: 'Boot or Logon Autostart Execution', tactic: 'pers' },
  'T1547.009': { name: 'Shortcut Modification', tactic: 'pers' },
  'T1562.003': { name: 'Impair Defenses: Impair Command History Logging', tactic: 'de' },
  'T1553.002': { name: 'Subvert Trust Controls: Code Signing', tactic: 'de' },
  'T1036.001': { name: 'Masquerading: Invalid Code Signature', tactic: 'de' },
  'T1539': { name: 'Steal Web Session Cookie', tactic: 'ca' },
  'T1543': { name: 'Create or Modify System Process', tactic: 'pers' },
  'T1553.004': { name: 'Install Root Certificate', tactic: 'de' }
};

export function TtpsPage({ graphData, showToast }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTtpId, setSelectedTtpId] = useState(null);
  const [modalTtp, setModalTtp] = useState(null);
  const cellRefs = useRef({});

  // Leemos los atributos de las CVEs para extraer las TTPs
  const vulNodes = (graphData?.nodes || []).filter(n => n.labels?.includes('Vulnerability') || n.primaryLabel === 'Vulnerability');
  
  const extractedTtpsMap = {};
  
  vulNodes.forEach(vul => {
    const props = vul.properties || {};
    
    let ttps = [];
    if (Array.isArray(props.ttps)) {
      ttps = props.ttps;
    } else if (typeof props.ttps === 'string') {
      ttps = props.ttps.split(',').map(t => t.trim()).filter(Boolean);
    }
    
    ttps.forEach(ttpItem => {
      const isObj = typeof ttpItem === 'object' && ttpItem !== null;
      const ttpId = isObj ? (ttpItem.ttp_id || ttpItem.id) : ttpItem;
      if (!ttpId) return;

      const ttpNameBackend = isObj ? ttpItem.name : null;
      const ttpTacticBackend = isObj ? ttpItem.tactic : null;
      const ttpDescBackend = isObj ? (ttpItem.description || ttpItem.desc) : null;

      if (!extractedTtpsMap[ttpId]) {
        const foundInTTPSData = TTPS_DATA.find(t => t.id === ttpId);
        const fallbackInfo = INFERRED_TTP_INFO[ttpId] || {};

        const name = (ttpNameBackend && ttpNameBackend.trim()) || 
                     foundInTTPSData?.name || 
                     fallbackInfo.name || 
                     `TTP ${ttpId}`;

        const rawTactic = ttpTacticBackend || 
                          foundInTTPSData?.tactic || 
                          fallbackInfo.tactic || 
                          'de';

        const tactic = normalizeTacticKey(rawTactic);

        const desc = ttpDescBackend || 
                     foundInTTPSData?.desc || 
                     `Extraída dinámicamente de ${props.cve_id || props.id || vul.id}`;

        extractedTtpsMap[ttpId] = {
          id: ttpId,
          name: name,
          tactic: tactic,
          desc: desc,
          cve: props.cve_id || props.id || vul.id,
          cvss: props.cvss_score || foundInTTPSData?.cvss || 'N/A',
          cveDesc: props.description || foundInTTPSData?.cveDesc || '',
          remed: foundInTTPSData?.remed || ['Implementar filtrado y monitorización de seguridad.']
        };
      }
    });
  });

  const finalTtps = Object.values(extractedTtpsMap);

  // Filtrar TTPs por búsqueda
  const filteredTtps = finalTtps.filter(t => 
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTtp = finalTtps.find(t => t.id === selectedTtpId);

  const handleSelectTtp = (id) => {
    if (selectedTtpId === id) {
      // Si ya está seleccionada, abrir modal
      const ttp = finalTtps.find(t => t.id === id);
      if (ttp) setModalTtp(ttp);
    } else {
      setSelectedTtpId(id);
      // Scroll automático suave hacia la celda en la matriz
      if (cellRefs.current[id]) {
        cellRefs.current[id].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  const handleOpenModalForTtp = (ttp) => {
    setSelectedTtpId(ttp.id);
    setModalTtp(ttp);
  };

  const handleMarkMitigated = () => {
    if (showToast) {
      showToast(`TTP ${modalTtp?.id} marcada como mitigada correctamente.`, 'success');
    }
    setModalTtp(null);
  };

  return (
    <main className="ttps">
      <section className="page-head">
        <div className="head-info">
          <p className="eyebrow">Inteligencia de amenazas</p>
          <h2>Tácticas, Técnicas y Procedimientos (TTPs)</h2>
        </div>
        <p style={{ maxWidth: '450px', fontSize: '13.5px', textAlign: 'right', margin: 0, opacity: 0.9 }}>
          Selecciona una TTP en el listado para localizarla en la matriz MITRE ATT&CK. Vuelve a hacer clic sobre la misma TTP para abrir su ficha completa con descripción, CVE asociada y remediaciones recomendadas.
        </p>
      </section>

      <section className="workspace">
        {/* LISTADO DE TTPs (IZQUIERDA) */}
        <div className="list-panel">
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            Listado de TTPs
          </h3>
          <div className="search-wrap">
            <input
              type="text"
              id="ttpSearch"
              placeholder="Buscar por ID o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="ttp-list">
            {filteredTtps.map((ttp) => {
              const tacticObj = TACTICS.find(t => t.key === ttp.tactic);
              const isSelected = selectedTtpId === ttp.id;
              
              return (
                <div 
                  key={ttp.id} 
                  className={`ttp-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectTtp(ttp.id)}
                  onDoubleClick={() => handleOpenModalForTtp(ttp)}
                >
                  <div className="row1">
                    <span className="tid">{ttp.id}</span>
                    <span className="tactic-tag">{tacticObj ? tacticObj.label : ttp.tactic}</span>
                  </div>
                  <div className="tname">{ttp.name}</div>
                  <div className="hint">Clic de nuevo para abrir detalle ➔</div>
                </div>
              );
            })}
            {filteredTtps.length === 0 && (
              <div className="empty-list">No se encontraron TTPs.</div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA (MATRIZ + FOOTER) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          {/* MATRIZ MITRE ATT&CK */}
          <div className="matrix-panel">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
                <path d="M3.5 9h17M8 9v11" />
              </svg>
              Matriz MITRE ATT&CK
            </h3>
            <p className="matrix-sub">
              {TACTICS.length} TÁCTICAS · DESPLAZA HORIZONTALMENTE PARA VER LA MATRIZ COMPLETA
            </p>

            <div className="matrix-scroll">
              <div className="matrix">
                {TACTICS.map((tac) => {
                  const ttpsInTactic = finalTtps.filter((t) => t.tactic === tac.key);
                  return (
                    <div key={tac.key} className="tactic-col">
                      <div className="tactic-head">
                        <div>{tac.label}</div>
                        <small style={{ fontSize: '8px', opacity: 0.7 }}>{tac.id}</small>
                      </div>

                      {ttpsInTactic.map((ttp) => {
                        const isSelected = ttp.id === selectedTtpId;
                        return (
                          <div
                            key={ttp.id}
                            ref={(el) => (cellRefs.current[ttp.id] = el)}
                            className={`cell ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectTtp(ttp.id)}
                          >
                            <span className="cid">{ttp.id}</span>
                            <span className="cname">{ttp.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* FOOTER ESTADÍSTICAS (FUERA DEL PANEL) */}
          <div className="matrix-stats-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '16px 20px', background: 'rgba(56, 19, 255, 0.05)', borderRadius: '12px', border: '1px solid var(--c700)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(51, 224, 138, 0.1)', border: '1px solid var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ok)', fontSize: '18px', fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold' }}>
                   {finalTtps.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <span style={{ fontSize: '10px', color: 'var(--c400)', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: '"Share Tech Mono", monospace' }}>Detectadas</span>
                   <span style={{ fontSize: '14px', color: 'var(--c50)', fontWeight: '600' }}>TTPs en Entorno</span>
                </div>
             </div>
             
             <div style={{ width: '1px', height: '34px', background: 'var(--c700)' }}></div>
             
             <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(122, 115, 255, 0.1)', border: '1px solid var(--c500)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c300)', fontSize: '18px', fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold' }}>
                   {TACTICS.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <span style={{ fontSize: '10px', color: 'var(--c400)', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: '"Share Tech Mono", monospace' }}>Catálogo</span>
                   <span style={{ fontSize: '14px', color: 'var(--c50)', fontWeight: '600' }}>Tácticas MITRE</span>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* MODAL DETALLE DE TTP */}
      {modalTtp && (
        <div className="ttp-modal-backdrop" onClick={() => setModalTtp(null)}>
          <div className="ttp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">{modalTtp.id}</p>
                <h3>{modalTtp.name}</h3>
              </div>
              <button className="modal-close" onClick={() => setModalTtp(null)}>
                ✕
              </button>
            </div>

            <span className="tactic-badge">
              <i></i>{' '}
              {TACTICS.find((t) => t.key === modalTtp.tactic)?.label || modalTtp.tactic}
            </span>

            <div className="sec">
              <p className="sec-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
                Descripción
              </p>
              <p>{modalTtp.desc}</p>
            </div>

            {modalTtp.cve && (
              <div className="sec">
                <p className="sec-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 2 3.5 6v6c0 5 3.6 8.5 8.5 10 4.9-1.5 8.5-5 8.5-10V6L12 2Z" />
                    <path d="M9.5 12.3l1.8 1.8 3.4-3.8" />
                  </svg>
                  CVE asociada
                </p>
                <div className="cve-box">
                  <div className="cve-top">
                    <span className="cve-id">{modalTtp.cve}</span>
                    <span className="cve-score">CVSS {modalTtp.cvss}</span>
                  </div>
                  <p>{modalTtp.cveDesc}</p>
                </div>
              </div>
            )}

            {modalTtp.remed && modalTtp.remed.length > 0 && (
              <div className="sec">
                <p className="sec-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 12.5 11 15l4.5-5" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  Remediaciones recomendadas
                </p>
                <ul className="remed-list">
                  {modalTtp.remed.map((r, idx) => (
                    <li key={idx}>
                      <span className="chk">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="modal-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setModalTtp(null)} style={{ height: 'auto', padding: '8px 16px', fontSize: '11px' }}>
                Cerrar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleMarkMitigated} style={{ height: 'auto', padding: '8px 16px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
                  <path d="M9 12.5 11 15l4.5-5" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
                Marcar como mitigada
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
