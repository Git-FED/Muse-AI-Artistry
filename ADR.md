# Architecture decisions

## Static GitHub Pages
The site uses plain HTML, CSS, and JavaScript so it can be hosted from a repository without a server-side build. Gallery files keep their distinct interaction models.

## Lumen remains Home
`index.html` stays the root entry point and keeps the Lumen spotlight gallery. MuseAI promotion lives in `museai.html`, linked from every site page.

## Shared visual layer
MuseAI-wide styles and client-side behavior are shared through `assets/css/main.css` and `assets/js/app.js`; each existing page retains its own gallery styles and scripts.

## Payment age check
Payment widgets are injected only after the visitor passes a local date-of-birth threshold check. The date is not stored or sent by this site. This is a UI gate only, not identity verification or a legal compliance system.
