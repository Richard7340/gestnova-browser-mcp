# gestnova-browser-mcp

Un navegador para agentes: navegar, leer, rellenar formularios y sacar capturas,
expuesto como herramientas sobre HTTP.

La diferencia con pedirle a un modelo que "lea una web" es que aquí hay un
navegador de verdad detrás (Playwright), así que funciona con páginas que se
montan con JavaScript, con sesiones que hay que mantener entre pasos y con
formularios que hay que rellenar de verdad.

## Herramientas

**Navegación y estado**
`browser-navigate` · `browser-go-back` · `browser-forward` · `browser-wait-for`
· `browser-clear-cookies`

**Leer la página**
`browser-snapshot` (árbol accesible, que es lo que un agente entiende mejor que
el HTML crudo) · `browser-dom` · `browser-extract-visible` · `browser-screenshot`

**Actuar**
`browser-click` · `browser-click-at` · `browser-fill` · `browser-type-text` ·
`browser-select` · `browser-scroll` · `browser-evaluate` · `browser-download`

**Web sin navegador**
`web-fetch` · `web-extract` (texto legible con Readability) · `web-search`

## Cómo se usa

Necesita Node 20+.

```bash
npm install
npx playwright install chromium
npm run build
PORT=8018 node dist/server.js
```

Cada herramienta es un `POST /tools/<nombre>` con sus argumentos en el cuerpo, y
hay un `GET /health` para comprobar que está vivo.

```bash
curl -X POST localhost:8018/tools/browser-navigate \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'
```

Las sesiones se mantienen entre llamadas (`_session.ts`), así que una secuencia
navegar → rellenar → pulsar → leer funciona como esperas.

## Un aviso de uso

Un navegador automatizado puede hacer cosas que un sitio no espera. Respeta el
`robots.txt` y las condiciones de los sitios que visites, y no lo uses para
saltarte medidas de protección. La responsabilidad de lo que automatices es de
quien lo automatiza.

## Tests

```bash
npm test
```

## Licencia

MIT. Úsalo, modifícalo y véndelo si te sirve. Hecho en [Gestnova](https://gestnova.eu).
