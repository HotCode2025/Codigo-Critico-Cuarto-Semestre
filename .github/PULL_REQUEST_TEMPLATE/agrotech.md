## Qué cambia

<!-- Una o dos líneas. Si cierra una issue: Closes #NN -->

## Cómo se probó

<!-- Pasos que seguiste, en docker-compose o en producción. -->

## Checklist

- [ ] `npm run lint` pasa
- [ ] Los tests de la API pasan (`cd server && npm test`)
- [ ] Si agregué o cambié un endpoint, está documentado en `server/src/docs/openapi.js`
- [ ] Si cambié la base, hay una migración en `server/migrations/` y `schema.sql` está actualizado
- [ ] Si cambié algo que ve el usuario, está en `CHANGELOG.md` (`[Sin publicar]`)
- [ ] No subí `.env`, backups, tokens ni datos reales

## Capturas

<!-- Si cambia algo en pantalla, antes y después. -->
