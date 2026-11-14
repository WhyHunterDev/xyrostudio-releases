#!/usr/bin/env python3
"""Congela el panel de pruebas (web/public/app/dev/) como una versión nueva en web/public/app/v/<id>/.
Uso: python3 herramientas/version.py "Título corto" "cambio 1" "cambio 2" ... [--sql "SQL 30"] [--rubro gym|consultorio]
--rubro: para qué ecosistema es (se puede repetir o separar con comas). Sin --rubro = para todos los negocios.
Se ve en Panel XyroStudio → Actualizaciones → Historial. Los negocios NO cambian hasta que el gestor la sube."""
import json, os, shutil, sys, datetime
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'public', 'app')
args = sys.argv[1:]
req = ''
if '--sql' in args:
    i = args.index('--sql'); req = args[i + 1] if i + 1 < len(args) else ''; args = args[:i] + args[i + 2:]
rubros = []
while '--rubro' in args:
    i = args.index('--rubro'); rubros += [x.strip() for x in (args[i + 1] if i + 1 < len(args) else '').split(',') if x.strip()]; args = args[:i] + args[i + 2:]
titulo = (args[0] if args else 'Mejoras').strip()
cambios = [a.strip() for a in args[1:] if a.strip()] or [titulo]
ahora = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-5)))
vid = ahora.strftime('%Y%m%d-%H%M')
dst = os.path.join(R, 'v', vid)
if os.path.exists(dst): sys.exit('Ya existe ' + vid)
shutil.copytree(os.path.join(R, 'dev'), dst)
jf = os.path.join(R, 'v', 'versiones.json')
L = json.load(open(jf)) if os.path.exists(jf) else []
e = {'id': vid, 'fecha': ahora.strftime('%Y-%m-%d %H:%M'), 'titulo': titulo, 'notas': titulo, 'cambios': cambios}
if req: e['requiere'] = req
if rubros: e['rubros'] = rubros
L.insert(0, e)
json.dump(L, open(jf, 'w'), ensure_ascii=False, indent=1)
print(vid)
