#!/usr/bin/env python3
"""Congela el panel de pruebas (web/public/app/dev/) como una versión nueva en web/public/app/v/<id>/.
Uso: python3 herramientas/version.py "Qué cambió (texto para el gestor)"
Los negocios NO cambian hasta que el gestor la sube (Panel XyroStudio → Actualizaciones)."""
import json, os, shutil, sys, datetime
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'public', 'app')
notas = ' '.join(sys.argv[1:]).strip() or 'Mejoras'
ahora = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-5)))
vid = ahora.strftime('%Y%m%d-%H%M')
dst = os.path.join(R, 'v', vid)
if os.path.exists(dst): sys.exit('Ya existe ' + vid)
shutil.copytree(os.path.join(R, 'dev'), dst)
jf = os.path.join(R, 'v', 'versiones.json')
L = json.load(open(jf)) if os.path.exists(jf) else []
L.insert(0, {'id': vid, 'fecha': ahora.strftime('%Y-%m-%d %H:%M'), 'notas': notas})
json.dump(L, open(jf, 'w'), ensure_ascii=False, indent=1)
print(vid)
